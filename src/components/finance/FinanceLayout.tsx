/**
 * Layout de la seccion Gestion.
 *
 * Solo define su navegacion: el marco (cabecera, menu lateral, barras) lo pone
 * AppChrome, compartido con la seccion Tienda. Antes este archivo repetia ese
 * markup completo, y por eso al rediseñar Tienda esta seccion se quedo con la
 * tipografia y los colores viejos.
 */
import { useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useShowUpgradeUI } from '../../hooks/useShowUpgradeUI'
import AppChrome, { type NavElement, type NavItem } from '../layout/AppChrome'

function Icon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg
      className={`w-5 h-5 ${active ? 'opacity-100' : 'opacity-70'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? 1.75 : 1.5}
    >
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
const SubscriptionIcon = ({ active }: { active?: boolean }) => <Icon active={active} d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
const ChatNavIcon = ({ active }: { active?: boolean }) => (
  <svg
    className={`w-5 h-5 ${active ? 'opacity-100' : 'opacity-70'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={active ? 1.75 : 1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M12 10h.01M15 10h.01" />
  </svg>
)

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

export default function FinanceLayout() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { user, firebaseUser, store, loading, logout } = useAuth()
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser?.email || '')
  const navigate = useNavigate()
  const location = useLocation()
  const showUpgrade = useShowUpgradeUI()

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
    ...(showUpgrade
      ? [{ name: 'Suscripcion', href: localePath('/finance/subscription'), icon: SubscriptionIcon } as NavItem]
      : []),
    { name: 'Mi cuenta', href: localePath('/finance/account'), icon: AccountIcon },
    ...(isAdmin ? [{ name: 'Chats', href: localePath('/finance/support-chats'), icon: ChatNavIcon }] : []),
  ] as NavElement[], [localePath, isAdmin, showUpgrade])

  useEffect(() => {
    if (!loading && !user) {
      navigate(localePath('/login'))
    }
  }, [user, loading, navigate, localePath])

  const handleLogout = async () => {
    await logout()
    navigate(localePath('/login'))
  }

  const isItemActive = (href: string) => {
    const financePath = localePath('/finance')
    if (href === financePath) return location.pathname === financePath
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <AppChrome
      mode="finance"
      navigation={navigation}
      isItemActive={isItemActive}
      homeHref={localePath('/finance')}
      accountHref={localePath('/finance/account')}
      isAdmin={isAdmin}
      adminHref={localePath('/admin')}
      store={store}
      user={user}
      onLogout={handleLogout}
      logoutLabel={t('nav.logout')}
    >
      <Outlet />
    </AppChrome>
  )
}
