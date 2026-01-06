import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd } from '@/utils/adValidation';

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

        const fetchLimit = Number(maxResults) * 5;
        const countryCode = country || 'US';
        const encodedKeyword = encodeURIComponent(keyword.trim());

        const searchUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${countryCode}&q=${encodedKeyword}&search_type=keyword_unordered&media_type=all`;

        console.log(`Generated Search URL: ${searchUrl}`);

        const runInput = {
            "urls": [
                {
                    "url": searchUrl
                }
            ],
            "count": fetchLimit,
            "scrapePageAds.activeStatus": "all",
            "scrapePageAds.countryCode": "ALL"
        };

        const run = await client.actor('XtaWFhbtfxyzqrFmd').call(runInput, {
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

        // Quality Sorting & Ranking
        const rankedItems = items.sort((a, b) => {
            // 1. Active Status Priority
            if (a.is_active && !b.is_active) return -1;
            if (!a.is_active && b.is_active) return 1;

            // 2. Duration Priority (Longest Running = Oldest Start Date)
            const dateA = a.startDate || a.start_date ? new Date((a.startDate || a.start_date) as string).getTime() : Date.now();
            const dateB = b.startDate || b.start_date ? new Date((b.startDate || b.start_date) as string).getTime() : Date.now();

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

            // Log first 3 ads for debugging
            if (i < 3) {
                console.log(`\n✅ Ad ${i + 1} - NORMALIZED DATA:`);
                console.log(`   ID: ${normalizedAd.adArchiveID}`);
                console.log(`   Page: ${normalizedAd.pageName} (ID: ${normalizedAd.pageId})`);
                console.log(`   Page Profile: ${normalizedAd.pageProfileUrl}`);
                console.log(`   Page PFP: ${normalizedAd.pageProfilePictureUrl}`);
                console.log(`   Page Categories: [${normalizedAd.pageCategories.join(', ')}]`);
                console.log(`   Page Likes: ${normalizedAd.pageLikeCount}`);
                console.log(`   Title: ${normalizedAd.title?.substring(0, 50)}...`);
                console.log(`   Body: ${normalizedAd.body?.substring(0, 80)}...`);
                console.log(`   Images (${normalizedAd.images.length}): ${normalizedAd.images.slice(0, 2).join(', ')}`);
                console.log(`   Videos (${normalizedAd.videos.length}): ${normalizedAd.videos.join(', ')}`);
                console.log(`   Links (${normalizedAd.links.length}): ${normalizedAd.links.join(', ')}`);
                console.log(`   Platforms: [${normalizedAd.platforms.join(', ')}]`);
                console.log(`   Status: ${normalizedAd.isActive ? '🟢 Active' : '⚫ Inactive'}`);
                console.log(`   Branded Content: ${normalizedAd.brandedContent ? 'Yes' : 'No'}`);
                console.log(`   User Reported: ${normalizedAd.hasUserReported ? 'Yes' : 'No'}`);
                console.log(`   Sensitive Content: ${normalizedAd.containsSensitiveContent ? 'Yes' : 'No'}`);
                console.log(`   Dates: ${normalizedAd.startDate} → ${normalizedAd.endDate}`);
            }

            // Stop once we have enough
            if (validatedAds.length >= Number(maxResults)) {
                break;
            }
        }

        console.log(`\n========== RESULTS SUMMARY ==========`);
        console.log(`Total Valid Ads: ${validatedAds.length}`);
        console.log(`Returning: ${Math.min(validatedAds.length, Number(maxResults))} ads`);
        console.log(`====================================\n`);

        const topAds = validatedAds.slice(0, Number(maxResults));

        // Save to Supabase Search History (Fire and Forget)
        (async () => {
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
                                filters: { country: countryCode, maxResults }
                            });
                    }
                }
            } catch (dbError) {
                console.error('Error saving history:', dbError);
            }
        })();

        return NextResponse.json(topAds);
    } catch (error: any) {
        console.error('Apify Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
