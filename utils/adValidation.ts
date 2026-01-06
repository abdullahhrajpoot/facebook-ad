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

    // Derived Metrics (New)
    adActiveDays: number
    hasVideo: boolean
    hasImage: boolean
    mediaType: 'VIDEO' | 'IMAGE' | 'CAROUSEL' | 'TEXT'
    impressionsEstimated: number | null
    pageAuthorityScore: number
    performanceScore: number

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
    const parseTimestamp = (d: any): number => {
        if (!d) return 0
        if (typeof d === 'number') {
            return d < 10000000000 ? d * 1000 : d
        }
        if (!isNaN(Number(d)) && !String(d).includes('-')) {
            const num = Number(d)
            return num < 10000000000 ? num * 1000 : num
        }
        return new Date(d).getTime()
    }

    const parseDateISO = (d: any) => {
        const ts = parseTimestamp(d)
        return ts ? new Date(ts).toISOString() : undefined
    }

    const startDate = parseDateISO(ad.start_date || ad.startDate)
    const endDate = parseDateISO(ad.end_date || ad.endDate)

    // ===== DERIVED METRICS =====

    // 1. Ad Active Days
    const startTs = parseTimestamp(ad.start_date || ad.startDate)
    const endTs = endDate ? parseTimestamp(endDate) : Date.now()
    const adActiveDays = startTs ? Math.max(0, Math.floor((endTs - startTs) / (1000 * 60 * 60 * 24))) : 0

    // 2. Media Type & Flags
    const hasVideo = videos.length > 0
    const hasImage = images.length > 0

    let mediaType: 'VIDEO' | 'IMAGE' | 'CAROUSEL' | 'TEXT' = 'TEXT'
    if (hasVideo) mediaType = 'VIDEO'
    else if ((snapshot.cards && snapshot.cards.length > 1) || images.length > 1) mediaType = 'CAROUSEL'
    else if (hasImage) mediaType = 'IMAGE'

    // 3. Impressions Estimate
    // Formats: "<100", "1K-5K", "100-500", etc.
    let impressionsEstimated: number | null = null
    const impressionsRaw = ad.impressions_with_index?.impressions_text

    if (impressionsRaw) {
        if (impressionsRaw.includes('<')) {
            impressionsEstimated = 50 // estimate for <100
        } else if (impressionsRaw.includes('-')) {
            const parts = impressionsRaw.split('-').map((s: string) => {
                const val = s.toUpperCase().trim()
                if (val.includes('K')) return parseFloat(val) * 1000
                if (val.includes('M')) return parseFloat(val) * 1000000
                return parseFloat(val)
            })
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                impressionsEstimated = Math.floor((parts[0] + parts[1]) / 2)
            }
        } else {
            // Try parsing raw number
            const val = parseInt(impressionsRaw.replace(/[^0-9]/g, ''))
            if (!isNaN(val)) impressionsEstimated = val
        }
    } else if (typeof ad.impressions === 'number') {
        impressionsEstimated = ad.impressions
    }

    // 4. Page Authority Score (Log Scale of Likes)
    // Log10(1) = 0, Log10(1000) = 3, Log10(1M) = 6. 
    // We Map 0-1M+ to 0-100 score roughly.
    // 1M likes => 6 * 16.6 ~= 100
    const pageAuthorityScore = pageLikeCount > 0
        ? Math.min(100, Math.round(Math.log10(pageLikeCount) * 15))
        : 0

    // 5. Performance Score (Composite)
    // Weights: Media (30%), Authority (30%), Duration (20%), Impressions (20%)
    const mediaScore = mediaType === 'VIDEO' ? 100 : mediaType === 'CAROUSEL' ? 80 : mediaType === 'IMAGE' ? 60 : 20
    const durationScore = Math.min(100, adActiveDays * 2) // 50 days = 100 score
    const impressionScore = impressionsEstimated ? Math.min(100, (Math.log10(impressionsEstimated) * 20)) : 50 // Default average

    const performanceScore = Math.round(
        (mediaScore * 0.3) +
        (pageAuthorityScore * 0.3) +
        (durationScore * 0.2) +
        (impressionScore * 0.2)
    )

    // ===== OLD IMPRESSIONS FIELD (Keep for backward compatibility) =====
    const impressions = impressionsRaw ||
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
        snapshot,
        // New Derived Metrics
        adActiveDays,
        hasVideo,
        hasImage,
        mediaType,
        impressionsEstimated,
        pageAuthorityScore,
        performanceScore
    }
}
