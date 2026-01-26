import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Default feature flags
const DEFAULT_FLAGS: Record<string, boolean> = {
    page_discovery: false
};

// Read feature flags from Supabase (public endpoint)
async function readFeatureFlags(): Promise<Record<string, boolean>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('*');
        
        if (error) {
            console.error('Error reading feature flags from database:', error);
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

// GET - Fetch current feature flags (public endpoint)
export async function GET() {
    try {
        const flags = await readFeatureFlags();
        return NextResponse.json(flags);
    } catch (error: any) {
        console.error('Error fetching feature flags:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
