'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/lib/api'

type UserRow = {
  id: string
  username: string
  full_name: string
  role: string
  created_at: string
}

const emptyForm = { username: '', full_name: '', password: '', role: 'user' }

export default function UsersPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; username: string } | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [apiError, setApiError] = useState('')
  const [serviceKeyMissing, setServiceKeyMissing] = useState(false)

  useEffect(() => {
    if (role !== 'admin') router.push('/dashboard')
  }, [role, router])

  const handleAuthError = () => {
    setLoading(false)
    router.push('/')
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/admin/users', {}, handleAuthError)
      
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      if (data.error === 'SERVICE_ROLE_KEY_MISSING') {
        setServiceKeyMissing(true)
      } else if (Array.isArray(data)) {
        setUsers(data)
        setServiceKeyMissing(false)
      } else if (data.error) {
        setApiError(data.error)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      if (!(error instanceof Error && error.message === 'SESSION_EXPIRED')) {
        setApiError('فشل تحميل المستخدمين')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    try {
      const res = await fetchWithAuth('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      }, handleAuthError)

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        const data = await res.json()
        setApiError(data.error || 'حدث خطأ')
      } else {
        setShowModal(false)
        setForm(emptyForm)
        fetchUsers()
      }
    } catch (error) {
      console.error('Create user error:', error)
      if (!(error instanceof Error && error.message === 'SESSION_EXPIRED')) {
        setApiError('فشل إنشاء المستخدم')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { id: userId } = deleteTarget
    setDeleteTarget(null)
    try {
      const res = await fetchWithAuth('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      }, handleAuthError)

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        const data = await res.json()
        setApiError(data.error || 'حدث خطأ')
      } else {
        fetchUsers()
      }
    } catch (error) {
      console.error('Delete user error:', error)
      if (!(error instanceof Error && error.message === 'SESSION_EXPIRED')) {
        setApiError('فشل حذف المستخدم')
      }
    }
  }

  if (role !== 'admin') return null

  if (serviceKeyMissing) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">إدارة المستخدمين</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-xl">
          <h2 className="font-bold text-amber-800 mb-3 text-lg">يلزم إعداد إضافي</h2>
          <p className="text-amber-700 text-sm mb-4">
            لإدارة المستخدمين يجب إضافة متغير البيئة{' '}
            <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>
          </p>
          <ol className="text-amber-700 text-sm space-y-2 list-decimal list-inside">
            <li>من لوحة Supabase انتقل إلى <strong>Settings &gt; API</strong></li>
            <li>انسخ قيمة <strong>service_role (secret)</strong></li>
            <li>في Vercel: <strong>Settings &gt; Environment Variables</strong></li>
            <li>أضف متغيراً باسم <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
            <li>أعد النشر من Vercel: <strong>Deployments &gt; Redeploy</strong></li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <button
          onClick={() => { setShowModal(true); setApiError('') }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + إضافة مستخدم
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['اسم المستخدم', 'الاسم الكامل', 'الدور', 'تاريخ الإنشاء', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-blue-700">{user.username}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.full_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget({ id: user.id, username: user.username })}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget !== null && (
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
                <p className="text-sm text-gray-500 mt-0.5">هل أنت متأكد من حذف المستخدم <span className="font-semibold text-gray-700">{deleteTarget.username}</span>؟ لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
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

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">إضافة مستخدم جديد</h2>
              <button onClick={() => { setShowModal(false); setApiError('') }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم (للدخول)</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  placeholder="مثال: basem"
                  dir="ltr"
                  pattern="[a-z0-9_]+"
                  title="أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">أحرف إنجليزية صغيرة وأرقام فقط — هذا ما يكتبه المستخدم عند الدخول</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="الاسم بالعربي (اختياري)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="user">مستخدم — بونات فقط</option>
                  <option value="admin">مدير — وصول كامل</option>
                </select>
              </div>

              {apiError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{apiError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium">
                  إضافة
                </button>
                <button type="button" onClick={() => { setShowModal(false); setApiError('') }}
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
