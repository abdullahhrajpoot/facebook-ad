export interface AdData {
    id?: string
    adArchiveID?: string
    publisherPlatform?: string[]
    startDate?: string
    endDate?: string
    isActive?: boolean // mapped from is_active
    pageName?: string
    pageId?: string

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

    return {
        id: ad.id || ad.adArchiveID,
        adArchiveID: ad.adArchiveID || ad.ad_archive_id || ad.archive_id || ad.id || String(Date.now()), // Fallback to avoid crashes, though ideally should be unique
        isActive: ad.is_active,
        startDate: parseDate(ad.startDate || ad.start_date),
        endDate: parseDate(ad.endDate || ad.end_date),
        pageName: ad.pageName || ad.page_name || snapshot.page_name || 'Unknown Page',
        publisherPlatform: ad.publisher_platforms || snapshot.publisher_platforms,
        imageUrl,
        title,
        body,
        linkUrl,
        ctaText: snapshot.cta_text || 'Learn More',
        snapshot
    }
}
