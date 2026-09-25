/**
 * Configuración de ShopiChat: el número conectado, desconectar y las
 * respuestas rápidas (portado de la sección de rápidas de Cobrify,
 * components/chat/ConfiguracionChat.jsx; sin perfil, automáticos ni fondos).
 *
 * Cada respuesta tiene un atajo ("precios") y un texto. En el cuadro de
 * escribir se tipea "/" y el atajo; el texto se pega y se puede editar antes
 * de mandar. `{nombre}` se reemplaza por el primer nombre del cliente.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { disconnectAccount, formatPhone, saveQuickReplies, toDate } from '../../lib/shopichatService'
import type { WaAccount, WaQuickReply } from '../../types/shopichat'
import { useToast } from '../ui/Toast'
import SoundButton from './SoundButton'
import { IconArrowLeft, IconPencil, IconPlus, IconTrash, IconWhatsApp } from './icons'

/** "Precios Lima" → "precios-lima": sin espacios ni tildes, que se tipea rápido. */
const normalizeShortcut = (s: string) =>
  s.trim().toLowerCase().replace(/^\/+/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 30)

interface Props {
  storeId: string
  account: WaAccount
  quickReplies: WaQuickReply[]
  onBack: () => void
}

interface Draft { original: string | null; shortcut: string; text: string }

export default function SettingsPanel({ storeId, account, quickReplies, onBack }: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const { showToast } = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const shortcut = draft ? normalizeShortcut(draft.shortcut) : ''
  const taken = Boolean(draft && shortcut && quickReplies.some(r => r.shortcut === shortcut && r.shortcut !== draft.original))
  const canSave = Boolean(draft && shortcut && draft.text.trim() && !taken && !saving)

  const persist = async (list: WaQuickReply[], okMsg: string) => {
    setSaving(true)
    try {
      await saveQuickReplies(storeId, list)
      showToast(okMsg, 'success')
      return true
    } catch {
      showToast(t('shopichat.settings.saveError'), 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!draft || !canSave) return
    const r = { shortcut, text: draft.text.trim() }
    const i = draft.original ? quickReplies.findIndex(x => x.shortcut === draft.original) : -1
    const next = i >= 0 ? quickReplies.map((x, k) => (k === i ? r : x)) : [...quickReplies, r]
    if (await persist(next, t('shopichat.settings.saved', { shortcut: `/${r.shortcut}` }))) setDraft(null)
  }

  const remove = async (s: string) => {
    if (!window.confirm(t('shopichat.settings.confirmDelete', { shortcut: `/${s}` }))) return
    await persist(quickReplies.filter(x => x.shortcut !== s), t('shopichat.settings.deleted', { shortcut: `/${s}` }))
    if (draft?.original === s) setDraft(null)
  }

  const disconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectAccount(storeId)
      showToast(t('shopichat.settings.disconnected'), 'success')
    } catch (e) {
      showToast((e as Error).message || t('shopichat.settings.disconnectError'), 'error')
    } finally {
      setDisconnecting(false)
      setConfirmDisconnect(false)
    }
  }

  const connectedAt = toDate(account.connectedAt)
  const card = 'bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5'

  const form = draft && (
    <div className="rounded-xl border border-[#38bdf8]/40 bg-[#F0F9FF]/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-mono font-semibold text-[#0284C7]">/</span>
        <input
          autoFocus
          value={draft.shortcut}
          onChange={e => setDraft({ ...draft, shortcut: e.target.value })}
          placeholder={t('shopichat.settings.shortcutPlaceholder')}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-[13px] font-mono bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]"
        />
      </div>
      {taken && <p className="text-[11.5px] text-red-600">{t('shopichat.settings.taken', { shortcut: `/${shortcut}` })}</p>}
      <textarea
        value={draft.text}
        onChange={e => setDraft({ ...draft, text: e.target.value })}
        rows={4}
        placeholder={t('shopichat.settings.textPlaceholder')}
        className="w-full px-3 py-2 text-[13px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8] resize-y"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 text-[12.5px] font-medium text-[#425466] hover:bg-white rounded-lg">
          {t('shopichat.common.cancel')}
        </button>
        <button type="button" onClick={save} disabled={!canSave} className="px-3 py-1.5 text-[12.5px] font-semibold bg-[#1e3a5f] text-white rounded-lg disabled:opacity-40">
          {t('shopichat.common.save')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafbfc]">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E6EBF1] px-4 py-3 flex items-center gap-2">
        <button type="button" onClick={onBack} className="p-1 -ml-1 text-[#425466] rounded-lg hover:bg-[#F6F9FC]" aria-label={t('shopichat.common.back')}>
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-[#1e3a5f]">{t('shopichat.settings.title')}</h2>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Número conectado */}
        <section className={card}>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA]">{t('shopichat.settings.number')}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white grid place-items-center flex-none">
              <IconWhatsApp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#1e3a5f] truncate">{account.verifiedName || '—'}</p>
              <p className="text-[12.5px] text-[#8898AA]">{account.displayNumber || formatPhone(account.phoneNumberId)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold">{t('shopichat.settings.connected')}</span>
            {account.coexistence && (
              <span className="px-2 py-0.5 rounded-full bg-[#F0F9FF] text-[#0284C7] text-[11px] font-semibold">{t('shopichat.settings.coexistence')}</span>
            )}
          </div>
          {connectedAt && (
            <p className="mt-2 text-[11.5px] text-[#A9B6C6]">{t('shopichat.settings.connectedAt', { date: connectedAt.toLocaleDateString(i18n.language) })}</p>
          )}
          <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
            {confirmDisconnect ? (
              <div className="space-y-2">
                <p className="text-[12.5px] text-[#425466]">{t('shopichat.settings.disconnectConfirm')}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={disconnect} disabled={disconnecting} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[12.5px] font-semibold disabled:opacity-50">
                    {disconnecting ? t('shopichat.common.loading') : t('shopichat.settings.disconnectYes')}
                  </button>
                  <button type="button" onClick={() => setConfirmDisconnect(false)} className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-[#425466] hover:bg-[#F6F9FC]">
                    {t('shopichat.common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDisconnect(true)} className="text-[12.5px] font-medium text-red-600 hover:underline">
                {t('shopichat.settings.disconnect')}
              </button>
            )}
          </div>
        </section>

        {/* Sonido */}
        <section className={`${card} flex items-center justify-between gap-3`}>
          <div>
            <p className="text-[13px] font-semibold text-[#1e3a5f]">{t('shopichat.settings.soundTitle')}</p>
            <p className="text-[12px] text-[#8898AA]">{t('shopichat.settings.soundBody')}</p>
          </div>
          <SoundButton />
        </section>

        {/* Respuestas rápidas */}
        <section className={card}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA]">{t('shopichat.settings.quickReplies')}</p>
            {!draft && (
              <button
                type="button"
                onClick={() => setDraft({ original: null, shortcut: '', text: '' })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6EBF1] text-[12px] font-medium text-[#1e3a5f] hover:bg-[#F6F9FC]"
              >
                <IconPlus className="w-3.5 h-3.5" />
                {t('shopichat.settings.newReply')}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-[#8898AA]">{t('shopichat.settings.quickRepliesHelp')}</p>
          <div className="mt-3 space-y-2">
            {draft && !draft.original && form}
            {quickReplies.length === 0 && !draft && <p className="text-[12.5px] text-[#A9B6C6] py-2">{t('shopichat.settings.noReplies')}</p>}
            {quickReplies.map(r => (
              draft?.original === r.shortcut ? (
                <div key={r.shortcut}>{form}</div>
              ) : (
                <div key={r.shortcut} className="rounded-xl border border-[#E6EBF1] p-3 flex items-start gap-3">
                  <span className="font-mono text-[12.5px] font-semibold text-[#0284C7] bg-[#F0F9FF] px-2 py-0.5 rounded flex-none">/{r.shortcut}</span>
                  <p className="flex-1 min-w-0 text-[12.5px] text-[#425466] whitespace-pre-wrap break-words line-clamp-3">{r.text}</p>
                  <div className="flex items-center gap-0.5 flex-none">
                    <button type="button" onClick={() => setDraft({ original: r.shortcut, shortcut: r.shortcut, text: r.text })} className="p-1.5 text-[#A9B6C6] hover:text-[#1e3a5f] rounded-md hover:bg-[#F6F9FC]" aria-label={t('shopichat.common.edit')}>
                      <IconPencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(r.shortcut)} className="p-1.5 text-[#A9B6C6] hover:text-red-600 rounded-md hover:bg-red-50" aria-label={t('shopichat.common.delete')}>
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
