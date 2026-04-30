# Supply Management System - إدارة التوريدات

A lightweight, mobile-friendly supply management system with Arabic interface.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS (RTL)
- **Deployment**: Vercel (free tier)

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from Settings > API

### 2. Environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your Supabase credentials.

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Create Admin User
1. Sign up via Supabase Auth (Dashboard > Authentication > Users > Add User)
2. Run this SQL to make the user admin:
```sql
UPDATE user_profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';
```

### 5. Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Add your environment variables in Vercel dashboard.

### 6. Daily Activity Log Cron
The app includes a Vercel cron job at `/api/cron/daily-activity-log`.

1. For an existing project, run `supabase-daily-activity-log-migration.sql` in Supabase SQL Editor. For a fresh project, run the latest `supabase-schema.sql`.
2. Add `CRON_SECRET` in Vercel project environment variables.
3. Vercel runs the job daily from `vercel.json` at `22:05 UTC`. The endpoint logs the previous completed Cairo day and can be manually backfilled with:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://YOUR_DOMAIN/api/cron/daily-activity-log?date=2026-04-28"
```

## User Roles
- **admin**: Full access to all screens and reports
- **user**: Access only to بونات (Vouchers)

## Screens
- **بونات**: Voucher records with auto-fill from cubic records
- **محضر التكعيب شركات**: Company cubic meter records
- **سجل الدفعات**: Payment ledger (drivers, companies, quarries)
- **تسعيرة المحاجر**: Quarry pricing
- **مصروفات**: Expenses

## Reports (Admin only)
- **كشف حساب شركات**: Company account statement
- **كشف حساب العربيات**: Vehicle/driver account statement
- **كشف حساب المحاجر**: Quarry account statement
- **كشف حساب ختامي**: Final/closing account statement
