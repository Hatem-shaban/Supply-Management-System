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
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], amount: '' })
  const [driverOptions, setDriverOptions] = useState<string[]>([])
  const [companyOptions, setCompanyOptions] = useState<string[]>([])
  const [quarryOptions, setQuarryOptions] = useState<string[]>([])

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

  useEffect(() => {
    const fetchOptions = async () => {
      const [drivers, companies, quarries] = await Promise.all([
        supabase.from('transport_contractors').select('driver_name').order('driver_name'),
        supabase.from('cubic_records').select('company_name').order('company_name'),
        supabase.from('quarry_pricing').select('quarry_name').order('quarry_name'),
      ])
      if (drivers.data) setDriverOptions([...new Set(drivers.data.map((d: { driver_name: string }) => d.driver_name?.trim()).filter(Boolean))])
      if (companies.data) setCompanyOptions([...new Set(companies.data.map((c: { company_name: string }) => c.company_name?.trim()).filter(Boolean))])
      if (quarries.data) setQuarryOptions([...new Set(quarries.data.map((q: { quarry_name: string }) => q.quarry_name?.trim()).filter(Boolean))])
    }
    fetchOptions()
  }, [])

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

  const handleDelete = async () => {
    if (deleteId === null) return
    const id = deleteId
    setDeleteId(null)
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
                      <button onClick={() => setDeleteId(row.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
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

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">تأكيد الحذف</h3>
                <p className="text-sm text-gray-500 mt-0.5">هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

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
                <select
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  required
                >
                  <option value="">-- اختر --</option>
                  {(activeTab === 'driver' ? driverOptions : activeTab === 'company' ? companyOptions : quarryOptions).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
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
