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

type Contractor = {
  id: number
  driver_name: string
  tractor_number: string
}

const emptyForm = {
  driver_name: '',
  tractor_number: '',
}

export default function TransportContractorsPage() {
  const { role, accessToken } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<Contractor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
        `${SUPABASE_URL}/rest/v1/transport_contractors?select=*&order=driver_name.asc`,
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

  useEffect(() => { fetchData() }, [fetchData])

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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/transport_contractors`, {
        method: 'POST',
        headers: dbHeaders(accessToken),
        body: JSON.stringify({
          driver_name: form.driver_name.trim(),
          tractor_number: form.tractor_number.trim(),
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
      await fetch(`${SUPABASE_URL}/rest/v1/transport_contractors?id=eq.${id}`, {
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
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (role !== 'admin') return null

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مقاولين النقل</h1>
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
                {['اسم السائق', 'رقم الجرار', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">{row.driver_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.tractor_number}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg font-bold">إضافة مقاول نقل</h2>
              <button onClick={() => { setShowModal(false); setSubmitError('') }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم السائق</label>
                <input type="text" value={form.driver_name} onChange={e => updateField('driver_name', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجرار</label>
                <input type="text" value={form.tractor_number} onChange={e => updateField('tractor_number', e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              {submitError && (
                <p className="text-red-500 text-sm">{submitError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                  {submitting ? 'جاري الحفظ...' : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setSubmitError('') }}
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
