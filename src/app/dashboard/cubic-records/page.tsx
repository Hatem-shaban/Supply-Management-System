'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function dbHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
  }
}

type CubicRecord = {
  id: number
  company_name: string
  vehicle_number: string
  cubic_capacity: number
  location: string
  company_price: number
}

const emptyForm = {
  company_name: '',
  driver_name: '',
  vehicle_number: '',
  cubic_capacity: '',
  location: '',
  company_price: '',
}

export default function CubicRecordsPage() {
  const { role, accessToken } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<CubicRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [contractors, setContractors] = useState<Array<{driver_name: string, tractor_number: string}>>([])  

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  const fetchData = useCallback(async (token?: string) => {
    const authToken = token || accessToken
    if (!authToken) { setLoading(false); return }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/cubic_records?select=*&order=created_at.desc`,
        { headers: dbHeaders(authToken), signal: controller.signal }
      )
      clearTimeout(timer)
      if (res.ok) {
        const rows = await res.json()
        setData(rows)
      } else {
        setData([])
      }
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchData()
    const fetchContractors = async () => {
      if (!accessToken) return
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/transport_contractors?select=driver_name,tractor_number&order=driver_name.asc`,
        { headers: dbHeaders(accessToken) }
      )
      if (res.ok) setContractors(await res.json())
    }
    fetchContractors()
  }, [fetchData, accessToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    if (!accessToken) {
      setSubmitError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.')
      setSubmitting(false)
      return
    }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/cubic_records`, {
        method: 'POST',
        headers: dbHeaders(accessToken),
        body: JSON.stringify({
          company_name: form.company_name,
          vehicle_number: form.vehicle_number,
          cubic_capacity: parseFloat(form.cubic_capacity) || 0,
          location: form.location,
          company_price: parseFloat(form.company_price) || 0,
        }),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) {
        const body = await res.text()
        setSubmitError(`خطأ ${res.status}: ${body}`)
      } else {
        setShowModal(false)
        setForm(emptyForm)
        fetchData()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSubmitError('انتهت مهلة الاتصال. حاول لاحقاً.')
      } else {
        setSubmitError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    if (!accessToken) return
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      await fetch(`${SUPABASE_URL}/rest/v1/cubic_records?id=eq.${id}`, {
        method: 'DELETE',
        headers: dbHeaders(accessToken),
        signal: controller.signal,
      })
      clearTimeout(timer)
      fetchData()
    } catch {
      alert('خطأ في الحذف')
    }
  }

  const updateField = (field: string, value: string) => {
    if (field === 'driver_name') {
      setForm(prev => ({ ...prev, driver_name: value, vehicle_number: '' }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const drivers = [...new Set(contractors.map(c => c.driver_name))]
  const filteredTractors = contractors
    .filter(c => c.driver_name === form.driver_name)
    .map(c => c.tractor_number)

  if (role !== 'admin') return null

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">محضر التكعيب شركات</h1>
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
                {['اسم الشركة', 'رقم العربية', 'تكعيب العربية', 'الموقع', 'سعر الشركة', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">{row.company_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.vehicle_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.cubic_capacity}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.company_price}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg font-bold">إضافة سجل تكعيب</h2>
              <button onClick={() => { setShowModal(false); setSubmitError('') }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة</label>
                <input type="text" value={form.company_name} onChange={e => updateField('company_name', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم السائق</label>
                <select value={form.driver_name} onChange={e => updateField('driver_name', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                  <option value="">اختر السائق</option>
                  {drivers.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم العربية</label>
                <select value={form.vehicle_number} onChange={e => updateField('vehicle_number', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required
                  disabled={!form.driver_name}>
                  <option value="">اختر رقم العربية</option>
                  {filteredTractors.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تكعيب العربية</label>
                <input type="number" step="0.01" value={form.cubic_capacity} onChange={e => updateField('cubic_capacity', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                <input type="text" value={form.location} onChange={e => updateField('location', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشركة</label>
                <input type="number" step="0.01" value={form.company_price} onChange={e => updateField('company_price', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'جاري الإضافة...' : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setSubmitError('') }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
