'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const menuItems = [
  { label: 'الرئيسية', path: '/dashboard', adminOnly: false, icon: '01-dashboard' },
  { label: 'بونات', path: '/dashboard/vouchers', adminOnly: false, icon: '02-vouchers' },
  { label: 'محضر التكعيب شركات', path: '/dashboard/cubic-records', adminOnly: false, icon: '03-cubic-records' },
  { label: 'مقاولين النقل', path: '/dashboard/transport-contractors', adminOnly: false, icon: '12_transport' },
  { label: 'سجل الدفعات', path: '/dashboard/payments', adminOnly: true, icon: '04-payments' },
  { label: 'تسعيرة المحاجر', path: '/dashboard/quarry-pricing', adminOnly: false, icon: '05-pricing' },
  { label: 'مصروفات', path: '/dashboard/expenses', adminOnly: false, icon: '06-expenses' },
  { label: 'إدارة المستخدمين', path: '/dashboard/users', adminOnly: true, icon: '07-users' },
]

const reportItems = [
  { label: 'كشف حساب شركات', path: '/dashboard/reports/company', adminOnly: false, icon: '08-company-statement' },
  { label: 'كشف حساب العربيات', path: '/dashboard/reports/vehicles', adminOnly: false, icon: '09-vehicle-statement' },
  { label: 'كشف حساب المحاجر', path: '/dashboard/reports/quarries', adminOnly: false, icon: '10-quarry-statement' },
  { label: 'كشف حساب ختامي', path: '/dashboard/reports/final', adminOnly: true, icon: '11-final-statement' },
  { label: 'تقرير صافي الربح', path: '/dashboard/reports/profit', adminOnly: true, icon: '11-final-statement' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { role, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const getIconSrc = (iconName: string, isHovered: boolean) => {
    const folder = isHovered ? 'hover' : 'standard'
    return `/icons/${folder}/${iconName}.svg`
  }

  const filteredItems = menuItems.filter(item => !item.adminOnly || role === 'admin')
  const filteredReportItems = reportItems.filter(item => !item.adminOnly || role === 'admin')

  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 right-0 left-0 bg-slate-800 text-white p-4 flex items-center justify-between z-50 shadow-lg">
        <div className="mobile-logo-section flex items-center gap-3">
          <div className="animated-loader-container" style={{ width: '50px', height: '50px' }}>
            <img
              src="/icons/network_core_animated.svg"
              alt="Loading"
              className="animated-loader-icon"
            />
          </div>
          <h1 className="text-base font-bold">إدارة التوريدات</h1>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700 transition"
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-slate-800 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="logo-section hidden lg:flex items-center gap-4 p-5 border-b border-slate-700">
          <div className="animated-loader-container flex-shrink-0" style={{ width: '60px', height: '60px' }}>
            <img
              src="/icons/network_core_animated.svg"
              alt="Loading"
              className="animated-loader-icon"
            />
          </div>
          <h1 className="text-lg font-bold">إدارة التوريدات</h1>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto mt-14 lg:mt-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {filteredItems.map(item => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700/70'
              }`}
            >
              <img
                src={getIconSrc(item.icon, hoveredItem === item.path || isActive(item.path))}
                alt={item.label}
                className="w-6 h-6 flex-shrink-0"
              />
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Reports sub-menu */}
          {filteredReportItems.length > 0 && (
            <div>
              <button
                onClick={() => setReportsOpen(!reportsOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition text-sm ${
                  pathname.startsWith('/dashboard/reports')
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-300 hover:bg-slate-700/70'
                }`}
              >
                <span>تقارير</span>
                <svg
                  className={`w-4 h-4 transform transition-transform ${reportsOpen ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {reportsOpen && (
                <div className="mr-4 mt-1 space-y-1 border-r border-slate-600 pr-3">
                  {filteredReportItems.map(item => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm ${
                        isActive(item.path)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
                      }`}
                    >
                      <img
                        src={getIconSrc(item.icon, hoveredItem === item.path || isActive(item.path))}
                        alt={item.label}
                        className="w-5 h-5 flex-shrink-0"
                      />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Sign out */}
        <div className="absolute bottom-0 right-0 left-0 p-3 border-t border-slate-700">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:bg-red-600/90 hover:text-white rounded-lg transition text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}
