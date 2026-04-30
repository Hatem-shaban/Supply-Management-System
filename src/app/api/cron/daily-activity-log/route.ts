import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_CONFIG_MISSING')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function formatDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function subtractCalendarDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function isValidDateString(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false

  const date = new Date(`${dateString}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateString
}

function getTargetDate(req: NextRequest) {
  const requestedDate = req.nextUrl.searchParams.get('date')
  if (requestedDate) {
    if (!isValidDateString(requestedDate)) {
      return { error: 'INVALID_DATE_FORMAT' }
    }

    return { date: requestedDate }
  }

  const cairoToday = formatDateInTimeZone(new Date(), 'Africa/Cairo')
  return { date: subtractCalendarDays(cairoToday, 1) }
}

function verifyCronRequest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return { error: 'CRON_SECRET_MISSING', status: 500 }

  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${cronSecret}`) {
    return { error: 'Unauthorized', status: 401 }
  }

  return null
}

export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  const target = getTargetDate(req)
  if (target.error || !target.date) {
    return NextResponse.json({ error: target.error }, { status: 400 })
  }

  try {
    const { data, error } = await getServiceClient().rpc('log_daily_voucher_activity', {
      target_date: target.date,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      activityLog: data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
