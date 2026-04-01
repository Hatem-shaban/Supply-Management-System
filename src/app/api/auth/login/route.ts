import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const secret = process.env.AUTH_SECRET

  if (!serviceKey || !secret) {
    return NextResponse.json({ error: 'الخادم غير مكتمل الإعداد' }, { status: 500 })
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: user, error } = await client
    .from('user_profiles')
    .select('id, username, password_hash, full_name, role')
    .eq('username', username.trim().toLowerCase())
    .single()

  // Use constant-time comparison to prevent user-enumeration timing attacks
  const dummyHash = '$2a$12$invaliddummyhashtopreventtimingattacks000000000000000000'
  const hashToCheck = user?.password_hash ?? dummyHash
  const passwordValid = await bcrypt.compare(password, hashToCheck)

  if (error || !user || !passwordValid) {
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name ?? '', role: user.role },
    secret,
    { expiresIn: '7d' }
  )

  return NextResponse.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name ?? '', role: user.role },
  })
}
