import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Please use POST with { keyword, country, maxResults }' },
        { status: 405 }
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { keyword, country, maxResults = 10 } = body;

        console.log(`Received search request for keyword: "${keyword}", country: ${country}, maxResults: ${maxResults}`);

        if (!keyword) {
            return NextResponse.json(
                { error: 'Keyword is required' },
                { status: 400 }
            );
        }

        const token = process.env.APIFY_API_TOKEN;
        if (!token) {
            return NextResponse.json(
                { error: 'APIFY_API_TOKEN is not configured' },
                { status: 500 }
            );
        }

        const client = new ApifyClient({
            token: token,
        });

        // Input for the actor uMnsf6khYz0VsDGlg (Facebook Ad Library Scraper)
        // Adjusting parameters based on common Apify Facebook Scraper patterns
        const fetchLimit = Number(maxResults) * 2; // Fetch more to allow for deduplication
        const runInput = {
            searchTerms: [keyword],
            q: keyword, // Alias for some actors
            query: keyword, // Alias for others
            countryCode: country || 'US',
            adReachedCountries: [country || 'US'],
            resultsLimit: fetchLimit,
            maxItems: fetchLimit,
            adActiveStatus: 'ALL',
        };

        // Start the actor and search
        const run = await client.actor('uMnsf6khYz0VsDGlg').call(runInput, {
            waitSecs: 60,
        });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            return NextResponse.json(
                { error: 'Scraper run failed or was aborted' },
                { status: 502 }
            );
        }

        // Fetch results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Deduplicate items based on adArchiveID or id
        const uniqueItems = [];
        const seenIds = new Set();

        for (const item of items) {
            // Use adArchiveID if available (standard), otherwise id, otherwise valid item
            // Cast item to any to access dynamic props safely
            const adItem = item as any;
            const id = adItem.adArchiveID || adItem.id || adItem.snapshot?.id;

            if (id) {
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    uniqueItems.push(item);
                }
            } else {
                // If it doesn't have an ID, we assume it's unique enough or keep it to be safe
                uniqueItems.push(item);
            }
        }

        // Enforce the limit strictly from the unique list
        const limitedItems = uniqueItems.slice(0, Number(maxResults));

        // Save to Supabase Search History
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const filters = {
                    country: country || 'US',
                    maxResults: maxResults
                };

                const { error: saveError } = await supabase
                    .from('search_history')
                    .insert({
                        user_id: user.id,
                        keyword: keyword,
                        filters: filters
                    });

                if (saveError) {
                    console.error('Failed to save search history:', saveError);
                    // We don't block the response if saving history fails, but we log it.
                }
            }
        } catch (dbError) {
            console.error('Error connecting to Supabase:', dbError);
        }

        return NextResponse.json(limitedItems);
    } catch (error: any) {
        console.error('Apify Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
