import { useEffect, useState, useMemo, type JSX } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { usePresence } from '../../hooks/usePresence'
import { useShowUpgradeUI } from '../../hooks/useShowUpgradeUI'
import { useNewOrdersCount } from '../../hooks/useNewOrdersCount'
import { useSidebar } from '../../contexts/SidebarContext'
import ChatModal from '../chat/ChatModal'
import PlanBanner from './PlanBanner'
import ModeSwitcher from '../finance/ModeSwitcher'
import { chatService } from '../../lib/chatService'
import {
  HomeIcon, BoxIcon, DropshippingIcon, ChartIcon, OrdersIcon, CustomersIcon,
  PaletteIcon, SettingsIcon, GlobeIcon, TagIcon, CreditCardIcon, PhoneIcon,
  IntegrationsIcon, UserIcon, ChatIcon,
} from '../layout/sharedIcons'

// Tipos para la navegacion
interface NavItem {
  name: string
  href: string
  icon: (props: { active?: boolean }) => JSX.Element
  badge?: number
}

type NavElement = NavItem | 'separator'


function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
  const showUpgrade = useShowUpgradeUI()

  // Track presence for any user with a store
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser?.email || '')
  usePresence(store?.id)
  const newOrders = useNewOrdersCount(store?.id)
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
      { name: t('nav.orders'), href: localePath('/dashboard/orders'), icon: OrdersIcon, badge: newOrders },
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
  }, [t, localePath, isAdmin, newOrders])

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
              {!isChatItem && item.badge && item.badge > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full flex items-center justify-center ${
                  isActive ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
                }`}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pt-3 pb-5 border-t border-gray-100">
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

  // Native uses the same layout as web mobile (hamburger + lateral sidebar).
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
          <div className="flex items-center gap-1.5">
            <Link to={localePath('/dashboard')}>
              <img src="/newlogo.png" alt="Shopifree" className="h-[26px]" />
            </Link>
            {store && (
              showUpgrade ? (
                <Link
                  to={localePath('/finance/subscription')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                    store.plan === 'free' ? 'bg-gray-100/80 text-gray-600'
                    : store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}
                >
                  {store.plan}
                </Link>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                    store.plan === 'free' ? 'bg-gray-100/80 text-gray-600'
                    : store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}
                >
                  {store.plan}
                </span>
              )
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Open storefront */}
            {store && (
              <a
                href={store.customDomain ? `https://${store.customDomain}` : `https://${store.subdomain}.shopifree.app`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title={store.customDomain || `${store.subdomain}.shopifree.app`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}
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
