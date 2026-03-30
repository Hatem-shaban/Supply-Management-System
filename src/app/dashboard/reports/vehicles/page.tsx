'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

type DriverRow = {
  driver_name: string
  payments: number
  dues: number
  remaining: number
}

export default function VehicleStatementPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => {
    const fetchReport = async () => {
      const [vouchersRes, paymentsRes] = await Promise.all([
        supabase.from('vouchers').select('driver_name, cubic_capacity, discount, mashal_price'),
        supabase.from('payments').select('name, amount').eq('payment_type', 'driver'),
      ])

      const vouchers = vouchersRes.data || []
      const payments = paymentsRes.data || []

      const driverNames = [...new Set(vouchers.map(v => v.driver_name))]

      // Payments per driver
      const paymentMap: Record<string, number> = {}
      payments.forEach(p => {
        paymentMap[p.name] = (paymentMap[p.name] || 0) + (p.amount || 0)
      })

      // Calculate: المستحقات = SUM(mashal_price * (cubic_capacity - discount)) per driver
      const result: DriverRow[] = driverNames.map(name => {
        const driverVouchers = vouchers.filter(v => v.driver_name === name)
        const dues = driverVouchers.reduce((sum, v) => {
          return sum + ((v.mashal_price || 0) * ((v.cubic_capacity || 0) - (v.discount || 0)))
        }, 0)
        const paidAmount = paymentMap[name] || 0

        return {
          driver_name: name,
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
      <h1 className="text-2xl font-bold mb-6">كشف حساب العربيات</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['اسم السائق', 'الدفعات', 'المستحقات', 'المتبقي'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.driver_name} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{row.driver_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.payments.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.dues.toFixed(2)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-medium ${row.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.remaining.toFixed(2)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3">الإجمالي</td>
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
