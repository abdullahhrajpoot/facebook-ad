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
        const { keywords, location, limit = 10 } = body;

        if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
            return NextResponse.json(
                { error: 'At least one keyword/category is required' },
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

        // Prepare Input
        const categories = Array.isArray(keywords) ? keywords : [keywords];
        const locations = location ? [location] : [];

        const runInput = {
            "categories": categories,
            "locations": locations,
            "resultsLimit": Number(limit)
        };

        console.log(`\n========== PAGE DISCOVERY REQUEST ==========`);
        console.log(`Keywords: "${categories.join(', ')}"`);
        console.log(`Location: "${locations.join(', ')}"`);
        console.log(`Limit: ${limit}`);
        console.log(`============================================\n`);

        // Start Actor Run (Facebook Search Scraper - Us34x9p7VgjCz99H6)
        const run = await client.actor('Us34x9p7VgjCz99H6').call(runInput, {
            waitSecs: 120, // Wait up to 2 mins
        });

        if (!run || run.status === 'FAILED' || run.status === 'ABORTED') {
            console.error('Apify Page Discovery run failed:', run);
            return NextResponse.json(
                { error: 'Page Discovery run failed or was aborted' },
                { status: 502 }
            );
        }

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`\n========== RAW PAGE RESULTS ==========`);
        console.log(`Total items fetched: ${items.length}`);
        console.log(`All Items: 
            ${JSON.stringify(items, null, 2)}`)
        console.log(`======================================\n`);
        console.log(`Sample item: ${JSON.stringify(items[0], null, 2)}`);

        console.log(`======================================\n`);

        return NextResponse.json(items);

    } catch (error: any) {
        console.error('Apify Page Discovery Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
