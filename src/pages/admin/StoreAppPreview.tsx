import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import AppDownloadCard from '../../components/dashboard/AppDownloadCard'
import type { Store } from '../../types'

type StoreLite = Store & { id: string }

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  none: { label: 'No solicitada', cls: 'bg-gray-100 text-gray-600' },
  requested: { label: 'Solicitada', cls: 'bg-amber-100 text-amber-800' },
  building: { label: 'En construccion', cls: 'bg-blue-100 text-blue-800' },
  published: { label: 'Publicada', cls: 'bg-green-100 text-green-800' },
}

/**
 * Read-only admin view of a merchant's "Mi App" page. Lets the operator
 * verify how a store's app configuration looks (icon, colors, app name,
 * download links, QR codes) without needing to log in as the merchant.
 *
 * Renders only the visible / merchant-facing parts of MiApp — the
 * editing controls and push notification flows live on the merchant
 * side and aren't useful here.
 */
export default function AdminStoreAppPreview() {
  const { storeId } = useParams<{ storeId: string }>()
  const { localePath } = useLanguage()
  const [store, setStore] = useState<StoreLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storeId) return
    const fetch = async () => {
      setLoading(true)
      setError(null)
      try {
        const snap = await getDoc(doc(db, 'stores', storeId))
        if (!snap.exists()) {
          setError('Tienda no encontrada')
          return
        }
        setStore({ id: snap.id, ...(snap.data() as Omit<StoreLite, 'id'>) })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [storeId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="space-y-6">
        <Link to={localePath('/admin/app-builds')} className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a App Builds
        </Link>
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-900">{error || 'Tienda no encontrada'}</p>
        </div>
      </div>
    )
  }

  const appConfig = store.appConfig
  const status = appConfig?.status || 'none'
  const statusBadge = STATUS_LABELS[status] || STATUS_LABELS.none
  const appName = appConfig?.appName || store.name
  const slug = (appName || store.subdomain || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-')
  const testers = appConfig?.publishInfo?.testers ?? []

  return (
    <div className="space-y-5">
      {/* Back nav + header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <Link
            to={localePath('/admin/app-builds')}
            className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            App Builds
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Vista previa — Mi App</h1>
          <p className="text-sm text-gray-500">
            Asi se ve esta seccion para el dueno de <strong>{store.name}</strong>. Vista de solo lectura.
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Hero — app identity */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {appConfig?.icon ? (
            <img
              src={appConfig.icon}
              alt={appName}
              className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
            />
          ) : store.logo ? (
            <img
              src={store.logo}
              alt={appName}
              className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl font-medium text-gray-500">
              {appName[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{appName}</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{store.subdomain}.shopifree.app</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">Plan {store.plan}</p>
          </div>
        </div>

        {/* Brand colors */}
        {(appConfig?.primaryColor || appConfig?.secondaryColor || appConfig?.splashColor) && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Colores de marca</p>
            <div className="flex flex-wrap gap-3">
              {appConfig?.primaryColor && (
                <ColorSwatch label="Primary" hex={appConfig.primaryColor} />
              )}
              {appConfig?.secondaryColor && (
                <ColorSwatch label="Secondary" hex={appConfig.secondaryColor} />
              )}
              {appConfig?.splashColor && (
                <ColorSwatch label="Splash" hex={appConfig.splashColor} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Download links + QR codes — same component the merchant sees */}
      {status === 'published' && (appConfig?.androidUrl || appConfig?.iosUrl) ? (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Links de descarga</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {appConfig?.androidUrl ? (
              <AppDownloadCard
                url={appConfig.androidUrl}
                label="Google Play Store"
                qrFilenameSlug={`${slug}-android`}
                accentColor="#16a34a"
                scanLabel="Escaneá este QR con el celular para descargar"
                downloadQrLabel="Descargar QR"
                icon={
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.523 2.294l-1.907 3.302A9.953 9.953 0 0012.002 4.5c-1.327 0-2.588.259-3.744.726L6.35 1.924a.5.5 0 00-.866.5l1.893 3.278A9.972 9.972 0 002.5 14h19a9.972 9.972 0 00-4.877-8.298l1.893-3.278a.5.5 0 00-.866-.5h-.127zM8.5 11a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                }
              />
            ) : null}
            {appConfig?.iosUrl ? (
              <AppDownloadCard
                url={appConfig.iosUrl}
                label="Apple App Store"
                qrFilenameSlug={`${slug}-ios`}
                accentColor="#1f2937"
                scanLabel="Escaneá este QR con el celular para descargar"
                downloadQrLabel="Descargar QR"
                icon={
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                }
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-sm text-gray-600">
            La seccion de links de descarga aparecera cuando la app este publicada y tenga al menos un URL guardado.
          </p>
        </div>
      )}

      {/* Testers (read-only count + list preview) */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Testers internos</h2>
          <span className="px-2 py-0.5 text-[11px] rounded-md bg-gray-100 text-gray-700 font-medium tabular-nums">
            {testers.length} / 12
          </span>
        </div>
        {testers.length === 0 ? (
          <p className="text-xs text-gray-500 italic">El dueno aun no agrego correos de testers.</p>
        ) : (
          <ul className="space-y-1">
            {testers.map(email => (
              <li
                key={email}
                className="text-xs text-gray-700 font-mono px-3 py-1.5 bg-gray-50 rounded-md truncate"
              >
                {email}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ColorSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-md border border-gray-200 flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="text-[11px]">
        <p className="font-medium text-gray-700">{label}</p>
        <p className="font-mono text-gray-500 uppercase">{hex}</p>
      </div>
    </div>
  )
}
