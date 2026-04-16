import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useSidebar } from '../../contexts/SidebarContext'
import ModeSwitcher from '../finance/ModeSwitcher'
import {
  HomeIcon, BoxIcon, DropshippingIcon, ChartIcon, OrdersIcon, CustomersIcon,
  PaletteIcon, SettingsIcon, GlobeIcon, TagIcon, CreditCardIcon, PhoneIcon,
  IntegrationsIcon, UserIcon, ChatIcon,
  FinanceDashIcon, InventoryIcon, MovementsIcon, WarehouseIcon, SupplierIcon,
  PurchaseIcon, ProductionIcon, ExpenseIcon, CashFlowIcon, ReportsIcon, AccountIcon,
  ChatNavIcon, CloseIcon,
} from './sharedIcons'

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

interface NavItem {
  name: string
  href: string
  icon: (props: { active?: boolean }) => JSX.Element
}
type NavElement = NavItem | 'separator'

function isFinanceRoute(pathname: string): boolean {
  // Matches /finance, /en/finance, /es/finance, /finance/*, etc.
  return /(^|\/)(finance)(\/|$)/.test(pathname)
}

/**
 * Persistent mobile sidebar shared between Dashboard and Finance modes.
 * Lives at AppShell level so it does NOT unmount when switching modes,
 * giving a seamless transition between Tienda and Finanzas.
 */
export default function SharedMobileSidebar() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { user, firebaseUser, logout } = useAuth()
  const { open, setOpen } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()

  const isAdmin = ADMIN_EMAILS.includes(firebaseUser?.email || '')
  const mode: 'ecommerce' | 'finance' = isFinanceRoute(location.pathname) ? 'finance' : 'ecommerce'

  // Close sidebar on actual navigation within the same mode. If the user switches
  // mode via ModeSwitcher, keep the sidebar open (that's the whole point of this refactor).
  // Also track mode swap direction so the nav content animates in the right direction.
  const prevPathRef = useRef(location.pathname)
  const prevModeRef = useRef(mode)
  const [swapDirection, setSwapDirection] = useState<'left' | 'right' | null>(null)
  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    if (prev === curr) return
    const prevMode: 'ecommerce' | 'finance' = isFinanceRoute(prev) ? 'finance' : 'ecommerce'
    const currMode: 'ecommerce' | 'finance' = isFinanceRoute(curr) ? 'finance' : 'ecommerce'
    prevPathRef.current = curr
    if (prevMode !== currMode) {
      // Going to Finanzas (right tab) = slide in from right; going back to Tienda = from left
      setSwapDirection(currMode === 'finance' ? 'left' : 'right')
      prevModeRef.current = currMode
      return
    }
    setOpen(false)
  }, [location.pathname, setOpen])

  const navigation: NavElement[] = useMemo(() => {
    if (mode === 'finance') {
      const items: NavElement[] = [
        { name: 'Resumen', href: localePath('/finance'), icon: FinanceDashIcon },
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
      ]
      if (isAdmin) items.push({ name: 'Chats', href: localePath('/finance/support-chats'), icon: ChatNavIcon })
      return items
    }
    // Dashboard (ecommerce)
    const items: NavElement[] = [
      { name: t('nav.home'), href: localePath('/dashboard'), icon: HomeIcon },
      { name: t('nav.products'), href: localePath('/dashboard/products'), icon: BoxIcon },
      { name: 'Dropshipping', href: localePath('/dashboard/dropshipping'), icon: DropshippingIcon },
      { name: t('nav.orders'), href: localePath('/dashboard/orders'), icon: OrdersIcon },
      { name: t('nav.customers'), href: localePath('/dashboard/customers'), icon: CustomersIcon },
      { name: t('nav.analytics'), href: localePath('/dashboard/analytics'), icon: ChartIcon },
      'separator',
      { name: t('nav.appearance'), href: localePath('/dashboard/branding'), icon: PaletteIcon },
      { name: t('nav.myBusiness'), href: localePath('/dashboard/settings'), icon: SettingsIcon },
      { name: t('nav.payments'), href: localePath('/dashboard/payments'), icon: CreditCardIcon },
      { name: t('nav.coupons'), href: localePath('/dashboard/coupons'), icon: TagIcon },
      { name: t('nav.domain'), href: localePath('/dashboard/domain'), icon: GlobeIcon },
      { name: t('nav.integrations'), href: localePath('/dashboard/integrations'), icon: IntegrationsIcon },
      { name: t('nav.miApp'), href: localePath('/dashboard/mi-app'), icon: PhoneIcon },
      'separator',
      { name: t('nav.myAccount'), href: localePath('/dashboard/account'), icon: UserIcon },
    ]
    if (isAdmin) items.push({ name: 'Chats', href: localePath('/dashboard/support-chats'), icon: ChatIcon })
    return items
  }, [mode, t, localePath, isAdmin])

  const isItemActive = (href: string) => {
    const rootDash = localePath('/dashboard')
    const rootFin = localePath('/finance')
    if (href === rootDash) return location.pathname === rootDash
    if (href === rootFin) return location.pathname === rootFin
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const handleLogout = async () => {
    await logout()
    navigate(localePath('/login'))
  }

  const rootPath = mode === 'finance' ? localePath('/finance') : localePath('/dashboard')

  if (!user) return null

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-[280px] bg-white border-r border-gray-200/60 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="bg-white" style={{ height: 'env(safe-area-inset-top)' }} />
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3 relative">
            <div className="flex items-center justify-center gap-2">
              <Link to={rootPath}>
                <img src="/newlogo.png" alt="Shopifree" className="h-8" />
              </Link>
              {isAdmin && (
                <Link to={localePath('/admin')} className="p-1 rounded-md text-gray-300 hover:text-violet-500 transition-colors" title="Admin">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </Link>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors absolute right-4 top-4"
              >
                <CloseIcon />
              </button>
            </div>
            {/* ModeSwitcher — when clicked, navigates but sidebar stays mounted */}
            <ModeSwitcher mode={mode} isAdmin={isAdmin} />
          </div>

          {/* Navigation — animated when mode swaps */}
          <nav
            key={mode}
            className={`flex-1 px-2 py-3 space-y-px overflow-y-auto ${
              swapDirection === 'left' ? 'animate-[modeSwapLeft_220ms_ease-out]' :
              swapDirection === 'right' ? 'animate-[modeSwapRight_220ms_ease-out]' : ''
            }`}
          >
            {navigation.map((item, index) => {
              if (item === 'separator') return <div key={`sep-${index}`} className="my-1.5" />
              const active = isItemActive(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2.5 px-3 py-[5px] rounded-md text-[13px] transition-colors relative ${
                    active
                      ? 'bg-gray-900/[0.04] text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-900/[0.02] font-normal'
                  }`}
                >
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-gray-900 rounded-r-full" />}
                  <item.icon active={active} />
                  <span className="flex-1">{item.name}</span>
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
        </div>
      </aside>
    </>
  )
}
