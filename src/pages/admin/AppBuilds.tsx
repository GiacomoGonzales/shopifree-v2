import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { apiUrl } from '../../utils/apiBase'

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
    build?: {
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
  }
}

function fmtDate(d?: Timestamp | Date): string {
  if (!d) return '—'
  const date = typeof (d as Timestamp)?.toDate === 'function' ? (d as Timestamp).toDate() : (d as Date)
  return date.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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

  const triggerBuild = async (store: StoreRow) => {
    if (!firebaseUser) return
    setTriggeringId(store.id)
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      showToast(`Build encolado para ${store.name}`, 'success')
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
              const buildStatus = store.appConfig?.build?.status || 'idle'
              const badge = STATUS_LABELS[buildStatus] || STATUS_LABELS.idle
              const isBuilding = buildStatus === 'queued' || buildStatus === 'running'
              const isTriggering = triggeringId === store.id
              return (
                <div key={store.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {store.logo ? (
                        <img src={store.logo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-gray-400">
                          {store.name[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{store.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {store.appConfig?.appName || store.subdomain}
                          {store.appConfig?.build?.buildNumber ? ` · v${store.appConfig.build.versionName || ''} (#${store.appConfig.build.buildNumber})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>

                      {store.appConfig?.status === 'published' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">
                          ✓ En Play Store
                        </span>
                      )}

                      <input
                        type="text"
                        placeholder="1.0.0"
                        value={versionName[store.id] || ''}
                        onChange={e => setVersionName(prev => ({ ...prev, [store.id]: e.target.value }))}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs"
                        disabled={isBuilding || isTriggering}
                      />

                      <button
                        onClick={() => triggerBuild(store)}
                        disabled={isBuilding || isTriggering}
                        className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-md text-xs font-medium hover:bg-[#2d6cb5] transition-colors disabled:opacity-40"
                      >
                        {isTriggering ? 'Encolando…' : isBuilding ? 'Compilando…' : 'Generar build'}
                      </button>

                      {buildStatus === 'success' && store.appConfig?.status !== 'published' && (
                        <button
                          onClick={() => openPublishModal(store)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          Marcar publicada
                        </button>
                      )}

                      {store.appConfig?.status === 'published' && (
                        <button
                          onClick={() => openPublishModal(store)}
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
                          title="Actualizar URL de Play Store"
                        >
                          Editar URL
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Build detail row */}
                  {(store.appConfig?.build?.artifactUrl || store.appConfig?.build?.runUrl || store.appConfig?.build?.lastError) && (
                    <div className="mt-2 pl-[52px] text-xs flex items-center gap-3 flex-wrap">
                      {store.appConfig?.build?.artifactUrl && (
                        <a
                          href={store.appConfig.build.artifactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Descargar AAB ({store.appConfig.build.artifactName || 'app.aab'})
                        </a>
                      )}
                      {store.appConfig?.build?.runUrl && (
                        <a
                          href={store.appConfig.build.runUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Ver logs →
                        </a>
                      )}
                      {store.appConfig?.build?.finishedAt && (
                        <span className="text-gray-400">
                          {buildStatus === 'success' ? 'Completado' : 'Finalizado'}: {fmtDate(store.appConfig.build.finishedAt)}
                        </span>
                      )}
                      {store.appConfig?.build?.lastError && (
                        <span className="text-red-500">Error: {store.appConfig.build.lastError}</span>
                      )}
                    </div>
                  )}
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
