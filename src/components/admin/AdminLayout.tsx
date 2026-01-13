import { useEffect, useState, useMemo } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@shopifree.app'

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
    if (!loading && (!firebaseUser || firebaseUser.email !== ADMIN_EMAIL)) {
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8]"></div>
      </div>
    )
  }

  if (!firebaseUser || firebaseUser.email !== ADMIN_EMAIL) {
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
                  ? 'bg-[#38bdf8] text-[#0f172a] shadow-md shadow-[#38bdf8]/20'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
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
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">
              ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">Panel de administracion</p>
          <Link
            to={localePath('/dashboard')}
            className="block w-full text-center text-xs font-semibold py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-500 transition-all"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-md shadow-red-500/20">
            <span className="text-sm font-semibold text-white">
              {firebaseUser.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {firebaseUser.email}
            </p>
            <p className="text-xs text-red-400 font-medium">Super Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700"
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
    <div className="min-h-screen bg-[#0f172a]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#1e293b] border-b border-slate-700 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
        >
          <MenuIcon />
        </button>
        <div className="flex items-center gap-2">
          <img src="/newlogo.png" alt="Shopifree" className="h-7 brightness-0 invert" />
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">
            Admin
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-[#1e293b] border-r border-slate-700 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <img src="/newlogo.png" alt="Shopifree" className="h-7 brightness-0 invert" />
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">
                Admin
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            >
              <CloseIcon />
            </button>
          </div>

          <SidebarContent />
        </div>
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-[#1e293b] border-r border-slate-700">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <img src="/newlogo.png" alt="Shopifree" className="h-8 brightness-0 invert" />
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">
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
  )
}
