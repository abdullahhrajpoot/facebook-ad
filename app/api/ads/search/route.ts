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
            // Fallback for demo/dev if no token provided (avoids crash but won't search real ads)
            console.error('APIFY_API_TOKEN is not configured');
            return NextResponse.json(
                { error: 'Server configuration error: APIFY_API_TOKEN missing' },
                { status: 500 }
            );
        }

        const client = new ApifyClient({
            token: token,
        });

        // Input for the actor uMnsf6khYz0VsDGlg (Facebook Ad Library Scraper)
        const fetchLimit = Number(maxResults) * 2;
        const runInput = {
            searchTerms: [keyword],
            countryCode: country || 'US',
            adReachedCountries: [country || 'US'],
            resultsLimit: fetchLimit,
            maxItems: fetchLimit,
            adActiveStatus: 'ALL',
        };

        const run = await client.actor('uMnsf6khYz0VsDGlg').call(runInput, {
            waitSecs: 60,
        });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            return NextResponse.json(
                { error: 'Scraper run failed or was aborted' },
                { status: 502 }
            );
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Save to Supabase Search History (Fire and Forget)
        (async () => {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const countryCode = country || 'US';

                    // Check for existing entry
                    const { data: existingHistory } = await supabase
                        .from('search_history')
                        .select('id')
                        .eq('user_id', user.id)
                        .ilike('keyword', keyword.trim())
                        .eq('filters->>country', countryCode)
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
                                keyword: keyword.trim(),
                                filters: { country: countryCode, maxResults }
                            });
                    }
                }
            } catch (dbError) {
                console.error('Error saving history:', dbError);
            }
        })();

        return NextResponse.json(items);
    } catch (error: any) {
        console.error('Apify Scraper Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
