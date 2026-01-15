import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
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

        // STRATEGY: Over-fetch by 2x
        const requestedLimit = Number(limit);
        const fetchLimit = Math.max(requestedLimit * 2, 20);

        const runInput = {
            "categories": categories,
            "locations": locations,
            "resultsLimit": fetchLimit,
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };

        log('ACTOR_INIT', { actorId: 'Us34x9p7VgjCz99H6', runInput });

        // Retry Logic
        let items: any[] = [];
        let attempts = 0;
        const maxAttempts = 2; // Try twice
        let success = false;
        let lastError: any = null;

        while (attempts < maxAttempts && !success) {
            attempts++;
            try {
                const run = await client.actor('Us34x9p7VgjCz99H6').call(runInput, {
                    waitSecs: 300,
                });

                if (run && run.status === 'SUCCEEDED') {
                    const dataset = await client.dataset(run.defaultDatasetId).listItems();
                    items = dataset.items;

                    log(`ACTOR_ATTEMPT_${attempts}_COMPLETE`, { count: items.length });

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
                                log('HISTORY_SAVED');
                            } catch (hErr) {
                                errorLog('HISTORY_ERROR', hErr);
                            }
                        })();

                    } else {
                        log(`ACTOR_ATTEMPT_${attempts}_EMPTY`);
                    }
                } else {
                    log(`ACTOR_ATTEMPT_${attempts}_FAILED`, { status: run?.status });
                }
            } catch (err) {
                lastError = err;
                errorLog(`ACTOR_ATTEMPT_${attempts}_EXCEPTION`, err);
            }

            if (!success && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (items.length === 0) {
            log('EMPTY_RESULTS_FINAL');
        }

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

        log('REQUEST_SUCCESS', { fetched: items.length, returned: finalItems.length });

        if (finalItems.length === 0 && lastError) {
            const errorMessage = lastError.message || '';
            if (errorMessage.includes('Monthly usage hard limit exceeded') ||
                lastError.type === 'platform-feature-disabled' ||
                lastError.statusCode === 403) {
                return NextResponse.json(
                    { error: 'Service usage limit exceeded. Please contact administrator.' },
                    { status: 429 }
                );
            }
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
