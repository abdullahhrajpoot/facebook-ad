import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';
import { normalizeAdData, validateAd, AdData } from '@/utils/adValidation';

// Helper to find page URL and ID if needed
async function resolvePageDetails(client: ApifyClient, query: string, log: (s: string, d?: any) => void): Promise<{ url?: string; pageId?: string } | null> {
    try {
        log('RESOLVE_PAGE_START', { query });

        const isUrl = query.startsWith('http://') || query.startsWith('https://');

        // Prepare query for search scraper
        let method2Query = query;
        if (isUrl) {
            try {
                const urlObj = new URL(query);
                const parts = urlObj.pathname.split('/').filter(p => p && p !== 'pages' && p !== 'profile.php' && p !== 'home.php');
                if (parts.length > 0) {
                    let candidate = parts[parts.length - 1];
                    // Remove numeric suffixes often found in slugs like 'name-123456'
                    candidate = candidate.replace(/-\d+$/, '').replace(/-/g, ' ');

                    if (candidate.length > 2) {
                        method2Query = candidate;
                        log('RESOLVE_PAGE_EXTRACTED_TERM', { method2Query });
                    }
                }
            } catch (e) {
                log('RESOLVE_PAGE_URL_PARSE_ERROR', e);
            }
        }

        // STRATEGY 2: Search Scrape
        const runInput = {
            "categories": [method2Query],
            "resultsLimit": 1,
            "proxyConfiguration": {
                "useApifyProxy": true,
                "apifyProxyGroups": ["RESIDENTIAL"]
            }
        };

        log('RESOLVE_PAGE_ACTOR_INIT', { actorId: 'Us34x9p7VgjCz99H6', runInput });
        const run = await client.actor('Us34x9p7VgjCz99H6').call(runInput, { waitSecs: 60 });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            log('RESOLVE_PAGE_ACTOR_FAILED', run);
            return null;
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (items.length > 0) {
            const item = items[0];
            const result = {
                url: (item.facebookUrl as string) || undefined,
                pageId: (item.id as string) || (item.pageId as string) || undefined
            };
            log('RESOLVE_PAGE_SUCCESS', result);
            return result;
        }
        log('RESOLVE_PAGE_EMPTY');
        return null;

    } catch (e) {
        log('RESOLVE_PAGE_EXCEPTION', e);
        return null;
    }
}

export async function POST(request: Request) {
    const requestId = `REQ_PAGE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

        // Authenticate User
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
                authError.message.toLowerCase().includes('timeout')
            );
            if (!isNetwork) break;
            if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (authError && (authError.message?.toLowerCase().includes('fetch') || authError.message?.toLowerCase().includes('timeout'))) {
            errorLog('AUTH_NETWORK_ERROR', authError);
            return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
        }

        if (authError || !user) {
            errorLog('AUTH_FAILED_FINAL', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { pageNameOrUrl, count = 100, unique = false } = body;

        log('PARSE_BODY', { pageNameOrUrl, count, unique });

        if (!pageNameOrUrl) {
            return NextResponse.json(
                { error: 'Page name or URL is required' },
                { status: 400 }
            );
        }

        const token = process.env.APIFY_API_TOKEN;
        if (!token) {
            errorLog('CONFIG_ERROR', 'APIFY_API_TOKEN missing');
            return NextResponse.json(
                { error: 'Server configuration' },
                { status: 500 }
            );
        }

        const client = new ApifyClient({ token: token });

        // 1. Resolve Target URL & ID
        let targetUrl = pageNameOrUrl.trim();
        let targetPageId: string | undefined;

        const isUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');
        const hasSpaces = targetUrl.includes(' ');

        if (!isUrl && hasSpaces) {
            log('RESOLVE_NEEDED', { reason: 'Name has spaces and is not URL' });
            const details = await resolvePageDetails(client, targetUrl, log);
            if (details) {
                if (details.url) targetUrl = details.url;
                if (details.pageId) targetPageId = details.pageId;
            } else {
                targetUrl = `https://www.facebook.com/${targetUrl}`;
                log('RESOLVE_FAILED_FALLBACK', { targetUrl });
            }
        } else if (!isUrl) {
            targetUrl = `https://www.facebook.com/${targetUrl}`;
            log('HEURISTIC_URL', { targetUrl });
        }

        targetUrl = targetUrl.trim();
        const fetchLimit = Number(count) * (unique ? 3 : 1);

        const runInput = {
            "urls": [{ "url": targetUrl }],
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

        log('PRIMARY_ACTOR_INIT', { actorId: 'XtaWFhbtfxyzqrFmd', input: runInput });

        // 2. Retry Logic
        let items: any[] = [];
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;
        let usedFallback = false;
        let lastError: any = null;

        while (attempts < maxAttempts && !success) {
            attempts++;
            try {
                const run = await client.actor('XtaWFhbtfxyzqrFmd').call(runInput, {
                    waitSecs: 300,
                });

                if (run && run.status === 'SUCCEEDED') {
                    const dataset = await client.dataset(run.defaultDatasetId).listItems();
                    items = dataset.items;

                    log(`PRIMARY_ACTOR_ATTEMPT_${attempts}_COMPLETE`, { count: items.length });

                    // DEBUG: Log detailed structure of first few items to see what Apify returns
                    if (items.length > 0) {
                        const sampleItem = items[0];
                        const snap = sampleItem.snapshot || {};
                        log('DEBUG_RAW_APIFY_RESPONSE', {
                            itemKeys: Object.keys(sampleItem),
                            snapshotKeys: Object.keys(snap),
                            // Check all possible media locations
                            media: {
                                // Snapshot level
                                'snapshot.images': snap.images ? { length: snap.images.length, sample: snap.images[0] } : 'MISSING',
                                'snapshot.videos': snap.videos ? { length: snap.videos.length, sample: snap.videos[0] } : 'MISSING',
                                'snapshot.cards': snap.cards ? { length: snap.cards.length, sample: snap.cards[0] } : 'MISSING',
                                'snapshot.extra_images': snap.extra_images ? { length: snap.extra_images.length } : 'MISSING',
                                'snapshot.extra_videos': snap.extra_videos ? { length: snap.extra_videos.length } : 'MISSING',
                                // Root level
                                'root.images': sampleItem.images ? { length: sampleItem.images.length, sample: sampleItem.images[0] } : 'MISSING',
                                'root.videos': sampleItem.videos ? { length: sampleItem.videos.length, sample: sampleItem.videos[0] } : 'MISSING',
                                'root.cards': sampleItem.cards ? { length: sampleItem.cards.length } : 'MISSING',
                                'root.media': sampleItem.media ? { length: sampleItem.media?.length, sample: sampleItem.media?.[0] } : 'MISSING',
                                // Singular fields
                                'root.imageUrl': sampleItem.imageUrl || 'MISSING',
                                'root.image': sampleItem.image || 'MISSING',
                                'root.videoUrl': sampleItem.videoUrl || 'MISSING',
                                'root.thumbnailUrl': sampleItem.thumbnailUrl || 'MISSING'
                            },
                            text: {
                                'snapshot.body': snap.body ? (typeof snap.body === 'object' ? snap.body : { text: snap.body }) : 'MISSING',
                                'snapshot.title': snap.title || 'MISSING',
                                'root.body': sampleItem.body || 'MISSING',
                                'root.title': sampleItem.title || 'MISSING'
                            },
                            links: {
                                'snapshot.link_url': snap.link_url || snap.linkUrl || 'MISSING',
                                'snapshot.extra_links': snap.extra_links ? { length: snap.extra_links.length } : 'MISSING',
                                'root.link': sampleItem.link || sampleItem.url || 'MISSING'
                            },
                            identifiers: {
                                'ad_archive_id': sampleItem.ad_archive_id || sampleItem.adArchiveID || sampleItem.adArchiveId || 'MISSING',
                                'page_id': sampleItem.page_id || sampleItem.pageId || snap.page_id || snap.pageId || 'MISSING'
                            }
                        });
                        success = true;
                    }
                } else {
                    log(`PRIMARY_ACTOR_ATTEMPT_${attempts}_FAILED`, { status: run?.status });
                }
            } catch (err) {
                lastError = err;
                errorLog(`PRIMARY_ACTOR_ATTEMPT_${attempts}_EXCEPTION`, err);
            }

            if (!success && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Validate Primary
        if (success && items.length > 0) {
            // Pre-map primary actor output to normalize field names
            // Actor XtaWFhbtfxyzqrFmd returns camelCase fields that need to be normalized
            items = items.map((item: any) => {
                const snap = item.snapshot || {};

                // Normalize images array - handle various formats
                const normalizedImages: any[] = [];
                const sourceImages = snap.images || item.images || [];
                if (Array.isArray(sourceImages)) {
                    sourceImages.forEach((img: any) => {
                        if (typeof img === 'string') {
                            normalizedImages.push({ original_image_url: img });
                        } else {
                            normalizedImages.push({
                                original_image_url: img.originalImageUrl || img.original_image_url || img.url || img.src
                            });
                        }
                    });
                }

                // Normalize cards array - cards can contain videos with preview images
                const normalizedCards: any[] = [];
                const sourceCards = snap.cards || item.cards || [];
                if (Array.isArray(sourceCards)) {
                    sourceCards.forEach((card: any) => {
                        normalizedCards.push({
                            // Image fields - prefer original_image_url, fall back to video_preview_image_url
                            original_image_url: card.original_image_url || card.originalImageUrl ||
                                card.resized_image_url || card.watermarked_resized_image_url || null,
                            video_preview_image_url: card.video_preview_image_url || card.videoPreviewImageUrl || null,
                            // Video fields
                            video_hd_url: card.video_hd_url || card.videoHdUrl || null,
                            video_sd_url: card.video_sd_url || card.videoSdUrl || null,
                            watermarked_video_hd_url: card.watermarked_video_hd_url || null,
                            watermarked_video_sd_url: card.watermarked_video_sd_url || null,
                            // Other card fields
                            title: card.title,
                            body: card.body,
                            caption: card.caption,
                            cta_text: card.cta_text,
                            link_url: card.link_url || card.linkUrl,
                            link: card.link || card.linkUrl || card.link_url
                        });
                    });
                }

                // Normalize videos array - handle various formats
                const normalizedVideos: any[] = [];
                const sourceVideos = snap.videos || item.videos || [];
                if (Array.isArray(sourceVideos)) {
                    sourceVideos.forEach((vid: any) => {
                        if (typeof vid === 'string') {
                            normalizedVideos.push({ video_hd_url: vid });
                        } else {
                            normalizedVideos.push({
                                video_hd_url: vid.videoHdUrl || vid.video_hd_url || vid.url,
                                video_sd_url: vid.videoSdUrl || vid.video_sd_url,
                                video_preview_image_url: vid.videoPreviewImageUrl || vid.video_preview_image_url || vid.thumbnail || vid.thumbnailUrl
                            });
                        }
                    });
                }

                // Normalize extra_images
                const normalizedExtraImages: any[] = [];
                const sourceExtraImages = snap.extra_images || snap.extraImages || [];
                if (Array.isArray(sourceExtraImages)) {
                    sourceExtraImages.forEach((img: any) => {
                        if (typeof img === 'string') {
                            normalizedExtraImages.push({ original_image_url: img });
                        } else {
                            normalizedExtraImages.push({
                                original_image_url: img.originalImageUrl || img.original_image_url || img.url || img.src
                            });
                        }
                    });
                }

                // Normalize extra_videos
                const normalizedExtraVideos: any[] = [];
                const sourceExtraVideos = snap.extra_videos || snap.extraVideos || [];
                if (Array.isArray(sourceExtraVideos)) {
                    sourceExtraVideos.forEach((vid: any) => {
                        if (typeof vid === 'string') {
                            normalizedExtraVideos.push({ video_hd_url: vid });
                        } else {
                            normalizedExtraVideos.push({
                                video_hd_url: vid.videoHdUrl || vid.video_hd_url || vid.url,
                                video_sd_url: vid.videoSdUrl || vid.video_sd_url,
                                video_preview_image_url: vid.videoPreviewImageUrl || vid.video_preview_image_url
                            });
                        }
                    });
                }

                return {
                    ...item,
                    ad_archive_id: item.ad_archive_id || item.adArchiveID || item.adArchiveId || item.id,
                    page_id: item.page_id || item.pageId || snap.page_id || snap.pageId,
                    page_name: item.page_name || item.pageName || snap.page_name || snap.pageName,
                    start_date: item.start_date || item.startDate,
                    end_date: item.end_date || item.endDate,
                    is_active: item.is_active ?? item.isActive,
                    snapshot: {
                        ...snap,
                        images: normalizedImages.length > 0 ? normalizedImages : snap.images,
                        cards: normalizedCards.length > 0 ? normalizedCards : snap.cards,
                        videos: normalizedVideos.length > 0 ? normalizedVideos : snap.videos,
                        extra_images: normalizedExtraImages.length > 0 ? normalizedExtraImages : snap.extra_images,
                        extra_videos: normalizedExtraVideos.length > 0 ? normalizedExtraVideos : snap.extra_videos,
                        body: snap.body || { text: item.body || item.text || item.message },
                        title: snap.title || item.title,
                        link_url: snap.link_url || snap.linkUrl || item.link_url || item.linkUrl,
                        page_id: snap.page_id || snap.pageId || item.page_id || item.pageId,
                        page_name: snap.page_name || snap.pageName || item.page_name || item.pageName,
                        page_profile_uri: snap.page_profile_uri || snap.pageProfileUri,
                        page_profile_picture_url: snap.page_profile_picture_url || snap.pageProfilePictureUrl || item.page_profile_picture_url,
                        page_like_count: snap.page_like_count || snap.pageLikeCount || item.page_like_count,
                        page_categories: snap.page_categories || snap.pageCategories || item.page_categories,
                        extra_links: snap.extra_links || snap.extraLinks || []
                    }
                };
            });

            log('PRIMARY_ACTOR_MAPPED', { count: items.length });

            const validCount = items.filter(item => validateAd(item)).length;
            if (validCount === 0) {
                log('PRIMARY_VALIDATION_FAILED_ALL', {
                    rawCount: items.length, sample: items[0] ? {
                        hasSnapshot: !!items[0].snapshot,
                        hasImages: !!(items[0].snapshot?.images?.length),
                        hasVideos: !!(items[0].snapshot?.videos?.length),
                        hasBody: !!(items[0].snapshot?.body)
                    } : null
                });
                // Extract Page ID if possible
                const firstItem = items[0];
                const extractedId = firstItem.pageId || firstItem.page_id || firstItem.publisher_platform_id;
                if (!targetPageId && extractedId) {
                    targetPageId = extractedId;
                    log('EXTRACTED_PAGE_ID_FROM_INVALID', { targetPageId });
                }
                success = false;
                items = [];
            }
        }

        // 3. Fallback Actor Logic
        if (!success || items.length === 0) {
            log('FALLBACK_TRIGGERED');
            try {
                if (!targetPageId) {
                    let searchQuery = pageNameOrUrl;
                    if (isUrl) {
                        try {
                            const urlObj = new URL(pageNameOrUrl);
                            const pathParts = urlObj.pathname.split('/').filter(Boolean);
                            if (pathParts.length > 0) {
                                searchQuery = pathParts[pathParts.length - 1];
                            }
                        } catch (e) { }
                    }
                    const details = await resolvePageDetails(client, searchQuery, log);
                    if (details?.pageId) targetPageId = details.pageId;
                }

                if (targetPageId) {
                    const fallbackInput = {
                        "page_id": targetPageId,
                        "size": fetchLimit,
                        "start_date_min": "2020-01-01"
                    };

                    log('FALLBACK_ACTOR_INIT', { actorId: 'yhoz5tLd6h8XSuUP7', input: fallbackInput });
                    const run = await client.actor('yhoz5tLd6h8XSuUP7').call(fallbackInput, {
                        waitSecs: 300,
                    });

                    if (run && run.status === 'SUCCEEDED') {
                        const dataset = await client.dataset(run.defaultDatasetId).listItems();
                        const rawItems = dataset.items;
                        log('FALLBACK_ACTOR_COMPLETE', { count: rawItems.length });

                        if (rawItems.length > 0) {
                            items = rawItems.map((item: any) => {
                                // Handle various image formats
                                const images: any[] = [];
                                if (Array.isArray(item.images)) {
                                    item.images.forEach((img: any) => {
                                        if (typeof img === 'string') {
                                            images.push({ original_image_url: img });
                                        } else if (img?.url || img?.src || img?.original_image_url) {
                                            images.push({ original_image_url: img.url || img.src || img.original_image_url || img.originalImageUrl });
                                        }
                                    });
                                }
                                if (item.image) images.push({ original_image_url: item.image });
                                if (item.imageUrl) images.push({ original_image_url: item.imageUrl });
                                if (item.thumbnail_url) images.push({ original_image_url: item.thumbnail_url });

                                // Handle various video formats
                                const videos: any[] = [];
                                if (Array.isArray(item.videos)) {
                                    item.videos.forEach((vid: any) => {
                                        if (typeof vid === 'string') {
                                            videos.push({ video_hd_url: vid });
                                        } else if (vid?.url || vid?.video_hd_url || vid?.videoHdUrl) {
                                            videos.push({ video_hd_url: vid.url || vid.video_hd_url || vid.videoHdUrl || vid.video_sd_url });
                                        }
                                    });
                                }
                                if (item.video) videos.push({ video_hd_url: item.video });
                                if (item.videoUrl) videos.push({ video_hd_url: item.videoUrl });

                                // Handle various link formats
                                const extraLinks: string[] = [];
                                if (Array.isArray(item.links)) {
                                    item.links.forEach((link: any) => {
                                        const url = typeof link === 'string' ? link : (link?.url || link?.link || link?.href);
                                        if (url) extraLinks.push(url);
                                    });
                                }
                                const primaryLink = item.link_url || item.linkUrl || item.link || item.url || item.website_url || extraLinks[0];

                                return {
                                    ...item,
                                    ad_archive_id: item.ad_archive_id || item.adArchiveID || item.adArchiveId || item.id,
                                    snapshot: {
                                        body: { text: item.body || item.text || item.description || item.message },
                                        images: images,
                                        videos: videos,
                                        link_url: primaryLink,
                                        extra_links: extraLinks,
                                        title: item.title || item.page_name || item.pageName,
                                        page_id: item.page_id || item.pageId,
                                        page_name: item.page_name || item.pageName,
                                        page_profile_picture_url: item.page_profile_picture_url || item.pageProfilePictureUrl,
                                        page_like_count: item.page_like_count || item.pageLikeCount
                                    }
                                };
                            });
                            success = true;
                            usedFallback = true;
                            log('FALLBACK_ACTOR_MAPPED');
                        }
                    } else {
                        errorLog('FALLBACK_ACTOR_FAILED', run);
                    }
                } else {
                    log('FALLBACK_SKIPPED_NO_ID');
                }
            } catch (err) {
                lastError = err;
                errorLog('FALLBACK_ACTOR_EXCEPTION', err);
            }
        }

        log('FETCH_COMPLETE', { totalRaw: items.length, usedFallback });

        const validatedAds: AdData[] = items
            .filter(item => validateAd(item))
            .map(item => normalizeAdData(item))
            .sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
                const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
                return dateB - dateA;
            });

        log('VALIDATION_COMPLETE', { totalValid: validatedAds.length });

        // Slicing
        let cutoffIndex = validatedAds.length;
        let validUniqueCount = validatedAds.length;

        if (unique) {
            const uniqueTarget = Number(count);
            const seen = new Set<string>();
            validUniqueCount = 0;
            cutoffIndex = 0;
            for (let i = 0; i < validatedAds.length; i++) {
                const ad = validatedAds[i];
                const key = `${ad.pageId}|${ad.title}|${ad.body}`;
                if (!seen.has(key)) { seen.add(key); validUniqueCount++; }
                cutoffIndex = i + 1;
                if (validUniqueCount >= uniqueTarget) break;
            }
        } else {
            cutoffIndex = Math.min(validatedAds.length, Number(count));
            validUniqueCount = cutoffIndex;
        }

        log('SLICING_COMPLETE', { finalCount: cutoffIndex });

        const topAds = validatedAds.slice(0, cutoffIndex);

        // Save History
        try {
            // ... existing history logic
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existingHistory } = await supabase
                    .from('search_history')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('keyword', pageNameOrUrl.trim())
                    .eq('filters->searchType', 'page')
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
                            keyword: pageNameOrUrl.trim(),
                            filters: {
                                searchType: 'page',
                                count: Number(count)
                            }
                        });
                }
                log('HISTORY_SAVED');
            }
        } catch (dbError) {
            errorLog('HISTORY_ERROR', dbError);
        }

        // Check for specific Apify errors if no items found
        if (items.length === 0 && lastError) {
            const errorMessage = lastError.message || '';
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

        return NextResponse.json(topAds);

    } catch (error: any) {
        errorLog('UNHANDLED_EXCEPTION', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
