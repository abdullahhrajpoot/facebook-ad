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
    if (!ad.ad_archive_id && !ad.adArchiveID && !ad.adArchiveId && !ad.id && !ad.archive_id) return false

    // 2. MUST have at least one image or video
    const hasMedia =
        // Snapshot-level checks
        (snapshot.images && snapshot.images.length > 0) ||
        (snapshot.cards && snapshot.cards.length > 0) ||
        (snapshot.videos && snapshot.videos.length > 0) ||
        (snapshot.extra_images && snapshot.extra_images.length > 0) ||
        (snapshot.extra_videos && snapshot.extra_videos.length > 0) ||
        !!snapshot.image ||
        !!snapshot.video ||
        !!snapshot.thumbnail_url ||
        !!snapshot.preview_image_url ||
        !!snapshot.video_preview_image_url ||
        // Root-level array checks
        (Array.isArray(ad.images) && ad.images.length > 0) ||
        (Array.isArray(ad.videos) && ad.videos.length > 0) ||
        (Array.isArray(ad.cards) && ad.cards.length > 0) ||
        (Array.isArray(ad.media) && ad.media.length > 0) ||
        // Root-level singular checks
        !!ad.imageUrl ||
        !!ad.image_url ||
        !!ad.image ||
        !!ad.videoUrl ||
        !!ad.video_url ||
        !!ad.video ||
        !!ad.thumbnailUrl ||
        !!ad.thumbnail_url ||
        !!ad.thumbnail ||
        !!ad.preview_image_url ||
        !!ad.media_url ||
        !!ad.creative_image ||
        !!ad.creative_video

    if (!hasMedia) return false

    // 3. MUST have some text content
    const hasText =
        snapshot.body?.text ||
        snapshot.body ||
        snapshot.title ||
        snapshot.link_description ||
        snapshot.description ||
        snapshot.message ||
        snapshot.caption ||
        snapshot.text ||
        ad.adCreativeBody ||
        ad.adCreativeLinkTitle ||
        ad.message ||
        ad.caption ||
        ad.body ||
        ad.text ||
        ad.description ||
        ad.ad_creative_body ||
        ad.creative_body ||
        ad.content

    if (!hasText) return false

    // 4. MUST have at least one link
    const hasLink =
        snapshot.link_url ||
        snapshot.linkUrl ||
        snapshot.website_url ||
        snapshot.destination_url ||
        snapshot.cta_link ||
        (snapshot.extra_links && snapshot.extra_links.length > 0) ||
        (snapshot.links && snapshot.links.length > 0) ||
        ad.adCreativeLinkUrl ||
        ad.ad_creative_link_url ||
        ad.link ||
        ad.link_url ||
        ad.linkUrl ||
        ad.url ||
        ad.website_url ||
        ad.destination_url ||
        ad.cta_link ||
        (Array.isArray(ad.links) && ad.links.length > 0) ||
        ad.ad_library_url // Worst case, link to the ad itself is enough to be "valid"

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
    const cleanText = (text: any): string => {
        if (!text) return ''
        // Handle if text is an object with a text property
        if (typeof text === 'object' && text.text) {
            text = text.text
        }
        // Ensure we have a string before calling replace
        if (typeof text !== 'string') {
            return String(text || '')
        }
        return text.replace(/\{\{.*?\}\}/g, '').trim()
    }

    // Extract body text - handle various formats
    let bodyRaw = ''
    if (snapshot.body?.text) {
        bodyRaw = snapshot.body.text
    } else if (typeof snapshot.body === 'string') {
        bodyRaw = snapshot.body
    } else if (ad.adCreativeBody) {
        bodyRaw = ad.adCreativeBody
    } else if (snapshot.message) {
        bodyRaw = snapshot.message
    } else if (snapshot.caption) {
        bodyRaw = snapshot.caption
    } else if (snapshot.cards?.[0]?.body) {
        bodyRaw = snapshot.cards[0].body
    }
    const body = cleanText(bodyRaw)

    // Extract title - handle various formats
    let titleRaw = ''
    if (typeof snapshot.title === 'string') {
        titleRaw = snapshot.title
    } else if (ad.adCreativeLinkTitle) {
        titleRaw = ad.adCreativeLinkTitle
    } else if (snapshot.link_description) {
        titleRaw = snapshot.link_description
    } else if (snapshot.cards?.[0]?.title) {
        titleRaw = snapshot.cards[0].title
    }
    const title = cleanText(titleRaw)

    // ===== IMAGES =====
    const images: string[] = []

    // Helper to extract URL from various image object formats
    // Also checks video_preview_image_url for cards that contain videos instead of images
    const extractImageUrl = (img: any): string | null => {
        if (typeof img === 'string') return img
        return img?.original_image_url || img?.originalImageUrl ||
            img?.resized_image_url || img?.watermarked_resized_image_url ||
            img?.video_preview_image_url || img?.videoPreviewImageUrl ||
            img?.src || img?.url || img?.image_url || img?.imageUrl ||
            img?.thumbnail || img?.thumbnailUrl || img?.thumbnail_url || null
    }

    // Primary images from snapshot.images
    if (snapshot.images && Array.isArray(snapshot.images)) {
        snapshot.images.forEach((img: any) => {
            const url = extractImageUrl(img)
            if (url) images.push(url)
        })
    }

    // Carousel cards - these can have regular images OR video preview images
    if (snapshot.cards && Array.isArray(snapshot.cards)) {
        snapshot.cards.forEach((card: any) => {
            // First try to get a regular image
            let url = card.original_image_url || card.originalImageUrl ||
                card.resized_image_url || card.watermarked_resized_image_url
            // If no regular image, fall back to video preview image
            if (!url) {
                url = card.video_preview_image_url || card.videoPreviewImageUrl
            }
            if (url) images.push(url)
        })
    }

    // Extra images
    if (snapshot.extra_images && Array.isArray(snapshot.extra_images)) {
        snapshot.extra_images.forEach((img: any) => {
            const url = extractImageUrl(img)
            if (url) images.push(url)
        })
    }

    // Root-level images array
    if (images.length === 0 && Array.isArray(ad.images)) {
        ad.images.forEach((img: any) => {
            const url = extractImageUrl(img)
            if (url) images.push(url)
        })
    }

    // Root-level cards array
    if (images.length === 0 && Array.isArray(ad.cards)) {
        ad.cards.forEach((card: any) => {
            const url = extractImageUrl(card)
            if (url) images.push(url)
        })
    }

    // Root-level media array
    if (images.length === 0 && Array.isArray(ad.media)) {
        ad.media.forEach((m: any) => {
            if (m.type === 'image' || !m.type) {
                const url = extractImageUrl(m)
                if (url) images.push(url)
            }
        })
    }

    // Video preview images as fallback
    if (images.length === 0 && snapshot.videos && Array.isArray(snapshot.videos)) {
        snapshot.videos.forEach((vid: any) => {
            const url = vid.video_preview_image_url || vid.videoPreviewImageUrl || vid.thumbnail || vid.thumbnail_url
            if (url) images.push(url)
        })
    }

    // Singular image fallbacks
    if (images.length === 0) {
        const singularImage =
            ad.imageUrl || ad.image_url || ad.image ||
            ad.thumbnailUrl || ad.thumbnail_url || ad.thumbnail ||
            ad.preview_image_url || ad.media_url ||
            ad.creative_image ||
            snapshot.image || snapshot.thumbnail_url || snapshot.preview_image_url
        if (singularImage) images.push(singularImage)
    }

    // ===== VIDEOS =====
    const videos: string[] = []

    // Helper to extract URL from various video object formats
    const extractVideoUrl = (vid: any): string | null => {
        if (typeof vid === 'string') return vid
        return vid?.video_hd_url || vid?.videoHdUrl || vid?.video_sd_url || vid?.videoSdUrl ||
            vid?.url || vid?.video_url || vid?.videoUrl || vid?.src || null
    }

    if (snapshot.videos && Array.isArray(snapshot.videos)) {
        snapshot.videos.forEach((vid: any) => {
            const url = extractVideoUrl(vid)
            if (url) videos.push(url)
        })
    }

    // Extract videos from carousel cards - cards can contain video_hd_url/video_sd_url
    if (snapshot.cards && Array.isArray(snapshot.cards)) {
        snapshot.cards.forEach((card: any) => {
            const url = card.video_hd_url || card.videoHdUrl ||
                card.video_sd_url || card.videoSdUrl ||
                card.watermarked_video_hd_url || card.watermarked_video_sd_url
            if (url) videos.push(url)
        })
    }

    if (snapshot.extra_videos && Array.isArray(snapshot.extra_videos)) {
        snapshot.extra_videos.forEach((vid: any) => {
            const url = extractVideoUrl(vid)
            if (url) videos.push(url)
        })
    }

    // Root-level videos array
    if (videos.length === 0 && Array.isArray(ad.videos)) {
        ad.videos.forEach((vid: any) => {
            const url = extractVideoUrl(vid)
            if (url) videos.push(url)
        })
    }

    // Root-level media array (video type)
    if (videos.length === 0 && Array.isArray(ad.media)) {
        ad.media.forEach((m: any) => {
            if (m.type === 'video') {
                const url = extractVideoUrl(m)
                if (url) videos.push(url)
            }
        })
    }

    // Singular video fallbacks
    if (videos.length === 0) {
        const singularVideo =
            ad.videoUrl || ad.video_url || ad.video ||
            ad.creative_video ||
            snapshot.video || snapshot.video_url
        if (singularVideo) videos.push(singularVideo)
    }

    // ===== LINKS (Blended into one array) =====
    const links: string[] = []

    // Helper to extract URL from various link formats
    const extractLinkUrl = (link: any): string | null => {
        if (typeof link === 'string') return link
        return link?.url || link?.link || link?.href || link?.link_url || link?.linkUrl || null
    }

    // Primary link - check multiple possible field names
    const primaryLink =
        snapshot.link_url || snapshot.linkUrl ||
        snapshot.website_url || snapshot.destination_url ||
        snapshot.cta_link ||
        ad.adCreativeLinkUrl || ad.ad_creative_link_url ||
        ad.link_url || ad.linkUrl ||
        ad.website_url || ad.destination_url ||
        ad.cta_link ||
        snapshot.call_to_action?.value?.link
    if (primaryLink) links.push(primaryLink)

    // Extra links from snapshot
    if (snapshot.extra_links && Array.isArray(snapshot.extra_links)) {
        snapshot.extra_links.forEach((link: any) => {
            const url = extractLinkUrl(link)
            if (url && !links.includes(url)) links.push(url)
        })
    }

    // Links array from snapshot
    if (snapshot.links && Array.isArray(snapshot.links)) {
        snapshot.links.forEach((link: any) => {
            const url = extractLinkUrl(link)
            if (url && !links.includes(url)) links.push(url)
        })
    }

    // Root-level links array
    if (Array.isArray(ad.links)) {
        ad.links.forEach((link: any) => {
            const url = extractLinkUrl(link)
            if (url && !links.includes(url)) links.push(url)
        })
    }

    // Card links
    if (snapshot.cards && Array.isArray(snapshot.cards)) {
        snapshot.cards.forEach((card: any) => {
            const url = extractLinkUrl(card.link) || extractLinkUrl(card)
            if (url && !links.includes(url)) links.push(url)
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
