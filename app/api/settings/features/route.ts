import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Default feature flags
const DEFAULT_FLAGS: Record<string, boolean> = {
    page_discovery: false
};

// Read feature flags from Supabase
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
            data.forEach(row => {
                flags[row.feature_id] = row.enabled;
            });
        }
        return flags;
    } catch (error) {
        console.error('Error reading feature flags:', error);
        return DEFAULT_FLAGS;
    }
}

// Write feature flags to Supabase
async function writeFeatureFlags(featureId: string, enabled: boolean): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('feature_flags')
            .upsert(
                { feature_id: featureId, enabled, updated_at: new Date().toISOString() },
                { onConflict: 'feature_id' }
            );
        
        if (error) {
            console.error('Error writing feature flag to database:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error writing feature flag:', error);
        return false;
    }
}

// GET - Fetch current feature flags
export async function GET() {
    try {
        // Verify admin access
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

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

// POST - Update a feature flag
export async function POST(request: Request) {
    try {
        // Verify admin access
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { featureId, enabled } = body;

        if (!featureId || typeof enabled !== 'boolean') {
            return NextResponse.json(
                { error: 'Invalid request body. Required: featureId (string), enabled (boolean)' },
                { status: 400 }
            );
        }

        // Update the flag
        if (!await writeFeatureFlags(featureId, enabled)) {
            return NextResponse.json(
                { error: 'Failed to save feature flag' },
                { status: 500 }
            );
        }

        console.log(`Feature flag '${featureId}' set to ${enabled} by user ${user.id}`);

        return NextResponse.json({
            success: true,
            featureId,
            enabled
        });

    } catch (error: any) {
        console.error('Error updating feature flag:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
