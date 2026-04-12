import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin(req: NextRequest) {
  const secret = process.env.AUTH_SECRET
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  try {
    const payload = jwt.verify(token, secret) as { id: string; role: string }
    return payload.role === 'admin' ? payload : null
  } catch {
    return null
  }
}

// GET /api/admin/users - list all users
export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SERVICE_ROLE_KEY_MISSING' }, { status: 500 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getServiceClient()
    .from('user_profiles')
    .select('id, username, full_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
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

  const password_hash = await bcrypt.hash(password, 12)

  const { error } = await getServiceClient()
    .from('user_profiles')
    .insert({ username: clean, password_hash, full_name: full_name || username, role: role || 'user' })

  if (error) {
    const msg = error.code === '23505' ? 'اسم المستخدم مستخدم بالفعل' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/admin/users - update user fields
export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SERVICE_ROLE_KEY_MISSING' }, { status: 500 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, password, full_name, role } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (role !== undefined) updates.role = role
  if (password) {
    updates.password_hash = await bcrypt.hash(password, 12)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 })
  }

  const { error } = await getServiceClient()
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

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

  const { error } = await getServiceClient()
    .from('user_profiles')
    .delete()
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

