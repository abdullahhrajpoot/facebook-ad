import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd, AdData } from '@/utils/adValidation';

export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Please use POST with { keyword, country, maxResults }' },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    try {
        // Authenticate User
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { keyword, country, maxResults = 10 } = body;

        console.log(`\n========== AD SEARCH REQUEST ==========`);
        console.log(`Keyword: "${keyword}"`);
        console.log(`Country: ${country}`);
        console.log(`Max Results: ${maxResults}`);
        console.log(`========================================\n`);

        if (!keyword) {
            return NextResponse.json(
                { error: 'Keyword is required' },
                { status: 400 }
            );
        }

        const token = process.env.APIFY_API_TOKEN;
        if (!token) {
            console.error('APIFY_API_TOKEN is not configured');
            return NextResponse.json(
                { error: 'Server configuration error: APIFY_API_TOKEN missing' },
                { status: 500 }
            );
        }

        const client = new ApifyClient({
            token: token,
        });

        const countryCode = country || 'US';

        const runInput = {
            "query": keyword,
            "country": countryCode,
            "max_results": Number(maxResults),
            "keyword_type": "KEYWORD_EXACT_PHRASE",
            "languages": [
                "en"
            ],
            "media_type": "all",
            "start_date_min": "2020-01-01",
            "start_date_max": new Date().toISOString().split('T')[0]
        };

        const run = await client.actor('uMnsf6khYz0VsDGlg').call(runInput, {
            waitSecs: 60,
        });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            console.error('Apify run failed:', run);
            return NextResponse.json(
                { error: 'Scraper run failed or was aborted' },
                { status: 502 }
            );
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`\n========== RAW API RESPONSE ==========`);
        console.log(`Total items fetched: ${items.length}`);
        console.log(`======================================\n`);

        // Simple Validation & Normalization
        const validatedAds: AdData[] = items
            .filter(item => validateAd(item))
            .map(item => normalizeAdData(item));

        console.log(`\n========== RESULTS SUMMARY ==========`);
        console.log(`Total Valid Ads: ${validatedAds.length}`);
        console.log(`Returning: ${Math.min(validatedAds.length, Number(maxResults))} ads`);
        console.log(`====================================\n`);

        // Log first 3 ads for debugging
        for (let i = 0; i < Math.min(3, validatedAds.length); i++) {
            const normalizedAd = validatedAds[i];
            console.log(`\n✅ Ad ${i + 1} - NORMALIZED DATA:`);
            console.log(`   ID: ${normalizedAd.adArchiveID}`);
            console.log(`   Page: ${normalizedAd.pageName} (ID: ${normalizedAd.pageId})`);
            console.log(`   Score: ${normalizedAd.performanceScore} (Auth: ${normalizedAd.pageAuthorityScore}, Media: ${normalizedAd.mediaType})`);
            console.log(`   Title: ${normalizedAd.title?.substring(0, 50)}...`);
            console.log(`   Dates: ${normalizedAd.startDate} → ${normalizedAd.endDate} (${normalizedAd.adActiveDays} days)`);
        }

        const topAds = validatedAds.slice(0, Number(maxResults));

        // Save to Supabase Search History (Fire and Forget)
        // Save to Supabase Search History
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const countryCode = country || 'US';

                const { data: existingHistory } = await supabase
                    .from('search_history')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('keyword', keyword.trim())
                    .eq('filters->country', countryCode)
                    .eq('filters->searchType', 'keyword')
                    .maybeSingle();

                if (existingHistory) {
                    await supabase
                        .from('search_history')
                        .update({ created_at: new Date().toISOString() })
                        .eq('id', existingHistory.id);
                } else {
                    await supabase
                        .from('search_history')
                        .insert({
                            user_id: user.id,
                            keyword: keyword.trim(),
                            filters: {
                                searchType: 'keyword',
                                country: countryCode,
                                maxResults
                            }
                        });
                }

                console.log('✅ Keyword search saved to history');
            }
        } catch (dbError) {
            console.error('Error saving keyword search history:', dbError);
        }

        return NextResponse.json(topAds);
    } catch (error: any) {
        console.error('Apify Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
