import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { checkRateLimit, getRateLimitIdentifier } from '@/utils/rateLimit'
import { validateCSRFToken, setCSRFTokenCookie } from '@/utils/csrf'
import { validatePassword, validateEmail } from '@/utils/passwordValidation'

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
async function isAdmin(userId: string): Promise<boolean> {
    const supabase = await createServerClient()
    
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    if (error || !profile) return false
    return profile.role === 'admin'
}

// Helper to get admin user ID for rate limiting - supports both cookies and Bearer token
async function getAdminUserId(request: Request): Promise<string | null> {
    const supabase = await createServerClient()
    
    // Check for Authorization header first (works in iframe where cookies are blocked)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
            return data.user.id;
        }
    }
    
    // Fall back to cookie-based auth
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
}

export async function DELETE(request: Request) {
    try {
        // Verify admin user exists and is authenticated
        const adminId = await getAdminUserId(request)
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify CSRF token
        const isValidCSRF = await validateCSRFToken(request)
        if (!isValidCSRF) {
            return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 })
        }

        // Verify admin role
        if (!await isAdmin(adminId)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Rate limiting for admin operations
        const rateLimitId = getRateLimitIdentifier(adminId, request)
        const rateLimit = await checkRateLimit(rateLimitId, 'admin')
        if (!rateLimit.success) {
            return rateLimit.error
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Prevent self-deletion
        if (userId === adminId) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
        }

        const supabaseAdmin = getAdminClient()
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete user error:', error)
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        // Verify admin user exists and is authenticated
        const adminId = await getAdminUserId(request)
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify CSRF token
        const isValidCSRF = await validateCSRFToken(request)
        if (!isValidCSRF) {
            return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 })
        }

        // Verify admin role
        if (!await isAdmin(adminId)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Rate limiting for admin operations
        const rateLimitId = getRateLimitIdentifier(adminId, request)
        const rateLimit = await checkRateLimit(rateLimitId, 'admin')
        if (!rateLimit.success) {
            return rateLimit.error
        }

        const body = await request.json()
        const { id, full_name, gender, role } = body

        if (!id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Prevent privilege escalation: non-admin users can't change role
        const targetUserRole = role || 'user'
        if (targetUserRole === 'admin' && !await isAdmin(id)) {
            // Only admins can promote users to admin
            if (!await isAdmin(adminId)) {
                return NextResponse.json({ error: 'Insufficient permissions to grant admin role' }, { status: 403 })
            }
        }

        const supabaseAdmin = getAdminClient()
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ full_name, gender, role: targetUserRole })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Update user error:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        // Verify admin user exists and is authenticated
        const adminId = await getAdminUserId(request)
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify CSRF token
        const isValidCSRF = await validateCSRFToken(request)
        if (!isValidCSRF) {
            return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 })
        }

        // Verify admin role
        if (!await isAdmin(adminId)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Rate limiting for admin operations
        const rateLimitId = getRateLimitIdentifier(adminId, request)
        const rateLimit = await checkRateLimit(rateLimitId, 'admin')
        if (!rateLimit.success) {
            return rateLimit.error
        }

        const body = await request.json()
        const { email, password, full_name, gender, role } = body

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 })
        }

        // Validate email format
        if (!validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Validate password strength
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                { error: 'Password does not meet requirements', details: passwordValidation.errors },
                { status: 400 }
            )
        }

        const supabaseAdmin = getAdminClient()

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

        return NextResponse.json({ success: true, user: { id: authData.user.id, email: authData.user.email } })
    } catch (error: any) {
        console.error('Create user error:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}
