import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd, AdData } from '@/utils/adValidation';
import { checkRateLimit, getRateLimitIdentifier } from '@/utils/rateLimit';
import { generateSearchCacheKey, getFromCache, setInCache, CACHE_TTL } from '@/utils/cache';

export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Please use POST with { keyword, country, maxResults }' },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    // Generate a unique Request ID for tracing
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
            stack: error.stack,
            fullError: error
        }, null, 2));
    };

    try {
        log('START_REQUEST', { method: request.method, url: request.url });

        // Authenticate User
        const supabase = await createClient();
        let user = null;
        let authError = null;

        log('AUTH_START');
        // Retry auth check up to 3 times if network issues occur
        for (let i = 0; i < 3; i++) {
            const result = await supabase.auth.getUser();
            user = result.data.user;
            authError = result.error;

            if (!authError) {
                log('AUTH_SUCCESS', { userId: user?.id, attempt: i + 1 });
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

            console.warn(`Auth attempt ${i + 1} timed out or failed. Retrying...`);
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

        // Rate Limiting Check
        const rateLimitId = getRateLimitIdentifier(user.id, request);
        const rateLimit = await checkRateLimit(rateLimitId, 'search');
        if (!rateLimit.success) {
            log('RATE_LIMITED', { identifier: rateLimitId, remaining: rateLimit.remaining });
            return rateLimit.error;
        }
        log('RATE_LIMIT_OK', { remaining: rateLimit.remaining });

        const body = await request.json();
        const { keyword, country, maxResults = 10, unique = false } = body;

        log('PARSE_BODY', { keyword, country, maxResults, unique });

        if (!keyword) {
            log('VALIDATION_ERROR', { field: 'keyword', message: 'Keyword is required' });
            return NextResponse.json(
                { error: 'Keyword is required' },
                { status: 400 }
            );
        }

        // Check cache first (skip for unique searches as those need fresh de-duplication)
        if (!unique) {
            const cacheKey = generateSearchCacheKey({
                type: 'keyword',
                query: keyword,
                country: country || 'US',
                maxResults: Number(maxResults),
            });
            
            const cached = await getFromCache<AdData[]>(cacheKey);
            if (cached) {
                log('CACHE_HIT', { cacheKey, count: cached.length });
                return NextResponse.json(cached);
            }
            log('CACHE_MISS', { cacheKey });
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

        const countryCode = country || 'US';
        const fetchMultiplier = unique ? 3 : 1.5;

        const runInput = {
            "query": keyword,
            "country": countryCode,
            "max_results": Number(maxResults) * fetchMultiplier,
            "languages": ["en"],
            "media_type": "all",
            "start_date_min": "2025-01-01",
            "start_date_max": new Date().toISOString().split('T')[0]
        };

        log('PRIMARY_ACTOR_INIT', { actorId: 'uMnsf6khYz0VsDGlg', input: runInput });

        let items: any[] = [];
        let usedFallback = false;
        let fallbackAttempted = false;
        let lastError: any = null;

        const run = await client.actor('uMnsf6khYz0VsDGlg').call(runInput, {
            waitSecs: 60,
        });

        log('PRIMARY_ACTOR_COMPLETE', { status: run?.status, datasetId: run?.defaultDatasetId });

        if (run && run.status === 'SUCCEEDED') {
            const dataset = await client.dataset(run.defaultDatasetId).listItems();
            items = dataset.items;
            log('PRIMARY_ACTOR_FETCHED', { count: items.length });
        } else {
            lastError = run; // Capture run failure
            errorLog('PRIMARY_ACTOR_FAILED', run);
        }

        // --- FALLBACK ACTOR STRATEGY ---
        if (items.length === 0) {
            fallbackAttempted = true;
            log('FALLBACK_TRIGGERED', { reason: 'Primary actor returned 0 items' });

            const params = new URLSearchParams({
                active_status: "active",
                ad_type: "all",
                country: countryCode,
                is_targeted_country: "false",
                media_type: "all",
                q: keyword,
                search_type: "keyword_exact_phrase"
            });

            const fallbackUrl = `https://www.facebook.com/ads/library/?${params.toString()}`;
            log('FALLBACK_URL_GENERATED', { url: fallbackUrl });

            const fallbackInput = {
                "count": Number(maxResults) * fetchMultiplier,
                "urls": [{ "url": fallbackUrl }]
            };

            try {
                log('FALLBACK_1_INIT', { actorId: 'XtaWFhbtfxyzqrFmd', input: fallbackInput });
                const fallbackRun = await client.actor('XtaWFhbtfxyzqrFmd').call(fallbackInput, {
                    waitSecs: 300,
                });

                log('FALLBACK_1_COMPLETE', { status: fallbackRun?.status });

                if (fallbackRun && (fallbackRun.status === 'SUCCEEDED' || fallbackRun.status === 'RUNNING')) {
                    const dataset = await client.dataset(fallbackRun.defaultDatasetId).listItems();
                    if (dataset.items.length > 0) {
                        items = dataset.items;
                        usedFallback = true;
                        log('FALLBACK_1_SUCCESS', { count: items.length });
                    } else {
                        log('FALLBACK_1_EMPTY');
                    }
                } else {
                    errorLog('FALLBACK_1_FAILED', fallbackRun);
                }
            } catch (fbError) {
                lastError = fbError;
                errorLog('FALLBACK_1_EXCEPTION', fbError);
            }

            // --- SECOND FALLBACK ACTOR (JJghSZmShuco4j9gJ) ---
            if (items.length === 0) {
                log('FALLBACK_2_TRIGGERED');
                const secondFallbackInput = {
                    "startUrls": [{ "url": fallbackUrl }],
                    "resultsLimit": Number(maxResults) * fetchMultiplier,
                    "activeStatus": ""
                };

                try {
                    log('FALLBACK_2_INIT', { actorId: 'JJghSZmShuco4j9gJ', input: secondFallbackInput });
                    const secondRun = await client.actor('JJghSZmShuco4j9gJ').call(secondFallbackInput, {
                        waitSecs: 300,
                    });

                    if (secondRun && (secondRun.status === 'SUCCEEDED' || secondRun.status === 'RUNNING')) {
                        const dataset = await client.dataset(secondRun.defaultDatasetId).listItems();
                        const rawItems = dataset.items;
                        log('FALLBACK_2_COMPLETE', { count: rawItems.length });

                        if (rawItems.length > 0) {
                            // Map JJghSZmShuco4j9gJ output
                            items = rawItems.map((item: any) => {
                                const snap = item.snapshot || {};
                                return {
                                    ...item,
                                    ad_archive_id: item.adArchiveID || item.adArchiveId || item.ad_archive_id,
                                    snapshot: {
                                        ...snap,
                                        images: (snap.images || []).map((img: any) => ({
                                            original_image_url: img.originalImageUrl || img.original_image_url
                                        })),
                                        videos: (snap.videos || []).map((vid: any) => ({
                                            video_hd_url: vid.videoHdUrl || vid.video_hd_url,
                                            video_sd_url: vid.videoSdUrl || vid.video_sd_url,
                                            video_preview_image_url: vid.videoPreviewImageUrl || vid.video_preview_image_url
                                        })),
                                        body: snap.body || { text: item.snapshot?.body?.text },
                                        title: snap.title || item.snapshot?.title,
                                        link_url: snap.linkUrl || snap.link_url,
                                        cta_text: snap.ctaText || snap.cta_text,
                                        page_name: snap.pageName || item.page?.name,
                                        page_profile_uri: snap.pageProfileUri,
                                        page_profile_picture_url: snap.pageProfilePictureUrl,
                                        page_id: snap.pageId || item.page?.id || item.pageID
                                    }
                                };
                            });
                            log('FALLBACK_2_MAPPING_COMPLETE');

                            const validCount = items.filter(item => validateAd(item)).length;
                            if (validCount > 0) {
                                usedFallback = true;
                                log('FALLBACK_2_VALIDATED', { validCount });
                            } else {
                                log('FALLBACK_2_INVALID_ALL', { total: items.length });
                                items = [];
                                usedFallback = false;
                            }
                        }
                    }
                } catch (err) {
                    lastError = err;
                    errorLog('FALLBACK_2_EXCEPTION', err);
                }
            }

            // --- THIRD FALLBACK ACTOR (zifiWgYXT1cHHxavq) ---
            if (items.length === 0) {
                log('FALLBACK_3_TRIGGERED');
                const thirdParams = new URLSearchParams({
                    active_status: "active",
                    ad_type: "all",
                    country: countryCode,
                    q: keyword,
                    search_type: "keyword_exact_phrase",
                    media_type: "all"
                });
                const adLibraryUrl = `https://www.facebook.com/ads/library/?${thirdParams.toString()}`;

                const thirdFallbackInput = {
                    "adLibraryUrl": adLibraryUrl,
                    "maxResults": Number(maxResults) * fetchMultiplier
                };

                try {
                    log('FALLBACK_3_INIT', { actorId: 'zifiWgYXT1cHHxavq', input: thirdFallbackInput });
                    const thirdRun = await client.actor('zifiWgYXT1cHHxavq').call(thirdFallbackInput, {
                        waitSecs: 300,
                    });

                    if (thirdRun && (thirdRun.status === 'SUCCEEDED' || thirdRun.status === 'RUNNING')) {
                        const dataset = await client.dataset(thirdRun.defaultDatasetId).listItems();
                        const rawItems = dataset.items;
                        log('FALLBACK_3_COMPLETE', { count: rawItems.length });

                        if (rawItems.length > 0) {
                            items = rawItems.map((item: any) => ({
                                ...item,
                                ad_archive_id: item.ad_archive_id || item.id,
                                snapshot: {
                                    title: item.ad_title,
                                    body: { text: item.ad_body },
                                    link_url: item.link_url,
                                    cta_text: item.cta_text,
                                    page_name: item.page_name,
                                    page_id: item.page_id,
                                    page_like_count: item.page_like_count,
                                    images: (item.images || []).map((img: any) => ({
                                        original_image_url: img.original_url || img.src
                                    })),
                                    videos: (item.videos || []).map((vid: any) => ({
                                        video_hd_url: vid.url || vid.video_hd_url
                                    })),
                                    publisher_platforms: item.publisher_platform
                                },
                                start_date: item.start_date,
                                end_date: item.end_date,
                                is_active: item.is_active
                            }));
                            usedFallback = true;
                            log('FALLBACK_3_MAPPED');
                        }
                    }
                } catch (err) {
                    lastError = err;
                    errorLog('FALLBACK_3_EXCEPTION', err);
                }
            }
        }

        log('FETCH_COMPLETE', { totalRawItems: items.length });

        // Validation & Normalization
        const validatedAds: AdData[] = [];
        const invalidSamples: any[] = [];

        items.forEach((item, idx) => {
            const isValid = validateAd(item);
            if (isValid) {
                validatedAds.push(normalizeAdData(item));
            } else {
                if (invalidSamples.length < 5) invalidSamples.push({ idx, id: item.id || item.ad_archive_id, reason: 'Failed validateAd' });
            }
        });

        log('VALIDATION_COMPLETE', {
            totalRaw: items.length,
            totalValid: validatedAds.length,
            invalidCount: items.length - validatedAds.length,
            firstFewInvalid: invalidSamples
        });

        if (items.length > 0 && validatedAds.length === 0) {
            log('CRITICAL_VALIDATION_FAILURE', { message: 'Items fetched but all failed validation', sample: items[0] });
        }

        // Slicing
        let cutoffIndex = validatedAds.length;
        let validUniqueCount = validatedAds.length;

        if (unique) {
            const uniqueTarget = Number(maxResults);
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
            cutoffIndex = Math.min(validatedAds.length, Number(maxResults));
            validUniqueCount = cutoffIndex;
        }

        log('SLICING_COMPLETE', { requested: maxResults, uniqueMode: unique, finalCount: cutoffIndex, uniqueFound: validUniqueCount });

        const topAds = validatedAds.slice(0, cutoffIndex);

        // History Saving
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const countryCode = country || 'US';
                const { data: existingHistory } = await supabase
                    .from('search_history')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('keyword', keyword.trim())
                    .eq('filters->>country', countryCode)
                    .eq('filters->>searchType', 'keyword')
                    .maybeSingle();

                if (existingHistory) {
                    await supabase
                        .from('search_history')
                        .update({ created_at: new Date().toISOString() })
                        .eq('id', existingHistory.id);
                    log('HISTORY_UPDATED', { id: existingHistory.id });
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
                    log('HISTORY_INSERTED');
                }
            }
        } catch (dbError) {
            errorLog('HISTORY_ERROR', dbError);
        }

        log('REQUEST_SUCCESS', { returnedAds: topAds.length });

        // Cache successful results (only for non-unique searches)
        if (topAds.length > 0 && !unique) {
            const cacheKey = generateSearchCacheKey({
                type: 'keyword',
                query: keyword,
                country: country || 'US',
                maxResults: Number(maxResults),
            });
            setInCache(cacheKey, topAds, CACHE_TTL.SEARCH_RESULTS).then(cached => {
                if (cached) log('CACHE_SET', { cacheKey, count: topAds.length });
            });
        }

        if (topAds.length === 0 && lastError) {
            const errorMessage = lastError.message || (lastError.error?.message) || '';
            // Check for Usage Limit / Plan limits
            if (errorMessage.includes('Monthly usage hard limit exceeded') ||
                lastError.type === 'platform-feature-disabled' ||
                lastError.statusCode === 403) {
                return NextResponse.json(
                    { error: 'Service usage limit exceeded. Please contact administrator.' },
                    { status: 429 }
                );
            }
        }

        // Return successful response even if no ads found (genuinely no results, not an error)
        return NextResponse.json(topAds);

    } catch (error: any) {
        errorLog('UNHANDLED_EXCEPTION', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
