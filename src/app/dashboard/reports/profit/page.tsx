'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import ReportActions from '@/components/ReportActions'

type ProfitRow = {
  id: number
  date: string
  voucher_number: string
  company_name: string
  tractor_number: string
  location: string
  driver_name: string
  company_account: number
  wheel_account: number
  quarry_account: number
  profit: number
}

export default function ProfitReportPage() {
  const { role } = useAuth()
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState<ProfitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => {
    const fetchReport = async () => {
      const [vouchersRes, cubicRes, pricingRes] = await Promise.all([
        supabase
          .from('vouchers')
          .select('id, date, voucher_number, company_name, tractor_number, location, driver_name, cubic_capacity, discount, mashal_price, quarry_name, material')
          .order('date', { ascending: false }),
        supabase
          .from('cubic_records')
          .select('company_name, vehicle_number, location, cubic_capacity, company_price'),
        supabase
          .from('quarry_pricing')
          .select('quarry_name, material, price'),
      ])

      const vouchers = vouchersRes.data || []
      const cubicRecords = cubicRes.data || []
      const pricing = pricingRes.data || []

      // Build cubic records lookup: company_name|vehicle_number|location -> { cubic_capacity, company_price }
      const cubicMap: Record<string, { cubic_capacity: number; company_price: number }> = {}
      cubicRecords.forEach(cr => {
        const key = `${cr.company_name}|${cr.vehicle_number}|${cr.location}`
        cubicMap[key] = {
          cubic_capacity: cr.cubic_capacity || 0,
          company_price: cr.company_price || 0,
        }
        // Also index by company+location only (fallback)
        const keyNoVehicle = `${cr.company_name}||${cr.location}`
        if (!cubicMap[keyNoVehicle]) {
          cubicMap[keyNoVehicle] = {
            cubic_capacity: cr.cubic_capacity || 0,
            company_price: cr.company_price || 0,
          }
        }
      })

      // Build quarry pricing lookup: quarry_name|material -> price
      const quarryPriceMap: Record<string, number> = {}
      pricing.forEach(p => {
        quarryPriceMap[`${p.quarry_name}|${p.material}`] = p.price || 0
      })

      const result: ProfitRow[] = vouchers.map(v => {
        // حساب الشركة = company_price × cubic_capacity (from cubic_records for same company+vehicle+location)
        const cubicKey = `${v.company_name}|${v.tractor_number}|${v.location}`
        const cubicFallbackKey = `${v.company_name}||${v.location}`
        const cubicRecord = cubicMap[cubicKey] || cubicMap[cubicFallbackKey]
        const company_account = cubicRecord
          ? (cubicRecord.company_price || 0) * (cubicRecord.cubic_capacity || 0)
          : 0

        // حساب العجل = mashal_price × (cubic_capacity - discount)
        const net = (v.cubic_capacity || 0) - (v.discount || 0)
        const wheel_account = (v.mashal_price || 0) * net

        // حساب المحجر = quarry_price × (cubic_capacity - discount)
        const quarryPrice = quarryPriceMap[`${v.quarry_name}|${v.material}`] || 0
        const quarry_account = quarryPrice * net

        // الربح = حساب الشركة - حساب العجل - حساب المحجر
        const profit = company_account - wheel_account - quarry_account

        return {
          id: v.id,
          date: v.date,
          voucher_number: v.voucher_number,
          company_name: v.company_name,
          tractor_number: v.tractor_number,
          location: v.location || '',
          driver_name: v.driver_name,
          company_account,
          wheel_account,
          quarry_account,
          profit,
        }
      })

      setRows(result)
      setLoading(false)
    }

    fetchReport()
  }, [])

  if (role !== 'admin') return null

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const companies = [...new Set(rows.map(r => r.company_name))]

  const filtered = rows.filter(r => {
    if (filterCompany && r.company_name !== filterCompany) return false
    if (filterFrom && r.date < filterFrom) return false
    if (filterTo && r.date > filterTo) return false
    return true
  })

  const totalCompanyAccount = filtered.reduce((s, r) => s + r.company_account, 0)
  const totalWheelAccount = filtered.reduce((s, r) => s + r.wheel_account, 0)
  const totalQuarryAccount = filtered.reduce((s, r) => s + r.quarry_account, 0)
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <span />
        <ReportActions contentRef={reportRef} filename="تقرير صافي الربح" />
      </div>

      <div ref={reportRef}>
      <h1 className="text-2xl font-bold mb-6">تقرير صافي الربح</h1>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-end print:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">الشركة</label>
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          >
            <option value="">كل الشركات</option>
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">من تاريخ</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">إلى تاريخ</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {(filterCompany || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterCompany(''); setFilterFrom(''); setFilterTo('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-300 rounded-lg hover:border-red-300 transition"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-500 mb-1">حساب الشركة</p>
          <p className="text-lg font-bold text-blue-700">{totalCompanyAccount.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-xs text-orange-500 mb-1">حساب العجل</p>
          <p className="text-lg font-bold text-orange-700">{totalWheelAccount.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-xs text-purple-500 mb-1">حساب المحجر</p>
          <p className="text-lg font-bold text-purple-700">{totalQuarryAccount.toFixed(2)}</p>
        </div>
        <div className={`${totalProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4 text-center`}>
          <p className={`text-xs mb-1 ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>صافي الربح</p>
          <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{totalProfit.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {[
                  'تاريخ البون',
                  'رقم البون',
                  'اسم الشركة',
                  'رقم الجرار',
                  'الموقع',
                  'اسم السائق',
                  'حساب الشركة',
                  'حساب العجل',
                  'حساب المحجر',
                  'الربح',
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.voucher_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{row.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.tractor_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.driver_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-blue-700">{row.company_account.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-orange-700">{row.wheel_account.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-purple-700">{row.quarry_account.toFixed(2)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="px-4 py-3" colSpan={6}>الإجمالي</td>
                  <td className="px-4 py-3 text-blue-700">{totalCompanyAccount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-orange-700">{totalWheelAccount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-purple-700">{totalQuarryAccount.toFixed(2)}</td>
                  <td className={`px-4 py-3 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalProfit.toFixed(2)}
                  </td>
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
