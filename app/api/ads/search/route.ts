import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Please use POST with { keyword, country, maxResults }' },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { keyword, country, maxResults = 10 } = body;

        console.log(`Received search request for keyword: "${keyword}", country: ${country}, maxResults: ${maxResults}`);

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

        // Input for the actor uMnsf6khYz0VsDGlg (Facebook Ad Library Scraper)
        // Fetch 5x the requested amount to allow for quality filtering/ranking
        const fetchLimit = Number(maxResults) * 5;
        const runInput = {
            searchTerms: [keyword],
            countryCode: country || 'US',
            adReachedCountries: [country || 'US'],
            resultsLimit: fetchLimit,
            maxItems: fetchLimit,
            adActiveStatus: 'ALL',
        };

        const run = await client.actor('uMnsf6khYz0VsDGlg').call(runInput, {
            waitSecs: 60,
        });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            return NextResponse.json(
                { error: 'Scraper run failed or was aborted' },
                { status: 502 }
            );
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // --- Quality Sorting & Ranking Logic ---
        // 1. Prioritize Valid Ads (basic check)
        // 2. Prioritize ACTIVE ads over Inactive
        // 3. Prioritize LONGER RUNNING ads (older startDate is better)

        const rankedItems = items.sort((a, b) => {
            // 1. Active Status Priority
            if (a.is_active && !b.is_active) return -1; // a comes first
            if (!a.is_active && b.is_active) return 1;  // b comes first

            // 2. Duration Priority (Longest Running = Oldest Start Date)
            const dateA = a.startDate || a.start_date ? new Date((a.startDate || a.start_date) as string).getTime() : Date.now();
            const dateB = b.startDate || b.start_date ? new Date((b.startDate || b.start_date) as string).getTime() : Date.now();

            return dateA - dateB; // Ascending sort: Oldest date (smallest timestamp) comes first
        });

        // --- Deduplication Ranking ---
        // Separate unique ads from duplicates (based on content signature)
        // Since the list is already sorted by quality (Active + Duration), the "First" one we encounter
        // will be the "Best" version of that ad. Subsequent ones are duplicates and get downranked.
        const seenSignatures = new Set();
        const uniqueAds: any[] = [];
        const duplicateAds: any[] = [];

        for (const item of rankedItems) {
            // Create a signature based on core content (Title + Body + Link)
            const snap = (item.snapshot || {}) as any;
            const title = item.adCreativeLinkTitle || snap.title || snap.link_description || '';
            const body = item.adCreativeBody || snap.body?.text || snap.message || '';
            const link = item.adCreativeLinkUrl || snap.link_url || '';

            // Simple signature; lowercase to handle minor casing diffs
            const signature = `${title}|${body}|${link}`.toLowerCase();

            if (seenSignatures.has(signature)) {
                duplicateAds.push(item);
            } else {
                seenSignatures.add(signature);
                uniqueAds.push(item);
            }
        }

        // Recombine: Uniques first, then duplicates
        const finalRanked = [...uniqueAds, ...duplicateAds];

        // --- Post-Processing Validation ---
        // Ensure we only return ads that will pass the frontend validation
        // (Must have Link, Image, and Text)
        const validatedAds: any[] = [];
        for (const ad of finalRanked) {
            const snapshot = ad.snapshot || {};

            // Check Link
            const linkUrl = snapshot.link_url || ad.adCreativeLinkUrl || snapshot.call_to_action?.value?.link;
            if (!linkUrl) continue;

            // Check Image
            const hasImage = !!ad.imageUrl ||
                (snapshot.images && snapshot.images.length > 0) ||
                (snapshot.cards && snapshot.cards.length > 0 && snapshot.cards[0].original_image_url) ||
                (snapshot.videos && snapshot.videos.length > 0 && snapshot.videos[0].video_preview_image_url);
            if (!hasImage) continue;

            // Check Text
            const title = ad.adCreativeLinkTitle || snapshot.title || snapshot.link_description || snapshot.cards?.[0]?.title;
            const body = ad.adCreativeBody || snapshot.body?.text || snapshot.message || snapshot.caption || ad.description;
            if (!title && !body) continue;

            validatedAds.push(ad);

            // Optimization: Stop once we have enough unique valid ads? 
            // Better to validate all high-ranked ones to ensure we fill the quota
        }

        const topAds = validatedAds.slice(0, Number(maxResults));

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
