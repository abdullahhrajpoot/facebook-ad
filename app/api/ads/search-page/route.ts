import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd, AdData } from '@/utils/adValidation';

// Helper to find page URL and ID if needed
async function resolvePageDetails(client: ApifyClient, query: string): Promise<{ url?: string; pageId?: string } | null> {
    try {
        console.log(`Resolving details for query: "${query}"...`);

        const isUrl = query.startsWith('http://') || query.startsWith('https://');
        const hasSpaces = query.includes(' ');

        // Strategy 1 (Direct Scrape) removed as actor mpBGBrrGdLyyoUs5R is deprecated.
        // Falling through to Strategy 2 (Search Scraper) which is more reliable.

        // Prepare query for search scraper
        let method2Query = query;
        if (isUrl) {
            try {
                const urlObj = new URL(query);
                // Simple extraction: take the last segment of the path
                const parts = urlObj.pathname.split('/').filter(p => p && p !== 'pages' && p !== 'profile.php' && p !== 'home.php');
                if (parts.length > 0) {
                    // Start with the last part
                    let candidate = parts[parts.length - 1];
                    // If it's numeric (like an ID), maybe take the one before it? 
                    // But for now, let's just clean it up.
                    // Remove numeric suffixes often found in slugs like 'name-123456'
                    candidate = candidate.replace(/-\d+$/, '').replace(/-/g, ' ');

                    if (candidate.length > 2) {
                        method2Query = candidate;
                        console.log(`Extracted search term from URL: "${method2Query}"`);
                    }
                }
            } catch (e) {
                console.warn('Failed to parse URL for fallback search query', e);
            }
        }

        // STRATEGY 2: Search Scrape (Fallback for names with spaces or failed direct scrape)
        console.log(`Strategy: Search Scraper (Us34x9p7VgjCz99H6) using query: "${method2Query}"`);
        const runInput = {
            "categories": [method2Query],
            "resultsLimit": 1,
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };
        // Use the Facebook Search Scraper
        const run = await client.actor('Us34x9p7VgjCz99H6').call(runInput, { waitSecs: 60 });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            console.warn('Page resolution (search) run failed');
            return null;
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (items.length > 0) {
            const item = items[0];
            const result = {
                url: (item.facebookUrl as string) || undefined,
                pageId: (item.id as string) || (item.pageId as string) || undefined
            };
            console.log(`Resolved "${query}" to`, result);
            return result;
        }
        console.warn(`No details found for query: "${query}"`);
        return null;

    } catch (e) {
        console.error("Error resolving page details:", e);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        // Authenticate User with Retry for Robustness
        const supabase = await createClient();
        let user = null;
        let authError = null;

        // Retry auth check up to 3 times if network issues occur
        for (let i = 0; i < 3; i++) {
            const result = await supabase.auth.getUser();
            user = result.data.user;
            authError = result.error;

            if (!authError) break;

            // Check if it's a network/timeout error
            const isNetwork = authError.message && (
                authError.message.toLowerCase().includes('fetch failed') ||
                authError.message.toLowerCase().includes('timeout') ||
                authError.message.toLowerCase().includes('network') ||
                authError.message.toLowerCase().includes('connection')
            );

            if (!isNetwork) break; // Real auth error (e.g. invalid token), don't retry

            console.warn(`Auth attempt ${i + 1} timed out or failed. Retrying...`);
            if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // If we still have a network error after retries, return 503 instead of 401
        if (authError && (authError.message?.toLowerCase().includes('fetch') || authError.message?.toLowerCase().includes('timeout'))) {
            console.error('Supabase Auth verification failed due to network timeout:', authError);
            return NextResponse.json({ error: 'Service temporarily unavailable, please try again' }, { status: 503 });
        }

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

        // 1. Resolve Target URL & ID
        let targetUrl = pageNameOrUrl.trim();
        let targetPageId: string | undefined;

        const isUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

        // Heuristic: If it looks like a simple handle (no spaces), allow it to fall through to FB default
        // If it has spaces or doesn't look like a URL, try to resolve it first.
        const hasSpaces = targetUrl.includes(' ');

        if (!isUrl && hasSpaces) {
            const details = await resolvePageDetails(client, targetUrl);
            if (details) {
                if (details.url) targetUrl = details.url;
                if (details.pageId) targetPageId = details.pageId;
            } else {
                console.log('could not resolve details, trying default heuristic');
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
            "start_date_min": "2020-01-01",
            "start_date_max": new Date().toISOString().split('T')[0],
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };

        console.log('Starting Apify Actor run with URL:', targetUrl);

        // 2. Retry Logic
        let items: any[] = [];
        let attempts = 0;
        const maxAttempts = 3; // Increased to 3
        let success = false;
        let usedFallback = false;

        // Primary Actor Run
        while (attempts < maxAttempts && !success) {
            attempts++;
            console.log(`Attempt ${attempts} of ${maxAttempts} (Primary Actor)...`);

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
                        console.log(`Primary actor succeeded with ${items.length} items.`);
                    } else {
                        console.log('Primary actor run succeeded but returned 0 items.');
                    }
                } else {
                    console.error('Primary Apify run failed or aborted:', run);
                }
            } catch (err) {
                console.error(`Primary actor attempt ${attempts} error:`, err);
            }

            if (!success && attempts < maxAttempts) {
                console.log('Waiting 2 seconds before retry...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Validate Primary Results: If we got "items" but they aren't valid ads, we should still try fallback
        if (success && items.length > 0) {
            const validCount = items.filter(item => validateAd(item)).length;
            if (validCount === 0) {
                console.log(`Primary actor returned ${items.length} items, but 0 were valid ads. Forcing fallback.`);

                // Attempt to extract page_id from invalid items before discarding them
                // This helps the fallback actor run without needing a separate resolvePageDetails call
                const firstItem = items[0];
                const extractedId = firstItem.pageId || firstItem.page_id || firstItem.publisher_platform_id;
                if (!targetPageId && extractedId) {
                    targetPageId = extractedId;
                    console.log(`Extracted Page ID from invalid primary items: ${targetPageId}`);
                }

                success = false;
                items = [];
            }
        }

        // 3. Fallback Actor Logic (Last Resort)
        // Explicitly check for !success OR empty items to ensure fallback runs on 0 results from Primary
        if (!success || items.length === 0) {
            console.log(`Primary condition failed (Success: ${success}, Items: ${items.length}). Attempting fallback actor (yhoz5tLd6h8XSuUP7)...`);

            try {
                // We need a page_id for the fallback actor.
                if (!targetPageId) {
                    console.log('Page ID not known explicitly. Attempting to resolve Page ID...');

                    // Derive a search query. 
                    // If original input was a name, use it. 
                    // If it was a URL, try to extract the name part.
                    let searchQuery = pageNameOrUrl;
                    if (isUrl) {
                        try {
                            const urlObj = new URL(pageNameOrUrl);
                            // Remove trailing slash and get last segment
                            const pathParts = urlObj.pathname.split('/').filter(Boolean);
                            if (pathParts.length > 0) {
                                searchQuery = pathParts[pathParts.length - 1];
                            }
                        } catch (e) {
                            console.warn('Failed to parse URL for query derivation:', e);
                        }
                    }

                    const details = await resolvePageDetails(client, searchQuery);
                    if (details?.pageId) {
                        targetPageId = details.pageId;
                    }
                }

                if (targetPageId) {
                    console.log(`Using Page ID for fallback: ${targetPageId}`);

                    const fallbackInput = {
                        "page_id": targetPageId,
                        "size": fetchLimit,
                        "start_date_min": "2020-01-01"
                    };

                    const run = await client.actor('yhoz5tLd6h8XSuUP7').call(fallbackInput, {
                        waitSecs: 300,
                    });

                    if (run && run.status === 'SUCCEEDED') {
                        const dataset = await client.dataset(run.defaultDatasetId).listItems();
                        const rawItems = dataset.items;

                        if (rawItems.length > 0) {
                            console.log(`Fallback actor succeeded with ${rawItems.length} items.`);

                            // Map fallback items to match normalizeAdData expectation
                            items = rawItems.map((item: any) => ({
                                ...item,
                                // Map flat structure to snapshot structure expected by normalizeAdData
                                snapshot: {
                                    body: { text: item.body },
                                    images: item.images?.map((url: string) => ({ original_image_url: url })) || [],
                                    videos: item.videos?.map((url: string) => ({ video_hd_url: url })) || [],
                                    link_url: item.links?.[0]?.url,
                                    extra_links: item.links?.map((l: any) => l.url) || [],
                                    title: item.title || item.page_name,
                                    page_id: item.page_id,
                                    page_name: item.page_name,
                                    page_profile_picture_url: item.page_profile_picture_url,
                                    page_like_count: item.page_like_count
                                }
                            }));

                            success = true;
                            usedFallback = true;
                        } else {
                            console.log('Fallback actor run succeeded but returned 0 items.');
                        }
                    } else {
                        console.error('Fallback Apify run failed or aborted:', run);
                    }
                } else {
                    console.error('Could not determine Page ID for fallback actor. Skipping.');
                }

            } catch (err) {
                console.error('Fallback actor error:', err);
            }
        }

        if (items.length === 0) {
            console.log(`\n========== EMPTY RESULTS ==========`);
            console.log('Scraper returned 0 ads after retries and fallback.');
        }

        console.log(`\n========== RAW API RESPONSE ==========`);
        console.log(`Total items fetched: ${items.length}`);
        console.log(`Used Fallback: ${usedFallback}`);
        console.log(`======================================\n`);

        // Simple Validation & Normalization
        const validatedAds: AdData[] = items
            .filter((item, index) => {
                const isValid = validateAd(item);
                if (!isValid && index < 10) { // Log first 10 failures
                    // Only log if we have a massive failure rate (e.g. valid count is low)
                    // But we don't know the final valid count yet.
                    // We'll log locally here.
                    // console.log(`Invalid Item ${index}:`, JSON.stringify(item).substring(0, 200));
                }
                return isValid;
            })
            .map(item => normalizeAdData(item))
            .sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
                const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
                return dateB - dateA; // Descending (Newest first)
            });

        if (items.length > 0 && validatedAds.length === 0) {
            console.log('ALL ITEMS FAILED VALIDATION. Dumping first item:', JSON.stringify(items[0], null, 2));
        } else if (items.length > validatedAds.length) {
            console.log(`Validation dropped ${items.length - validatedAds.length} items. First dropped item sample:`);
            const firstInvalid = items.find(i => !validateAd(i));
            if (firstInvalid) console.log(JSON.stringify(firstInvalid, null, 2).substring(0, 500));
        }

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
