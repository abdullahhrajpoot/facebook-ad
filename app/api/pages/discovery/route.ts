import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';

// Read feature flag from Supabase database
async function isPageDiscoveryEnabled(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('enabled')
            .eq('feature_id', 'page_discovery')
            .single();
        
        if (error) {
            console.error('Error reading feature flag from database:', error);
            return false;
        }
        
        return data?.enabled ?? false;
    } catch (error) {
        console.error('Error reading feature flags:', error);
        return false;
    }
}

// Transform fast search actor output to match FacebookPageLocal interface
function transformFastSearchResults(rawResults: any[]): any[] {
    return rawResults.map(item => ({
        // Map fast search fields to standard format
        facebookUrl: item.url || item.profile_url,
        pageUrl: item.url || item.profile_url,
        title: item.name,
        pageName: item.name,
        pageId: item.facebook_id,
        facebookId: item.facebook_id,
        
        // Profile/Cover images
        profilePictureUrl: item.image?.uri,
        profilePhoto: item.image?.uri,
        
        // Verification
        CONFIRMED_OWNER_LABEL: item.is_verified ? 'Verified' : null,
        confirmed_owner: item.is_verified ? 'Verified' : null,
        
        // Fallback fields for frontend compatibility
        followers: null,
        likes: null,
        categories: [item.type || 'Page'],
        info: [],
        
        // Preserve original fields
        ...item
    }));
}

// Extract URLs from fast search results for detail scraping (removes duplicates)
function extractUrlsFromFastSearch(items: any[]): string[] {
    const urls = items
        .map(item => item.url || item.profile_url)
        .filter(Boolean);
    
    // Remove duplicates using Set
    const uniqueUrls = [...new Set(urls)];
    
    return uniqueUrls.slice(0, 50); // Limit to 50 URLs for scraping
}

export async function POST(request: Request) {
    // Check feature flag first - return early if disabled
    if (!(await isPageDiscoveryEnabled())) {
        return NextResponse.json(
            { error: 'Page Discovery feature is temporarily disabled. Please check back later.' },
            { status: 503 }
        );
    }

    const requestId = `REQ_DISCO_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const log = (step: string, details?: any) => {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId,
            step,
            details
        }, null, 2));
    };

    const errorLog = (step: string, error: any) => {
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId,
            step,
            error: error.message || error,
            fullError: error
        }, null, 2));
    };

    try {
        log('START_REQUEST', { method: request.method, url: request.url });

        // Authenticate User with Retry for Robustness
        const supabase = await createClient();
        let user = null;
        let authError = null;

        log('AUTH_START');
        for (let i = 0; i < 3; i++) {
            const result = await supabase.auth.getUser();
            user = result.data.user;
            authError = result.error;

            if (!authError) {
                log('AUTH_SUCCESS', { attempt: i + 1 });
                break;
            }

            const isNetwork = authError.message && (
                authError.message.toLowerCase().includes('fetch failed') ||
                authError.message.toLowerCase().includes('timeout') ||
                authError.message.toLowerCase().includes('network') ||
                authError.message.toLowerCase().includes('connection')
            );

            log('AUTH_ATTEMPT_FAILED', { attempt: i + 1, error: authError.message, isNetwork });

            if (!isNetwork) break;

            if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (authError && (authError.message?.toLowerCase().includes('fetch') || authError.message?.toLowerCase().includes('timeout'))) {
            errorLog('AUTH_NETWORK_ERROR', authError);
            return NextResponse.json({ error: 'Service temporarily unavailable, please try again' }, { status: 503 });
        }

        if (authError || !user) {
            errorLog('AUTH_FAILED_FINAL', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { keywords, location, limit = 10 } = body;

        log('PARSE_BODY', { keywords, location, limit });

        if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
            log('VALIDATION_ERROR', { field: 'keywords', message: 'Required' });
            return NextResponse.json(
                { error: 'At least one keyword/category is required' },
                { status: 400 }
            );
        }

        const token = process.env.APIFY_API_TOKEN;
        if (!token) {
            errorLog('CONFIG_ERROR', 'APIFY_API_TOKEN missing');
            return NextResponse.json(
                { error: 'Server configuration error: APIFY_API_TOKEN missing' },
                { status: 500 }
            );
        }

        const client = new ApifyClient({ token: token });

        // Prepare Input
        const categories = Array.isArray(keywords) ? keywords : [keywords];
        const locations = location ? [location] : [];
        const searchQuery = categories.join(' ');

        // STRATEGY: Over-fetch by 2x
        const requestedLimit = Number(limit);
        const fetchLimit = Math.max(requestedLimit * 2, 20);

        // PRIMARY ACTOR: Fast Facebook Search (YAg3YuPbbASz7JzWG) - gets pages by keyword
        const primaryActorInput = {
            "query": searchQuery,
            "maxResults": fetchLimit
        };

        // FALLBACK ACTOR: Original Discovery (Us34x9p7VgjCz99H6) - if primary fails
        const fallbackActorInput = {
            "categories": categories,
            "locations": locations,
            "resultsLimit": fetchLimit,
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };

        log('ACTOR_STRATEGY_INIT', { 
            phase1: 'YAg3YuPbbASz7JzWG (fast search)',
            phase2: '4Hv5RhChiaDk6iwad (detail scraper)',
            fallback: 'Us34x9p7VgjCz99H6 (discovery)',
            query: searchQuery
        });

        // Retry Logic with Fallback
        let items: any[] = [];
        let fastSearchItems: any[] = [];
        let pageUrls: string[] = [];
        let usedActor = '';
        let attempts = 0;
        const maxAttempts = 2;
        let success = false;
        let lastError: any = null;

        // PHASE 1: Try Fast Search Actor
        log('PHASE_1_START', { actor: 'YAg3YuPbbASz7JzWG (fast search)', input: primaryActorInput });
        
        attempts = 0;
        while (attempts < maxAttempts && !success) {
            attempts++;
            try {
                const run = await client.actor('YAg3YuPbbASz7JzWG').call(primaryActorInput, {
                    waitSecs: 300,
                });

                if (run && run.status === 'SUCCEEDED') {
                    const dataset = await client.dataset(run.defaultDatasetId).listItems();
                    fastSearchItems = dataset.items;

                    log(`PHASE_1_ATTEMPT_${attempts}_COMPLETE`, { count: fastSearchItems.length });

                    if (fastSearchItems.length > 0) {
                        success = true;
                        log('PHASE_1_SUCCESS', { resultsCount: fastSearchItems.length });

                        // Extract URLs for detail scraping
                        pageUrls = extractUrlsFromFastSearch(fastSearchItems);
                        log('URLS_EXTRACTED', { count: pageUrls.length });
                    } else {
                        log(`PHASE_1_ATTEMPT_${attempts}_EMPTY`);
                    }
                } else {
                    log(`PHASE_1_ATTEMPT_${attempts}_FAILED`, { status: run?.status });
                }
            } catch (err) {
                lastError = err;
                errorLog(`PHASE_1_ATTEMPT_${attempts}_EXCEPTION`, err);
            }

            if (!success && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // PHASE 2: Scrape detailed info from URLs using detail scraper
        if (pageUrls.length > 0) {
            log('PHASE_2_START', { actor: '4Hv5RhChiaDk6iwad (detail scraper)', urls: pageUrls.length });

            // Detail scraper expects an OBJECT with startUrls array, not a raw array
            const detailScraperInput = {
                startUrls: pageUrls.map(url => ({ url }))
            };

            attempts = 0;
            while (attempts < maxAttempts && items.length === 0) {
                attempts++;
                try {
                    const run = await client.actor('4Hv5RhChiaDk6iwad').call(detailScraperInput, {
                        waitSecs: 300,
                    });

                    if (run && run.status === 'SUCCEEDED') {
                        const dataset = await client.dataset(run.defaultDatasetId).listItems();
                        items = dataset.items;
                        usedActor = 'YAg3YuPbbASz7JzWG->4Hv5RhChiaDk6iwad';

                        log(`PHASE_2_ATTEMPT_${attempts}_COMPLETE`, { count: items.length });

                        if (items.length > 0) {
                            success = true;
                            log('PHASE_2_SUCCESS', { resultsCount: items.length });

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
                                            resultsCount: items.length,
                                            pipeline: 'fast_search->detail_scraper'
                                        }
                                    });
                                    log('HISTORY_SAVED');
                                } catch (hErr) {
                                    errorLog('HISTORY_ERROR', hErr);
                                }
                            })();
                        } else {
                            log(`PHASE_2_ATTEMPT_${attempts}_EMPTY`);
                        }
                    } else {
                        log(`PHASE_2_ATTEMPT_${attempts}_FAILED`, { status: run?.status });
                    }
                } catch (err) {
                    lastError = err;
                    errorLog(`PHASE_2_ATTEMPT_${attempts}_EXCEPTION`, err);
                }

                if (items.length === 0 && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        } else {
            log('PHASE_2_SKIPPED', { reason: 'no_urls_from_fast_search' });
        }

        // If Phase 2 failed but Phase 1 succeeded, use transformed fast search results
        if (items.length === 0 && fastSearchItems.length > 0) {
            log('USING_FAST_SEARCH_FALLBACK', { reason: 'phase_2_failed', fastSearchCount: fastSearchItems.length });
            items = transformFastSearchResults(fastSearchItems);
            usedActor = 'YAg3YuPbbASz7JzWG (fast search only)';
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
                            resultsCount: items.length,
                            pipeline: 'fast_search_only',
                            note: 'detail_scraper_failed'
                        }
                    });
                    log('HISTORY_SAVED');
                } catch (hErr) {
                    errorLog('HISTORY_ERROR', hErr);
                }
            })();
        }

        // PHASE 3: If fast search + detail scraper fails, try Discovery as fallback
        if (items.length === 0) {
            log('PHASE_3_START', { actor: 'Us34x9p7VgjCz99H6 (discovery fallback)', reason: 'phases_1_2_empty_or_failed', input: fallbackActorInput });
            
            attempts = 0;
            while (attempts < maxAttempts && !success) {
                attempts++;
                try {
                    const run = await client.actor('Us34x9p7VgjCz99H6').call(fallbackActorInput, {
                        waitSecs: 300,
                    });

                    if (run && run.status === 'SUCCEEDED') {
                        const dataset = await client.dataset(run.defaultDatasetId).listItems();
                        items = dataset.items;
                        usedActor = 'Us34x9p7VgjCz99H6 (fallback)';

                        log(`PHASE_3_ATTEMPT_${attempts}_COMPLETE`, { count: items.length });

                        if (items.length > 0) {
                            success = true;
                            log('PHASE_3_SUCCESS', { resultsCount: items.length });

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
                                            resultsCount: items.length,
                                            pipeline: 'discovery_fallback',
                                            note: 'fast_search_pipeline_failed'
                                        }
                                    });
                                    log('HISTORY_SAVED');
                                } catch (hErr) {
                                    errorLog('HISTORY_ERROR', hErr);
                                }
                            })();
                        } else {
                            log(`PHASE_3_ATTEMPT_${attempts}_EMPTY`);
                        }
                    } else {
                        log(`PHASE_3_ATTEMPT_${attempts}_FAILED`, { status: run?.status });
                    }
                } catch (err) {
                    lastError = err;
                    errorLog(`PHASE_3_ATTEMPT_${attempts}_EXCEPTION`, err);
                }

                if (!success && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        if (items.length === 0) {
            log('EMPTY_RESULTS_FINAL');
        }

        // RELEVANCE SCORING: Calculate relevance for each result
        function calculateRelevanceScore(page: any, searchKeywords: string[]): number {
            let score = 0;
            
            // Normalize page text fields for matching (handle all field name variations)
            const pageTitle = (page.title || page.pageName || page.name || '').toLowerCase();
            const pageCategory = (page.category || (page.categories && page.categories[0]) || page.type || '').toLowerCase();
            const pageInfo = (page.info || []).join(' ').toLowerCase();
            const pageAbout = (page.about_me?.text || '').toLowerCase();
            const pageIntro = (page.intro || '').toLowerCase();
            
            // Combine all text fields
            const allPageText = `${pageTitle} ${pageCategory} ${pageInfo} ${pageAbout} ${pageIntro}`;
            
            // Score based on keyword matches
            let keywordMatches = 0;
            let exactMatches = 0;
            
            for (const keyword of searchKeywords) {
                const lowerKeyword = keyword.toLowerCase().trim();
                
                // Exact phrase match (highest priority)
                if (pageTitle.includes(lowerKeyword)) {
                    score += 100;
                    exactMatches++;
                } else if (pageCategory.includes(lowerKeyword)) {
                    score += 80;
                    exactMatches++;
                } else if (allPageText.includes(lowerKeyword)) {
                    score += 40;
                    keywordMatches++;
                }
                
                // Word-by-word matching (lower priority)
                const keywords = lowerKeyword.split(/\s+/);
                for (const word of keywords) {
                    if (word.length > 2) { // Only match words longer than 2 chars
                        if (pageTitle.includes(word)) {
                            score += 30;
                        } else if (pageCategory.includes(word)) {
                            score += 20;
                        } else if (allPageText.includes(word)) {
                            score += 10;
                        }
                    }
                }
            }
            
            // Boost score based on engagement metrics
            const followers = page.followers || 0;
            const hasAds = (page.pageAdLibrary?.is_business_page_active === true) ||
                (page.ad_status && typeof page.ad_status === 'string' && page.ad_status.toLowerCase().includes('running ads') && !page.ad_status.toLowerCase().includes('not'));
            const hasVerification = !!page.CONFIRMED_OWNER_LABEL || !!page.confirmed_owner || !!page.is_verified;
            
            // Add follower score (normalized to avoid overwhelming relevance)
            if (followers > 0) {
                score += Math.min(Math.log10(followers) * 5, 30);
            }
            
            // Boost verified/confirmed pages
            if (hasVerification) {
                score += 25;
            }
            
            // Boost pages with active ads
            if (hasAds) {
                score += 20;
            }
            
            return score;
        }

        // Calculate relevance for all items
        const scoredItems = items.map(item => ({
            ...item,
            relevanceScore: calculateRelevanceScore(item, categories)
        }));
        
        // Filter items with minimum relevance threshold (exclude completely unrelated results)
        const MIN_RELEVANCE_THRESHOLD = 10; // Only keep pages with at least some relevance match
        const relevantItems = scoredItems.filter(item => item.relevanceScore >= MIN_RELEVANCE_THRESHOLD);
        
        // If no items meet threshold, return top scoring items anyway to avoid empty results
        const itemsToSort = relevantItems.length > 0 ? relevantItems : scoredItems;
        
        // SORTING: Sort by relevance score first, then engagement metrics
        itemsToSort.sort((a: any, b: any) => {
            // 1. Primary sort: Relevance Score
            if (a.relevanceScore !== b.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            
            // 2. Secondary sort: Check for Active Ads
            const aHasAds = (a.pageAdLibrary?.is_business_page_active === true) ||
                (a.ad_status && typeof a.ad_status === 'string' && a.ad_status.toLowerCase().includes('running ads') && !a.ad_status.toLowerCase().includes('not'));

            const bHasAds = (b.pageAdLibrary?.is_business_page_active === true) ||
                (b.ad_status && typeof b.ad_status === 'string' && b.ad_status.toLowerCase().includes('running ads') && !b.ad_status.toLowerCase().includes('not'));

            if (aHasAds && !bHasAds) return -1;
            if (!aHasAds && bHasAds) return 1;

            // 3. Tie-Breaker: Followers
            const followersA = a.followers || 0;
            const followersB = b.followers || 0;
            return followersB - followersA;
        });

        // Slice to the exact requested limit
        const finalItems = itemsToSort.slice(0, requestedLimit);

        log('REQUEST_SUCCESS', { 
            pipeline: 'fast_search->detail_scraper->discovery_fallback',
            actor: usedActor,
            phase1_fast_search: fastSearchItems.length,
            phase2_detail_scraper: items.length,
            fetched: items.length, 
            relevantItems: relevantItems.length,
            filtered: items.length - relevantItems.length,
            returned: finalItems.length,
            topRelevanceScores: finalItems.slice(0, 3).map(item => ({
                title: item.title || item.name || item.pageName,
                score: item.relevanceScore
            }))
        });

        if (finalItems.length === 0 && lastError) {
            const errorMessage = lastError.message || '';
            log('EMPTY_RESULTS_WITH_ERROR', { actor: usedActor, error: errorMessage });
            
            if (errorMessage.includes('Monthly usage hard limit exceeded') ||
                lastError.type === 'platform-feature-disabled' ||
                lastError.statusCode === 403) {
                return NextResponse.json(
                    { error: 'Service usage limit exceeded. Please contact administrator.' },
                    { status: 429 }
                );
            }
        }

        if (finalItems.length === 0) {
            log('EMPTY_RESULTS_FINAL', { pipeline: 'fast_search->detail_scraper->discovery_fallback', phase1: fastSearchItems.length, phase2: items.length });
        }

        return NextResponse.json(finalItems);

    } catch (error: any) {
        errorLog('UNHANDLED_EXCEPTION', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
