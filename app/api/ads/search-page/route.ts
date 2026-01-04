import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        // Authenticate User
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { pageNameOrUrl, count = 100 } = body;

        console.log(`Received page search request for: "${pageNameOrUrl}", count: ${count}`);

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

        // Construct the URL
        let targetUrl = pageNameOrUrl.trim();
        if (!targetUrl.startsWith('http')) {
            // Assume it's a page name/handle, e.g. "ZapierApp" -> "https://www.facebook.com/ZapierApp"
            targetUrl = `https://www.facebook.com/${targetUrl}`;
        }

        // Input for the actor XtaWFhbtfxyzqrFmd (Facebook Ads Scraper)
        // Fetch 5x to allow for quality sorting
        const fetchLimit = Number(count) * 5;
        const runInput = {
            "urls": [
                {
                    "url": targetUrl
                }
            ],
            "count": fetchLimit,
            "scrapePageAds.activeStatus": "all",
            "scrapePageAds.countryCode": "ALL"
        };

        console.log('Starting Apify Actor run with input:', JSON.stringify(runInput));

        const run = await client.actor('XtaWFhbtfxyzqrFmd').call(runInput, {
            waitSecs: 120, // Wait up to 2 mins for completion
        });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            console.error('Apify run failed:', run);
            return NextResponse.json(
                { error: 'Scraper run failed or was aborted' },
                { status: 502 }
            );
        }

        console.log('Apify run finished, fetching results from dataset:', run.defaultDatasetId);

        // Fetch results with pagination if needed, but client.dataset().listItems() fetches all by default (paginated internally)
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // --- Quality Sorting & Ranking Logic ---
        const rankedItems = items.sort((a, b) => {
            // 1. Active Status Priority
            if (a.is_active && !b.is_active) return -1;
            if (!a.is_active && b.is_active) return 1;

            // 2. Duration Priority
            const dateA = a.startDate || a.start_date ? new Date((a.startDate || a.start_date) as string).getTime() : Date.now();
            const dateB = b.startDate || b.start_date ? new Date((b.startDate || b.start_date) as string).getTime() : Date.now();

            return dateA - dateB; // Ascending sort: Oldest date comes first
        });

        // --- Deduplication Ranking ---
        const seenSignatures = new Set();
        const uniqueAds: any[] = [];
        const duplicateAds: any[] = [];

        for (const item of rankedItems) {
            const snap = (item.snapshot || {}) as any;
            const title = item.adCreativeLinkTitle || snap.title || snap.link_description || '';
            const body = item.adCreativeBody || snap.body?.text || snap.message || '';
            const link = item.adCreativeLinkUrl || snap.link_url || '';

            const signature = `${title}|${body}|${link}`.toLowerCase();

            if (seenSignatures.has(signature)) {
                duplicateAds.push(item);
            } else {
                seenSignatures.add(signature);
                uniqueAds.push(item);
            }
        }

        const finalRanked = [...uniqueAds, ...duplicateAds];

        // --- Post-Processing Validation ---
        const validatedAds: any[] = [];
        for (const ad of finalRanked) {
            const snapshot = ad.snapshot || {};

            // Check Link
            const linkUrl = snapshot.link_url || ad.adCreativeLinkUrl || snapshot.call_to_action?.value?.link;
            if (!linkUrl) continue;

            // Check Image
            const hasImage = !!ad.imageUrl ||
                (snapshot.images && snapshot.images.length > 0) ||
                (snapshot.cards && snapshot.cards.length > 0 && snapshot.cards[0].original_image_url) ||
                (snapshot.videos && snapshot.videos.length > 0 && snapshot.videos[0].video_preview_image_url);
            if (!hasImage) continue;

            // Check Text
            const title = ad.adCreativeLinkTitle || snapshot.title || snapshot.link_description || snapshot.cards?.[0]?.title;
            const body = ad.adCreativeBody || snapshot.body?.text || snapshot.message || snapshot.caption || ad.description;
            if (!title && !body) continue;

            validatedAds.push(ad);
        }

        const topAds = validatedAds.slice(0, Number(count));

        return NextResponse.json(topAds);

    } catch (error: any) {
        console.error('Apify Page Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
