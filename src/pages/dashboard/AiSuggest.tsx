import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { auth } from '../../lib/firebase'
import { apiUrl } from '../../utils/apiBase'

/**
 * "Sugerir con IA" del editor en vivo (solo plan Business): pide 3 propuestas
 * a /api/ai-text y aplica la que se elija. El plan lo valida el servidor; aca
 * solo se muestra el boton bloqueado en los otros planes.
 */
export type AiTextField = 'slogan' | 'description' | 'announcement' | 'productDescription'

interface Props {
  storeId: string
  field: AiTextField
  productId?: string
  /** Plan Business activo. */
  enabled: boolean
  upgradeHref: string
  onPick: (text: string) => void
}

export default function AiSuggest({ storeId, field, productId, enabled, upgradeHref, onPick }: Props) {
  const { t } = useTranslation('dashboard')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState('')

  if (!enabled) {
    return (
      <p className="mt-1 text-[0.7rem] text-[#8898AA]">
        ✨ {t('liveEditor.ai.businessOnly')}{' '}
        <a href={upgradeHref} className="font-semibold text-[#2d6cb5] hover:underline">{t('liveEditor.upgrade')}</a>
      </p>
    )
  }

  const ask = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await auth?.currentUser?.getIdToken()
      if (!token) throw new Error('auth')
      const res = await fetch(apiUrl('/api/ai-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId, field, productId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(t(data?.error === 'LIMIT_REACHED' ? 'liveEditor.ai.limit' : data?.error === 'PLAN_REQUIRED' ? 'liveEditor.ai.businessOnly' : 'liveEditor.ai.error'))
        return
      }
      setSuggestions(data.suggestions || [])
    } catch {
      setError(t('liveEditor.ai.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={ask}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-[#7c3aed] hover:text-[#6d28d9] disabled:opacity-60"
      >
        <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.8L12 16.5l-1.8-5.7L4.5 9l5.7-1.4L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
        </svg>
        {loading ? t('liveEditor.ai.loading') : suggestions.length ? t('liveEditor.ai.more') : t('liveEditor.ai.suggest')}
      </button>
      {error && <p className="mt-1 text-[0.7rem] text-amber-700">{error}</p>}
      {suggestions.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {suggestions.map(s => (
            <li key={s}>
              <button
                type="button"
                onClick={() => { onPick(s); setSuggestions([]) }}
                className="w-full text-left text-xs text-[#425466] rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] px-2.5 py-1.5 hover:border-[#7c3aed] hover:text-[#1e3a5f]"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
