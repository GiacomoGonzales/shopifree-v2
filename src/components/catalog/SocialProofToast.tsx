import { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'

interface RecentOrder {
  firstName: string
  city: string
  productName: string
  createdAt: string
}

function getTimeAgo(dateStr: string, language: string) {
  const t = getThemeTranslations(language)
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}${t.socialProofHours}`
  return `${Math.max(1, minutes)}${t.socialProofMinutes}`
}

export default function SocialProofToast() {
  const { store, theme, language } = useTheme()
  const t = getThemeTranslations(language)

  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch orders once
  useEffect(() => {
    if (store.plan === 'free' || !store.socialProof?.enabled) return
    fetch(`/api/recent-orders?storeId=${store.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.orders?.length) setOrders(data.orders)
      })
      .catch(() => {})
  }, [store.id, store.plan, store.socialProof?.enabled])

  // Cycle toasts
  useEffect(() => {
    if (!orders.length || dismissed) return

    // First toast after 10 seconds
    timerRef.current = setTimeout(() => {
      setVisible(true)

      // Hide after 5s, then cycle
      const cycle = () => {
        timerRef.current = setTimeout(() => {
          setVisible(false)
          timerRef.current = setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % orders.length)
            setVisible(true)
            cycle()
          }, 15000)
        }, 5000)
      }
      cycle()
    }, 10000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [orders.length, dismissed])

  if (store.plan === 'free' || !store.socialProof?.enabled || !orders.length || !visible) {
    return null
  }

  const order = orders[currentIndex]
  if (!order) return null

  return (
    <div
      className="fixed bottom-20 left-4 z-30 max-w-xs animate-slideInLeft"
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.lg,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div className="flex items-start gap-3 p-3.5 pr-8">
        {/* Icon */}
        <div
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: theme.colors.surfaceHover,
            borderRadius: theme.radius.full,
          }}
        >
          <svg className="w-4.5 h-4.5" style={{ color: theme.colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>

        {/* Content */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
            {order.firstName} {order.city && `${t.socialProofFrom} ${order.city}`} {t.socialProofBought}
          </p>
          <p className="text-sm truncate" style={{ color: theme.colors.primary }}>
            {order.productName}
          </p>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
            {getTimeAgo(order.createdAt, language)}
          </p>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          setVisible(false)
          setDismissed(true)
        }}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center"
        style={{ color: theme.colors.textMuted }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
