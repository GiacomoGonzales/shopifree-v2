import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { Store, Product } from '../../types'

type StoreLite = Store & { id: string }

interface StoreMediaRow {
  id: string
  name: string
  subdomain: string
  plan: string
  country: string
  productCount: number
  videoCount: number
  imageCount: number
}

interface CountryMedia {
  code: string
  videos: number
  images: number
}

interface MediaStats {
  totalStores: number
  storesWithMedia: number
  totalProducts: number
  productsWithVideo: number
  productsWithGallery: number
  totalVideos: number
  totalImages: number
  perStore: StoreMediaRow[]
  perCountry: CountryMedia[]
  loadedAt: number
  durationMs: number
}

// Response from /api/admin-cloudinary-stats
interface CloudinaryStats {
  usage: {
    plan: string | null
    last_updated: string | null
    storage_bytes: number
    bandwidth_bytes_this_month: number
    bandwidth_limit_bytes: number | null
    transformations_this_month: number
    transformations_limit: number | null
    total_objects: number
    credits_used: number | null
    credits_limit: number | null
  }
  formatBreakdown: Record<string, { count: number; bytes: number }>
  counts: {
    images: number
    videos: number
    truncated: boolean
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

const COUNTRY_NAMES: Record<string, string> = {
  CO: 'Colombia',
  PE: 'Peru',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  EC: 'Ecuador',
  VE: 'Venezuela',
  BR: 'Brasil',
  UY: 'Uruguay',
  PY: 'Paraguay',
  BO: 'Bolivia',
  PA: 'Panama',
  CR: 'Costa Rica',
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  NI: 'Nicaragua',
  DO: 'Rep. Dominicana',
  CU: 'Cuba',
  PR: 'Puerto Rico',
  US: 'Estados Unidos',
  ES: 'Espana',
}

function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('')
}

// Counts unique image refs (image + images[] deduplicated) so we don't double-count
// when image equals images[0].
function countProductImages(p: Product): number {
  const set = new Set<string>()
  if (p.image) set.add(p.image)
  if (p.images) p.images.forEach(u => u && set.add(u))
  return set.size
}

// Run promises in batches to avoid hammering Firestore with hundreds of
// concurrent reads when there are many stores.
async function inBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize)
    const part = await Promise.all(slice.map(fn))
    out.push(...part)
  }
  return out
}

type SortKey = 'videos' | 'images' | 'products'

export default function AdminMediaStats() {
  const { localePath } = useLanguage()
  const { firebaseUser } = useAuth()
  const [stats, setStats] = useState<MediaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('videos')

  // Cloudinary stats load separately so the page renders Firestore counts
  // immediately without waiting on the slower Cloudinary API listing.
  const [cloudStats, setCloudStats] = useState<CloudinaryStats | null>(null)
  const [cloudLoading, setCloudLoading] = useState(true)
  const [cloudError, setCloudError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      const t0 = performance.now()
      setLoading(true)
      setError(null)

      try {
        const storesSnap = await getDocs(collection(db, 'stores'))
        const stores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as StoreLite[]

        if (cancelled) return
        setProgress({ done: 0, total: stores.length })

        let processed = 0

        const perStore = await inBatches(stores, 15, async (store) => {
          const productsSnap = await getDocs(collection(db, 'stores', store.id, 'products'))
          let videoCount = 0
          let imageCount = 0
          productsSnap.forEach(p => {
            const data = p.data() as Product
            if (data.video) videoCount++
            imageCount += countProductImages(data)
          })

          processed++
          if (!cancelled) setProgress({ done: processed, total: stores.length })

          return {
            id: store.id,
            name: store.name || '(sin nombre)',
            subdomain: store.subdomain || '',
            plan: store.plan || 'free',
            country: store.location?.country || 'N/A',
            productCount: productsSnap.size,
            videoCount,
            imageCount,
          } satisfies StoreMediaRow
        })

        if (cancelled) return

        // Aggregate totals
        let totalProducts = 0
        let totalVideos = 0
        let totalImages = 0
        let storesWithMedia = 0
        const countryMap = new Map<string, CountryMedia>()

        for (const row of perStore) {
          totalProducts += row.productCount
          totalVideos += row.videoCount
          totalImages += row.imageCount
          if (row.videoCount > 0 || row.imageCount > 0) storesWithMedia++

          const existing = countryMap.get(row.country) || { code: row.country, videos: 0, images: 0 }
          existing.videos += row.videoCount
          existing.images += row.imageCount
          countryMap.set(row.country, existing)
        }

        // productsWithVideo and productsWithGallery require a second pass on raw
        // product data, but we already kept videoCount per store. videoCount ==
        // productsWithVideo for that store, so summing gives the global.
        const productsWithVideo = totalVideos // 1 video per product max
        // productsWithGallery: products where image refs > 1. We don't track this
        // separately yet. Add later if useful.
        const productsWithGallery = 0

        const perCountry = Array.from(countryMap.values())
          .filter(c => c.videos + c.images > 0)
          .sort((a, b) => (b.videos + b.images) - (a.videos + a.images))

        setStats({
          totalStores: stores.length,
          storesWithMedia,
          totalProducts,
          productsWithVideo,
          productsWithGallery,
          totalVideos,
          totalImages,
          perStore,
          perCountry,
          loadedAt: Date.now(),
          durationMs: Math.round(performance.now() - t0),
        })
      } catch (err) {
        console.error('Error fetching media stats:', err)
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  // Fetch real Cloudinary usage + format breakdown from the admin API. Runs
  // in parallel with the Firestore aggregation above; the page shows Firestore
  // numbers as soon as they arrive without waiting on the Cloudinary listing.
  useEffect(() => {
    if (!firebaseUser) return
    let cancelled = false

    const fetchCloudStats = async () => {
      setCloudLoading(true)
      setCloudError(null)
      try {
        const token = await firebaseUser.getIdToken()
        const r = await fetch('/api/admin-cloudinary-stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok) {
          const data = await r.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${r.status}`)
        }
        const data = await r.json() as CloudinaryStats
        if (!cancelled) setCloudStats(data)
      } catch (err) {
        if (!cancelled) setCloudError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        if (!cancelled) setCloudLoading(false)
      }
    }

    fetchCloudStats()
    return () => { cancelled = true }
  }, [firebaseUser])

  const sortedStores = stats ? [...stats.perStore].sort((a, b) => {
    if (sortBy === 'videos') return b.videoCount - a.videoCount
    if (sortBy === 'images') return b.imageCount - a.imageCount
    return b.productCount - a.productCount
  }).slice(0, 20) : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Media Stats</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calculando consumo de imagenes y videos...</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-8 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
          {progress.total > 0 && (
            <p className="text-xs text-gray-500 tabular-nums">
              {progress.done} / {progress.total} tiendas
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Media Stats</h1>
        </div>
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-900">Error cargando estadisticas: {error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Media Stats</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consumo de imagenes y videos por tienda</p>
        </div>
        <p className="text-[11px] text-gray-400 tabular-nums">
          {stats.totalStores} tiendas en {(stats.durationMs / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Productos totales" value={stats.totalProducts} />
        <StatCard label="Imagenes totales" value={stats.totalImages} />
        <StatCard label="Videos totales" value={stats.totalVideos} />
        <StatCard label="Tiendas con media" value={stats.storesWithMedia} sub={`de ${stats.totalStores}`} />
      </div>

      {/* Real Cloudinary usage — bytes, bandwidth, format breakdown */}
      <div className="border border-gray-200 rounded-lg">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-medium text-gray-900">Storage real (Cloudinary)</h2>
          {cloudStats?.usage.last_updated && (
            <p className="text-[11px] text-gray-400 tabular-nums">
              Actualizado: {cloudStats.usage.last_updated}
              {cloudStats.usage.plan && ` · Plan ${cloudStats.usage.plan}`}
            </p>
          )}
        </div>

        {cloudLoading && (
          <div className="p-8 flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-gray-900" />
            <p className="text-[11px] text-gray-500">Consultando API de Cloudinary...</p>
          </div>
        )}

        {cloudError && (
          <div className="p-5 border-b border-gray-200 bg-red-50">
            <p className="text-[12px] text-red-900">
              <strong>Error:</strong> {cloudError}
            </p>
            <p className="text-[11px] text-red-700 mt-1">
              Verifica que las env vars <code>CLOUDINARY_API_KEY</code> y{' '}
              <code>CLOUDINARY_API_SECRET</code> esten configuradas en Vercel y en{' '}
              <code>.env.local</code>.
            </p>
          </div>
        )}

        {cloudStats && (
          <>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-100">
              <StatCard
                label="Storage usado"
                value={cloudStats.usage.storage_bytes}
                formatter="bytes"
              />
              <StatCard
                label="Bandwidth (mes)"
                value={cloudStats.usage.bandwidth_bytes_this_month}
                formatter="bytes"
                sub={cloudStats.usage.bandwidth_limit_bytes ? `de ${formatBytes(cloudStats.usage.bandwidth_limit_bytes)}` : undefined}
              />
              <StatCard
                label="Transformaciones"
                value={cloudStats.usage.transformations_this_month}
                sub={cloudStats.usage.transformations_limit ? `de ${cloudStats.usage.transformations_limit.toLocaleString()}` : undefined}
              />
              <StatCard
                label="Assets totales"
                value={cloudStats.usage.total_objects}
                sub={cloudStats.counts.truncated ? '(parcial)' : undefined}
              />
            </div>

            {/* Format breakdown */}
            {Object.keys(cloudStats.formatBreakdown).length > 0 && (() => {
              const totalBytes = Object.values(cloudStats.formatBreakdown).reduce((s, f) => s + f.bytes, 0) || 1
              const sortedFormats = Object.entries(cloudStats.formatBreakdown)
                .sort((a, b) => b[1].bytes - a[1].bytes)

              return (
                <div className="p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-3">
                    Bytes por formato
                  </p>
                  <div className="space-y-3">
                    {sortedFormats.map(([fmt, data]) => {
                      const percentage = (data.bytes / totalBytes) * 100
                      const isOptimized = fmt === 'webp' || fmt === 'avif'
                      return (
                        <div key={fmt}>
                          <div className="flex justify-between text-[13px] mb-1">
                            <span className="text-gray-700 font-medium uppercase">
                              {fmt}
                              {isOptimized && (
                                <span className="ml-1.5 text-[10px] font-normal text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                  optimizado
                                </span>
                              )}
                            </span>
                            <span className="font-medium text-gray-900 tabular-nums">
                              {formatBytes(data.bytes)}
                              <span className="text-gray-400 ml-1">
                                · {data.count.toLocaleString()} archivos ({percentage.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isOptimized ? 'bg-green-600' : 'bg-gray-900'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {cloudStats.counts.truncated && (
                    <p className="text-[11px] text-gray-500 mt-3">
                      Listado truncado a {cloudStats.counts.images.toLocaleString()} imgs +{' '}
                      {cloudStats.counts.videos.toLocaleString()} videos. La API admin de Cloudinary
                      tiene limites de paginacion.
                    </p>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Firestore reference notice */}
      <div className="border border-gray-200 rounded-lg px-5 py-3 bg-gray-50">
        <p className="text-[12px] text-gray-600 leading-relaxed">
          <strong className="text-gray-900">Nota:</strong> los datos de arriba son storage real
          de Cloudinary. Las tablas de abajo son referencias en Firestore (cuantos productos
          tienen video/imagen). El bandwidth por tienda no es exponible por la API de Cloudinary.
        </p>
      </div>

      {/* Country distribution */}
      {stats.perCountry.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Media por pais</h2>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {stats.perCountry.map(({ code, videos, images }) => {
                const totalMedia = stats.totalImages + stats.totalVideos || 1
                const myMedia = videos + images
                const percentage = Math.round((myMedia / totalMedia) * 100)
                const name = code === 'N/A' ? 'Sin pais' : (COUNTRY_NAMES[code] || code)
                const flag = code === 'N/A' ? '' : countryCodeToFlag(code)

                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center shrink-0">{flag || '—'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="text-gray-600 truncate">{name}</span>
                        <span className="font-medium text-gray-900 shrink-0 ml-2 tabular-nums">
                          {images.toLocaleString()} img · {videos.toLocaleString()} vid
                          <span className="text-gray-400 ml-1">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gray-900 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top stores table */}
      <div className="border border-gray-200 rounded-lg">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-medium text-gray-900">Top tiendas por consumo</h2>
          <div className="flex items-center gap-1 text-[12px]">
            <span className="text-gray-500 mr-1">Ordenar por:</span>
            {(['videos', 'images', 'products'] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {key === 'videos' ? 'Videos' : key === 'images' ? 'Imagenes' : 'Productos'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2 text-left font-medium">Tienda</th>
                <th className="px-3 py-2 text-left font-medium">Plan</th>
                <th className="px-3 py-2 text-right font-medium">Productos</th>
                <th className="px-3 py-2 text-right font-medium">Imagenes</th>
                <th className="px-3 py-2 text-right font-medium">Videos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStores.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to={localePath(`/admin/stores/${row.id}`)}
                      className="text-gray-900 hover:text-gray-600 font-medium block truncate max-w-[260px]"
                    >
                      {row.name}
                    </Link>
                    <span className="text-[11px] text-gray-500 block truncate max-w-[260px]">
                      {row.subdomain ? `${row.subdomain}.shopifree.app` : row.id}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 text-[11px] rounded-sm font-medium capitalize border border-gray-200 text-gray-700">
                      {row.plan}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                    {row.productCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                    {row.imageCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                    {row.videoCount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {sortedStores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                    No hay tiendas con datos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 border-t border-gray-100 text-[11px] text-gray-500">
          Mostrando top 20 — total tiendas: {stats.totalStores}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  formatter,
}: {
  label: string
  value: number
  sub?: string
  formatter?: 'bytes' | 'count'
}) {
  const display = formatter === 'bytes' ? formatBytes(value) : value.toLocaleString()
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-semibold text-gray-900 tabular-nums">{display}</p>
        {sub && <p className="text-[11px] text-gray-400 tabular-nums">{sub}</p>}
      </div>
    </div>
  )
}
