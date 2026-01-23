import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import fs from 'fs';
import path from 'path';

// Feature flags file path - stored in a JSON file for simplicity
const FEATURE_FLAGS_PATH = path.join(process.cwd(), 'config', 'feature-flags.json');

// Default feature flags
const DEFAULT_FLAGS: Record<string, boolean> = {
    page_discovery: false
};

// Ensure config directory and file exist
function ensureConfigExists() {
    const configDir = path.join(process.cwd(), 'config');

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(FEATURE_FLAGS_PATH)) {
        fs.writeFileSync(FEATURE_FLAGS_PATH, JSON.stringify(DEFAULT_FLAGS, null, 2));
    }
}

// Read feature flags from file
function readFeatureFlags(): Record<string, boolean> {
    try {
        ensureConfigExists();
        const content = fs.readFileSync(FEATURE_FLAGS_PATH, 'utf-8');
        return { ...DEFAULT_FLAGS, ...JSON.parse(content) };
    } catch (error) {
        console.error('Error reading feature flags:', error);
        return DEFAULT_FLAGS;
    }
}

// Write feature flags to file
function writeFeatureFlags(flags: Record<string, boolean>) {
    try {
        ensureConfigExists();
        fs.writeFileSync(FEATURE_FLAGS_PATH, JSON.stringify(flags, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing feature flags:', error);
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

        const flags = readFeatureFlags();
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

        // Update the flags
        const flags = readFeatureFlags();
        flags[featureId] = enabled;

        if (!writeFeatureFlags(flags)) {
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
