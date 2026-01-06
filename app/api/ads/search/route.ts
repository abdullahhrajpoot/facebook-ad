import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, AdData } from '@/utils/adValidation';

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

        // Clamp strict limits
        const safeMaxResults = Math.min(Number(maxResults), 50);
        const fetchLimit = Math.min(safeMaxResults * 5, 200);

        console.log(`Received search request for keyword: "${keyword}", country: ${country}, maxResults: ${safeMaxResults}, fetchLimit: ${fetchLimit}`);

        if (!keyword) {
            return NextResponse.json(
                { error: 'Keyword is required' },
                { status: 400 }
            );
        }

        const token = process.env.APIFY_API_TOKEN;
        if (!token) {
            // Fallback for demo/dev if no token provided (avoids crash but won't search real ads)
            console.error('APIFY_API_TOKEN is not configured');
            return NextResponse.json(
                { error: 'Server configuration error: APIFY_API_TOKEN missing' },
                { status: 500 }
            );
        }

        const client = new ApifyClient({
            token: token,
        });

        // Use the same reliable actor as Page Search (XtaWFhbtfxyzqrFmd)
        // Manually construct the URL to ensure the keyword is strictly respected
        // URL Format: https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country={COUNTRY}&q={KEYWORD}&search_type=keyword_unordered&media_type=all

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
            "scrapePageAds.countryCode": countryCode
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

        const { items } = await client.dataset(run.defaultDatasetId).listItems({
            limit: fetchLimit
        });

        console.log('Raw Apify Results:', JSON.stringify(items, null, 2));

        // --- Quality Sorting & Ranking Logic ---
        // 1. Normalize all items to calculate performance scores
        // 2. Sort by Performance Score (Descending)
        // 3. Deduplicate

        const normalizedItems = items.map(item => normalizeAdData(item));

        const rankedItems = normalizedItems.sort((a, b) => {
            // Priority 1: Performance Score (Higher is better)
            const scoreA = a.performanceScore || 0;
            const scoreB = b.performanceScore || 0;
            if (scoreB !== scoreA) return scoreB - scoreA;

            // Priority 2: Active Status (Active is better)
            const activeA = a.isActive ? 1 : 0;
            const activeB = b.isActive ? 1 : 0;
            if (activeB !== activeA) return activeB - activeA;

            // Priority 3: Duration (Older Start Date is better/longer running)
            // Using start date timestamp; smaller is older
            const dateA = a.startDate ? new Date(a.startDate).getTime() : Date.now();
            const dateB = b.startDate ? new Date(b.startDate).getTime() : Date.now();
            return dateA - dateB;
        });

        // --- Deduplication Ranking ---
        // Separate unique ads from duplicates (based on content signature)
        // Since the list is already sorted by quality, the "First" one we encounter
        // will be the "Best" version of that ad.
        const seenSignatures = new Set();
        const uniqueAds: AdData[] = [];
        const duplicateAds: AdData[] = [];

        for (const item of rankedItems) {
            // Create a signature based on content
            const title = item.title || '';
            const body = item.body || '';
            const link = item.linkUrl || '';

            // Simple signature; lowercase to handle minor casing diffs
            const signature = `${title}|${body}|${link}`.toLowerCase();
            const isEmpty = !title && !body && !link;

            if (!isEmpty && seenSignatures.has(signature)) {
                duplicateAds.push(item);
            } else {
                if (!isEmpty) seenSignatures.add(signature);
                uniqueAds.push(item);
            }
        }

        // Recombine: Uniques first, then duplicates
        const finalRanked = [...uniqueAds, ...duplicateAds];

        // --- Post-Processing Validation ---
        // Ensure we only return ads that will pass the frontend validation
        const validatedAds: AdData[] = [];
        for (const ad of finalRanked) {
            // Check Link
            if (!ad.linkUrl) continue;

            // Check Image
            // ad.imageUrl is already resolved by normalizeAdData
            if (!ad.imageUrl) continue;

            // Check Text
            if (!ad.title && !ad.body) continue;

            validatedAds.push(ad);
        }

        const topAds = validatedAds.slice(0, safeMaxResults);

        // Save to Supabase Search History (Fire and Forget)
        (async () => {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const countryCode = country || 'US';

                    // Check for existing entry
                    const { data: existingHistory } = await supabase
                        .from('search_history')
                        .select('id')
                        .eq('user_id', user.id)
                        .ilike('keyword', keyword.trim())
                        .eq('filters->>country', countryCode)
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
                                filters: { country: countryCode, maxResults: safeMaxResults }
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
