import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getAdminClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function verifyAdmin(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return null

  const adminClient = getAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

// GET /api/admin/users - list all users
export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SERVICE_ROLE_KEY_MISSING' }, { status: 500 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = getAdminClient()
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profiles } = await adminClient.from('user_profiles').select('id, role, full_name')
  const profileMap = (profiles || []).reduce<Record<string, { role: string; full_name: string }>>(
    (acc, p) => ({ ...acc, [p.id]: p }),
    {}
  )

  const result = users.map(u => ({
    id: u.id,
    username: (u.email || '').replace('@supplysystem.com', ''),
    full_name: profileMap[u.id]?.full_name || '',
    role: profileMap[u.id]?.role || 'user',
    created_at: u.created_at,
  }))

  return NextResponse.json(result)
}

// POST /api/admin/users - create a new user
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SERVICE_ROLE_KEY_MISSING' }, { status: 500 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username, password, full_name, role } = await req.json()

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
  }

  const clean = username.trim().toLowerCase()
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return NextResponse.json({ error: 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط' }, { status: 400 })
  }

  const email = `${clean}@supplysystem.com`
  const adminClient = getAdminClient()

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: full_name || username },
    email_confirm: true,
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  await adminClient.from('user_profiles').upsert({
    id: newUser.user.id,
    role: role || 'user',
    full_name: full_name || username,
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users - delete a user
export async function DELETE(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SERVICE_ROLE_KEY_MISSING' }, { status: 500 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  if (userId === admin.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 })
  }

  const adminClient = getAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
