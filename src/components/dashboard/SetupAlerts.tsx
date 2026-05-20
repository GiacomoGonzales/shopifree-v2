import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'
import type { Store } from '../../types'

/**
 * SetupAlerts — banners auto-detectados de "te falta algo" para el dashboard.
 *
 * Patron paralelo al de PlanBanner: cada alerta se deriva del estado del store
 * (no se guarda en Firestore — el sistema detecta cuando un campo critico esta
 * vacio y muestra el banner). Cuando el merchant arregla el problema, el banner
 * desaparece solo en el proximo render.
 *
 * Casos cubiertos en v1:
 *  - WhatsApp number vacio (critico — todos los temas dependen de el)
 *  - App white-label solicitada sin logo de tienda
 *  - App white-label solicitada sin icono de app
 *
 * Agregar mas: editar getSetupAlerts() y meter la nueva clave en es/en/dashboard.json
 * bajo setupAlerts. El banner aparece automaticamente cuando el dato real lo amerita.
 */

type AlertSeverity = 'warning' | 'info'

interface SetupAlert {
  id: string
  severity: AlertSeverity
  message: string
  actionLabel: string
  actionPath: string
}

const ALERT_STYLES: Record<AlertSeverity, { bg: string; border: string; text: string; icon: string; button: string }> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-500',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
}

function getSetupAlerts(
  store: Store,
  t: (key: string, opts?: Record<string, unknown>) => string
): SetupAlert[] {
  const alerts: SetupAlert[] = []

  // 1. WhatsApp vacio — critico. Los temas usan este numero para el boton flotante,
  //    el footer y el checkout. Sin esto la tienda funcionalmente no vende.
  if (!store.whatsapp || !store.whatsapp.trim()) {
    alerts.push({
      id: 'no-whatsapp',
      severity: 'warning',
      message: t('setupAlerts.noWhatsapp'),
      actionLabel: t('setupAlerts.setupNow'),
      actionPath: '/dashboard/settings',
    })
  }

  // 2. App white-label solicitada pero sin logo de tienda. El logo aparece en
  //    el header y en el listado de la app, asi que el build queda incompleto sin el.
  if (store.appConfig?.status === 'requested' && !store.logo) {
    alerts.push({
      id: 'app-no-logo',
      severity: 'warning',
      message: t('setupAlerts.appNoLogo'),
      actionLabel: t('setupAlerts.uploadLogo'),
      actionPath: '/dashboard/branding',
    })
  }

  // 3. App solicitada sin icono propio. El icono de la app es lo que se ve en
  //    el escritorio del telefono y en la Play/App Store. Sin esto no se publica.
  if (store.appConfig?.status === 'requested' && !store.appConfig.icon) {
    alerts.push({
      id: 'app-no-icon',
      severity: 'warning',
      message: t('setupAlerts.appNoIcon'),
      actionLabel: t('setupAlerts.uploadIcon'),
      actionPath: '/dashboard/mi-app',
    })
  }

  return alerts
}

export default function SetupAlerts({ store }: { store: Store }) {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  // Dismissal solo de sesion. No persistimos a localStorage a proposito: queremos
  // que el alert vuelva en el proximo refresh hasta que el merchant arregle el
  // problema real. Una vez fixeado, getSetupAlerts deja de devolverlo y el banner
  // desaparece para siempre sin estado adicional.
  const [dismissed, setDismissed] = useState<string[]>([])

  const alerts = useMemo(
    () => getSetupAlerts(store, t).filter(a => !dismissed.includes(a.id)),
    [store, dismissed, t]
  )

  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-4">
      {alerts.map(alert => {
        const styles = ALERT_STYLES[alert.severity]
        return (
          <div
            key={alert.id}
            className={`${styles.bg} ${styles.border} border rounded-xl px-4 py-3 flex items-center gap-3`}
          >
            <div className={`flex-shrink-0 ${styles.icon}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`flex-1 text-sm font-medium ${styles.text}`}>
              {alert.message}
            </p>
            <Link
              to={localePath(alert.actionPath)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${styles.button}`}
            >
              {alert.actionLabel}
            </Link>
            <button
              onClick={() => setDismissed(d => [...d, alert.id])}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5 ${styles.text} opacity-60 hover:opacity-100`}
              aria-label={t('common.dismiss', 'Dismiss')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
