import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        // Authenticate User
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { keywords, location, limit = 10 } = body;

        if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
            return NextResponse.json(
                { error: 'At least one keyword/category is required' },
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

        // Prepare Input
        const categories = Array.isArray(keywords) ? keywords : [keywords];
        const locations = location ? [location] : [];

        // STRATEGY: Over-fetch by 2x to ensure we have enough valid results to meet the requested limit
        const requestedLimit = Number(limit);
        const fetchLimit = Math.max(requestedLimit * 2, 20); // Always fetch at least 20

        const runInput = {
            "categories": categories,
            "locations": locations,
            "resultsLimit": fetchLimit,
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };

        console.log(`\n========== PAGE DISCOVERY REQUEST ==========`);
        console.log(`Keywords: "${categories.join(', ')}"`);
        console.log(`Location: "${locations.join(', ')}"`);
        console.log(`Requested Limit: ${requestedLimit} (Fetching ${fetchLimit})`);
        console.log(`============================================\n`);

        // Retry Logic
        let items: any[] = [];
        let attempts = 0;
        const maxAttempts = 2; // Try twice
        let success = false;

        while (attempts < maxAttempts && !success) {
            attempts++;
            console.log(`Attempt ${attempts} of ${maxAttempts}...`);

            try {
                // Start Actor Run (Facebook Search Scraper - Us34x9p7VgjCz99H6)
                // Increased wait time to 300s
                const run = await client.actor('Us34x9p7VgjCz99H6').call(runInput, {
                    waitSecs: 300,
                });

                if (run && run.status === 'SUCCEEDED') {
                    const dataset = await client.dataset(run.defaultDatasetId).listItems();
                    items = dataset.items;

                    // Simple check: did we get anything?
                    if (items.length > 0) {
                        success = true;

                        // Save History asynchronously
                        (async () => {
                            try {
                                await supabase.from('search_history').insert({
                                    user_id: user.id,
                                    keyword: Array.isArray(keywords) ? keywords.join(', ') : keywords,
                                    filters: {
                                        type: 'page_discovery',
                                        location: location,
                                        limit: limit,
                                        resultsCount: items.length
                                    }
                                });
                            } catch (hErr) {
                                console.error('Failed to save history:', hErr);
                            }
                        })();

                    } else {
                        console.log('Run succeeded but returned 0 page results.');
                    }
                } else {
                    console.error('Apify Page Discovery run failed or was aborted:', run);
                }
            } catch (err) {
                console.error(`Page Discovery Attempt ${attempts} error:`, err);
            }
        }

        if (items.length === 0) {
            console.log(`\n========== EMPTY RESULTS ==========`);
            console.log('Page Discovery returned 0 items after retries.');
        }

        console.log(`\n========== RAW PAGE RESULTS ==========`);
        console.log(`Total items fetched: ${items.length}`);

        // SORTING: Prioritize "Best" pages (Having Ads -> Most Followers)
        items.sort((a: any, b: any) => {
            // 1. Check for Active Ads
            const aHasAds = (a.pageAdLibrary?.is_business_page_active === true) ||
                (a.ad_status && typeof a.ad_status === 'string' && a.ad_status.toLowerCase().includes('running ads') && !a.ad_status.toLowerCase().includes('not'));

            const bHasAds = (b.pageAdLibrary?.is_business_page_active === true) ||
                (b.ad_status && typeof b.ad_status === 'string' && b.ad_status.toLowerCase().includes('running ads') && !b.ad_status.toLowerCase().includes('not'));

            if (aHasAds && !bHasAds) return -1;
            if (!aHasAds && bHasAds) return 1;

            // 2. Tie-Breaker: Followers
            const followersA = a.followers || 0;
            const followersB = b.followers || 0;
            return followersB - followersA;
        });

        // Slice to the exact requested limit
        const finalItems = items.slice(0, requestedLimit);

        console.log(`Returning ${finalItems.length} items (Requested: ${requestedLimit})`);
        console.log(`======================================\n`);

        return NextResponse.json(finalItems);

    } catch (error: any) {
        console.error('Apify Page Discovery Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
