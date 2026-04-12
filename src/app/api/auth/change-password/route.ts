import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword?.trim() || !newPassword?.trim()) {
    return NextResponse.json(
      { error: 'كلمة المرور الحالية والجديدة مطلوبة' },
      { status: 400 }
    )
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' },
      { status: 400 }
    )
  }

  // Get the JWT token from the Authorization header
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const secret = process.env.AUTH_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'الخادم غير مكتمل الإعداد' }, { status: 500 })
  }

  // Verify and decode the token
  let decoded: any
  try {
    decoded = jwt.verify(token, secret)
  } catch {
    return NextResponse.json({ error: 'توكن غير صحيح' }, { status: 401 })
  }

  const userId = decoded.id

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return NextResponse.json({ error: 'الخادم غير مكتمل الإعداد' }, { status: 500 })
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch the user and verify the current password
  const { data: user, error: fetchError } = await client
    .from('user_profiles')
    .select('id, password_hash')
    .eq('id', userId)
    .single()

  if (fetchError || !user) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
  }

  // Verify current password
  const currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)

  if (!currentPasswordValid) {
    return NextResponse.json(
      { error: 'كلمة المرور الحالية غير صحيحة' },
      { status: 401 }
    )
  }

  // Hash the new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12)

  // Update the password
  const { error: updateError } = await client
    .from('user_profiles')
    .update({ password_hash: newPasswordHash })
    .eq('id', userId)

  if (updateError) {
    console.error('Password update error:', updateError)
    return NextResponse.json(
      { error: 'فشل تحديث كلمة المرور' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'تم تحديث كلمة المرور بنجاح',
  })
}
