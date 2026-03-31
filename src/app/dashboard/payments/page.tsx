'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

type Payment = {
  id: number
  payment_type: string
  name: string
  date: string
  amount: number
}

const tabs = [
  { key: 'driver', label: 'السائقين', nameLabel: 'اسم السائق' },
  { key: 'company', label: 'الشركات', nameLabel: 'اسم الشركة' },
  { key: 'quarry', label: 'المحاجر', nameLabel: 'اسم المحجر' },
]

export default function PaymentsPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('driver')
  const [data, setData] = useState<Payment[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], amount: '' })

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  const handleSessionError = () => {
    setLoading(false)
    setError('انتهت جلستك - يرجى تسجيل الدخول مجددًا')
    setTimeout(() => router.push('/'), 2000)
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data: payments, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_type', activeTab)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('401')) {
          handleSessionError()
          return
        }
        setError('فشل تحميل البيانات')
      } else if (payments) {
        setData(payments)
      }
    } catch (err) {
      console.error('Fetch exception:', err)
      setError('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [activeTab, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('payments').insert({
        payment_type: activeTab,
        name: form.name,
        date: form.date,
        amount: parseFloat(form.amount) || 0,
      })
      if (error) {
        console.error('Insert error:', error)
        if (error.code === 'PGRST116' || error.message?.includes('401')) {
          handleSessionError()
          return
        }
        setError('فشل إضافة الدفعة')
      } else {
        setShowModal(false)
        setForm({ name: '', date: new Date().toISOString().split('T')[0], amount: '' })
        fetchData()
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError('فشل حفظ البيانات')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) {
        console.error('Delete error:', error)
        if (error.code === 'PGRST116' || error.message?.includes('401')) {
          handleSessionError()
          return
        }
        setError('فشل حذف الدفعة')
      } else {
        fetchData()
      }
    } catch (err) {
      console.error('Delete exception:', err)
      setError('فشل حذف الدفعة')
    }
  }

  const currentTab = tabs.find(t => t.key === activeTab)!

  if (role !== 'admin') return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">سجل الدفعات</h1>
        <button onClick={() => { setShowModal(true); setError('') }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          + إضافة
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setError('') }}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{currentTab.nameLabel}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap">{row.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.amount}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">إضافة دفعة - {currentTab.label}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{currentTab.nameLabel}</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium">إضافة</button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
