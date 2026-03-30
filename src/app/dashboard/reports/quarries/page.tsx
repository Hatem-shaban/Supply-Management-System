'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

type QuarryRow = {
  quarry_name: string
  trip_count: number
  quantity: number
  payments: number
  dues: number
  remaining: number
}

export default function QuarryStatementPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<QuarryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => {
    const fetchReport = async () => {
      const [vouchersRes, paymentsRes, pricingRes] = await Promise.all([
        supabase.from('vouchers').select('quarry_name, cubic_capacity, discount, material'),
        supabase.from('payments').select('name, amount').eq('payment_type', 'quarry'),
        supabase.from('quarry_pricing').select('quarry_name, material, price'),
      ])

      const vouchers = vouchersRes.data || []
      const payments = paymentsRes.data || []
      const pricing = pricingRes.data || []

      const quarryNames = [...new Set(vouchers.map(v => v.quarry_name).filter(Boolean))]

      // Build price lookup: quarry_name + material -> price
      const priceMap: Record<string, number> = {}
      pricing.forEach(p => {
        priceMap[`${p.quarry_name}|${p.material}`] = p.price || 0
      })

      // Payments per quarry
      const paymentMap: Record<string, number> = {}
      payments.forEach(p => {
        paymentMap[p.name] = (paymentMap[p.name] || 0) + (p.amount || 0)
      })

      const result: QuarryRow[] = quarryNames.map(name => {
        const quarryVouchers = vouchers.filter(v => v.quarry_name === name)
        const totalCubic = quarryVouchers.reduce((sum, v) => sum + (v.cubic_capacity || 0), 0)
        const totalDiscount = quarryVouchers.reduce((sum, v) => sum + (v.discount || 0), 0)

        // Calculate dues: for each voucher, (cubic - discount) * material price from quarry_pricing
        const dues = quarryVouchers.reduce((sum, v) => {
          const materialPrice = priceMap[`${name}|${v.material}`] || 0
          return sum + ((v.cubic_capacity || 0) - (v.discount || 0)) * materialPrice
        }, 0)

        const paidAmount = paymentMap[name] || 0

        return {
          quarry_name: name,
          trip_count: quarryVouchers.length,
          quantity: totalCubic,
          payments: paidAmount,
          dues,
          remaining: dues - paidAmount,
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
      <h1 className="text-2xl font-bold mb-6">كشف حساب المحاجر</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['اسم المحجر', 'عدد النقلات', 'الكمية', 'الدفعات', 'المستحقات', 'المتبقي'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.quarry_name} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{row.quarry_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.trip_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.quantity.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.payments.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.dues.toFixed(2)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-medium ${row.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.remaining.toFixed(2)}
                  </td>
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
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.trip_count, 0)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.quantity, 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.payments, 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.dues, 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{rows.reduce((s, r) => s + r.remaining, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
