'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

type QuarryPrice = {
  id: number
  quarry_name: string
  material: string
  price: number
}

const emptyForm = { quarry_name: '', material: '', price: '' }

export default function QuarryPricingPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<QuarryPrice[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('quarry_pricing')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setData(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('quarry_pricing').insert({
      quarry_name: form.quarry_name,
      material: form.material,
      price: parseFloat(form.price) || 0,
    })
    if (!error) {
      setShowModal(false)
      setForm(emptyForm)
      fetchData()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    await supabase.from('quarry_pricing').delete().eq('id', id)
    fetchData()
  }

  if (role !== 'admin') return null

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">تسعيرة المحاجر</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          + إضافة
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['اسم المحجر', 'الخامه', 'السعر', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">{row.quarry_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.material}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.price}</td>
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">إضافة تسعيرة محجر</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المحجر</label>
                <input type="text" value={form.quarry_name} onChange={e => setForm({ ...form, quarry_name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الخامه</label>
                <input type="text" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
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
