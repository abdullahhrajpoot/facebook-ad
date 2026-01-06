import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd } from '@/utils/adValidation';

export async function POST(request: Request) {
    try {
        // Authenticate User
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { pageNameOrUrl, count = 100 } = body;

        console.log(`\n========== PAGE SEARCH REQUEST ==========`);
        console.log(`Page: "${pageNameOrUrl}"`);
        console.log(`Count: ${count}`);
        console.log(`=========================================\n`);

        if (!pageNameOrUrl) {
            return NextResponse.json(
                { error: 'Page name or URL is required' },
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

        // Construct the URL
        let targetUrl = pageNameOrUrl.trim();
        if (!targetUrl.startsWith('http')) {
            // Assume it's a page name/handle
            targetUrl = `https://www.facebook.com/${targetUrl}`;
        }

        // Fetch 5x to allow for quality sorting
        const fetchLimit = Number(count) * 5;
        const runInput = {
            "urls": [
                {
                    "url": targetUrl
                }
            ],
            "count": fetchLimit,
            "scrapePageAds.activeStatus": "all",
            "scrapePageAds.countryCode": "ALL"
        };

        console.log('Starting Apify Actor run with URL:', targetUrl);

        const run = await client.actor('XtaWFhbtfxyzqrFmd').call(runInput, {
            waitSecs: 120,
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

        // Quality Sorting & Ranking
        const rankedItems = items.sort((a, b) => {
            // 1. Active Status Priority
            if (a.is_active && !b.is_active) return -1;
            if (!a.is_active && b.is_active) return 1;

            // 2. Duration Priority (Longest Running = Oldest Start Date)
            const getTimestamp = (d: any) => {
                if (!d) return Date.now();
                if (typeof d === 'number') {
                    return d < 10000000000 ? d * 1000 : d;
                }
                return new Date(d).getTime();
            };

            const dateA = getTimestamp(a.startDate || a.start_date);
            const dateB = getTimestamp(b.startDate || b.start_date);

            return dateA - dateB;
        });

        // Deduplication
        const seenSignatures = new Set();
        const uniqueAds: any[] = [];
        const duplicateAds: any[] = [];

        for (const item of rankedItems) {
            const snap = (item.snapshot || {}) as any;
            const title = item.adCreativeLinkTitle || snap.title || snap.link_description || '';
            const body = item.adCreativeBody || snap.body?.text || snap.message || '';
            const link = item.adCreativeLinkUrl || snap.link_url || '';

            const signature = `${title}|${body}|${link}`.toLowerCase();

            if (seenSignatures.has(signature)) {
                duplicateAds.push(item);
            } else {
                seenSignatures.add(signature);
                uniqueAds.push(item);
            }
        }

        const finalRanked = [...uniqueAds, ...duplicateAds];

        // Validation & Normalization
        const validatedAds: any[] = [];

        console.log(`\n========== PROCESSING ADS ==========`);

        for (let i = 0; i < finalRanked.length; i++) {
            const rawAd = finalRanked[i];

            // Validate first
            if (!validateAd(rawAd)) {
                console.log(`❌ Ad ${i + 1} failed validation (missing required fields)`);
                continue;
            }

            // Normalize the ad data
            const normalizedAd = normalizeAdData(rawAd);

            validatedAds.push(normalizedAd);

            // Log first 2 ads for debugging
            if (i < 2) {
                console.log(`\n✅ Ad ${i + 1} - NORMALIZED DATA:`);
                console.log(`   ID: ${normalizedAd.adArchiveID}`);
                console.log(`   Page: ${normalizedAd.pageName}`);
                console.log(`   Images: ${normalizedAd.images.length}`);
                console.log(`   Videos: ${normalizedAd.videos.length}`);
                console.log(`   Links: ${normalizedAd.links.length}`);
            }

            // Stop once we have enough
            if (validatedAds.length >= Number(count)) {
                break;
            }
        }

        console.log(`\n========== RESULTS SUMMARY ==========`);
        console.log(`Total Valid Ads: ${validatedAds.length}`);
        console.log(`Returning: ${Math.min(validatedAds.length, Number(count))} ads`);
        console.log(`====================================\n`);

        const topAds = validatedAds.slice(0, Number(count));

        // Save to Supabase Search History (Fire and Forget)
        (async () => {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    // Check for existing entry with same page search
                    const { data: existingHistory } = await supabase
                        .from('search_history')
                        .select('id')
                        .eq('user_id', user.id)
                        .ilike('keyword', pageNameOrUrl.trim())
                        .eq('filters->searchType', 'page')
                        .maybeSingle();

                    if (existingHistory) {
                        // Update timestamp
                        await supabase
                            .from('search_history')
                            .update({ created_at: new Date().toISOString() })
                            .eq('id', existingHistory.id);
                    } else {
                        // Insert new entry
                        await supabase
                            .from('search_history')
                            .insert({
                                user_id: user.id,
                                keyword: pageNameOrUrl.trim(),
                                filters: {
                                    searchType: 'page',
                                    count: Number(count)
                                }
                            });
                    }

                    console.log('✅ Page search saved to history');
                }
            } catch (dbError) {
                console.error('Error saving page search history:', dbError);
            }
        })();

        return NextResponse.json(topAds);

    } catch (error: any) {
        console.error('Apify Page Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
