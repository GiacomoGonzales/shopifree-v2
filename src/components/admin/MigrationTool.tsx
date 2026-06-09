/**
 * MigrationTool — migración Cloudinary → Cloudflare R2, tienda por tienda.
 *
 * Solo admin. Llama a /api/admin-migrate-store-r2:
 *  - "Analizar": cuenta cuántas imágenes de Cloudinary tiene la tienda (no mueve nada).
 *  - "Migrar": copia esas imágenes a R2 en tandas (limit) hasta terminar, con
 *    respaldo y SIN borrar nada de Cloudinary. Muestra el progreso.
 */

import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiUrl } from '../../utils/apiBase'

interface StoreOpt { id: string; name: string }
interface Props { stores: StoreOpt[] }

interface Analysis { storeName: string; totalCloudinary: number; products: number; categories: number }

export default function MigrationTool({ stores }: Props) {
  const { firebaseUser } = useAuth()
  const [storeId, setStoreId] = useState('')
  const [filter, setFilter] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState<'analyze' | 'migrate' | null>(null)
  const [progress, setProgress] = useState<{ migrated: number; total: number; errors: number } | null>(null)
  const [log, setLog] = useState<string>('')

  const options = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = f ? stores.filter(s => s.name.toLowerCase().includes(f) || s.id.toLowerCase().includes(f)) : stores
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [stores, filter])

  const post = async (body: Record<string, unknown>) => {
    const token = await firebaseUser?.getIdToken()
    const res = await fetch(apiUrl('/api/admin-migrate-store-r2'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  }

  const analyze = async () => {
    if (!storeId) return
    setBusy('analyze'); setAnalysis(null); setProgress(null); setLog('')
    try {
      const d = await post({ storeId, dryRun: true })
      setAnalysis({ storeName: d.storeName, totalCloudinary: d.totalCloudinary, products: d.products, categories: d.categories })
    } catch (e) {
      setLog('Error: ' + (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const migrate = async () => {
    if (!storeId) return
    setBusy('migrate'); setProgress(null); setLog('Migrando…')
    try {
      let migrated = 0, errors = 0, total = analysis?.totalCloudinary || 0
      for (let i = 0; i < 500; i++) {
        const d = await post({ storeId, limit: 60 })
        if (i === 0) total = d.totalCloudinary
        migrated += d.migrated
        errors += d.errors || 0
        setProgress({ migrated, total, errors })
        if (d.done || d.migrated === 0) {
          setLog(`✅ Listo. ${migrated} imágenes movidas a Cloudflare${errors ? ` · ${errors} con error (quedaron en Cloudinary)` : ''}.`)
          break
        }
      }
      // refrescar el análisis para ver lo que queda
      try {
        const d = await post({ storeId, dryRun: true })
        setAnalysis({ storeName: d.storeName, totalCloudinary: d.totalCloudinary, products: d.products, categories: d.categories })
      } catch { /* noop */ }
    } catch (e) {
      setLog('Error: ' + (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.migrated / progress.total) * 100)) : 0

  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <h2 className="text-base font-semibold text-gray-900">Migración a Cloudflare R2</h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Mueve las imágenes de una tienda desde Cloudinary al depósito nuevo. Guarda respaldo y no borra nada de Cloudinary.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar tienda por nombre o id…"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg sm:w-64"
        />
        <select
          value={storeId}
          onChange={e => { setStoreId(e.target.value); setAnalysis(null); setProgress(null); setLog('') }}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="">— Elige una tienda ({options.length}) —</option>
          {options.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id.slice(0, 6)}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={analyze}
          disabled={!storeId || busy !== null}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === 'analyze' ? 'Analizando…' : 'Analizar'}
        </button>
        <button
          onClick={migrate}
          disabled={!storeId || busy !== null || (analysis !== null && analysis.totalCloudinary === 0)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
        >
          {busy === 'migrate' ? 'Migrando…' : 'Migrar a Cloudflare'}
        </button>
      </div>

      {analysis && (
        <div className="mt-4 text-sm text-gray-700">
          <p><strong>{analysis.storeName}</strong></p>
          <p className="text-gray-600">
            Imágenes en Cloudinary por mover: <strong className={analysis.totalCloudinary === 0 ? 'text-green-600' : 'text-amber-600'}>{analysis.totalCloudinary}</strong>
            {' '}· {analysis.products} productos · {analysis.categories} categorías
          </p>
          {analysis.totalCloudinary === 0 && <p className="text-green-600 mt-1">✅ Esta tienda ya está 100% en Cloudflare.</p>}
        </div>
      )}

      {progress && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{progress.migrated} / {progress.total} movidas{progress.errors ? ` · ${progress.errors} con error` : ''}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {log && <p className="mt-3 text-sm text-gray-700">{log}</p>}
    </div>
  )
}
