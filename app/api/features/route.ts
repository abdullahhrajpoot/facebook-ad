import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getFromCache, setInCache, CACHE_TTL } from '@/utils/cache';

// Default feature flags
const DEFAULT_FLAGS: Record<string, boolean> = {
    page_discovery: false
};

const CACHE_KEY = 'feature_flags';

// Read feature flags from Supabase (public endpoint)
async function readFeatureFlags(): Promise<Record<string, boolean>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('*');
        
        if (error) {
            console.error('Error reading feature flag from database:', error);
            return DEFAULT_FLAGS;
        }

        const flags: Record<string, boolean> = { ...DEFAULT_FLAGS };
        if (data) {
            data.forEach((row: any) => {
                flags[row.feature_id] = row.enabled;
            });
        }
        return flags;
    } catch (error) {
        console.error('Error reading feature flags:', error);
        return DEFAULT_FLAGS;
    }
}

// GET - Fetch current feature flags (public endpoint with caching)
export async function GET() {
    try {
        // Check cache first
        const cached = await getFromCache<Record<string, boolean>>(CACHE_KEY);
        if (cached) {
            return NextResponse.json(cached);
        }

        const flags = await readFeatureFlags();
        
        // Cache the result
        await setInCache(CACHE_KEY, flags, CACHE_TTL.FEATURE_FLAGS);
        
        return NextResponse.json(flags);
    } catch (error: any) {
        console.error('Error fetching feature flags:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
