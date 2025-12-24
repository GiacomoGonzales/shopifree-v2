import { useEffect, useState, type JSX } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Tipos para la navegacion
interface NavItem {
  name: string
  href: string
  icon: () => JSX.Element
}

interface NavGroup {
  name: string
  icon: () => JSX.Element
  items: NavItem[]
}

type NavElement = NavItem | NavGroup

function isNavGroup(item: NavElement): item is NavGroup {
  return 'items' in item
}

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

function StoreIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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

// Estructura de navegacion
const navigation: NavElement[] = [
  { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
  { name: 'Productos', href: '/dashboard/products', icon: BoxIcon },
  {
    name: 'Mi Tienda',
    icon: StoreIcon,
    items: [
      { name: 'Diseno', href: '/dashboard/branding', icon: PaletteIcon },
      { name: 'Configuracion', href: '/dashboard/settings', icon: SettingsIcon },
      { name: 'Dominio', href: '/dashboard/domain', icon: GlobeIcon },
      { name: 'Pagos', href: '/dashboard/payments', icon: CreditCardIcon },
    ]
  },
  { name: 'Mi Cuenta', href: '/dashboard/account', icon: UserIcon },
]

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@shopifree.app'

export default function DashboardLayout() {
  const { user, firebaseUser, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<string[]>(['Mi Tienda'])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin = firebaseUser?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Auto-expand group if a child is active
  useEffect(() => {
    navigation.forEach(item => {
      if (isNavGroup(item)) {
        const isChildActive = item.items.some(child =>
          location.pathname === child.href || location.pathname.startsWith(child.href + '/')
        )
        if (isChildActive && !openGroups.includes(item.name)) {
          setOpenGroups(prev => [...prev, item.name])
        }
      }
    })
  }, [location.pathname])

  const toggleGroup = (name: string) => {
    setOpenGroups(prev =>
      prev.includes(name)
        ? prev.filter(g => g !== name)
        : [...prev, name]
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
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
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (isNavGroup(item)) {
            const isOpen = openGroups.includes(item.name)
            const isGroupActive = item.items.some(child => isItemActive(child.href))

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isGroupActive
                      ? 'text-[#1e3a5f] bg-[#f0f7ff]'
                      : 'text-gray-600 hover:bg-[#f0f7ff] hover:text-[#1e3a5f]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon />
                    {item.name}
                  </div>
                  <ChevronIcon open={isOpen} />
                </button>

                {isOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-gray-100 space-y-1">
                    {item.items.map((subItem) => {
                      const isActive = isItemActive(subItem.href)
                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-md shadow-[#1e3a5f]/20'
                              : 'text-gray-600 hover:bg-[#f0f7ff] hover:text-[#1e3a5f]'
                          }`}
                        >
                          <subItem.icon />
                          {subItem.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = isItemActive(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
        <div className="bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[#2d6cb5] uppercase tracking-wide">Plan Gratuito</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">Desbloquea mas funciones</p>
          <Link
            to="/dashboard/plan"
            className="block w-full text-center text-xs font-semibold py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all"
          >
            Ver planes
          </Link>
        </div>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center shadow-md shadow-[#38bdf8]/20">
            <span className="text-sm font-semibold text-white">
              {user.email?.[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.email}
            </p>
            {isAdmin && (
              <Link to="/admin" className="text-xs text-gray-400 hover:text-[#2d6cb5] transition-colors">
                Panel Admin
              </Link>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-[#1e3a5f] transition-colors p-1.5 rounded-lg hover:bg-gray-100"
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
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-all"
        >
          <MenuIcon />
        </button>
        <Link to="/dashboard">
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
            <Link to="/dashboard" className="flex items-center gap-2">
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
            <Link to="/dashboard" className="flex items-center gap-2">
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
