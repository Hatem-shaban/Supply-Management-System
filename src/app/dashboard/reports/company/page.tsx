'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

type CompanyRow = {
  company_name: string
  payments: number
  dues: number
  remaining: number
  trip_count: number
  quantity: number
}

export default function CompanyStatementPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => {
    const fetchReport = async () => {
      const [vouchersRes, paymentsRes, cubicRes] = await Promise.all([
        supabase.from('vouchers').select('company_name, cubic_capacity, discount'),
        supabase.from('payments').select('name, amount').eq('payment_type', 'company'),
        supabase.from('cubic_records').select('company_name, company_price'),
      ])

      const vouchers = vouchersRes.data || []
      const payments = paymentsRes.data || []
      const cubicRecords = cubicRes.data || []

      // Get unique company names from vouchers
      const companyNames = [...new Set(vouchers.map(v => v.company_name))]

      // Build company price map from cubic records (latest price per company)
      const priceMap: Record<string, number> = {}
      cubicRecords.forEach(cr => {
        priceMap[cr.company_name] = cr.company_price || 0
      })

      // Calculate payments per company
      const paymentMap: Record<string, number> = {}
      payments.forEach(p => {
        paymentMap[p.name] = (paymentMap[p.name] || 0) + (p.amount || 0)
      })

      const result: CompanyRow[] = companyNames.map(name => {
        const companyVouchers = vouchers.filter(v => v.company_name === name)
        const totalCubic = companyVouchers.reduce((sum, v) => sum + (v.cubic_capacity || 0), 0)
        const totalDiscount = companyVouchers.reduce((sum, v) => sum + (v.discount || 0), 0)
        const companyPrice = priceMap[name] || 0
        const dues = companyPrice * (totalCubic - totalDiscount)
        const paidAmount = paymentMap[name] || 0

        return {
          company_name: name,
          payments: paidAmount,
          dues,
          remaining: dues - paidAmount,
          trip_count: companyVouchers.length,
          quantity: totalCubic,
        }
      })

      setRows(result)
      setLoading(false)
    }

    fetchReport()
  }, [])

  if (role !== 'admin') return null

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">كشف حساب شركات</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['اسم الشركة', 'الدفعات', 'مستحقات', 'المتبقي', 'عدد النقلات', 'الكمية'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.company_name} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{row.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.payments.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.dues.toFixed(2)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-medium ${row.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.remaining.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.trip_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.quantity.toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.payments, 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.dues, 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.remaining, 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.trip_count, 0)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.quantity, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
