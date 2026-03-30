'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function FinalStatementPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [openingBalance, setOpeningBalance] = useState('')
  const [liquidity, setLiquidity] = useState('')
  const [totalPayments, setTotalPayments] = useState(0)
  const [companyDues, setCompanyDues] = useState(0)

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => {
    const fetchData = async () => {
      const [expensesRes, driverPayRes, quarryPayRes, companyPayRes, vouchersRes, cubicRes] = await Promise.all([
        supabase.from('expenses').select('value'),
        supabase.from('payments').select('amount').eq('payment_type', 'driver'),
        supabase.from('payments').select('amount').eq('payment_type', 'quarry'),
        supabase.from('payments').select('name, amount').eq('payment_type', 'company'),
        supabase.from('vouchers').select('company_name, cubic_capacity, discount'),
        supabase.from('cubic_records').select('company_name, company_price'),
      ])

      const totalExpenses = (expensesRes.data || []).reduce((s, e) => s + (e.value || 0), 0)
      const totalDriverPay = (driverPayRes.data || []).reduce((s, p) => s + (p.amount || 0), 0)
      const totalQuarryPay = (quarryPayRes.data || []).reduce((s, p) => s + (p.amount || 0), 0)

      // مدفوعات = مصروفات + دفعات السائقين + دفعات المحاجر
      setTotalPayments(totalExpenses + totalDriverPay + totalQuarryPay)

      // Calculate company remaining (المتبقى من كشف حساب الشركات)
      const vouchers = vouchersRes.data || []
      const cubicRecords = cubicRes.data || []
      const companyPayments = companyPayRes.data || []

      // Company prices
      const priceMap: Record<string, number> = {}
      cubicRecords.forEach(cr => {
        priceMap[cr.company_name] = cr.company_price || 0
      })

      // Company payment totals
      const compPayMap: Record<string, number> = {}
      companyPayments.forEach(p => {
        compPayMap[p.name] = (compPayMap[p.name] || 0) + (p.amount || 0)
      })

      // Sum of المتبقي for all companies
      const companyNames = [...new Set(vouchers.map(v => v.company_name))]
      let totalCompanyRemaining = 0
      companyNames.forEach(name => {
        const compVouchers = vouchers.filter(v => v.company_name === name)
        const totalCubic = compVouchers.reduce((s, v) => s + (v.cubic_capacity || 0), 0)
        const totalDiscount = compVouchers.reduce((s, v) => s + (v.discount || 0), 0)
        const price = priceMap[name] || 0
        const dues = price * (totalCubic - totalDiscount)
        const paid = compPayMap[name] || 0
        totalCompanyRemaining += (dues - paid)
      })

      setCompanyDues(totalCompanyRemaining)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (role !== 'admin') return null

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const opening = parseFloat(openingBalance) || 0
  const liq = parseFloat(liquidity) || 0
  // نهائي = حساب افتتاحي + سيوله - (مستحقات - مدفوعات)
  // مستحقات here = المتبقي from company statement (what companies still owe)
  const finalBalance = opening + liq - (companyDues - totalPayments)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">كشف حساب ختامي</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="space-y-5">
          {/* User inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حساب افتتاحي</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سيولة</label>
              <input
                type="number"
                step="0.01"
                value={liquidity}
                onChange={e => setLiquidity(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Calculated values */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">مدفوعات</span>
              <span className="text-gray-600 font-medium">{totalPayments.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 px-4 -mt-2">
              مصروفات + إجمالي سجل دفوعات السائقين + إجمالي سجل دفوعات المحاجر
            </p>

            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">مستحقات</span>
              <span className="text-gray-600 font-medium">{companyDues.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 px-4 -mt-2">
              المتبقى من كشف حساب الشركات
            </p>

            <div className="flex items-center justify-between py-4 px-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="font-bold text-blue-800 text-lg">نهائي</span>
              <span className={`font-bold text-lg ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {finalBalance.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-400 px-4 -mt-2">
              حساب افتتاحي + سيولة - (مستحقات - مدفوعات)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
