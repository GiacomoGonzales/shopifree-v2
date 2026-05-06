import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { apiUrl } from '../../utils/apiBase'

interface BuildInfo {
  status?: 'idle' | 'queued' | 'running' | 'success' | 'failed'
  runUrl?: string
  artifactUrl?: string
  artifactName?: string
  buildNumber?: number
  versionName?: string
  lastError?: string
  startedAt?: Timestamp | Date
  finishedAt?: Timestamp | Date
}

interface StoreRow {
  id: string
  name: string
  subdomain: string
  logo?: string
  email?: string         // store-level contact email
  whatsapp?: string      // store-level contact phone
  appConfig?: {
    appName?: string
    icon?: string        // 1024x1024 logo uploaded specifically for the app
    primaryColor?: string
    secondaryColor?: string
    splashColor?: string
    status?: 'none' | 'requested' | 'building' | 'published'
    androidUrl?: string
    iosUrl?: string
    androidIsTesting?: boolean
    publishedAt?: Timestamp | Date
    build?: BuildInfo      // Android
    buildIos?: BuildInfo   // iOS
    publishInfo?: {
      testers: string[]
    }
    screenshots?: {
      status?: 'idle' | 'queued' | 'running' | 'success' | 'failed'
      urls?: string[]
      generatedAt?: Timestamp | Date
      runUrl?: string
      lastError?: string
    }
  }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  idle:    { label: 'Sin build',   cls: 'border border-gray-200 text-gray-500' },
  queued:  { label: 'En cola',     cls: 'border border-gray-200 text-gray-700' },
  running: { label: 'Compilando…', cls: 'border border-gray-300 text-gray-900 font-medium' },
  success: { label: 'Listo',       cls: 'border border-gray-900 bg-gray-50 text-gray-900 font-medium' },
  failed:  { label: 'Fallo',       cls: 'border border-gray-900 bg-gray-900 text-white' },
}

export default function AppBuilds() {
  const { firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [versionName, setVersionName] = useState<Record<string, string>>({})

  // Publish modal state — handles both Android and iOS URLs in one place so
  // the operator can paste either or both without juggling two modals.
  const [publishingStore, setPublishingStore] = useState<StoreRow | null>(null)
  const [publishAndroidUrl, setPublishAndroidUrl] = useState('')
  const [publishIosUrl, setPublishIosUrl] = useState('')
  const [publishAndroidIsTesting, setPublishAndroidIsTesting] = useState(true)
  const [publishNotify, setPublishNotify] = useState(true)
  const [publishing, setPublishing] = useState(false)

  // Details modal — surfaces everything needed to register the app on Play
  // Console without bouncing between Firestore and the merchant's WhatsApp.
  // Track only the id; the live store record is derived from `stores` so
  // when the Firestore snapshot listener updates (e.g. screenshots finish
  // uploading and `appConfig.screenshots.urls` lands), the open modal
  // re-renders with the fresh data automatically.
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null)
  const viewingStore = viewingStoreId ? stores.find(s => s.id === viewingStoreId) ?? null : null
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      showToast('No pude copiar al portapapeles', 'error')
    }
  }

  // Initial load — get all stores with appConfig set
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(query(collection(db, 'stores'), where('appConfig', '!=', null)))
        const rows: StoreRow[] = snap.docs.map(d => {
          const data = d.data() as Omit<StoreRow, 'id'>
          return { id: d.id, ...data }
        })
        rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setStores(rows)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Live subscription on individual store docs — so status badges update without refresh
  useEffect(() => {
    if (stores.length === 0) return
    const unsubs = stores.map(s => {
      return onSnapshot(
        // doc reference via query to keep same db
        query(collection(db, 'stores'), where('__name__', '==', s.id)),
        snap => {
          if (snap.empty) return
          const doc = snap.docs[0]
          setStores(prev => prev.map(p => p.id === s.id ? { id: doc.id, ...(doc.data() as Omit<StoreRow, 'id'>) } : p))
        }
      )
    })
    return () => { unsubs.forEach(u => u()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.length])

  const triggerScreenshot = async (storeId: string) => {
    if (!firebaseUser) return
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch(apiUrl('/api/admin-trigger-screenshot'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId }),
      })
      // Some failure modes (mid-deploy 404, edge timeouts, the function
      // crashing before responding) come back with an empty body that
      // .json() chokes on. Read once as text and try to parse — fall back
      // to status text so the toast still says something useful.
      const raw = await res.text()
      let data: { error?: string; ok?: boolean } = {}
      try {
        if (raw) data = JSON.parse(raw)
      } catch {
        // non-JSON body (HTML 404, empty, etc.) — leave data as {}
      }
      if (!res.ok) throw new Error(data.error || res.statusText || `HTTP ${res.status}`)
      showToast('Generando capturas en GitHub Actions (~3 min)', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      showToast(`Error: ${msg}`, 'error')
    }
  }

  const triggerBuild = async (store: StoreRow, platform: 'android' | 'ios' = 'android') => {
    if (!firebaseUser) return
    setTriggeringId(`${store.id}-${platform}`)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch(apiUrl('/api/admin-trigger-app-build'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          versionName: versionName[store.id] || '1.0.0',
          platform,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      showToast(`Build ${platform} encolado para ${store.name}`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      showToast(`Error: ${msg}`, 'error')
    } finally {
      setTriggeringId(null)
    }
  }

  const openPublishModal = (store: StoreRow) => {
    setPublishingStore(store)
    setPublishAndroidUrl(store.appConfig?.androidUrl || '')
    setPublishIosUrl(store.appConfig?.iosUrl || '')
    // Default to testing=true on first publish (most apps start in closed
    // testing). Otherwise reflect the saved flag so the operator only
    // has to toggle it off when promoting to production.
    setPublishAndroidIsTesting(
      store.appConfig?.androidIsTesting ?? !store.appConfig?.androidUrl
    )
    setPublishNotify(true)
  }

  const submitPublish = async () => {
    if (!firebaseUser || !publishingStore) return
    const android = publishAndroidUrl.trim()
    const ios = publishIosUrl.trim()
    if (!android && !ios) {
      showToast('Pegá al menos un URL (Play Store o App Store)', 'error')
      return
    }
    setPublishing(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch(apiUrl('/api/admin-mark-app-published'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: publishingStore.id,
          ...(android && { androidUrl: android }),
          ...(ios && { iosUrl: ios }),
          // Always send the testing flag so toggling it off (production
          // promotion) actually persists, even when the URL doesn't change.
          androidIsTesting: !!android && publishAndroidIsTesting,
          notifyOwner: publishNotify,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      showToast(`${publishingStore.name} marcada como publicada`, 'success')
      setPublishingStore(null)
      setPublishAndroidUrl('')
      setPublishIosUrl('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      showToast(`Error: ${msg}`, 'error')
    } finally {
      setPublishing(false)
    }
  }

  const summary = useMemo(() => {
    let requested = 0, building = 0, ready = 0, failed = 0
    for (const s of stores) {
      const st = s.appConfig?.build?.status
      if (st === 'queued' || st === 'running') building++
      else if (st === 'success') ready++
      else if (st === 'failed') failed++
      if (s.appConfig?.status === 'requested') requested++
    }
    return { total: stores.length, requested, building, ready, failed }
  }, [stores])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Builds de apps</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Genera el AAB firmado de cada tienda que tenga configurada su app. El build corre en GitHub Actions y deja el archivo en Firebase Storage.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tiendas con app" value={summary.total} />
        <StatCard label="Solicitadas" value={summary.requested} />
        <StatCard label="Compilando" value={summary.building} />
        <StatCard label="Listas" value={summary.ready} />
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
          </div>
        ) : stores.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-500">Ninguna tienda tiene app configurada todavía</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stores.map(store => {
              const androidBuild = store.appConfig?.build
              const iosBuild = store.appConfig?.buildIos
              const androidStatus = androidBuild?.status || 'idle'
              const iosStatus = iosBuild?.status || 'idle'
              return (
                <div key={store.id} className="px-4 py-3">
                  {/* Store identity row */}
                  <div className="flex items-center gap-3 min-w-0 mb-3">
                    {store.logo ? (
                      <img src={store.logo} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-gray-500">
                        {store.name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{store.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {store.appConfig?.appName || store.subdomain}
                      </p>
                    </div>
                    <Link
                      to={localePath(`/admin/stores/${store.id}/app-preview`)}
                      className="px-2.5 py-1 border border-gray-200 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors flex-shrink-0 inline-flex items-center gap-1"
                      title="Ver como se ve esta seccion en el dashboard del dueno"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Vista previa
                    </Link>
                    <button
                      type="button"
                      onClick={() => setViewingStoreId(store.id)}
                      className="px-2.5 py-1 border border-gray-200 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors flex-shrink-0 inline-flex items-center gap-1"
                      title="Ver datos de Play Console (ícono, contacto, testers)"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Datos
                      {(store.appConfig?.publishInfo?.testers?.length ?? 0) > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded-full tabular-nums">
                          {store.appConfig?.publishInfo?.testers?.length}
                        </span>
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder="1.0.0"
                      value={versionName[store.id] || ''}
                      onChange={e => setVersionName(prev => ({ ...prev, [store.id]: e.target.value }))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    />
                    {store.appConfig?.status === 'published' && (
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wide uppercase bg-black text-white flex-shrink-0">
                        Publicada
                      </span>
                    )}
                  </div>

                  {/* Platform rows: Android + iOS */}
                  <div className="pl-[52px] space-y-2">
                    <PlatformRow
                      label="Android"
                      icon={
                        <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
                        </svg>
                      }
                      build={androidBuild}
                      status={androidStatus}
                      triggering={triggeringId === `${store.id}-android`}
                      onTrigger={() => triggerBuild(store, 'android')}
                      onPublish={() => openPublishModal(store)}
                      // Allow marking as published independent of the build's
                      // status: GitHub Actions artifacts expire (~90 days), so
                      // a build that ran months ago and is no longer downloadable
                      // shouldn't block the operator from pasting the Play Store
                      // link the merchant ended up with.
                      canMarkPublished={!store.appConfig?.androidUrl}
                      isPublished={!!store.appConfig?.androidUrl}
                      artifactLabel="AAB"
                      publishedUrl={store.appConfig?.androidUrl}
                    />

                    <PlatformRow
                      label="iOS"
                      icon={
                        <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                      }
                      build={iosBuild}
                      status={iosStatus}
                      triggering={triggeringId === `${store.id}-ios`}
                      onTrigger={() => triggerBuild(store, 'ios')}
                      onPublish={() => openPublishModal(store)}
                      canMarkPublished={!store.appConfig?.iosUrl}
                      isPublished={!!store.appConfig?.iosUrl}
                      artifactLabel="IPA"
                      publishedUrl={store.appConfig?.iosUrl}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Publish modal — single modal handles both Play Store and App Store
          URLs. Each field is independent: paste one or both, edit either
          later without touching the other. */}
      {publishingStore && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !publishing && setPublishingStore(null)}
        >
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                URLs de descarga
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{publishingStore.name}</p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL de Play Store (Android)</label>
                <input
                  type="url"
                  value={publishAndroidUrl}
                  onChange={e => setPublishAndroidUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-1">Copiá desde Play Console → Ficha de tienda principal</p>

                {publishAndroidUrl.trim() && (
                  <label className="flex items-start gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishAndroidIsTesting}
                      onChange={e => setPublishAndroidIsTesting(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <div className="text-[11px]">
                      <span className="font-medium text-gray-700">URL de testing cerrado</span>
                      <p className="text-gray-500">
                        Si la app sigue en closed testing (12 testers × 14 dias antes de producción), dejá esto marcado. Al merchant le aparece una guía explicando qué hacer con el link. Desmarcá cuando ya sea URL pública.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL de App Store (iOS)</label>
                <input
                  type="url"
                  value={publishIosUrl}
                  onChange={e => setPublishIosUrl(e.target.value)}
                  placeholder="https://apps.apple.com/app/id..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-1">Copiá desde App Store Connect → My Apps → URL pública</p>
              </div>

              <p className="text-[11px] text-gray-500">
                Al menos un URL es obligatorio. Podés dejar el otro en blanco si la app aún no está en esa tienda.
              </p>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishNotify}
                  onChange={e => setPublishNotify(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <div className="text-xs">
                  <span className="font-medium text-gray-700">Enviar email al dueño</span>
                  <p className="text-gray-500">Le llega un aviso con los links de descarga.</p>
                </div>
              </label>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setPublishingStore(null)}
                disabled={publishing}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={submitPublish}
                disabled={publishing || (!publishAndroidUrl.trim() && !publishIosUrl.trim())}
                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {publishing ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Datos para Play Console — read-only modal with everything the
          operator pastes into Play Console when registering / submitting
          the white-label app. Testers list has a copy-to-clipboard so 12
          emails go in with one click instead of 12 paste actions. */}
      {viewingStore && (
        <DetailsModal
          store={viewingStore}
          copiedField={copiedField}
          onCopy={copyToClipboard}
          onClose={() => setViewingStoreId(null)}
          onTriggerScreenshot={() => triggerScreenshot(viewingStore.id)}
        />
      )}
    </div>
  )
}

interface DetailsModalProps {
  store: StoreRow
  copiedField: string | null
  onCopy: (text: string, field: string) => void
  onClose: () => void
  onTriggerScreenshot: () => void
}

// Inject sizing transforms after `/upload/` so a Cloudinary-hosted icon is
// served as a 512×512 PNG with transparent padding (`c_pad,b_transparent`)
// — exactly what Play Console asks for in Store listing → Icon. `f_png`
// forces the format regardless of the source extension. Returns the input
// unchanged if it isn't a Cloudinary URL.
function cloudinary512(url: string): string {
  if (!url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', '/image/upload/c_pad,b_transparent,w_512,h_512,f_png/')
}

// Normalize a hex color to Cloudinary's `rgb:RRGGBB` format. Strips the
// leading `#`, expands shorthand (#abc → aabbcc), pads/truncates to six
// chars, and falls back to a neutral dark slate when the input is missing
// or malformed so the transform URL is always valid.
function toCloudinaryRgb(hex: string | undefined, fallback: string): string {
  const raw = (hex ?? fallback).replace('#', '').trim()
  let normalized = raw
  if (raw.length === 3) {
    normalized = raw.split('').map(c => c + c).join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    normalized = fallback.replace('#', '')
  }
  return `rgb:${normalized.toLowerCase()}`
}

// Build a 1024×500 Play Store feature graphic from the merchant's app icon
// and brand color, server-side via Cloudinary. The icon is square (~1024×
// 1024); `c_pad,w_1024,h_500,b_<brand>` scales it to fit the 500px height
// (yielding 500×500 centered) and pads the remaining 524px of width with
// the brand color, so the result reads as "logo on brand-colored banner."
// Picks primaryColor over splashColor (splash is usually white and would
// flatten the whole banner). Returns null when we lack either input.
function cloudinaryFeatureGraphic(
  url: string | undefined,
  primaryColor: string | undefined,
  splashColor: string | undefined,
): string | null {
  if (!url || !url.includes('/image/upload/')) return null
  // Prefer primaryColor; fall back to splashColor only if primary is the
  // generic Shopifree default. Final fallback is the same dark slate.
  const FALLBACK = '#1e3a5f'
  const isShopifreeDefault = (primaryColor || '').toLowerCase() === FALLBACK
  const chosen = isShopifreeDefault && splashColor && splashColor.toLowerCase() !== '#ffffff'
    ? splashColor
    : (primaryColor || splashColor || FALLBACK)
  const bg = toCloudinaryRgb(chosen, FALLBACK)
  return url.replace('/image/upload/', `/image/upload/c_pad,w_1024,h_500,b_${bg},f_png/`)
}

function DetailsModal({ store, copiedField, onCopy, onClose, onTriggerScreenshot }: DetailsModalProps) {
  const testers = store.appConfig?.publishInfo?.testers ?? []
  const appIcon = store.appConfig?.icon
  const appName = store.appConfig?.appName || store.name
  const packageName = `app.shopifree.store.${store.subdomain.replace(/[^a-z0-9]/gi, '')}`
  const icon512 = appIcon ? cloudinary512(appIcon) : null
  const featureGraphic = cloudinaryFeatureGraphic(
    appIcon,
    store.appConfig?.primaryColor,
    store.appConfig?.splashColor,
  )
  const screenshots = store.appConfig?.screenshots
  const screenshotsStatus = screenshots?.status || 'idle'
  // Only `running` blocks retry: a workflow is genuinely executing right
  // now and a parallel one would race. `queued` can outlive the actual
  // workflow run when the dispatch was lost (Vercel deploy mid-click,
  // workflow died before its first status write, etc.) — allow retry so
  // the operator isn't stuck forever waiting on a dead run.
  const screenshotsBusy = screenshotsStatus === 'running'

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">Datos para Play Console</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{store.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 flex-shrink-0 ml-4"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 overflow-y-auto flex-1">
          {/* App icon */}
          <section>
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Ícono de la app</h3>
            {appIcon ? (
              <div className="flex items-center gap-3">
                <img
                  src={appIcon}
                  alt={appName}
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {icon512 && (
                      <a
                        href={icon512}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 text-white rounded-md text-[11px] font-medium hover:bg-gray-800 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        512×512 PNG
                      </a>
                    )}
                    <a
                      href={appIcon}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Original
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-500">El 512×512 PNG es el que pide Play Console en Ficha de tienda → Ícono.</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No subió ícono. Cae al logo general de la tienda al construir el AAB.</p>
            )}
          </section>

          {/* Feature graphic — auto-generated banner for Play Store listing */}
          <section>
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">
              Gráfico de funciones (1024×500)
            </h3>
            {featureGraphic ? (
              <div className="space-y-2">
                <a
                  href={featureGraphic}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                >
                  <img
                    src={featureGraphic}
                    alt={`${appName} — Gráfico de funciones`}
                    className="w-full h-auto block"
                    style={{ aspectRatio: '1024 / 500' }}
                  />
                </a>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-gray-500">
                    Generado del ícono + color de marca. Sube en Play Console → Ficha de tienda → Gráfico de funciones.
                  </p>
                  <a
                    href={featureGraphic}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 text-white rounded-md text-[11px] font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Descargar
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                No hay ícono cargado, no puedo generar el gráfico automáticamente.
              </p>
            )}
          </section>

          {/* Identity */}
          <section>
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">App</h3>
            <DetailRow label="Nombre" value={appName} field="appName" copied={copiedField === 'appName'} onCopy={onCopy} />
            <DetailRow label="Package name" value={packageName} field="packageName" copied={copiedField === 'packageName'} onCopy={onCopy} mono />
            <DetailRow label="Subdominio" value={store.subdomain} field="subdomain" copied={copiedField === 'subdomain'} onCopy={onCopy} mono />
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Contacto del dueño</h3>
            <DetailRow label="Nombre" value={store.name} field="contactName" copied={copiedField === 'contactName'} onCopy={onCopy} />
            <DetailRow label="Email" value={store.email || '—'} field="contactEmail" copied={copiedField === 'contactEmail'} onCopy={onCopy} disabled={!store.email} />
            <DetailRow label="Teléfono / WhatsApp" value={store.whatsapp || '—'} field="contactPhone" copied={copiedField === 'contactPhone'} onCopy={onCopy} disabled={!store.whatsapp} />
          </section>

          {/* Phone screenshots — auto-generated from the storefront */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Capturas de pantalla (1080×2400)
              </h3>
              <button
                type="button"
                onClick={onTriggerScreenshot}
                disabled={screenshotsBusy}
                className="px-2.5 py-1 bg-gray-900 text-white rounded-md text-[11px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 inline-flex items-center gap-1"
              >
                {screenshotsBusy ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                    Generando…
                  </>
                ) : screenshots?.urls?.length ? 'Regenerar' : 'Generar capturas'}
              </button>
            </div>

            {screenshotsStatus === 'failed' && screenshots?.lastError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 mb-2">
                Falló: {screenshots.lastError}
                {screenshots.runUrl && (
                  <>
                    {' · '}
                    <a href={screenshots.runUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      ver logs
                    </a>
                  </>
                )}
              </p>
            )}

            {screenshots?.urls && screenshots.urls.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {screenshots.urls.map((url, idx) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="relative aspect-[9/20] bg-gray-100 rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors group"
                    title={`Captura ${idx + 1} — click para descargar`}
                  >
                    <img src={url} alt={`Captura ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            ) : screenshotsStatus === 'idle' ? (
              <p className="text-xs text-gray-400 italic">
                Aún no se generaron. Click en "Generar capturas" — corre Playwright en GitHub Actions sobre la tienda en vivo (~3 min).
              </p>
            ) : null}

            {screenshots?.urls && screenshots.urls.length > 0 && (
              <p className="mt-2 text-[11px] text-gray-500">
                {screenshots.urls.length} capturas listas. Click en cada una para descargar — sube en Play Console → Ficha de tienda → Capturas de pantalla de teléfono.
              </p>
            )}
          </section>

          {/* Testers */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Testers ({testers.length})
              </h3>
              {testers.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCopy(testers.join(', '), 'allTesters')}
                  className="px-2 py-0.5 text-[11px] text-gray-700 hover:text-gray-900 font-medium inline-flex items-center gap-1"
                >
                  {copiedField === 'allTesters' ? (
                    <>
                      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copiar todos
                    </>
                  )}
                </button>
              )}
            </div>
            {testers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">El dueño aún no agregó correos de testers.</p>
            ) : (
              <ul className="space-y-1">
                {testers.map(email => (
                  <li
                    key={email}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50 rounded-md"
                  >
                    <span className="text-xs text-gray-700 truncate font-mono">{email}</span>
                    <button
                      type="button"
                      onClick={() => onCopy(email, `tester-${email}`)}
                      className="text-gray-400 hover:text-gray-900 flex-shrink-0"
                      title="Copiar correo"
                    >
                      {copiedField === `tester-${email}` ? (
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
  field: string
  copied: boolean
  onCopy: (text: string, field: string) => void
  mono?: boolean
  disabled?: boolean
}

function DetailRow({ label, value, field, copied, onCopy, mono, disabled }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onCopy(value, field)}
            className="text-gray-400 hover:text-gray-900 flex-shrink-0"
            title="Copiar"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

interface PlatformRowProps {
  label: string
  icon: React.ReactNode
  build?: BuildInfo
  status: string
  triggering: boolean
  onTrigger: () => void
  onPublish: () => void
  canMarkPublished: boolean
  isPublished: boolean
  artifactLabel: string
  disabledReason?: string
  publishedUrl?: string  // Play Store / App Store URL once the merchant published the app
}

function PlatformRow({
  label, icon, build, status, triggering, onTrigger, onPublish,
  canMarkPublished, isPublished, artifactLabel, disabledReason, publishedUrl,
}: PlatformRowProps) {
  const badge = STATUS_LABELS[status] || STATUS_LABELS.idle
  const isBuilding = status === 'queued' || status === 'running'
  const isDisabled = !!disabledReason

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="inline-flex items-center gap-1.5 min-w-[60px]">
        {icon}
        <span className="font-medium text-gray-700">{label}</span>
      </span>

      <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wide ${badge.cls}`}>
        {badge.label}
      </span>

      {build?.buildNumber ? (
        <span className="text-gray-500 text-[11px] tabular-nums">v{build.versionName || ''} (#{build.buildNumber})</span>
      ) : null}

      <button
        onClick={onTrigger}
        disabled={isBuilding || triggering || isDisabled}
        className="px-2.5 py-1 bg-black text-white rounded-md text-[11px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={disabledReason}
      >
        {triggering ? 'Encolando…' : isBuilding ? 'Compilando…' : 'Generar'}
      </button>

      {canMarkPublished && (
        <button
          onClick={onPublish}
          className="px-2.5 py-1 border border-gray-900 text-gray-900 rounded-md text-[11px] font-medium hover:bg-gray-900 hover:text-white transition-colors"
        >
          Agregar URL
        </button>
      )}

      {isPublished && (
        <button
          onClick={onPublish}
          className="px-2.5 py-1 border border-gray-200 text-gray-700 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors"
        >
          Editar URL
        </button>
      )}

      {publishedUrl && (
        <a
          href={publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:text-gray-900 inline-flex items-center gap-1 underline underline-offset-2 truncate max-w-[200px]"
          title={publishedUrl}
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Ver en {label === 'Android' ? 'Play Store' : 'App Store'}
        </a>
      )}

      {build?.artifactUrl && (
        <a
          href={build.artifactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:text-gray-900 font-medium inline-flex items-center gap-1 underline underline-offset-2"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Descargar {artifactLabel}
        </a>
      )}

      {build?.runUrl && (
        <a href={build.runUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900">
          logs →
        </a>
      )}

      {build?.lastError && (
        <span className="text-gray-900 font-medium truncate max-w-xs">{build.lastError}</span>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-[11px] text-gray-500 mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
