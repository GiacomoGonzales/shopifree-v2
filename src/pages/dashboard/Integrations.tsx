/**
 * Integraciones
 * ==========================================================================
 * Une lo que antes eran dos entradas del menú lateral — "Integraciones" y
 * "API & Webhooks" — en una sola página con pestañas. Son lo mismo desde el
 * punto de vista del comerciante: conectar Shopifree con algo de afuera.
 *
 * Estilo alineado con el Inicio y la landing: bordes de 1px en #E6EBF1, radios
 * de 14px, nada por encima de semibold y sin iconos SVG. Cada conexión se
 * identifica por su nombre y un punto de color, y muestra si está conectada —
 * dato que la versión anterior no daba, pese a dedicarle una tarjeta de 100px
 * de alto a cada servicio.
 */
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { apiUrl } from '../../utils/apiBase'
import type { Store } from '../../types'

type Tab = 'connections' | 'api'

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

/** Campos de integrations que se editan y guardan juntos. */
type FieldKey =
  | 'googleAnalytics'
  | 'metaPixel'
  | 'tiktokPixel'
  | 'googleSearchConsole'
  | 'cjApiKey'
  | 'printfulToken'

const FIELD_KEYS: FieldKey[] = [
  'googleAnalytics',
  'metaPixel',
  'tiktokPixel',
  'googleSearchConsole',
  'cjApiKey',
  'printfulToken',
]

const EMPTY_FIELDS: Record<FieldKey, string> = {
  googleAnalytics: '',
  metaPixel: '',
  tiktokPixel: '',
  googleSearchConsole: '',
  cjApiKey: '',
  printfulToken: '',
}

/** Color de identidad de cada servicio (el punto a la izquierda del nombre). */
const DOTS: Record<FieldKey, string> = {
  googleAnalytics: '#F9AB00',
  metaPixel: '#1877F2',
  tiktokPixel: '#334155',
  googleSearchConsole: '#4285F4',
  cjApiKey: '#F57C00',
  printfulToken: '#16A34A',
}

const GROUPS: { key: string; fields: FieldKey[] }[] = [
  { key: 'tracking', fields: ['googleAnalytics', 'metaPixel', 'tiktokPixel', 'googleSearchConsole'] },
  { key: 'suppliers', fields: ['cjApiKey', 'printfulToken'] },
]

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] text-[0.8rem] font-mono text-[#1e3a5f] ' +
  'placeholder:text-[#A9B6C6] placeholder:font-sans transition-colors focus:outline-none focus:bg-white ' +
  'focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/15'

export default function Integrations() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // La pestaña vive en la URL para que /dashboard/api pueda redirigir aquí
  // apuntando directo a la sección correcta.
  const tab: Tab = searchParams.get('tab') === 'api' ? 'api' : 'connections'
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'connections') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [fields, setFields] = useState<Record<FieldKey, string>>(EMPTY_FIELDS)
  const [savedFields, setSavedFields] = useState<Record<FieldKey, string>>(EMPTY_FIELDS)
  const [customHeadHtml, setCustomHeadHtml] = useState('')
  const [customBodyHtml, setCustomBodyHtml] = useState('')
  const [savedHtml, setSavedHtml] = useState({ head: '', body: '' })

  const [apiKey, setApiKey] = useState<StoredApiKey | null>(null)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  // La key en claro se muestra UNA vez en el modal. Nunca sale de este estado:
  // el servidor solo guarda su hash SHA-256.
  const [plainKey, setPlainKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    let cancelled = false
    const findStore = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'stores'), where('ownerId', '==', firebaseUser.uid)))
        if (cancelled) return
        if (snap.empty) {
          setLoading(false)
          return
        }
        const data = snap.docs[0].data() as Store
        setStoreId(snap.docs[0].id)

        const loaded = { ...EMPTY_FIELDS }
        for (const key of FIELD_KEYS) loaded[key] = data.integrations?.[key] || ''
        setFields(loaded)
        setSavedFields(loaded)

        const head = data.integrations?.customHeadHtml || ''
        const body = data.integrations?.customBodyHtml || ''
        setCustomHeadHtml(head)
        setCustomBodyHtml(body)
        setSavedHtml({ head, body })
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    findStore()
    return () => {
      cancelled = true
    }
  }, [firebaseUser])

  // Suscripción a la tienda: /api/api-keys escribe la key nueva del lado del
  // servidor, así que el bloque de la API se refresca solo.
  useEffect(() => {
    if (!storeId) return
    const unsub = onSnapshot(doc(db, 'stores', storeId), snap => {
      setApiKey((snap.data() as Store | undefined)?.apiKey ?? null)
    })
    return () => unsub()
  }, [storeId])

  const dirty =
    FIELD_KEYS.some(k => fields[k] !== savedFields[k]) ||
    customHeadHtml !== savedHtml.head ||
    customBodyHtml !== savedHtml.body

  const handleSave = async () => {
    if (!storeId) return
    setSaving(true)
    try {
      const payload: Record<string, string | null> = {}
      for (const key of FIELD_KEYS) payload[key] = fields[key].trim() || null
      payload.customHeadHtml = customHeadHtml.trim() || null
      payload.customBodyHtml = customBodyHtml.trim() || null

      await updateDoc(doc(db, 'stores', storeId), { integrations: payload, updatedAt: new Date() })

      const trimmed = { ...EMPTY_FIELDS }
      for (const key of FIELD_KEYS) trimmed[key] = fields[key].trim()
      setFields(trimmed)
      setSavedFields(trimmed)
      setSavedHtml({ head: customHeadHtml.trim(), body: customBodyHtml.trim() })
      showToast(t('integrations.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving:', error)
      showToast(t('integrations.toast.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

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
    if (apiKey && !window.confirm(t('integrations.api.confirmRegenerate'))) return
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
    if (!window.confirm(t('integrations.api.confirmRevoke'))) return
    setRevoking(true)
    try {
      await callApi('revoke')
      showToast(t('integrations.api.revoked'), 'success')
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
      showToast(t('integrations.api.copyFailed'), 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-3xl space-y-5 text-[#1e3a5f]">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{t('integrations.title')}</h1>
            <p className="text-[0.82rem] mt-0.5 font-normal text-[#8898AA]">{t('integrations.subtitle')}</p>
          </div>
          {tab === 'connections' && (
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-4 py-2.5 rounded-xl text-white text-[0.82rem] font-semibold shrink-0 transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }}
            >
              {saving ? t('integrations.saving') : dirty ? t('integrations.saveChanges') : t('integrations.saved')}
            </button>
          )}
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] self-start w-fit">
          {(['connections', 'api'] as Tab[]).map(id => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3.5 py-1.5 rounded-lg text-[0.78rem] transition-all ${
                tab === id
                  ? 'bg-white text-[#1e3a5f] shadow-sm font-semibold'
                  : 'text-[#8898AA] hover:text-[#425466] font-medium'
              }`}
            >
              {t(`integrations.tabs.${id}`)}
            </button>
          ))}
        </div>

        {tab === 'connections' ? (
          <>
            {GROUPS.map(group => (
              <div key={group.key}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] mb-2">
                  {t(`integrations.groups.${group.key}`)}
                </p>
                <div className="bg-white rounded-[14px] border border-[#E6EBF1] divide-y divide-[#EEF2F6]">
                  {group.fields.map(key => {
                    const connected = !!fields[key].trim()
                    return (
                      <div key={key} className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-[0.86rem] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DOTS[key] }} />
                              {t(`integrations.${key}.title`)}
                            </p>
                            <p className="text-[0.78rem] mt-1 font-normal text-[#8898AA]">
                              {t(`integrations.${key}.description`)}
                            </p>
                          </div>
                          {/* Estado de un vistazo: antes había que leer si el campo tenía algo. */}
                          <span
                            className="text-[0.64rem] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap shrink-0"
                            style={
                              connected
                                ? { background: '#DCFCE7', color: '#15803D' }
                                : { background: '#F1F5F9', color: '#8898AA' }
                            }
                          >
                            {connected ? t('integrations.connected') : t('integrations.notConnected')}
                          </span>
                        </div>
                        <div className="mt-3">
                          <label className="block text-[0.7rem] font-medium text-[#8898AA] mb-1.5">
                            {t(`integrations.${key}.label`)}
                          </label>
                          <input
                            type="text"
                            value={fields[key]}
                            onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={t(`integrations.${key}.placeholder`)}
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Código HTML personalizado */}
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] mb-2">
                {t('integrations.groups.code')}
              </p>
              <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
                <p className="text-[0.86rem] font-semibold">{t('integrations.customHeadHtml.title')}</p>
                <p className="text-[0.78rem] mt-1 font-normal text-[#8898AA]">
                  {t('integrations.customHeadHtml.description')}
                </p>

                <p
                  className="mt-3 rounded-xl px-3 py-2.5 text-[0.74rem] font-medium"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
                >
                  {t('integrations.customHeadHtml.warning')}
                </p>

                <div className="mt-4 space-y-4">
                  {(
                    [
                      {
                        label: t('integrations.customHeadHtml.headLabel'),
                        value: customHeadHtml,
                        set: setCustomHeadHtml,
                        placeholder: '<meta name="example-site-verification" content="abc123" />',
                      },
                      {
                        label: t('integrations.customHeadHtml.bodyLabel'),
                        value: customBodyHtml,
                        set: setCustomBodyHtml,
                        placeholder: '<script type="text/javascript">TrustLogo("...", "...", "...")</script>',
                      },
                    ] as const
                  ).map(area => (
                    <div key={area.label}>
                      <label className="block text-[0.7rem] font-medium text-[#8898AA] mb-1.5">{area.label}</label>
                      <textarea
                        value={area.value}
                        onChange={e => area.set(e.target.value)}
                        placeholder={area.placeholder}
                        rows={5}
                        className={`${INPUT_CLASS} resize-y`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p
              className="rounded-[14px] px-4 py-3.5 text-[0.8rem] font-normal"
              style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0C4A6E' }}
            >
              <span className="font-semibold">{t('integrations.api.whatFor')}</span>{' '}
              {t('integrations.api.whatForBody')}
            </p>

            <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.86rem] font-semibold">{t('integrations.api.keyTitle')}</p>
                {apiKey && (
                  <span
                    className="text-[0.64rem] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
                    style={{ background: '#DCFCE7', color: '#15803D' }}
                  >
                    {t('integrations.api.active')}
                  </span>
                )}
              </div>

              {!apiKey ? (
                <div className="mt-4 text-center py-6">
                  <p className="text-[0.82rem] font-normal text-[#8898AA] mb-4">{t('integrations.api.noKey')}</p>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-4 py-2.5 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }}
                  >
                    {generating ? t('integrations.api.generating') : t('integrations.api.generate')}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[0.7rem] font-medium text-[#8898AA] mb-1.5">{t('integrations.api.identifier')}</p>
                    <code
                      className="inline-block px-3 py-2 rounded-xl text-[0.8rem] font-mono"
                      style={{ background: '#F6F9FC', border: '1px solid #E6EBF1' }}
                    >
                      {apiKey.prefix}…
                    </code>
                    <p className="text-[0.74rem] mt-2 font-normal text-[#8898AA]">{t('integrations.api.hashOnly')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[0.7rem] font-medium text-[#8898AA] mb-0.5">{t('integrations.api.created')}</p>
                      <p className="text-[0.8rem] font-semibold">
                        {toDate(apiKey.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-medium text-[#8898AA] mb-0.5">{t('integrations.api.lastUsed')}</p>
                      <p className="text-[0.8rem] font-semibold">
                        {apiKey.lastUsedAt
                          ? toDate(apiKey.lastUsedAt).toLocaleString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : t('integrations.api.never')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-[#EEF2F6]">
                    <button
                      onClick={handleGenerate}
                      disabled={generating || revoking}
                      className="px-3 py-1.5 rounded-lg text-[0.76rem] font-semibold transition-colors disabled:opacity-50 hover:bg-[#F6F9FC]"
                      style={{ border: '1px solid #E6EBF1', color: '#425466' }}
                    >
                      {generating ? t('integrations.api.regenerating') : t('integrations.api.regenerate')}
                    </button>
                    <button
                      onClick={handleRevoke}
                      disabled={generating || revoking}
                      className="px-3 py-1.5 rounded-lg text-[0.76rem] font-semibold transition-colors disabled:opacity-50 hover:bg-[#FEF2F2] hover:text-[#B91C1C] hover:border-[#FECACA]"
                      style={{ border: '1px solid #E6EBF1', color: '#425466' }}
                    >
                      {revoking ? t('integrations.api.revoking') : t('integrations.api.revoke')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[0.8rem] font-normal text-[#8898AA]">
              {t('integrations.api.docs')}{' '}
              <a
                href="/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0284C7] hover:text-[#1e3a5f] transition-colors"
              >
                shopifree.app/api-docs
              </a>
            </p>
          </>
        )}
      </div>

      {/* Modal con la key en claro — se muestra una sola vez */}
      {plainKey && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPlainKey(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg text-[#1e3a5f]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#EEF2F6]">
              <h2 className="text-base font-semibold">{t('integrations.api.modalTitle')}</h2>
              <p className="text-[0.78rem] mt-0.5 font-normal text-[#8898AA]">{t('integrations.api.modalSubtitle')}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p
                className="rounded-xl px-3 py-2.5 text-[0.74rem] font-medium"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
              >
                {t('integrations.api.modalWarning')}
              </p>
              <div>
                <label className="block text-[0.7rem] font-medium text-[#8898AA] mb-1.5">
                  {t('integrations.api.keyTitle')}
                </label>
                <div className="flex items-stretch rounded-xl overflow-hidden" style={{ border: '1px solid #E6EBF1' }}>
                  <code className="flex-1 px-3 py-2.5 text-[0.8rem] font-mono break-all" style={{ background: '#F6F9FC' }}>
                    {plainKey}
                  </code>
                  <button
                    onClick={copyPlainKey}
                    className="px-4 text-[0.76rem] font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
                    style={{ background: copied ? '#16A34A' : '#1e3a5f' }}
                  >
                    {copied ? t('home.actions.copied') : t('home.actions.copy')}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#EEF2F6] flex justify-end">
              <button
                onClick={() => setPlainKey(null)}
                className="px-4 py-2 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#1e3a5f' }}
              >
                {t('home.actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
