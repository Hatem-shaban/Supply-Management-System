'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const { role } = useAuth()
  const [stats, setStats] = useState({ vouchers: 0, companies: 0, drivers: 0, quarries: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const [v, c, d, q] = await Promise.all([
        supabase.from('vouchers').select('id', { count: 'exact', head: true }),
        supabase.from('cubic_records').select('company_name'),
        supabase.from('vouchers').select('driver_name'),
        supabase.from('quarry_pricing').select('quarry_name'),
      ])

      const uniqueCompanies = new Set((c.data || []).map(r => r.company_name)).size
      const uniqueDrivers = new Set((d.data || []).map(r => r.driver_name)).size
      const uniqueQuarries = new Set((q.data || []).map(r => r.quarry_name)).size

      setStats({
        vouchers: v.count || 0,
        companies: uniqueCompanies,
        drivers: uniqueDrivers,
        quarries: uniqueQuarries,
      })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'إجمالي البونات', value: stats.vouchers, color: 'bg-blue-500' },
    { label: 'الشركات', value: stats.companies, color: 'bg-emerald-500' },
    { label: 'السائقين', value: stats.drivers, color: 'bg-amber-500' },
    { label: 'المحاجر', value: stats.quarries, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">لوحة التحكم</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-white text-lg font-bold">{card.value}</span>
            </div>
            <p className="text-gray-500 text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-lg font-medium">مرحباً بك في نظام إدارة التوريدات</p>
        <p className="text-gray-500 mt-1 text-sm">
          نوع الحساب: <span className="font-medium text-gray-700">{role === 'admin' ? 'مدير النظام' : 'مستخدم'}</span>
        </p>
      </div>
    </div>
  )
}
