'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Voucher = {
  id: number
  date: string
  company_name: string
  tractor_number: string
  driver_name: string
  cubic_capacity: number
  voucher_number: string
  location: string
  material: string
  discount: number
  quarry_name: string
  mashal_price: number
}

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  company_name: '',
  tractor_number: '',
  driver_name: '',
  cubic_capacity: '',
  voucher_number: '',
  location: '',
  material: '',
  discount: '0',
  quarry_name: '',
  mashal_price: '',
}

export default function VouchersPage() {
  const { role } = useAuth()
  const [data, setData] = useState<Voucher[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [companies, setCompanies] = useState<string[]>([])
  const [vehicles, setVehicles] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setData(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Fetch unique companies and vehicles for autocomplete
    const fetchLookups = async () => {
      const { data: cr } = await supabase.from('cubic_records').select('company_name, vehicle_number')
      if (cr) {
        setCompanies([...new Set(cr.map(r => r.company_name?.trim()).filter(Boolean))])
        setVehicles([...new Set(cr.map(r => r.vehicle_number?.trim()).filter(Boolean))])
      }
    }
    fetchLookups()
  }, [fetchData])

  // Auto-fill cubic capacity from cubic records
  useEffect(() => {
    const lookup = async () => {
      if (form.company_name && form.tractor_number) {
        const { data } = await supabase
          .from('cubic_records')
          .select('cubic_capacity')
          .eq('company_name', form.company_name)
          .eq('vehicle_number', form.tractor_number)
          .limit(1)
          .maybeSingle()
        if (data) {
          setForm(prev => ({ ...prev, cubic_capacity: String(data.cubic_capacity) }))
        }
      }
    }
    lookup()
  }, [form.company_name, form.tractor_number])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('vouchers').insert({
      date: form.date,
      company_name: form.company_name,
      tractor_number: form.tractor_number,
      driver_name: form.driver_name,
      cubic_capacity: parseFloat(form.cubic_capacity) || 0,
      voucher_number: form.voucher_number,
      location: form.location,
      material: form.material,
      discount: parseFloat(form.discount) || 0,
      quarry_name: form.quarry_name,
      mashal_price: parseFloat(form.mashal_price) || 0,
    })
    if (!error) {
      setShowModal(false)
      setForm(emptyForm)
      fetchData()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    await supabase.from('vouchers').delete().eq('id', id)
    fetchData()
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">بونات</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + إضافة
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['تاريخ', 'اسم الشركة', 'رقم الجرار', 'اسم السائق', 'التكعيب', 'رقم البون', 'الموقع', 'الخامه', 'الخصم', 'اسم المحجر', 'سعر المشال', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.tractor_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.driver_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.cubic_capacity}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.voucher_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.material}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.discount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.quarry_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.mashal_price}</td>
                  <td className="px-4 py-3">
                    {role === 'admin' && (
                      <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg font-bold">إضافة بون جديد</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ</label>
                <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة</label>
                <select value={form.company_name} onChange={e => updateField('company_name', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                  <option value="">اختر الشركة</option>
                  {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم السائق</label>
                <input type="text" value={form.driver_name} onChange={e => updateField('driver_name', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجرار</label>
                <input type="text" value={form.tractor_number} onChange={e => updateField('tractor_number', e.target.value)}
                  list="vehicles" className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                <datalist id="vehicles">
                  {vehicles.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">(الحموله) التكعيب</label>
                <input type="number" step="0.01" value={form.cubic_capacity} onChange={e => updateField('cubic_capacity', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50" placeholder="يتم ملؤه تلقائياً من محضر التكعيب" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم البون</label>
                <input type="text" value={form.voucher_number} onChange={e => updateField('voucher_number', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                <input type="text" value={form.location} onChange={e => updateField('location', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الخامه</label>
                <input type="text" value={form.material} onChange={e => updateField('material', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الخصم</label>
                <input type="number" step="0.01" value={form.discount} onChange={e => updateField('discount', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المحجر</label>
                <input type="text" value={form.quarry_name} onChange={e => updateField('quarry_name', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر المشال</label>
                <input type="number" step="0.01" value={form.mashal_price} onChange={e => updateField('mashal_price', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium">
                  إضافة
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
