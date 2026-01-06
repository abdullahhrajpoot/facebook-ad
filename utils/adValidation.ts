export interface AdData {
    id?: string
    adArchiveID?: string
    publisherPlatform?: string[]
    startDate?: string
    endDate?: string
    isActive?: boolean // mapped from is_active
    pageName?: string
    pageId?: string

    // Metric
    pageLikes?: number
    impressionsText?: string
    spend?: any

    // Computed Performance
    performanceScore?: number
    engagementScore?: number
    engagementRate?: number
    adActiveDays?: number

    // Normalized Metrics (Numeric for sorting)
    normImpressions?: number
    normSpend?: number

    // Visuals
    imageUrl?: string
    videoUrl?: string

    // Text
    title?: string
    body?: string
    linkDescription?: string
    ctaText?: string

    // Action
    linkUrl?: string

    // Raw Snapshot (fallback)
    snapshot?: any
}

export const validateAd = (ad: any): boolean => {
    const snapshot = ad.snapshot || {}

    // 1. MUST have a redirection URL (Link)
    const linkUrl = snapshot.link_url || ad.adCreativeLinkUrl || snapshot.call_to_action?.value?.link;
    if (!linkUrl) return false;

    // 2. MUST have an Image (or Video Preview)
    // We check for top level imageUrl, snapshot images, cards images (carousel), or video preview
    const hasImage =
        !!ad.imageUrl ||
        (snapshot.images && snapshot.images.length > 0) ||
        (snapshot.cards && snapshot.cards.length > 0 && snapshot.cards[0].original_image_url) ||
        (snapshot.videos && snapshot.videos.length > 0 && snapshot.videos[0].video_preview_image_url);

    if (!hasImage) return false;

    // 3. MUST have Title OR Description
    // We need at least some text to show
    const title = ad.adCreativeLinkTitle || snapshot.title || snapshot.link_description || snapshot.cards?.[0]?.title;
    const body = ad.adCreativeBody || snapshot.body?.text || snapshot.message || snapshot.caption || ad.description;

    if (!title && !body) return false;

    return true;
}

export const normalizeAdData = (ad: any): AdData => {
    // Check if ad is already normalized (heuristic: has performanceScore)
    if (ad.performanceScore !== undefined && ad.normImpressions !== undefined) {
        return ad as AdData;
    }

    const snapshot = ad.snapshot || {}

    // Resolve Image
    let imageUrl = ad.imageUrl
    if (!imageUrl && snapshot.images?.[0]) imageUrl = snapshot.images[0].original_image_url
    if (!imageUrl && snapshot.cards?.[0]) imageUrl = snapshot.cards[0].original_image_url
    if (!imageUrl && snapshot.videos?.[0]) imageUrl = snapshot.videos[0].video_preview_image_url

    // Resolve Text
    const cleanText = (text: string) => {
        if (!text) return ''
        // Remove template variables like {{product.name}}, {{product.brand}}
        return text.replace(/\{\{.*?\}\}/g, '').trim()
    }

    let title = ad.adCreativeLinkTitle || snapshot.title || snapshot.link_description || snapshot.cards?.[0]?.title || 'Sponsored Ad'
    title = cleanText(title) || 'Sponsored Ad'

    const bodyRaw = ad.adCreativeBody || snapshot.body || snapshot.message || snapshot.caption || ad.description
    const bodyText = typeof bodyRaw === 'object' ? bodyRaw?.text : bodyRaw
    const body = cleanText(bodyText)

    // Resolve Link
    const linkUrl = snapshot.link_url || ad.adCreativeLinkUrl || snapshot.call_to_action?.value?.link

    // Helper for date parsing
    const parseDate = (d: any) => {
        if (!d) return undefined;
        // If numeric timestamp
        if (typeof d === 'number') {
            // Check if seconds or ms. If small (seconds), convert to ms.
            return d < 10000000000 ? new Date(d * 1000).toISOString() : new Date(d).toISOString();
        }
        // If numeric string
        if (!isNaN(Number(d)) && !d.includes('-')) {
            const num = Number(d);
            return num < 10000000000 ? new Date(num * 1000).toISOString() : new Date(num).toISOString();
        }
        // Else assume date string
        return d;
    }

    const startDate = parseDate(ad.startDate || ad.start_date);
    const endDate = parseDate(ad.endDate || ad.end_date);
    const isActive = ad.is_active || (endDate ? new Date(endDate).getTime() > Date.now() : true); // Fallback if is_active missing

    // --- Performance Calculation ---

    // 1. Duration (Active Days)
    const now = new Date().getTime();
    const startMs = startDate ? new Date(startDate).getTime() : now;
    const endMs = endDate ? new Date(endDate).getTime() : now;
    // If active, cap end at now. If inactive, use end date.
    const effectiveEnd = isActive ? now : endMs;
    const durationMs = Math.max(0, effectiveEnd - startMs);
    const adActiveDays = Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)));

    // 2. Impressions (Normalize Range)
    let normImpressions = 0;
    const impIndex = ad.impressions_with_index || ad.impressions; // Sometimes it's directly in impressions
    if (impIndex && impIndex.lower_bound !== undefined) {
        // Estimate = Average of bounds, or lower_bound if upper is missing
        const lower = Number(impIndex.lower_bound) || 0;
        const upper = Number(impIndex.upper_bound) || lower;
        normImpressions = Math.ceil((lower + upper) / 2);
    } else if (typeof ad.impressions === 'number') {
        normImpressions = ad.impressions;
    }

    // 3. Spend (Normalize Range)
    let normSpend = 0;
    const spendObj = ad.spend;
    if (spendObj && spendObj.lower_bound !== undefined) {
        const lower = Number(spendObj.lower_bound) || 0;
        const upper = Number(spendObj.upper_bound) || lower;
        normSpend = Math.ceil((lower + upper) / 2);
    } else if (typeof ad.spend === 'number') {
        normSpend = ad.spend;
    }

    // 4. Page Likes
    const pageLikes = Number(snapshot.page_like_count) || 0;

    // 5. Engagement Score & Performance Score
    // Formula:
    // Base Score = (Page Likes * 0.1) + (Impressions / 100) + (Active Days * 10)
    // Multipliers: Active Ads get 1.5x boost

    // Engagement Score (interactions only)
    const engagementScore = (pageLikes * 0.5) + (normImpressions / 1000);

    // Performance Score (Overall Quality)
    let performanceScore = engagementScore + (adActiveDays * 5) + (normSpend / 10);

    if (isActive) {
        performanceScore *= 1.2; // 20% boost for active ads
    }

    // Engagement Rate (Approximate: Engagement / Impressions)
    // Avoid division by zero
    const engagementRate = normImpressions > 0 ? (engagementScore / normImpressions) * 100 : 0;


    return {
        id: ad.id || ad.adArchiveID,
        adArchiveID: ad.adArchiveID,
        isActive: ad.is_active,
        startDate,
        endDate,
        pageName: ad.pageName || ad.page_name || snapshot.page_name || 'Unknown Page',
        publisherPlatform: ad.publisher_platforms || snapshot.publisher_platforms,
        imageUrl,
        title,
        body,
        linkUrl,
        ctaText: snapshot.cta_text || 'Learn More',
        snapshot,

        // Metrics
        pageLikes,
        impressionsText: ad.impressions_with_index?.impressions_text,
        spend: ad.spend,

        // Computed
        performanceScore: Math.round(performanceScore),
        engagementScore: Math.round(engagementScore),
        engagementRate: Number(engagementRate.toFixed(4)),
        adActiveDays,
        normImpressions,
        normSpend
    }
}
