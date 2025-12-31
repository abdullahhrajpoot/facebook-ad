import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

// Helper to get Service Role client safely
function getAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
    )
}

// Helper to verify if current user is Admin
async function isAdmin() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return profile?.role === 'admin'
}

export async function DELETE(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = getAdminClient()
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        // Return JSON error even if config is missing
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = getAdminClient()
        const body = await request.json()
        const { id, full_name, gender, role } = body

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ full_name, gender, role })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!await isAdmin()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = getAdminClient()
        const body = await request.json()
        const { email, password, full_name, gender, role } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 })
        }

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Failed to create user')

        // 2. Update/Upsert Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                full_name,
                gender,
                role: role || 'user'
            })

        if (profileError) throw profileError

        return NextResponse.json({ success: true, user: authData.user })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
