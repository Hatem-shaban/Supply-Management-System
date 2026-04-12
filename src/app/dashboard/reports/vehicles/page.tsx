'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import ReportActions from '@/components/ReportActions'

type DriverRow = {
  driver_name: string
  payments: number
  dues: number
  remaining: number
}

export default function VehicleStatementPage() {
  const { role } = useAuth()
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState('')

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

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const filteredRows = selectedDriver ? rows.filter(r => r.driver_name === selectedDriver) : rows

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">كشف حساب العربيات</h1>
        <ReportActions contentRef={reportRef} filename="vehicle-statement" />
      </div>

      <div ref={reportRef}>
      <div className="mb-4">
        <select
          value={selectedDriver}
          onChange={e => setSelectedDriver(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="rtl"
        >
          <option value="">كل السائقين</option>
          {rows.map(r => (
            <option key={r.driver_name} value={r.driver_name}>{r.driver_name}</option>
          ))}
        </select>
      </div>

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
              {filteredRows.map(row => (
                <tr key={row.driver_name} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{row.driver_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.payments.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.dues.toFixed(2)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-medium ${row.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.remaining.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
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
    </div>
  )
}
