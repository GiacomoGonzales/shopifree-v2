import { useEffect, useState, useMemo, type JSX } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { usePresence } from '../../hooks/usePresence'
import { useSidebar } from '../../contexts/SidebarContext'
import ChatModal from '../chat/ChatModal'
import PlanBanner from './PlanBanner'
import ModeSwitcher from '../finance/ModeSwitcher'
import { chatService } from '../../lib/chatService'

// Tipos para la navegacion
interface NavItem {
  name: string
  href: string
  icon: (props: { active?: boolean }) => JSX.Element
}

type NavElement = NavItem | 'separator'

// Iconos - accept active prop for tab bar styling
function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BoxIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function DropshippingIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ChartIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function OrdersIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function CustomersIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function PaletteIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
}

function SettingsIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function GlobeIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function TagIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function CreditCardIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function PhoneIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function IntegrationsIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  )
}

function UserIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function ChatIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
      {!active && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 10h.01M12 10h.01M15 10h.01" />}
    </svg>
  )
}

function MoreIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

export default function DashboardLayout() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { user, firebaseUser, store, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Mobile sidebar state is now shared through AppShell's SidebarProvider
  const { setOpen: setSidebarOpen } = useSidebar()

  const isNative = Capacitor.isNativePlatform()

  // Track presence for any user with a store
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser?.email || '')
  usePresence(store?.id)
  const [totalUnread, setTotalUnread] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)

  // Subscribe to total unread chat count for admin
  useEffect(() => {
    if (!isAdmin) return
    const unsub = chatService.subscribeToTotalUnread(setTotalUnread)
    return () => unsub()
  }, [isAdmin])

  // Subscribe to user's own chat unread count
  useEffect(() => {
    if (!store || !firebaseUser || isAdmin) return
    const unsub = chatService.subscribeToUnreadCount(store.id, firebaseUser.uid, setChatUnread)
    return () => unsub()
  }, [store, firebaseUser, isAdmin])

  // Mark as read when opening chat
  useEffect(() => {
    if (chatOpen && chatUnread > 0 && store) {
      chatService.markAsRead(store.id, 'user')
    }
  }, [chatOpen, chatUnread, store])

  // Dynamic navigation with translations - flat structure with separators
  const navigation: NavElement[] = useMemo(() => {
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
    if (isAdmin) {
      items.push({ name: 'Chats', href: localePath('/dashboard/support-chats'), icon: ChatIcon })
    }
    return items
  }, [t, localePath, isAdmin])

  // Bottom tab bar items (first 4 primary + "More")
  const tabBarItems = useMemo(() => {
    const items = [
      { name: t('nav.home'), href: localePath('/dashboard'), icon: HomeIcon },
      { name: t('nav.products'), href: localePath('/dashboard/products'), icon: BoxIcon },
      { name: t('nav.orders'), href: localePath('/dashboard/orders'), icon: OrdersIcon },
    ]
    if (isAdmin) {
      items.push({ name: 'Chats', href: localePath('/dashboard/support-chats'), icon: ChatIcon })
    } else {
      items.push({ name: t('nav.analytics'), href: localePath('/dashboard/analytics'), icon: ChartIcon })
    }
    return items
  }, [t, localePath, isAdmin])

  // "More" sheet items - everything not in the tab bar
  const moreItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { name: t('nav.customers'), href: localePath('/dashboard/customers'), icon: CustomersIcon },
    ]
    if (isAdmin) {
      items.push({ name: t('nav.analytics'), href: localePath('/dashboard/analytics'), icon: ChartIcon })
    }
    items.push(
      { name: t('nav.appearance'), href: localePath('/dashboard/branding'), icon: PaletteIcon },
      { name: t('nav.myBusiness'), href: localePath('/dashboard/settings'), icon: SettingsIcon },
      { name: t('nav.payments'), href: localePath('/dashboard/payments'), icon: CreditCardIcon },
      { name: t('nav.coupons'), href: localePath('/dashboard/coupons'), icon: TagIcon },
      { name: t('nav.domain'), href: localePath('/dashboard/domain'), icon: GlobeIcon },
      { name: t('nav.integrations'), href: localePath('/dashboard/integrations'), icon: IntegrationsIcon },
      { name: t('nav.miApp'), href: localePath('/dashboard/mi-app'), icon: PhoneIcon },
    )
    if (isAdmin) {
      items.push({ name: 'Chats', href: localePath('/dashboard/support-chats'), icon: ChatIcon })
    }
    return items
  }, [t, localePath, isAdmin])

  // Check if current route is in "More" section
  const isMoreActive = useMemo(() => {
    const morePath = localePath('/dashboard/more')
    if (location.pathname === morePath || location.pathname.startsWith(morePath + '/')) return true
    return moreItems.some(item => {
      if (item.href === localePath('/dashboard')) return false
      return location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    })
  }, [moreItems, location.pathname, localePath])

  // Set dark status bar text for dashboard (white/light background)
  useEffect(() => {
    if (isNative) {
      const applyStatusBar = () => {
        import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          StatusBar.setStyle({ style: Style.Light })
          StatusBar.setOverlaysWebView({ overlay: false })
          StatusBar.setBackgroundColor({ color: '#ffffff' })
        })
      }
      applyStatusBar()
      // Re-apply on orientation change to fix safe area after rotation
      window.addEventListener('resize', applyStatusBar)
      return () => window.removeEventListener('resize', applyStatusBar)
    }
  }, [isNative])

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
      <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
        {navigation.map((item, index) => {
          // Render separator
          if (item === 'separator') {
            return <div key={`separator-${index}`} className="my-1.5" />
          }

          const isActive = isItemActive(item.href)
          const isChatItem = item.href.includes('support-chats')
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
              <item.icon />
              <span className="flex-1">{item.name}</span>
              {isChatItem && totalUnread > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full flex items-center justify-center ${
                  isActive ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
                }`}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.firstName || user.email}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-[11px] font-medium text-gray-600">
                {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-700 truncate">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.email
              }
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
  // NATIVE APP LAYOUT (bottom tab bar)
  // ==========================================
  if (isNative) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        {/* Native header - compact bar (safe area handled by overlay:false) */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200/60">
          <div className="h-11 flex items-center justify-between px-4">
            {!isAdmin && (
              <button onClick={() => setChatOpen(true)} className="relative w-8 h-8 flex items-center justify-center">
                <img src="/chat-support.png" alt="Soporte" className="w-7 h-7 object-contain" />
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </button>
            )}
            {isAdmin && <div className="w-8" />}
            <div className="flex flex-col items-center gap-0.5">
              <img src="/newlogo.png" alt="Shopifree" className="h-5" />
              <Link
                to={localePath('/dashboard/plan')}
                className={`flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[9px] font-semibold transition-all ${
                  store?.plan === 'business'
                    ? 'bg-purple-50 text-purple-600'
                    : store?.plan === 'pro'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {store?.plan === 'business' ? (
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ) : store?.plan === 'pro' ? (
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                )}
                {store?.plan === 'business' ? t('plan.business') : store?.plan === 'pro' ? t('plan.pro') : t('plan.free')}
              </Link>
            </div>
            <Link to={localePath('/dashboard/account')} className="w-8 h-8 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.firstName || user.email} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 bg-[#1e3a5f] rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {user.firstName ? user.firstName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                  </span>
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Main content - only this area scrolls */}
        <main className="flex-1 overflow-y-auto overscroll-none bg-[#fafbfc]">
          <div className="px-4 py-3">
            {store && <PlanBanner store={store} />}
            <Outlet />
          </div>
        </main>

        {/* Chat modal */}
        {!isAdmin && <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />}

        {/* Bottom tab bar - part of flex flow */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-t border-black/[0.08]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-stretch justify-around h-[52px]">
            {tabBarItems.map((item) => {
              const isActive = isItemActive(item.href)
              const isChatTab = item.href.includes('support-chats')
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                    isActive ? 'text-[#007AFF]' : 'text-[#8e8e93]'
                  }`}
                >
                  <item.icon active={isActive} />
                  <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.name}
                  </span>
                  {isChatTab && totalUnread > 0 && (
                    <span className="absolute top-0 right-1/4 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </Link>
              )
            })}
            {/* More tab */}
            <Link
              to={localePath('/dashboard/more')}
              className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                isMoreActive ? 'text-[#007AFF]' : 'text-[#8e8e93]'
              }`}
            >
              <MoreIcon active={isMoreActive} />
              <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
                {t('nav.home') === 'Home' ? 'More' : 'Mas'}
              </span>
              {isAdmin && totalUnread > 0 && (
                <span className="absolute top-0 right-1/4 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // WEB LAYOUT (hamburger menu + sidebar)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Mobile header - status bar area + header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
        {/* Status bar background - matches header seamlessly */}
        <div className="bg-white" style={{ height: 'env(safe-area-inset-top)' }} />
        {/* Header bar */}
        <div className="h-12 bg-white flex items-center justify-between px-4 border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <MenuIcon />
          </button>
          <Link to={localePath('/dashboard')}>
            <img src="/newlogo.png" alt="Shopifree" className="h-5" />
          </Link>
          <div className="flex items-center gap-1.5">
            {!isAdmin && (
              <button onClick={() => setChatOpen(true)} className="relative w-8 h-8 flex items-center justify-center">
                <img src="/chat-support.png" alt="Soporte" className="w-6 h-6 object-contain" />
                {chatUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </button>
            )}
            <Link to={localePath('/dashboard/account')} className="w-8 h-8 flex items-center justify-center">
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
      </div>

      {/* Mobile sidebar is rendered by AppShell so it persists across mode switches */}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100">
        <div className="flex flex-col h-full">
          {/* Logo + Mode Switcher */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Link to={localePath('/dashboard')}>
                <img src="/newlogo.png" alt="Shopifree" className="h-10" />
              </Link>
              {isAdmin && (
                <Link
                  to={localePath('/admin')}
                  className="p-1 rounded-md text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                  title="Admin"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </Link>
              )}
            </div>
            <ModeSwitcher mode="ecommerce" isAdmin={isAdmin} />
          </div>

          <SidebarContent />
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-60 lg:!pt-0" style={{ paddingTop: isNative ? 'calc(3rem + env(safe-area-inset-top))' : '3rem' }}>
        {/* Desktop top bar */}
        {store && (
          <div className="hidden lg:flex items-center justify-between px-8 py-2.5 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Link
                to={localePath('/dashboard/plan')}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                  store.plan === 'business' ? 'bg-amber-50 text-amber-600' :
                  store.plan === 'pro' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-50 text-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  store.plan === 'business' ? 'bg-amber-500' :
                  store.plan === 'pro' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />
                {store.plan === 'business' ? 'Business' : store.plan === 'pro' ? 'Pro' : 'Free'}
              </Link>
            </div>
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
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {chatUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
        <div className="p-4 sm:p-6 lg:pt-5 lg:pb-8 lg:px-8">
          {store && <PlanBanner store={store} />}
          <Outlet />
        </div>
      </main>

      {/* Floating chat button - desktop */}
      {!isAdmin && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="hidden lg:flex fixed bottom-6 right-6 z-50 w-12 h-12 rounded-xl bg-white shadow-md hover:shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95 border border-gray-200/60"
        >
          <img src="/chat-support.png" alt="Soporte" className="w-7 h-7 object-contain" />
          {chatUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
              {chatUnread > 9 ? '9+' : chatUnread}
            </span>
          )}
        </button>
      )}

      {/* Chat modal for web layout (hidden for admin) */}
      {!isAdmin && <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />}
    </div>
  )
}
