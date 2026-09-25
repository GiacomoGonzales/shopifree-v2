import { useEffect, useState, useMemo } from 'react'
import { useOrderAlarm } from '../../hooks/useOrderAlarm'
import { useReceptionMode } from '../../hooks/useReceptionMode'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { usePresence } from '../../hooks/usePresence'
import { useNewOrdersCount } from '../../hooks/useNewOrdersCount'
import ChatModal from '../chat/ChatModal'
import PlanBanner from './PlanBanner'
import { getEffectivePlan } from '../../lib/stripe'
import SetupAlerts from './SetupAlerts'
import { chatService } from '../../lib/chatService'
import { useOwnerPushNotifications } from '../../hooks/usePushNotifications'
import { useShopiChatAlerts } from '../../hooks/useShopiChatAlerts'
import { canSeeShopiChat } from '../../lib/shopichatAccess'
import AppChrome, { type NavElement } from '../layout/AppChrome'
import {
  HomeIcon, BoxIcon, DropshippingIcon, ChartIcon, OrdersIcon, CustomersIcon,
  PaletteIcon, SettingsIcon, GlobeIcon, TagIcon, CreditCardIcon, PhoneIcon,
  IntegrationsIcon, UserIcon, ChatIcon, HelpIcon, ShopiChatIcon,
} from '../layout/sharedIcons'

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

export default function DashboardLayout() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { user, firebaseUser, store, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isNative = Capacitor.isNativePlatform()

  // Registra el teléfono del dueño para recibir avisos, y al tocar el aviso
  // abre lo que corresponda: un mensaje de WhatsApp (ShopiChat) abre esa
  // conversación; cualquier otro (pedido nuevo: la Cloud Function notifyNewOrder
  // manda `orderId` y `storeId`) abre la lista de pedidos.
  const openShopiChat = (waId?: string) => {
    navigate(localePath(waId ? `/dashboard/shopichat?c=${encodeURIComponent(waId)}` : '/dashboard/shopichat'))
  }
  useOwnerPushNotifications(firebaseUser?.uid, data => {
    if (data?.type === 'whatsapp-message') {
      const waId = typeof data.waId === 'string' ? data.waId : typeof data.conversationId === 'string' ? data.conversationId : undefined
      openShopiChat(waId)
      return
    }
    navigate(localePath('/dashboard/orders'))
  })

  // ShopiChat (plan Business): contador de conversaciones sin leer, sonido y
  // título de la pestaña mientras el panel está abierto, esté donde esté.
  const shopichatVisible = canSeeShopiChat(firebaseUser?.email)
  const shopichatEnabled = shopichatVisible && !!store && getEffectivePlan(store) === 'business'
  const shopichatUnread = useShopiChatAlerts(store?.id, shopichatEnabled, openShopiChat)

  // Track presence for any user with a store
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser?.email || '')
  usePresence(store?.id)
  const newOrders = useNewOrdersCount(store?.id)
  // La alarma vive en el layout, no en Pedidos: en modo recepcion tiene que
  // sonar aunque el encargado se haya ido a Productos a corregir un precio.
  const { activo: modoRecepcion } = useReceptionMode(store?.id)
  const { sonando, pendientes, silenciar } = useOrderAlarm(store?.id, modoRecepcion)
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
      ...(shopichatVisible ? [{ name: t('nav.shopichat'), href: localePath('/dashboard/shopichat'), icon: ShopiChatIcon, badge: shopichatUnread }] : []),
      { name: t('nav.customers'), href: localePath('/dashboard/customers'), icon: CustomersIcon },
      { name: t('nav.analytics'), href: localePath('/dashboard/analytics'), icon: ChartIcon },
      'separator',
      { name: t('nav.appearance'), href: localePath('/dashboard/branding'), icon: PaletteIcon },
      { name: t('nav.myBusiness'), href: localePath('/dashboard/settings'), icon: SettingsIcon },
      { name: t('nav.payments'), href: localePath('/dashboard/payments'), icon: CreditCardIcon },
      { name: t('nav.coupons'), href: localePath('/dashboard/coupons'), icon: TagIcon },
      { name: t('nav.domain'), href: localePath('/dashboard/domain'), icon: GlobeIcon },
      // "API & Webhooks" era una entrada aparte que apuntaba a lo mismo:
      // conectar la tienda con algo externo. Ahora es una pestaña dentro de
      // Integraciones (/dashboard/integrations?tab=api).
      { name: t('nav.integrations'), href: localePath('/dashboard/integrations'), icon: IntegrationsIcon },
      { name: t('nav.miApp'), href: localePath('/dashboard/mi-app'), icon: PhoneIcon },
      'separator',
      { name: t('nav.help', { defaultValue: 'Ayuda' }), href: localePath('/dashboard/help'), icon: HelpIcon },
      { name: t('nav.myAccount'), href: localePath('/dashboard/account'), icon: UserIcon },
    ]
    if (isAdmin) {
      items.push({ name: 'Chats', href: localePath('/dashboard/support-chats'), icon: ChatIcon })
    }
    return items
  }, [t, localePath, isAdmin, newOrders, shopichatUnread, shopichatVisible])

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

  return (
    <AppChrome
      mode="ecommerce"
      navigation={navigation}
      isItemActive={isItemActive}
      homeHref={localePath('/dashboard')}
      accountHref={localePath('/dashboard/account')}
      isAdmin={isAdmin}
      adminHref={localePath('/admin')}
      store={store}
      user={user}
      onLogout={handleLogout}
      logoutLabel={t('nav.logout')}
      // Los chats de admin llevan su propio contador global, no el del item.
      badgeFor={item => (item.href.includes('support-chats') ? totalUnread : undefined)}
      topBarLeft={
        store && (() => {
          // Plan efectivo (una prueba vencida ya se ve como Free). En la app
          // nativa la chapa es solo informativa: sin link a la pagina de planes
          // (Apple no permite llevar a compras externas).
          const plan = getEffectivePlan(store)
          const className = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-semibold ${
            plan === 'business'
              ? 'bg-[#FEF3C7] text-[#B45309]'
              : plan === 'pro'
                ? 'bg-[#E0F2FE] text-[#0284C7]'
                : 'bg-[#F1F5F9] text-[#8898AA]'
          }`
          const content = (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  plan === 'business'
                    ? 'bg-[#D97706]'
                    : plan === 'pro'
                      ? 'bg-[#0284C7]'
                      : 'bg-[#A9B6C6]'
                }`}
              />
              {plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : 'Free'}
            </>
          )
          return isNative ? (
            <span className={className}>{content}</span>
          ) : (
            <Link to={localePath('/dashboard/plan')} className={className}>{content}</Link>
          )
        })()
      }
      topBarRight={
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="relative p-1.5 rounded-lg hover:bg-[#F6F9FC] transition-colors"
          title="Soporte"
        >
          <img src="/chat-support.png" alt="Soporte" className="w-5 h-5 object-contain" />
          {chatUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#DC2626] text-white text-[0.62rem] font-semibold rounded-full flex items-center justify-center">
              {chatUnread > 9 ? '9+' : chatUnread}
            </span>
          )}
        </button>
      }
      mobileActions={
        !isAdmin && (
          <button onClick={() => setChatOpen(true)} className="relative w-8 h-8 flex items-center justify-center">
            <img src="/chat-support.png" alt="Soporte" className="w-6 h-6 object-contain" />
            {chatUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DC2626] text-white text-[0.62rem] font-semibold rounded-full flex items-center justify-center">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </button>
        )
      }
      beforeContent={
        <>
          {store && <PlanBanner store={store} />}
          {store && <SetupAlerts store={store} />}
        </>
      }
      overlays={
        <>
          {/* Alarma de pedidos sin atender (modo recepcion).
              Arriba y ancha a proposito: el aviso tiene que verse desde lejos
              en una tablet de mostrador, no ser un puntito en una esquina.
              Silenciar calla la tanda actual; si entra otro pedido, vuelve. */}
          {sonando && (
            <div className="fixed top-0 inset-x-0 z-[60] bg-[#D97706] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
              <span className="font-semibold text-[0.95rem]">
                {pendientes === 1 ? '1 pedido sin atender' : `${pendientes} pedidos sin atender`}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={localePath('/dashboard/orders')}
                  className="px-3.5 py-1.5 rounded-full bg-white text-[#B45309] text-sm font-semibold"
                >
                  Ver
                </Link>
                <button
                  type="button"
                  onClick={silenciar}
                  className="px-3.5 py-1.5 rounded-full border border-white/60 text-sm font-medium"
                >
                  Silenciar
                </button>
              </div>
            </div>
          )}

          {/* Boton flotante de soporte, solo escritorio */}
          {!isAdmin && !chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="hidden lg:flex fixed bottom-6 right-6 z-50 w-12 h-12 rounded-[14px] bg-white items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ border: '1px solid #E6EBF1', boxShadow: '0 12px 32px -16px rgba(30,58,95,.45)' }}
            >
              <img src="/chat-support.png" alt="Soporte" className="w-7 h-7 object-contain" />
              {chatUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#DC2626] text-white text-[0.62rem] font-semibold rounded-full flex items-center justify-center">
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </button>
          )}
          {!isAdmin && <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />}
        </>
      }
    >
      <Outlet />
    </AppChrome>
  )
}
