import { useEffect, useState, useMemo } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

// Icons
function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function StoresIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function PlansIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

export default function AdminLayout() {
  const { firebaseUser, loading, logout } = useAuth()
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Dynamic navigation with language prefix
  const navigation = useMemo(() => [
    { name: 'Dashboard', path: localePath('/admin'), icon: DashboardIcon },
    { name: 'Tiendas', path: localePath('/admin/stores'), icon: StoresIcon },
    { name: 'Usuarios', path: localePath('/admin/users'), icon: UsersIcon },
    { name: 'Planes', path: localePath('/admin/plans'), icon: PlansIcon },
  ], [localePath])

  // Check admin access
  useEffect(() => {
    if (!loading && (!firebaseUser || !ADMIN_EMAILS.includes(firebaseUser.email || ''))) {
      navigate(localePath('/'))
    }
  }, [firebaseUser, loading, navigate, localePath])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate(localePath('/login'))
  }

  const adminPath = localePath('/admin')

  const isItemActive = (path: string) => {
    if (path === adminPath) {
      return location.pathname === adminPath
    }
    return location.pathname.startsWith(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (!firebaseUser || !ADMIN_EMAILS.includes(firebaseUser.email || '')) {
    return null
  }

  const SidebarContent = () => (
    <>
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = isItemActive(item.path)
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500/15 to-indigo-500/15 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
              }`}
            >
              <item.icon />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Admin Badge */}
      <div className="px-4 mb-4">
        <div className="bg-white/40 backdrop-blur border border-white/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-full font-semibold">
              ADMIN
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Panel de administracion</p>
          <Link
            to={localePath('/dashboard')}
            className="block w-full text-center text-xs font-semibold py-2 rounded-lg bg-white/60 text-gray-700 hover:bg-white/80 transition-all border border-white/80"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-white/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/20">
            <span className="text-sm font-semibold text-white">
              {firebaseUser.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {firebaseUser.email}
            </p>
            <p className="text-xs text-violet-600 font-medium">Super Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-violet-50"
            title="Cerrar sesion"
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50 relative">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-rose-200 rounded-full blur-3xl opacity-25" />
      </div>

      {/* Content over blobs */}
      <div className="relative z-10">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/60 backdrop-blur-2xl border-b border-white/50 shadow-sm z-40 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2">
            <img src="/newlogo.png" alt="Shopifree" className="h-7" />
            <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-full font-semibold">
              Admin
            </span>
          </div>
          <div className="w-10" />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Mobile */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white/70 backdrop-blur-2xl border-r border-white/50 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo + Close */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-white/50">
              <div className="flex items-center gap-2">
                <img src="/newlogo.png" alt="Shopifree" className="h-7" />
                <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-full font-semibold">
                  Admin
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all"
              >
                <CloseIcon />
              </button>
            </div>

            <SidebarContent />
          </div>
        </aside>

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white/70 backdrop-blur-2xl border-r border-white/50 shadow-xl">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-white/50">
              <div className="flex items-center gap-2">
                <img src="/newlogo.png" alt="Shopifree" className="h-8" />
                <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-full font-semibold">
                  Admin
                </span>
              </div>
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
    </div>
  )
}
