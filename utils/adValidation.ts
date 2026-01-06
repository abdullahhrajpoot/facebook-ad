export interface AdData {
    // Core Identifiers
    adArchiveID: string
    pageId: string

    // Page Information
    pageName: string
    pageProfileUrl: string
    pageProfilePictureUrl: string
    pageCategories: string[]
    pageLikeCount: number
    impressions?: string  // Impressions text from impressions_with_index

    // Content
    body: string
    title?: string

    // Media
    images: string[]  // Array of image URLs
    videos: string[]  // Array of video URLs

    // Links
    links: string[]  // All links blended into one array

    // Status & Metadata
    isActive: boolean
    hasUserReported: boolean
    containsSensitiveContent: boolean
    brandedContent: boolean

    // Platform
    platforms: string[]  // e.g., ["FACEBOOK", "INSTAGRAM"]

    // Dates
    startDate?: string
    endDate?: string

    // Raw snapshot for reference
    snapshot?: any
}

/**
 * Validates if an ad has minimum required data
 */
export const validateAd = (ad: any): boolean => {
    const snapshot = ad.snapshot || {}

    // 1. MUST have ad_archive_id
    if (!ad.ad_archive_id && !ad.adArchiveID && !ad.id) return false

    // 2. MUST have at least one image or video
    const hasImage =
        (snapshot.images && snapshot.images.length > 0) ||
        (snapshot.cards && snapshot.cards.length > 0) ||
        (snapshot.videos && snapshot.videos.length > 0) ||
        (snapshot.extra_images && snapshot.extra_images.length > 0)

    if (!hasImage) return false

    // 3. MUST have some text content
    const hasText =
        snapshot.body?.text ||
        snapshot.title ||
        snapshot.link_description ||
        ad.adCreativeBody ||
        ad.adCreativeLinkTitle

    if (!hasText) return false

    // 4. MUST have at least one link
    const hasLink =
        snapshot.link_url ||
        ad.adCreativeLinkUrl ||
        (snapshot.extra_links && snapshot.extra_links.length > 0)

    if (!hasLink) return false

    return true
}

/**
 * Normalizes raw API ad data into a clean, consistent format
 */
export const normalizeAdData = (ad: any): AdData => {
    const snapshot = ad.snapshot || {}

    // ===== IDENTIFIERS =====
    const adArchiveID = ad.ad_archive_id || ad.adArchiveID || ad.archive_id || ad.id || String(Date.now())
    const pageId = snapshot.page_id || ad.page_id || ''

    // ===== PAGE INFORMATION =====
    const pageName = snapshot.page_name || ad.page_name || ad.pageName || 'Unknown Page'
    const pageProfileUrl = snapshot.page_profile_uri || ad.page_profile_uri || ''
    const pageProfilePictureUrl = snapshot.page_profile_picture_url || ad.page_profile_picture_url || ''
    const pageCategories = snapshot.page_categories || ad.page_categories || []
    const pageLikeCount = snapshot.page_like_count || ad.page_like_count || 0

    // ===== TEXT CONTENT =====
    // Clean template variables like {{product.name}}
    const cleanText = (text: string) => {
        if (!text) return ''
        return text.replace(/\{\{.*?\}\}/g, '').trim()
    }

    const bodyRaw = snapshot.body?.text || snapshot.body || ad.adCreativeBody || snapshot.message || snapshot.caption || ''
    const body = cleanText(bodyRaw)

    const titleRaw = snapshot.title || ad.adCreativeLinkTitle || snapshot.link_description || snapshot.cards?.[0]?.title || ''
    const title = cleanText(titleRaw)

    // ===== IMAGES =====
    const images: string[] = []

    // Primary images from snapshot.images
    if (snapshot.images && Array.isArray(snapshot.images)) {
        snapshot.images.forEach((img: any) => {
            if (img.original_image_url) images.push(img.original_image_url)
        })
    }

    // Carousel cards
    if (snapshot.cards && Array.isArray(snapshot.cards)) {
        snapshot.cards.forEach((card: any) => {
            if (card.original_image_url) images.push(card.original_image_url)
        })
    }

    // Extra images
    if (snapshot.extra_images && Array.isArray(snapshot.extra_images)) {
        snapshot.extra_images.forEach((img: any) => {
            if (img.original_image_url) images.push(img.original_image_url)
        })
    }

    // Video preview images as fallback
    if (images.length === 0 && snapshot.videos && Array.isArray(snapshot.videos)) {
        snapshot.videos.forEach((vid: any) => {
            if (vid.video_preview_image_url) images.push(vid.video_preview_image_url)
        })
    }

    // Fallback to top-level imageUrl if exists
    if (images.length === 0 && ad.imageUrl) {
        images.push(ad.imageUrl)
    }

    // ===== VIDEOS =====
    const videos: string[] = []

    if (snapshot.videos && Array.isArray(snapshot.videos)) {
        snapshot.videos.forEach((vid: any) => {
            if (vid.video_hd_url) videos.push(vid.video_hd_url)
            else if (vid.video_sd_url) videos.push(vid.video_sd_url)
        })
    }

    if (snapshot.extra_videos && Array.isArray(snapshot.extra_videos)) {
        snapshot.extra_videos.forEach((vid: any) => {
            if (vid.video_hd_url) videos.push(vid.video_hd_url)
            else if (vid.video_sd_url) videos.push(vid.video_sd_url)
        })
    }

    // ===== LINKS (Blended into one array) =====
    const links: string[] = []

    // Primary link
    const primaryLink = snapshot.link_url || ad.adCreativeLinkUrl || snapshot.call_to_action?.value?.link
    if (primaryLink) links.push(primaryLink)

    // Extra links
    if (snapshot.extra_links && Array.isArray(snapshot.extra_links)) {
        snapshot.extra_links.forEach((link: string) => {
            if (link && !links.includes(link)) links.push(link)
        })
    }

    // Card links
    if (snapshot.cards && Array.isArray(snapshot.cards)) {
        snapshot.cards.forEach((card: any) => {
            if (card.link && !links.includes(card.link)) links.push(card.link)
        })
    }

    // ===== STATUS & FLAGS =====
    const isActive = ad.is_active === true
    const hasUserReported = ad.has_user_reported === true
    const containsSensitiveContent = ad.contains_sensitive_content === true
    const brandedContent = snapshot.branded_content === true || snapshot.branded_content === 'true'

    // ===== PLATFORMS =====
    const platforms = ad.publisher_platform || ad.publisher_platforms || snapshot.publisher_platforms || []

    // ===== DATES =====
    const parseDate = (d: any) => {
        if (!d) return undefined

        // If numeric timestamp
        if (typeof d === 'number') {
            // Check if seconds (10 digits) or ms (13 digits)
            return d < 10000000000 ? new Date(d * 1000).toISOString() : new Date(d).toISOString()
        }

        // If numeric string
        if (!isNaN(Number(d)) && !String(d).includes('-')) {
            const num = Number(d)
            return num < 10000000000 ? new Date(num * 1000).toISOString() : new Date(num).toISOString()
        }

        // Else assume date string
        return d
    }

    const startDate = parseDate(ad.start_date || ad.startDate)
    const endDate = parseDate(ad.end_date || ad.endDate)

    // ===== IMPRESSIONS =====
    const impressions = ad.impressions_with_index?.impressions_text ||
        (ad.impressions_with_index?.impressions_index >= 0 ?
            `${ad.impressions_with_index.impressions_index}` : undefined)

    // ===== ENHANCED LINK COLLECTION =====
    // Collect any additional links we might have missed from top-level properties
    if (ad.url && !links.includes(ad.url)) links.push(ad.url)
    if (ad.ad_library_url && !links.includes(ad.ad_library_url)) links.push(ad.ad_library_url)

    // Extract links from extra_texts if they contain URLs
    if (snapshot.extra_texts && Array.isArray(snapshot.extra_texts)) {
        snapshot.extra_texts.forEach((textObj: any) => {
            const text = textObj?.text || textObj
            if (typeof text === 'string') {
                // Simple URL regex to find links in text
                const urlMatches = text.match(/https?:\/\/[^\s]+/g)
                if (urlMatches) {
                    urlMatches.forEach(url => {
                        if (!links.includes(url)) links.push(url)
                    })
                }
            }
        })
    }

    return {
        adArchiveID,
        pageId,
        pageName,
        pageProfileUrl,
        pageProfilePictureUrl,
        pageCategories,
        pageLikeCount,
        impressions,
        body,
        title,
        images,
        videos,
        links,
        isActive,
        hasUserReported,
        containsSensitiveContent,
        brandedContent,
        platforms,
        startDate,
        endDate,
        snapshot
    }
}
