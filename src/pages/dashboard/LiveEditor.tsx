import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc, deleteField, limit } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { getThemeComponent } from '../../themes/components'
import { LiveEditProvider } from '../../components/catalog'
import type { Store, Product, Category } from '../../types'
import '../../themes/shared/animations.css'
import './liveEditor.css'

/** Temas que ya tienen el header conectado al editor (textos y colores). */
const LIVE_EDIT_THEMES = ['minimal']

/** Copia `obj` cambiando el valor en `path` ('about.slogan'), sin mutar nada. */
function setIn<T extends object>(obj: T, path: string, value: unknown): T {
  const [key, ...rest] = path.split('.')
  const current = (obj as Record<string, unknown>)[key]
  const next = rest.length
    ? setIn((current && typeof current === 'object' ? current : {}) as object, rest.join('.'), value)
    : value
  return { ...obj, [key]: next }
}

function getIn(obj: object, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj)
}

export default function LiveEditor() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [saved, setSaved] = useState<Store | null>(null)
  const [draft, setDraft] = useState<Store | null>(null)
  // Campos tocados, por ruta con puntos. `undefined` = volver al valor del tema (se borra el campo).
  const [changes, setChanges] = useState<Record<string, string | boolean | undefined>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const dirty = Object.keys(changes).length > 0

  useEffect(() => {
    if (!firebaseUser) return
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'stores'), where('ownerId', '==', firebaseUser.uid)))
        if (snap.empty) return
        const store = { ...(snap.docs[0].data() as Store), id: snap.docs[0].id }
        setSaved(store)
        setDraft(store)
        setLoading(false)

        // La vista previa no necesita el catalogo completo.
        const [productsSnap, categoriesSnap] = await Promise.all([
          getDocs(query(collection(db, 'stores', store.id, 'products'), limit(24))),
          getDocs(collection(db, 'stores', store.id, 'categories')),
        ])
        setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Product).filter(p => p.active !== false))
        setCategories(
          categoriesSnap.docs
            .map(d => ({ id: d.id, ...d.data() }) as Category)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        )
      } catch (error) {
        console.error('Error loading live editor:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [firebaseUser])

  // Avisar antes de cerrar la pestana con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const change = useCallback((path: string, value: string | boolean | undefined) => {
    setDraft(prev => (prev ? setIn(prev, path, value) : prev))
    setChanges(prev => {
      const next = { ...prev }
      // Si el valor vuelve a ser el guardado, ya no es un cambio pendiente.
      if (saved && getIn(saved, path) === value) delete next[path]
      else next[path] = value
      return next
    })
  }, [saved])

  const liveEdit = useMemo(() => ({ onChange: (path: string, value: string) => change(path, value) }), [change])

  const handleSave = async () => {
    if (!draft || !dirty) return
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(changes).map(([path, value]) => [path, value === undefined || value === '' ? deleteField() : value])
      )
      await updateDoc(doc(db, 'stores', draft.id), payload)
      setSaved(draft)
      setChanges({})
      showToast(t('liveEditor.saved'), 'success')
    } catch (error) {
      console.error('Error saving live editor changes:', error)
      showToast(t('liveEditor.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setDraft(saved)
    setChanges({})
  }

  const handleExit = () => {
    if (dirty && !window.confirm(t('liveEditor.confirmExit'))) return
    navigate(localePath('/dashboard/branding'))
  }

  if (loading || !draft) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        {loading
          ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
          : <p className="text-[#425466]">{t('liveEditor.noStore')}</p>}
      </div>
    )
  }

  const themeId = draft.themeId || 'minimal'
  const ThemeComponent = getThemeComponent(themeId)
  const headerSupported = LIVE_EDIT_THEMES.includes(themeId)
  const announcement = draft.announcement

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F6F9FC] pt-[env(safe-area-inset-top)]">
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-[#E6EBF1] shrink-0">
        <button onClick={handleExit} className="p-2 -ml-2 rounded-lg hover:bg-gray-100" title={t('liveEditor.exit')}>
          <svg className="w-5 h-5 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-[#1e3a5f] truncate">{t('liveEditor.title')}</h1>
          <p className="text-xs text-[#8898AA] truncate hidden sm:block">{t('liveEditor.hint')}</p>
        </div>
        {dirty && (
          <button onClick={handleDiscard} disabled={saving} className="px-3 py-2 text-sm text-[#425466] rounded-lg hover:bg-gray-100">
            {t('liveEditor.discard')}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg disabled:opacity-40"
        >
          {saving ? t('liveEditor.saving') : t('liveEditor.save')}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Vista previa. El transform hace que los elementos `fixed` del tema
            (carrito, WhatsApp) queden dentro de este recuadro y no tapen el panel. */}
        <div className="relative flex-1 min-h-0 [transform:translateZ(0)] bg-white">
          <div className="absolute inset-0 overflow-auto">
            <LiveEditProvider value={liveEdit}>
              <ThemeComponent store={draft} products={products} categories={categories} />
            </LiveEditProvider>
          </div>
        </div>

        {/* Panel de colores */}
        <aside className="w-full md:w-72 shrink-0 max-h-[40vh] md:max-h-none overflow-auto bg-white border-t md:border-t-0 md:border-l border-[#E6EBF1] p-4 space-y-6">
          {!headerSupported && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {t('liveEditor.themeNotice')}
            </p>
          )}

          <section className={headerSupported ? '' : 'opacity-50 pointer-events-none'}>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f] mb-3">{t('liveEditor.header')}</h2>
            <ColorField
              label={t('liveEditor.background')}
              value={draft.themeSettings?.headerBackground}
              fallback="#ffffff"
              onChange={v => change('themeSettings.headerBackground', v)}
              resetLabel={t('liveEditor.reset')}
            />
            <ColorField
              label={t('liveEditor.text')}
              value={draft.themeSettings?.headerText}
              fallback="#111827"
              onChange={v => change('themeSettings.headerText', v)}
              resetLabel={t('liveEditor.reset')}
            />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.announcement')}</h2>
              <label className="flex items-center gap-2 text-xs text-[#425466] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!announcement?.enabled}
                  onChange={e => change('announcement.enabled', e.target.checked)}
                />
                {t('liveEditor.show')}
              </label>
            </div>
            {announcement?.enabled && (
              <>
                <ColorField
                  label={t('liveEditor.background')}
                  value={announcement.backgroundColor}
                  fallback="#111827"
                  onChange={v => change('announcement.backgroundColor', v)}
                  resetLabel={t('liveEditor.reset')}
                />
                <ColorField
                  label={t('liveEditor.text')}
                  value={announcement.textColor}
                  fallback="#ffffff"
                  onChange={v => change('announcement.textColor', v)}
                  resetLabel={t('liveEditor.reset')}
                />
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string | undefined
  /** Color que se ve en el selector cuando el campo no tiene valor (el del tema). */
  fallback: string
  onChange: (value: string | undefined) => void
  resetLabel: string
}

function ColorField({ label, value, fallback, onChange, resetLabel }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <input
        type="color"
        value={value || fallback}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border border-[#E6EBF1] cursor-pointer p-0.5 bg-white shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#425466]">{label}</p>
        <p className="text-[0.7rem] text-[#8898AA] font-mono">{value || '—'}</p>
      </div>
      {value && (
        <button onClick={() => onChange(undefined)} className="text-[0.7rem] text-[#8898AA] hover:text-[#425466]">
          {resetLabel}
        </button>
      )}
    </div>
  )
}
