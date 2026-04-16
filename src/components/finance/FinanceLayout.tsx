import { useEffect, useMemo, type JSX } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useSidebar } from '../../contexts/SidebarContext'
import ModeSwitcher from './ModeSwitcher'

interface NavItem {
  name: string
  href: string
  icon: (props: { active?: boolean }) => JSX.Element
}

type NavElement = NavItem | 'separator'

// Icons
function Icon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'opacity-100' : 'opacity-70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const DashboardIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
const InventoryIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
const MovementsIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
const WarehouseIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5M10.5 21H3m1.125-9.75H3.375c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125H4.125Z" />
const SupplierIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
const PurchaseIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
const ProductionIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
const ExpenseIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
const CashFlowIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
const ReportsIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
const AccountIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
function ChatNavIcon({ active }: { active?: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'opacity-100' : 'opacity-70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M12 10h.01M15 10h.01" />
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

export default function FinanceLayout() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { user, firebaseUser, store, loading, logout } = useAuth()
  const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser?.email || '')
  const navigate = useNavigate()
  const location = useLocation()
  // Mobile sidebar state is shared via AppShell's SidebarProvider
  const { setOpen: setSidebarOpen } = useSidebar()
  const isNative = Capacitor.isNativePlatform()

  const navigation: NavElement[] = useMemo(() => [
    { name: 'Resumen', href: localePath('/finance'), icon: DashboardIcon },
    'separator',
    { name: 'Inventario', href: localePath('/finance/inventory'), icon: InventoryIcon },
    { name: 'Movimientos', href: localePath('/finance/stock-movements'), icon: MovementsIcon },
    { name: 'Almacenes', href: localePath('/finance/warehouses'), icon: WarehouseIcon },
    'separator',
    { name: 'Proveedores', href: localePath('/finance/suppliers'), icon: SupplierIcon },
    { name: 'Compras', href: localePath('/finance/purchases'), icon: PurchaseIcon },
    { name: 'Produccion', href: localePath('/finance/production'), icon: ProductionIcon },
    'separator',
    { name: 'Gastos', href: localePath('/finance/expenses'), icon: ExpenseIcon },
    { name: 'Flujo de caja', href: localePath('/finance/cashflow'), icon: CashFlowIcon },
    'separator',
    { name: 'Reportes', href: localePath('/finance/reports'), icon: ReportsIcon },
    'separator',
    { name: 'Mi cuenta', href: localePath('/finance/account'), icon: AccountIcon },
    ...(isAdmin ? [{ name: 'Chats', href: localePath('/finance/support-chats'), icon: ChatNavIcon }] : []),
  ] as NavElement[], [localePath, isAdmin])

  useEffect(() => {
    if (!loading && !user) {
      navigate(localePath('/login'))
    }
  }, [user, loading, navigate, localePath])

  // Finanzas temporarily restricted to admin only
  useEffect(() => {
    if (!loading && user && !isAdmin) {
      navigate(localePath('/dashboard'), { replace: true })
    }
  }, [loading, user, isAdmin, navigate, localePath])

  const handleLogout = async () => {
    await logout()
    navigate(localePath('/login'))
  }

  const isItemActive = (href: string) => {
    const financePath = localePath('/finance')
    if (href === financePath) {
      return location.pathname === financePath
    }
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
      </div>
    )
  }

  if (!user) return null

  const SidebarContent = () => (
    <>
      <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
        {navigation.map((item, index) => {
          if (item === 'separator') {
            return <div key={`sep-${index}`} className="my-1.5" />
          }
          const isActive = isItemActive(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-2.5 px-3 py-[5px] rounded-md text-[13px] transition-colors relative ${
                isActive
                  ? 'bg-gray-900/[0.04] text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-900/[0.02] font-normal'
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-gray-900 rounded-r-full" />}
              <item.icon active={isActive} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          {user.avatar ? (
            <img src={user.avatar} alt={user.firstName || user.email} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-[11px] font-medium text-gray-600">
                {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-700 truncate">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-300 hover:text-gray-500 transition-colors p-1.5 rounded-md hover:bg-gray-100"
            title={t('nav.logout')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )

  // ==========================================
  // NATIVE APP LAYOUT
  // ==========================================
  if (isNative) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <div className="flex-shrink-0 bg-white border-b border-gray-100">
          <div className="h-11 flex items-center justify-end px-4 gap-2">
            <ModeSwitcher mode="finance" isAdmin={isAdmin} />
            <Link to={localePath('/finance')} className="w-8 h-8 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.firstName || user.email} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                  <span className="text-[11px] font-medium text-white">
                    {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                  </span>
                </div>
              )}
            </Link>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overscroll-none bg-[#fafbfc]">
          <div className="px-4 py-3">
            <Outlet />
          </div>
        </main>

        {/* Bottom tab bar */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-t border-black/[0.08]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-stretch justify-around h-[52px]">
            {navigation.filter((item): item is NavItem => item !== 'separator').map(item => {
              const isActive = isItemActive(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                    isActive ? 'text-[#007AFF]' : 'text-[#8e8e93]'
                  }`}
                >
                  <item.icon active={isActive} />
                  <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // WEB LAYOUT
  // ==========================================
  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
        <div className="bg-white" style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="h-12 bg-white flex items-center justify-between px-4 border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <MenuIcon />
          </button>
          <Link to={localePath('/finance')}>
            <img src="/newlogo.png" alt="Shopifree" className="h-5" />
          </Link>
          <Link to={localePath('/finance/account')} className="w-8 h-8 flex items-center justify-center">
            {user.avatar ? (
              <img src={user.avatar} alt={user.firstName || user.email} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-[11px] font-medium text-gray-600">
                  {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile sidebar rendered by AppShell to persist across mode switches */}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100">
        <div className="flex flex-col h-full">
          <div className="px-4 pt-5 pb-3 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Link to={localePath('/finance')}>
                <img src="/newlogo.png" alt="Shopifree" className="h-10" />
              </Link>
              {isAdmin && (
                <Link to={localePath('/admin')} className="p-1 rounded-md text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-colors" title="Admin">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </Link>
              )}
            </div>
            <ModeSwitcher mode="finance" isAdmin={isAdmin} />
          </div>
          <SidebarContent />
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-60 lg:!pt-0" style={{ paddingTop: isNative ? 'calc(3rem + env(safe-area-inset-top))' : '3rem' }}>
        {store && (
          <div className="hidden lg:flex items-center justify-end px-8 py-2.5 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-1">
              <a
                href={store.customDomain ? `https://${store.customDomain}` : `https://${store.subdomain}.shopifree.app`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {store.customDomain || `${store.subdomain}.shopifree.app`}
              </a>
            </div>
          </div>
        )}
        <div className="p-4 sm:p-6 lg:pt-5 lg:pb-8 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
