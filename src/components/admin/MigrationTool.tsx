/**
 * MigrationTool — migración Cloudinary → Cloudflare R2, por lotes de tiendas.
 *
 * Solo admin. Llama a /api/admin-migrate-store-r2 por cada tienda seleccionada,
 * en tandas (limit) hasta terminar, con respaldo y SIN borrar nada de Cloudinary.
 *
 * Flujo: marca varias tiendas (botón "Seleccionar 10") → "Migrar seleccionadas".
 * Procesa una tienda a la vez y muestra el resultado de cada una.
 */

import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { apiUrl } from '../../utils/apiBase'

interface StoreOpt { id: string; name: string }
interface Props { stores: StoreOpt[] }

type Status = 'running' | 'done' | 'error'
interface Result { status: Status; migrated: number; errors: number; msg?: string }

export default function MigrationTool({ stores }: Props) {
  const { firebaseUser } = useAuth()
  const [mode, setMode] = useState<'images' | 'videos'>('images')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, Result>>({})
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState<{ i: number; n: number } | null>(null)

  const options = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = f ? stores.filter(s => s.name.toLowerCase().includes(f) || s.id.toLowerCase().includes(f)) : stores
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [stores, filter])

  const post = async (body: Record<string, unknown>) => {
    const token = await firebaseUser?.getIdToken()
    const endpoint = mode === 'videos' ? '/api/admin-migrate-store-videos' : '/api/admin-migrate-store-r2'
    const res = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  }

  const toggle = (id: string) => {
    if (running) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Marca las próximas 10 tiendas (del listado filtrado) que aún no están migradas.
  const selectNext10 = () => {
    if (running) return
    const next = new Set(selected)
    let added = 0
    for (const s of options) {
      if (added >= 10) break
      if (results[s.id]?.status === 'done') continue
      if (!next.has(s.id)) { next.add(s.id); added++ }
    }
    setSelected(next)
  }

  const clearSel = () => { if (!running) setSelected(new Set()) }

  const runMigration = async (ids: string[]) => {
    if (ids.length === 0) return
    setRunning(true)
    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        setCurrent({ i: i + 1, n: ids.length })
        setResults(prev => ({ ...prev, [id]: { status: 'running', migrated: 0, errors: 0 } }))
        let migrated = 0, errors = 0
        try {
          for (let k = 0; k < 500; k++) {
            const d = await post({ storeId: id, limit: 60 })
            migrated += d.migrated
            errors += d.errors || 0
            setResults(prev => ({ ...prev, [id]: { status: 'running', migrated, errors } }))
            if (d.done || d.migrated === 0) break
          }
          setResults(prev => ({ ...prev, [id]: { status: 'done', migrated, errors, msg: errors ? `${errors} con error` : undefined } }))
        } catch (e) {
          setResults(prev => ({ ...prev, [id]: { status: 'error', migrated, errors, msg: (e as Error).message } }))
        }
      }
    } finally {
      setRunning(false)
      setCurrent(null)
      setSelected(new Set())
    }
  }

  const migrateSelected = () => runMigration([...selected])

  // Masivo: todas las tiendas visibles que aún no estén migradas en esta sesión.
  const pendingAll = useMemo(
    () => options.filter(s => results[s.id]?.status !== 'done').map(s => s.id),
    [options, results]
  )
  const migrateAll = () => {
    if (pendingAll.length === 0) return
    const label = mode === 'videos' ? 'videos' : 'fotos'
    if (!window.confirm(`Vas a migrar ${label} de ${pendingAll.length} tiendas, una por una. Puede tardar varios minutos y no debes cerrar esta pestaña. ¿Continuar?`)) return
    runMigration(pendingAll)
  }

  const doneCount = Object.values(results).filter(r => r.status === 'done').length

  const badge = (id: string) => {
    const r = results[id]
    if (!r) return null
    if (r.status === 'running') return <span className="text-[11px] text-blue-600">migrando… {r.migrated}</span>
    if (r.status === 'done') return <span className="text-[11px] text-green-600">✅ {r.migrated} movidas{r.msg ? ` · ${r.msg}` : ''}</span>
    return <span className="text-[11px] text-red-600">⚠️ {r.msg}</span>
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Migración a Cloudflare</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Marca tiendas y migra su media de Cloudinary {mode === 'videos' ? 'a Cloudflare Stream' : 'a R2'}. Guarda respaldo y no borra nada de Cloudinary.
          </p>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{doneCount} migradas esta sesión</span>
      </div>

      {/* Selector Fotos / Videos */}
      <div className="inline-flex mt-3 rounded-lg border border-gray-200 overflow-hidden text-sm">
        {(['images', 'videos'] as const).map(m => (
          <button
            key={m}
            onClick={() => { if (running) return; setMode(m); setSelected(new Set()); setResults({}) }}
            disabled={running}
            className={`px-4 py-1.5 ${mode === m ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} disabled:opacity-50`}
          >
            {m === 'images' ? '📷 Fotos (R2)' : '🎬 Videos (Stream)'}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar tienda…"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-48"
        />
        <button onClick={selectNext10} disabled={running} className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50">
          Seleccionar 10
        </button>
        <button onClick={clearSel} disabled={running || selected.size === 0} className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50">
          Limpiar
        </button>
        <button onClick={migrateSelected} disabled={running || selected.size === 0} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50">
          {running ? 'Migrando…' : `Migrar seleccionadas (${selected.size})`}
        </button>
        <button onClick={migrateAll} disabled={running || pendingAll.length === 0} className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50" title="Migra todas las tiendas visibles que falten">
          {running ? 'Migrando…' : `Migrar TODAS (${pendingAll.length})`}
        </button>
        {current && <span className="text-xs text-gray-500">Tienda {current.i} de {current.n}…</span>}
      </div>

      {/* Lista de tiendas con casillas */}
      <div className="mt-3 border border-gray-100 rounded-lg max-h-80 overflow-y-auto divide-y divide-gray-100">
        {options.map(s => {
          const r = results[s.id]
          const rowDone = r?.status === 'done'
          return (
            <label
              key={s.id}
              className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${rowDone ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                disabled={running}
                className="w-4 h-4"
              />
              <span className="flex-1 truncate text-gray-800">{s.name}</span>
              <span className="text-[10px] text-gray-400 font-mono">{s.id.slice(0, 6)}</span>
              {badge(s.id)}
            </label>
          )
        })}
        {options.length === 0 && <p className="px-3 py-4 text-sm text-gray-400">Sin tiendas que coincidan.</p>}
      </div>
    </div>
  )
}
