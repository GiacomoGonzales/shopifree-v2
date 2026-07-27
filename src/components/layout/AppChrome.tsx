/**
 * AppChrome
 * ==========================================================================
 * El marco de las dos secciones del panel: cabecera movil, menu lateral de
 * escritorio, barra superior y contenedor del contenido.
 *
 * Existia por triplicado — DashboardLayout, FinanceLayout y SharedMobileSidebar
 * repetian el mismo markup con las mismas clases. Cuando se rediseño "Tienda",
 * "Gestion" se quedo con el estilo viejo: distinto color del item activo, otra
 * tipografia, otros bordes. Con un solo componente eso no puede volver a pasar.
 *
 * Cada layout aporta lo suyo por props: su navegacion, a donde apunta el logo,
 * y los trozos variables de las barras (chapa de plan, boton de soporte).
 */
import { type JSX, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useSidebar } from '../../contexts/SidebarContext'
import ModeSwitcher from '../finance/ModeSwitcher'
import type { Store } from '../../types'

export interface NavItem {
  name: string
  href: string
  icon: (props: { active?: boolean }) => JSX.Element
  badge?: number
}

export type NavElement = NavItem | 'separator'

/** Tres barras con CSS, sin SVG. */
function MenuIcon() {
  return (
    <span className="flex flex-col justify-between" style={{ width: 18, height: 12 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ height: 2, borderRadius: 1, background: 'currentColor' }} />
      ))}
    </span>
  )
}

/** Chapa del plan, sin degradados. */
export function PlanBadge({ plan }: { plan?: string }) {
  const estilo =
    plan === 'free' || !plan
      ? 'bg-[#F1F5F9] text-[#8898AA]'
      : plan === 'pro'
        ? 'bg-[#E0F2FE] text-[#0284C7]'
        : 'bg-[#FEF3C7] text-[#B45309]'
  return (
    <span className={`px-2 py-0.5 rounded-full text-[0.62rem] font-semibold capitalize ${estilo}`}>
      {plan || 'free'}
    </span>
  )
}

/** Iniciales del usuario cuando no hay foto. */
export function Avatar({
  avatar,
  nombre,
  email,
  redondo = true,
}: {
  avatar?: string
  nombre?: string
  email?: string
  redondo?: boolean
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={nombre || email || ''}
        className={`w-7 h-7 object-cover ${redondo ? 'rounded-full' : 'rounded-lg'}`}
      />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#E1E8EF' }}>
      <span className="text-[0.68rem] font-semibold text-[#425466]">
        {(nombre?.[0] || email?.[0] || '?').toUpperCase()}
      </span>
    </div>
  )
}

/** Enlace a la tienda publica. */
function storeUrl(store: Store) {
  return store.customDomain ? `https://${store.customDomain}` : `https://${store.subdomain}.shopifree.app`
}

export interface AppChromeProps {
  mode: 'ecommerce' | 'finance'
  navigation: NavElement[]
  isItemActive: (href: string) => boolean
  /** A donde lleva el logo. */
  homeHref: string
  /** Ficha del usuario en la cabecera movil. */
  accountHref: string
  isAdmin: boolean
  adminHref: string
  store?: Store | null
  user: { avatar?: string; firstName?: string; lastName?: string; email?: string }
  onLogout: () => void
  logoutLabel: string
  /** Contador que se pinta sobre un item concreto (chats de admin). */
  badgeFor?: (item: NavItem) => number | undefined
  /** Izquierda de la barra superior de escritorio. */
  topBarLeft?: ReactNode
  /** Junto al dominio, a la derecha. */
  topBarRight?: ReactNode
  /** Acciones extra en la cabecera movil (soporte). */
  mobileActions?: ReactNode
  /** Se pinta arriba del contenido (avisos de plan, alertas de configuracion). */
  beforeContent?: ReactNode
  /** El contenido de la ruta. */
  children: ReactNode
  /** Modales y botones flotantes que viven fuera del flujo. */
  overlays?: ReactNode
}

export default function AppChrome({
  mode,
  navigation,
  isItemActive,
  homeHref,
  accountHref,
  isAdmin,
  adminHref,
  store,
  user,
  onLogout,
  logoutLabel,
  badgeFor,
  topBarLeft,
  topBarRight,
  mobileActions,
  beforeContent,
  children,
  overlays,
}: AppChromeProps) {
  const { setOpen: setSidebarOpen } = useSidebar()
  const isNative = Capacitor.isNativePlatform()

  const menu = (
    <>
      <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
        {navigation.map((item, index) => {
          if (item === 'separator') return <div key={`sep-${index}`} className="my-1.5" />
          const activo = isItemActive(item.href)
          const contador = badgeFor?.(item) ?? item.badge ?? 0
          return (
            <Link
              key={item.name}
              to={item.href}
              // Activo en azul, igual que el mockup de dashboard de la landing.
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[0.82rem] transition-colors relative ${
                activo
                  ? 'bg-[#E0F2FE] text-[#0284C7] font-semibold'
                  : 'text-[#425466] hover:text-[#1e3a5f] hover:bg-[#F6F9FC] font-medium'
              }`}
            >
              {activo && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                  style={{ background: '#0284C7' }}
                />
              )}
              <item.icon active={activo} />
              <span className="flex-1">{item.name}</span>
              {contador > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 text-[0.62rem] font-semibold rounded-full flex items-center justify-center ${
                    activo ? 'bg-[#0284C7] text-white' : 'bg-[#DC2626] text-white'
                  }`}
                >
                  {contador > 9 ? '9+' : contador}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pt-3 pb-5 border-t border-[#EEF2F6]">
        <div className="flex items-center gap-2.5">
          <Avatar avatar={user.avatar} nombre={user.firstName} email={user.email} />
          <div className="flex-1 min-w-0">
            <p className="text-[0.8rem] font-semibold text-[#1e3a5f] truncate">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="text-[0.72rem] font-semibold text-[#A9B6C6] hover:text-[#DC2626] transition-colors px-2 py-1 rounded-lg hover:bg-[#FEF2F2] shrink-0"
          >
            {logoutLabel}
          </button>
        </div>
      </div>
    </>
  )

  return (
    // La tipografia del rediseño se aplica aca y no en `body`: el mismo
    // index.html sirve las tiendas de los clientes, y 33 de los 87 temas no
    // declaran fontFamily — heredarian esta y les cambiaria el aspecto a
    // storefronts en vivo. La landing y el blog ya se la ponen por su cuenta.
    <div
      className="min-h-screen bg-[#fafbfc]"
      style={{ fontFamily: "'Plus Jakarta Sans', Inter, system-ui, -apple-system, sans-serif" }}
    >
      {/* Cabecera movil */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
        <div className="bg-white" style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="h-12 bg-white flex items-center justify-between px-4 border-b border-[#EEF2F6]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-[#425466] hover:text-[#1e3a5f] hover:bg-[#F6F9FC] rounded-lg transition-colors"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-1.5">
            <Link to={homeHref}>
              <img src="/newlogo.png" alt="Shopifree" className="h-[26px]" />
            </Link>
            {store && <PlanBadge plan={store.plan} />}
          </div>
          <div className="flex items-center gap-1.5">
            {store && (
              <a
                href={storeUrl(store)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[0.95rem] leading-none text-[#425466] hover:text-[#0284C7] hover:bg-[#F6F9FC] transition-colors"
                title={store.customDomain || `${store.subdomain}.shopifree.app`}
              >
                &#8599;
              </a>
            )}
            {mobileActions}
            <Link to={accountHref} className="w-8 h-8 flex items-center justify-center">
              <Avatar avatar={user.avatar} nombre={user.firstName} email={user.email} redondo={false} />
            </Link>
          </div>
        </div>
      </div>

      {/* El menu lateral movil lo monta AppShell, para que sobreviva al cambio de modo */}

      {/* Menu lateral de escritorio */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-white border-r border-[#EEF2F6]">
        <div className="flex flex-col h-full">
          <div className="px-4 pt-5 pb-3 border-b border-[#EEF2F6] space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Link to={homeHref}>
                <img src="/newlogo.png" alt="Shopifree" className="h-10" />
              </Link>
              {isAdmin && (
                <Link
                  to={adminHref}
                  className="px-1.5 py-0.5 rounded-md text-[0.6rem] font-bold tracking-wide transition-colors"
                  style={{ background: '#F1F5F9', color: '#A9B6C6' }}
                  title="Admin"
                >
                  ADM
                </Link>
              )}
            </div>
            <ModeSwitcher mode={mode} isAdmin={isAdmin} />
          </div>
          {menu}
        </div>
      </aside>

      {/* Contenido */}
      <main
        className="lg:pl-60 lg:!pt-0"
        style={{ paddingTop: isNative ? 'calc(3rem + env(safe-area-inset-top))' : '3rem' }}
      >
        {store && (
          <div className="hidden lg:flex items-center justify-between px-8 py-2.5 border-b border-[#EEF2F6] bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">{topBarLeft}</div>
            <div className="flex items-center gap-1">
              <a
                href={storeUrl(store)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[0.74rem] font-medium text-[#8898AA] hover:text-[#0284C7] hover:bg-[#F6F9FC] rounded-lg transition-colors"
              >
                {store.customDomain || `${store.subdomain}.shopifree.app`}
                <span className="text-[0.85rem] leading-none">&#8599;</span>
              </a>
              {topBarRight}
            </div>
          </div>
        )}
        <div className="p-4 sm:p-6 lg:pt-5 lg:pb-8 lg:px-8">
          {beforeContent}
          {children}
        </div>
      </main>

      {overlays}
    </div>
  )
}
