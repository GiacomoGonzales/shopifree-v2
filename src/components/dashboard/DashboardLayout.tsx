import { useEffect, useState, useMemo, type JSX } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

// Tipos para la navegacion
interface NavItem {
  name: string
  href: string
  icon: () => JSX.Element
}

type NavElement = NavItem | 'separator'

// Iconos
function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function CustomersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}


function PaletteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function CreditCardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}


function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@shopifree.app'

export default function DashboardLayout() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { user, firebaseUser, store, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Dynamic navigation with translations - flat structure with separators
  const navigation: NavElement[] = useMemo(() => [
    { name: t('nav.home'), href: localePath('/dashboard'), icon: HomeIcon },
    { name: t('nav.products'), href: localePath('/dashboard/products'), icon: BoxIcon },
    { name: t('nav.orders'), href: localePath('/dashboard/orders'), icon: OrdersIcon },
    { name: t('nav.customers'), href: localePath('/dashboard/customers'), icon: CustomersIcon },
    { name: t('nav.analytics'), href: localePath('/dashboard/analytics'), icon: ChartIcon },
    'separator',
    { name: t('nav.appearance'), href: localePath('/dashboard/branding'), icon: PaletteIcon },
    { name: t('nav.myBusiness'), href: localePath('/dashboard/settings'), icon: SettingsIcon },
    { name: t('nav.payments'), href: localePath('/dashboard/payments'), icon: CreditCardIcon },
    { name: t('nav.domain'), href: localePath('/dashboard/domain'), icon: GlobeIcon },
    'separator',
    { name: t('nav.myAccount'), href: localePath('/dashboard/account'), icon: UserIcon },
  ], [t, localePath])

  const isAdmin = firebaseUser?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!loading && !user) {
      navigate(localePath('/login'))
    }
  }, [user, loading, navigate, localePath])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])


  const handleLogout = async () => {
    await logout()
    navigate(localePath('/login'))
  }

  const isItemActive = (href: string) => {
    const dashboardPath = localePath('/dashboard')
    if (href === dashboardPath) {
      return location.pathname === dashboardPath
    }
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const SidebarContent = () => (
    <>
      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item, index) => {
          // Render separator
          if (item === 'separator') {
            return (
              <div key={`separator-${index}`} className="my-2 mx-3 border-t border-gray-100" />
            )
          }

          const isActive = isItemActive(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-md shadow-[#1e3a5f]/20'
                  : 'text-gray-600 hover:bg-[#f0f7ff] hover:text-[#1e3a5f]'
              }`}
            >
              <item.icon />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Plan badge */}
      <div className="px-4 mb-4">
        {store?.plan === 'free' || !store?.plan ? (
          <div className="bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#2d6cb5] uppercase tracking-wide">{t('plan.free')}</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">{t('plan.freeDescription')}</p>
            <Link
              to={localePath('/dashboard/plan')}
              className="block w-full text-center text-xs font-semibold py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all"
            >
              {t('plan.viewPlans')}
            </Link>
          </div>
        ) : store?.plan === 'pro' ? (
          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{t('plan.pro')}</span>
            </div>
            <p className="text-xs text-gray-500">{t('plan.proDescription')}</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">{t('plan.business')}</span>
            </div>
            <p className="text-xs text-gray-500">{t('plan.businessDescription')}</p>
          </div>
        )}
      </div>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.firstName || user.email}
              className="w-9 h-9 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center shadow-md shadow-[#38bdf8]/20">
              <span className="text-sm font-semibold text-white">
                {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.email
              }
            </p>
            {isAdmin ? (
              <Link to={localePath('/admin')} className="text-xs text-gray-400 hover:text-[#2d6cb5] transition-colors">
                Admin
              </Link>
            ) : user.firstName && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-[#1e3a5f] transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            title={t('nav.logout')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-all"
        >
          <MenuIcon />
        </button>
        <Link to={localePath('/dashboard')}>
          <img src="/newlogo.png" alt="Shopifree" className="h-7" />
        </Link>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
            <Link to={localePath('/dashboard')} className="flex items-center gap-2">
              <img src="/newlogo.png" alt="Shopifree" className="h-7" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 text-gray-600 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-all"
            >
              <CloseIcon />
            </button>
          </div>

          <SidebarContent />
        </div>
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 shadow-sm">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-100">
            <Link to={localePath('/dashboard')} className="flex items-center gap-2">
              <img src="/newlogo.png" alt="Shopifree" className="h-8" />
            </Link>
          </div>

          <SidebarContent />
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
