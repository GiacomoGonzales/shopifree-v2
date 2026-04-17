import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
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
  appConfig?: {
    appName?: string
    status?: 'none' | 'requested' | 'building' | 'published'
    androidUrl?: string
    publishedAt?: Timestamp | Date
    build?: BuildInfo      // Android
    buildIos?: BuildInfo   // iOS
  }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  idle:    { label: 'Sin build',    cls: 'bg-gray-100 text-gray-600' },
  queued:  { label: 'En cola',      cls: 'bg-blue-50 text-blue-600' },
  running: { label: 'Compilando…',  cls: 'bg-amber-50 text-amber-700' },
  success: { label: 'Listo',        cls: 'bg-green-50 text-green-700' },
  failed:  { label: 'Fallo',        cls: 'bg-red-50 text-red-600' },
}

export default function AppBuilds() {
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [versionName, setVersionName] = useState<Record<string, string>>({})

  // Publish modal state
  const [publishingStore, setPublishingStore] = useState<StoreRow | null>(null)
  const [publishUrl, setPublishUrl] = useState('')
  const [publishNotify, setPublishNotify] = useState(true)
  const [publishing, setPublishing] = useState(false)

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
    setPublishUrl(store.appConfig?.androidUrl || '')
    setPublishNotify(true)
  }

  const submitPublish = async () => {
    if (!firebaseUser || !publishingStore) return
    if (!publishUrl.trim()) {
      showToast('Pegá el URL de Play Store', 'error')
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
          androidUrl: publishUrl.trim(),
          notifyOwner: publishNotify,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      showToast(`${publishingStore.name} marcada como publicada`, 'success')
      setPublishingStore(null)
      setPublishUrl('')
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
        <StatCard label="Solicitadas" value={summary.requested} highlight={summary.requested > 0 ? 'amber' : undefined} />
        <StatCard label="Compilando" value={summary.building} highlight={summary.building > 0 ? 'blue' : undefined} />
        <StatCard label="Listas" value={summary.ready} highlight={summary.ready > 0 ? 'green' : undefined} />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : stores.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">Ninguna tienda tiene app configurada todavia</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
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
                      <img src={store.logo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-gray-400">
                        {store.name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{store.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {store.appConfig?.appName || store.subdomain}
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="1.0.0"
                      value={versionName[store.id] || ''}
                      onChange={e => setVersionName(prev => ({ ...prev, [store.id]: e.target.value }))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs flex-shrink-0"
                    />
                    {store.appConfig?.status === 'published' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 flex-shrink-0">
                        ✓ En Play Store
                      </span>
                    )}
                  </div>

                  {/* Platform rows: Android + iOS */}
                  <div className="pl-[52px] space-y-2">
                    <PlatformRow
                      label="Android"
                      icon={
                        <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
                        </svg>
                      }
                      build={androidBuild}
                      status={androidStatus}
                      triggering={triggeringId === `${store.id}-android`}
                      onTrigger={() => triggerBuild(store, 'android')}
                      onPublish={() => openPublishModal(store)}
                      canMarkPublished={androidStatus === 'success' && store.appConfig?.status !== 'published'}
                      isPublished={store.appConfig?.status === 'published'}
                      artifactLabel="AAB"
                    />

                    <PlatformRow
                      label="iOS"
                      icon={
                        <svg className="w-3.5 h-3.5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                      }
                      build={iosBuild}
                      status={iosStatus}
                      triggering={triggeringId === `${store.id}-ios`}
                      onTrigger={() => triggerBuild(store, 'ios')}
                      onPublish={() => { /* iOS publish flow to be added */ }}
                      canMarkPublished={false}
                      isPublished={false}
                      artifactLabel="IPA"
                      disabledReason="Requiere setup de Apple Developer (ver mobile/IOS-SETUP.md)"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Publish modal */}
      {publishingStore && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          onClick={() => !publishing && setPublishingStore(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {publishingStore.appConfig?.status === 'published' ? 'Editar URL de Play Store' : 'Marcar app como publicada'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{publishingStore.name}</p>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL de Play Store</label>
                <input
                  type="url"
                  value={publishUrl}
                  onChange={e => setPublishUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                />
                <p className="text-[11px] text-gray-400 mt-1">Copiá el link directo desde Play Console → "Ficha de tienda principal"</p>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishNotify}
                  onChange={e => setPublishNotify(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                />
                <div className="text-xs">
                  <span className="font-medium text-gray-700">Enviar email al dueño</span>
                  <p className="text-gray-500">Le llega un aviso con el link de Play Store.</p>
                </div>
              </label>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setPublishingStore(null)}
                disabled={publishing}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={submitPublish}
                disabled={publishing || !publishUrl.trim()}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d6cb5] transition-colors disabled:opacity-40"
              >
                {publishing ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
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
}

function PlatformRow({
  label, icon, build, status, triggering, onTrigger, onPublish,
  canMarkPublished, isPublished, artifactLabel, disabledReason,
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

      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>
        {badge.label}
      </span>

      {build?.buildNumber ? (
        <span className="text-gray-400">v{build.versionName || ''} (#{build.buildNumber})</span>
      ) : null}

      <button
        onClick={onTrigger}
        disabled={isBuilding || triggering || isDisabled}
        className="px-2.5 py-1 bg-[#1e3a5f] text-white rounded-md text-[11px] font-medium hover:bg-[#2d6cb5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={disabledReason}
      >
        {triggering ? 'Encolando…' : isBuilding ? 'Compilando…' : 'Generar'}
      </button>

      {canMarkPublished && (
        <button
          onClick={onPublish}
          className="px-2.5 py-1 bg-green-600 text-white rounded-md text-[11px] font-medium hover:bg-green-700 transition-colors"
        >
          Marcar publicada
        </button>
      )}

      {isPublished && (
        <button
          onClick={onPublish}
          className="px-2.5 py-1 border border-gray-200 text-gray-600 rounded-md text-[11px] font-medium hover:bg-gray-50 transition-colors"
        >
          Editar URL
        </button>
      )}

      {build?.artifactUrl && (
        <a
          href={build.artifactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 font-medium inline-flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Descargar {artifactLabel}
        </a>
      )}

      {build?.runUrl && (
        <a href={build.runUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
          logs →
        </a>
      )}

      {build?.lastError && (
        <span className="text-red-500 truncate max-w-xs">{build.lastError}</span>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: 'amber' | 'blue' | 'green' }) {
  const colorClass =
    highlight === 'amber' ? 'text-amber-600' :
    highlight === 'blue' ? 'text-blue-600' :
    highlight === 'green' ? 'text-green-600' :
    'text-gray-900'
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  )
}
