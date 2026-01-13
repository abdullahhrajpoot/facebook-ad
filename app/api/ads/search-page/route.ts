import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd, AdData } from '@/utils/adValidation';

// Helper to find page URL if user provided a name
async function resolvePageUrl(client: ApifyClient, pageName: string): Promise<string | null> {
    try {
        console.log(`Resolving URL for page name: "${pageName}"...`);
        const runInput = {
            "categories": [pageName],
            "resultsLimit": 1,
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };
        // Use the Facebook Search Scraper (same as discovery)
        const run = await client.actor('Us34x9p7VgjCz99H6').call(runInput, { waitSecs: 60 });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            console.warn('Page resolution run failed');
            return null;
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (items.length > 0 && items[0].facebookUrl) {
            console.log(`Resolved "${pageName}" to ${items[0].facebookUrl}`);
            return items[0].facebookUrl;
        }
        console.warn(`No URL found for page name: "${pageName}"`);
        return null;
    } catch (e) {
        console.error("Error resolving page URL:", e);
        return null;
    }
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
        const { pageNameOrUrl, count = 100, unique = false } = body;

        console.log(`\n========== PAGE SEARCH REQUEST ==========`);
        console.log(`Page: "${pageNameOrUrl}"`);
        console.log(`Count: ${count}`);
        console.log(`Unique Mode: ${unique}`);
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

        // 1. Resolve Target URL
        let targetUrl = pageNameOrUrl.trim();
        const isUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

        // Heuristic: If it looks like a simple handle (no spaces), allow it to fall through to FB default
        // If it has spaces or doesn't look like a URL, try to resolve it first.
        const hasSpaces = targetUrl.includes(' ');

        if (!isUrl && hasSpaces) {
            const resolvedUrl = await resolvePageUrl(client, targetUrl);
            if (resolvedUrl) {
                targetUrl = resolvedUrl;
            } else {
                console.log('could not resolve url, trying default heuristic');
                // Fallback to heuristic
                targetUrl = `https://www.facebook.com/${targetUrl}`;
            }
        } else if (!isUrl) {
            // Simple handle, e.g. "nike" -> "https://www.facebook.com/nike"
            targetUrl = `https://www.facebook.com/${targetUrl}`;
        }

        // Final cleaning
        targetUrl = targetUrl.trim();

        // Fetch multiplier based on mode
        // Unique = 3x (User requested), Standard = 1x (Exact count)
        const fetchLimit = Number(count) * (unique ? 3 : 1);

        const runInput = {
            "urls": [
                {
                    "url": targetUrl
                }
            ],
            "count": fetchLimit,
            "scrapePageAds.activeStatus": "all",
            "scrapePageAds.countryCode": "ALL",
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };

        console.log('Starting Apify Actor run with URL:', targetUrl);

        // 2. Retry Logic
        let items: any[] = [];
        let attempts = 0;
        const maxAttempts = 2; // Try twice
        let success = false;

        while (attempts < maxAttempts && !success) {
            attempts++;
            console.log(`Attempt ${attempts} of ${maxAttempts}...`);

            try {
                // Increased timeout to 300s
                const run = await client.actor('XtaWFhbtfxyzqrFmd').call(runInput, {
                    waitSecs: 300,
                });

                if (run && run.status === 'SUCCEEDED') {
                    const dataset = await client.dataset(run.defaultDatasetId).listItems();
                    items = dataset.items;

                    if (items.length > 0) {
                        success = true;
                    } else {
                        console.log('Run succeeded but returned 0 items.');
                    }
                } else {
                    console.error('Apify run failed or aborted:', run);
                }
            } catch (err) {
                console.error(`Attempt ${attempts} error:`, err);
            }
        }

        if (items.length === 0) {
            console.log(`\n========== EMPTY RESULTS ==========`);
            console.log('Scraper returned 0 ads after retries.');
        }

        console.log(`\n========== RAW API RESPONSE ==========`);
        console.log(`Total items fetched: ${items.length}`);
        console.log(`======================================\n`);

        // Simple Validation & Normalization
        const validatedAds: AdData[] = items
            .filter(item => validateAd(item))
            .map(item => normalizeAdData(item));

        console.log(`\n========== RESULTS SUMMARY ==========`);
        console.log(`Total Valid Ads: ${validatedAds.length}`);

        let cutoffIndex = validatedAds.length;
        let validUniqueCount = validatedAds.length;

        if (unique) {
            // Smart Slicing: Ensure we return 'count' *unique* ads
            const uniqueTarget = Number(count);
            const seen = new Set<string>();
            validUniqueCount = 0;
            cutoffIndex = 0;

            for (let i = 0; i < validatedAds.length; i++) {
                const ad = validatedAds[i];
                const key = `${ad.pageId}|${ad.title}|${ad.body}`;

                if (!seen.has(key)) {
                    seen.add(key);
                    validUniqueCount++;
                }

                cutoffIndex = i + 1;
                if (validUniqueCount >= uniqueTarget) break;
            }
        } else {
            // Standard Slicing
            cutoffIndex = Math.min(validatedAds.length, Number(count));
            validUniqueCount = cutoffIndex;
        }

        console.log(`Returning: ${cutoffIndex} ads (containing ${validUniqueCount} unique)`);
        console.log(`====================================\n`);

        const topAds = validatedAds.slice(0, cutoffIndex);

        // Save to Supabase Search History
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

        return NextResponse.json(topAds);

    } catch (error: any) {
        console.error('Apify Page Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
