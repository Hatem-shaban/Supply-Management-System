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
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editRow, setEditRow] = useState<QuarryPrice | null>(null)
  const [updateError, setUpdateError] = useState('')

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

  const handleDelete = async () => {
    if (deleteId === null) return
    const id = deleteId
    setDeleteId(null)
    await supabase.from('quarry_pricing').delete().eq('id', id)
    fetchData()
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    setUpdateError('')
    const { error } = await supabase.from('quarry_pricing').update({
      quarry_name: form.quarry_name,
      material: form.material,
      price: parseFloat(form.price) || 0,
    }).eq('id', editRow.id).select()
    if (error) {
      setUpdateError(error.message)
    } else {
      setEditRow(null)
      setForm(emptyForm)
      fetchData()
    }
  }

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
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => { setEditRow(row); setForm({ quarry_name: row.quarry_name, material: row.material, price: String(row.price) }) }}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        تعديل
                      </button>
                      <button onClick={() => setDeleteId(row.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                    </div>
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

      {/* Edit Modal */}
      {editRow !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">تعديل تسعيرة محجر</h2>
              <button onClick={() => { setEditRow(null); setForm(emptyForm); setUpdateError('') }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المحجر</label>
                <input type="text" value={form.quarry_name} onChange={e => setForm({ ...form, quarry_name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الخامه</label>
                <select value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                  <option value="">اختر الخامه</option>
                  <option value="تربه">تربه</option>
                  <option value="رمال">رمال</option>
                  <option value="رديم">رديم</option>
                  <option value="سن">سن</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              {updateError && (
                <p className="text-red-500 text-sm">{updateError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium">حفظ</button>
                <button type="button" onClick={() => { setEditRow(null); setForm(emptyForm); setUpdateError('') }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <select value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                  <option value="">اختر الخامه</option>
                  <option value="تربه">تربه</option>
                  <option value="رمال">رمال</option>
                  <option value="رديم">رديم</option>
                  <option value="سن">سن</option>
                </select>
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
