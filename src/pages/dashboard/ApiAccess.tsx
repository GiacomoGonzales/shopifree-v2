import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { apiUrl } from '../../utils/apiBase'
import type { Store } from '../../types'

/**
 * API & Webhooks — merchant-facing page for managing the public Shopifree
 * API key. The key lets external tools (Cobrify, custom POS/ERP, etc.)
 * push products and pull orders.
 *
 * UX:
 *  - No key yet → big CTA "Generate API key"
 *  - Key exists → show prefix (e.g. "sfk_a1b2c3...") + dates + Regenerate / Revoke
 *  - On generate → modal shows plain key ONCE with copy button + warning
 *
 * Plain key is never persisted to React state beyond the one-time modal —
 * the server only stores its SHA-256 hash, so once the modal is dismissed
 * the key is gone forever. Regenerating creates a new one and invalidates
 * the previous.
 */

interface StoredApiKey {
  prefix: string
  createdAt: Date | { toDate: () => Date } | string
  lastUsedAt?: Date | { toDate: () => Date } | string | null
}

const toDate = (d: StoredApiKey['createdAt']): Date => {
  if (d instanceof Date) return d
  if (typeof d === 'object' && d !== null && 'toDate' in d) return d.toDate()
  return new Date(d as string)
}

export default function ApiAccess() {
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<StoredApiKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  // Plain key shown ONCE in the modal after generation. We never store this
  // anywhere persistent — it lives only in this state and gets cleared when
  // the user dismisses the modal.
  const [plainKey, setPlainKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Find the merchant's store id, then subscribe to it so the apiKey block
  // refreshes when /api/api-keys writes a new one.
  useEffect(() => {
    if (!firebaseUser) return
    const findStore = async () => {
      const storesRef = collection(db, 'stores')
      const q = query(storesRef, where('ownerId', '==', firebaseUser.uid))
      const snap = await getDocs(q)
      if (snap.empty) {
        setLoading(false)
        return
      }
      setStoreId(snap.docs[0].id)
    }
    findStore()
  }, [firebaseUser])

  useEffect(() => {
    if (!storeId) return
    const unsub = onSnapshot(doc(db, 'stores', storeId), snap => {
      const data = snap.data() as Store | undefined
      setApiKey(data?.apiKey ?? null)
      setLoading(false)
    })
    return () => unsub()
  }, [storeId])

  const callApi = useCallback(
    async (action: 'generate' | 'revoke') => {
      if (!firebaseUser) throw new Error('Not authenticated')
      const token = await firebaseUser.getIdToken()
      const res = await fetch(apiUrl('/api/api-keys'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data
    },
    [firebaseUser]
  )

  const handleGenerate = async () => {
    if (apiKey) {
      const ok = window.confirm(
        'Ya tienes una API key activa. Generar una nueva DESACTIVA la anterior — cualquier integración que la esté usando dejará de funcionar inmediatamente. Continuar?'
      )
      if (!ok) return
    }
    setGenerating(true)
    try {
      const data = await callApi('generate')
      setPlainKey(data.plainKey)
      setCopied(false)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'desconocido'}`, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async () => {
    const ok = window.confirm(
      'Revocar la API key? Cualquier integración que la esté usando dejará de funcionar inmediatamente. Esta acción no se puede deshacer (tendrás que generar una nueva).'
    )
    if (!ok) return
    setRevoking(true)
    try {
      await callApi('revoke')
      showToast('API key revocada', 'success')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'desconocido'}`, 'error')
    } finally {
      setRevoking(false)
    }
  }

  const copyPlainKey = async () => {
    if (!plainKey) return
    try {
      await navigator.clipboard.writeText(plainKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('No pude copiar — selecciona el texto manualmente', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">API & Webhooks</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Conecta herramientas externas (ERP, POS, sistema de facturación) a tu tienda Shopifree.
        </p>
      </div>

      {/* What is this card */}
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">¿Para qué sirve?</p>
        <p>
          Una API key permite que sistemas externos suban productos a tu catálogo y reciban
          los pedidos que entran por tu tienda. Útil si gestionás tu inventario/facturación
          desde otro lado y querés que Shopifree sea solo la cara visible.
        </p>
      </div>

      {/* Active key card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">API key</h2>
          {apiKey && (
            <span className="px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide bg-green-50 text-green-800 border border-green-200">
              Activa
            </span>
          )}
        </div>

        {!apiKey ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500 mb-4">No tienes una API key generada todavía.</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {generating ? 'Generando…' : 'Generar API key'}
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">Identificador</p>
              <code className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                {apiKey.prefix}…
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Por seguridad solo guardamos un hash. Si perdiste el key completo, regenera una nueva.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-500 mb-0.5">Creada</p>
                <p className="text-gray-900 font-medium">
                  {toDate(apiKey.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Último uso</p>
                <p className="text-gray-900 font-medium">
                  {apiKey.lastUsedAt
                    ? toDate(apiKey.lastUsedAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Nunca'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleGenerate}
                disabled={generating || revoking}
                className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {generating ? 'Regenerando…' : 'Regenerar'}
              </button>
              <button
                onClick={handleRevoke}
                disabled={generating || revoking}
                className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revocando…' : 'Revocar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Docs link */}
      <div className="text-sm text-gray-500">
        Documentación de la API:{' '}
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-900 underline hover:no-underline"
        >
          api-docs
        </a>
        {' '}(próximamente)
      </div>

      {/* One-time plain key modal */}
      {plainKey && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setPlainKey(null)}
        >
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Tu nueva API key</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cópiala ahora — no la podrás ver de nuevo.
              </p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-900">
                <p className="font-medium mb-0.5">Guárdala en un lugar seguro</p>
                <p>
                  Por seguridad no almacenamos el key completo. Si la perdés tenés que generar
                  una nueva (y reconfigurar tus integraciones).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                  API key
                </label>
                <div className="flex items-stretch border border-gray-200 rounded-md overflow-hidden">
                  <code className="flex-1 px-3 py-2 text-sm font-mono text-gray-900 bg-gray-50 break-all">
                    {plainKey}
                  </code>
                  <button
                    onClick={copyPlainKey}
                    className="px-3 bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copiada
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPlainKey(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
