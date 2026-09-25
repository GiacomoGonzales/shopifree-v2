/**
 * Nota y etiquetas del CLIENTE (perfil compartido stores/{id}/customers/{key}).
 *
 * Se usa en la ficha de Clientes y en el panel del cliente de ShopiChat: el doc
 * se escucha en vivo, así que lo que se escribe en un lado aparece en el otro.
 * No confundir con las etiquetas/nota de la CONVERSACIÓN de ShopiChat, que son
 * para ordenar la bandeja y viven en el doc de la conversación.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../ui/Toast'
import { normalizeCustomerKey } from '../../lib/customerKey'
import {
  MAX_CUSTOMER_NOTES,
  MAX_CUSTOMER_TAGS,
  MAX_CUSTOMER_TAG_LENGTH,
  rememberCustomerTags,
  saveCustomerProfile,
  storeCustomerTags,
  subscribeCustomerProfile,
  type CustomerProfile,
} from '../../lib/customerProfile'
import { labelColor } from '../shopichat/utils'

interface Props {
  storeId: string
  /** Teléfono en cualquier formato: de acá sale la clave. */
  phone: string
  name?: string | null
  /** 'panel' = columna angosta de ShopiChat; 'card' = modal de Clientes. */
  variant?: 'panel' | 'card'
}

export default function CustomerProfileEditor(props: Props) {
  const key = normalizeCustomerKey(props.phone)
  if (!key) return null
  // `key` de React: al cambiar de cliente el editor arranca de cero.
  return <Editor key={`${props.storeId}/${key}`} {...props} customerKey={key} />
}

function Editor({ storeId, phone, name, variant = 'card', customerKey: key }: Props & { customerKey: string }) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()
  const [profile, setProfile] = useState<CustomerProfile | null | undefined>(undefined)
  const [noteDraft, setNoteDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [knownTags, setKnownTags] = useState<string[]>([])
  // Última nota guardada que vimos: si el borrador sigue igual a ella, una
  // edición que llega desde la otra pantalla lo reemplaza; si no, se respeta
  // lo que se está escribiendo.
  const baseline = useRef('')

  useEffect(() => {
    return subscribeCustomerProfile(storeId, key, p => {
      setProfile(p)
      const notes = p?.notes || ''
      const prev = baseline.current
      baseline.current = notes
      setNoteDraft(d => (d === prev ? notes : d))
    }, () => setProfile(null))
  }, [storeId, key])

  useEffect(() => {
    let alive = true
    storeCustomerTags(storeId).then(list => { if (alive) setKnownTags(list) })
    return () => { alive = false }
  }, [storeId])

  const tags = useMemo(() => profile?.tags || [], [profile])
  const suggestions = useMemo(() => {
    const q = tagDraft.trim().toLowerCase()
    return knownTags.filter(l => !tags.includes(l) && l.toLowerCase().includes(q)).slice(0, 6)
  }, [knownTags, tags, tagDraft])

  const saveTags = async (next: string[]) => {
    try {
      await saveCustomerProfile(storeId, key, { phone, name, tags: next })
      rememberCustomerTags(storeId, next)
      setKnownTags(prev => [...new Set([...prev, ...next])].sort((a, b) => a.localeCompare(b)))
    } catch {
      showToast(t('customerProfile.tagsError'), 'error')
    }
  }

  const addTag = (raw: string) => {
    const l = raw.trim().slice(0, MAX_CUSTOMER_TAG_LENGTH)
    if (!l || tags.includes(l)) { setTagDraft(''); return }
    if (tags.length >= MAX_CUSTOMER_TAGS) { showToast(t('customerProfile.maxTags', { count: MAX_CUSTOMER_TAGS }), 'error'); return }
    setTagDraft('')
    void saveTags([...tags, l])
  }

  const saveNote = async () => {
    const notes = noteDraft.trim()
    setSavingNote(true)
    try {
      await saveCustomerProfile(storeId, key, { phone, name, notes })
      showToast(notes ? t('customerProfile.noteSaved') : t('customerProfile.noteDeleted'), 'success')
    } catch {
      showToast(t('customerProfile.noteError'), 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const panel = variant === 'panel'
  const title = panel
    ? 'text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA]'
    : 'text-xs font-medium text-[#8898AA] uppercase tracking-wider'
  const inputCls = panel
    ? 'w-full px-3 py-1.5 text-[12.5px] bg-[#F6F9FC] border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]'
    : 'w-full px-3 py-2 bg-white border border-[#E6EBF1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7]'
  const loading = profile === undefined
  const dirty = noteDraft.trim() !== (profile?.notes || '').trim()

  return (
    <div className="space-y-4">
      {/* Etiquetas del cliente */}
      <div>
        <p className={title}>{t('customerProfile.tagsTitle')}</p>
        <div className={`${panel ? 'mt-2.5' : 'mt-2'} flex flex-wrap gap-1.5`}>
          {loading && <span className="h-5 w-24 rounded-full bg-[#F1F5F9] animate-pulse" />}
          {!loading && tags.length === 0 && <span className="text-[12px] text-[#A9B6C6]">{t('customerProfile.noTags')}</span>}
          {tags.map(l => {
            const c = labelColor(l)
            return (
              <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: `${c}1A`, color: c }}>
                {l}
                <button
                  type="button"
                  onClick={() => saveTags(tags.filter(x => x !== l))}
                  className="opacity-60 hover:opacity-100"
                  aria-label={t('customerProfile.removeTag', { tag: l })}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </span>
            )
          })}
        </div>
        <form className="mt-2" onSubmit={e => { e.preventDefault(); addTag(tagDraft) }}>
          <input
            value={tagDraft}
            onChange={e => setTagDraft(e.target.value)}
            placeholder={t('customerProfile.addTag')}
            maxLength={MAX_CUSTOMER_TAG_LENGTH}
            disabled={loading || tags.length >= MAX_CUSTOMER_TAGS}
            className={inputCls}
          />
        </form>
        {suggestions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {suggestions.map(l => (
              <button key={l} type="button" onClick={() => addTag(l)} className="px-2 py-0.5 rounded-full border border-[#E6EBF1] text-[11px] text-[#425466] hover:bg-[#F6F9FC]">
                + {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nota del cliente */}
      <div>
        <p className={title}>{t('customerProfile.noteTitle')}</p>
        <textarea
          value={noteDraft}
          onChange={e => setNoteDraft(e.target.value)}
          rows={3}
          maxLength={MAX_CUSTOMER_NOTES}
          disabled={loading}
          placeholder={t('customerProfile.notePlaceholder')}
          className={`${panel ? 'mt-2.5' : 'mt-2'} ${inputCls} resize-none`}
        />
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <p className="text-[11px] text-[#A9B6C6]">{t('customerProfile.sharedHint')}</p>
          <button
            type="button"
            onClick={saveNote}
            disabled={savingNote || loading || !dirty}
            className="px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[12px] font-semibold disabled:opacity-40 flex-none"
          >
            {t('customerProfile.saveNote')}
          </button>
        </div>
      </div>
    </div>
  )
}
