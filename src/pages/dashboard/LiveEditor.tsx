import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc, deleteField, limit } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { getThemeComponent } from '../../themes/components'
import { LiveEditProvider } from '../../components/catalog'
import { getHeaderColors, getFooterColors, getPrimaryColor } from '../../themes/shared/themeColors'
import { themes } from '../../themes'
import type { Store, Product, Category } from '../../types'
import ImageCropModal from '../../components/dashboard/ImageCropModal'
import { uploadImage } from '../../utils/uploadImage'
import { optimizeImage } from '../../utils/cloudinary'
import { ALL_BADGE_IDS, getTrustBadgeText } from '../../themes/shared/trustBadgeDefaults'
import { HEADING_FONTS, getHeadingFont, googleFontUrl } from '../../themes/shared/fonts'
import { PALETTES, paletteEntries } from './palettes'
import ProductQuickEdit from './ProductQuickEdit'
import { imageFieldFromClick, historyActionFromKey, toCloneable, type ImageField, type PreviewMessage } from './liveEditorShared'
import '../../themes/shared/animations.css'
import './liveEditor.css'

/** Copia `obj` cambiando el valor en `path` ('about.slogan'), sin mutar nada. */
function setIn<T extends object>(obj: T, path: string, value: unknown): T {
  const [key, ...rest] = path.split('.')
  const current = (obj as Record<string, unknown>)[key]
  const next = rest.length
    ? setIn((current && typeof current === 'object' ? current : {}) as object, rest.join('.'), value)
    : value
  // Listas (las insignias de confianza): se copia la lista y se cambia el elemento.
  if (Array.isArray(obj)) {
    const copy = [...obj]
    copy[Number(key)] = next
    return copy as T
  }
  return { ...obj, [key]: next }
}

/**
 * Ruta con la que se guarda un cambio. Firestore no actualiza un elemento de
 * una lista por su posicion, asi que si la ruta pasa por una lista
 * ('trustBadges.badges.2.text') se guarda la lista entera ('trustBadges.badges').
 */
function savePathFor(obj: object, path: string): string {
  const parts = path.split('.')
  let node: unknown = obj
  for (let i = 0; i < parts.length; i++) {
    if (Array.isArray(node)) return parts.slice(0, i).join('.')
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[parts[i]] : undefined
  }
  return path
}

const sameValue = (a: unknown, b: unknown) =>
  a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b))

/** Imagenes que se cambian desde el editor, con su recorte (null = sin recorte). */
const IMAGE_FIELDS: Record<ImageField, { aspect: number | null; folder: 'logos' | 'heroes'; crop: 'logo' | 'hero' | null }> = {
  logo: { aspect: 1, folder: 'logos', crop: 'logo' },
  logoLandscape: { aspect: null, folder: 'logos', crop: null },
  heroImage: { aspect: 16 / 5, folder: 'heroes', crop: 'hero' },
  heroImageMobile: { aspect: 3 / 2, folder: 'heroes', crop: 'hero' },
}

type Changes = Record<string, unknown>
/** Cambios pendientes de productos, por id. Se guardan en su propio documento. */
type ProductEdits = Record<string, Partial<Product>>
interface Snapshot { draft: Store; changes: Changes; productEdits: ProductEdits }

/** Cambios seguidos al mismo campo dentro de este lapso cuentan como un solo paso de "deshacer". */
const MERGE_MS = 1000
const HISTORY_LIMIT = 50

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
  const [changes, setChanges] = useState<Changes>({})
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Imagenes: el campo que se esta cambiando, la foto elegida para recortar y la subida en curso.
  const fileInput = useRef<HTMLInputElement>(null)
  const [imageField, setImageField] = useState<ImageField | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState<ImageField | null>(null)

  // Vista de computadora (el tema directo en la pagina) o de celular (en un iframe, ver EditorPreview).
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const frame = useRef<HTMLIFrameElement>(null)
  const [frameReady, setFrameReady] = useState(false)

  // Deshacer / rehacer: fotos del borrador antes de cada cambio.
  const [past, setPast] = useState<Snapshot[]>([])
  const [future, setFuture] = useState<Snapshot[]>([])
  const lastEdit = useRef<{ path: string; at: number } | null>(null)
  // Estado actual para la foto del historial: `change` es estable (lo usan los
  // textos del tema y subidas que terminan tarde) y no puede leerlo del render.
  const [productEdits, setProductEdits] = useState<ProductEdits>({})
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const productFileInput = useRef<HTMLInputElement>(null)
  const [uploadingProduct, setUploadingProduct] = useState(false)

  const current = useRef<{ draft: Store | null; changes: Changes; productEdits: ProductEdits }>({ draft: null, changes: {}, productEdits: {} })
  useEffect(() => { current.current = { draft, changes, productEdits } }, [draft, changes, productEdits])

  const dirty = Object.keys(changes).length > 0 || Object.keys(productEdits).length > 0

  // Productos tal como se ven con los cambios pendientes. Los ocultos salen de la vista previa, como en la tienda.
  const previewProducts = useMemo(
    () => products.map(p => (productEdits[p.id] ? { ...p, ...productEdits[p.id] } : p)).filter(p => p.active !== false),
    [products, productEdits]
  )

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

  // Aplica uno o varios cambios como un solo paso de deshacer. `mergeKey`: cambios
  // seguidos con la misma clave (escribir, arrastrar un color) se juntan en un paso.
  const changeMany = useCallback((entries: Array<[string, unknown]>, mergeKey?: string) => {
    const snapshot = current.current
    if (!snapshot.draft) return
    const now = Date.now()
    const merge = !!mergeKey && lastEdit.current?.path === mergeKey && now - lastEdit.current.at < MERGE_MS
    lastEdit.current = mergeKey ? { path: mergeKey, at: now } : null
    if (!merge) {
      setPast(prev => [...prev.slice(-(HISTORY_LIMIT - 1)), { draft: snapshot.draft!, changes: snapshot.changes, productEdits: snapshot.productEdits }])
    }
    setFuture([])

    let nextDraft = snapshot.draft
    const nextChanges = { ...snapshot.changes }
    for (const [path, value] of entries) {
      nextDraft = setIn(nextDraft, path, value)
      const savePath = savePathFor(nextDraft, path)
      const saveValue = getIn(nextDraft, savePath)
      // Si el valor vuelve a ser el guardado, ya no es un cambio pendiente.
      if (saved && sameValue(getIn(saved, savePath), saveValue)) delete nextChanges[savePath]
      else nextChanges[savePath] = saveValue
    }
    // Al dia ya, por si llega otro cambio antes del proximo render.
    current.current = { ...snapshot, draft: nextDraft, changes: nextChanges }
    setDraft(nextDraft)
    setChanges(nextChanges)
  }, [saved])

  // Cambio a un producto: mismo historial que el resto (Ctrl+Z lo deshace).
  const changeProduct = useCallback((id: string, patch: Partial<Product>, field: string) => {
    const snapshot = current.current
    if (!snapshot.draft) return
    const mergeKey = `product:${id}:${field}`
    const now = Date.now()
    const merge = lastEdit.current?.path === mergeKey && now - lastEdit.current.at < MERGE_MS
    lastEdit.current = { path: mergeKey, at: now }
    if (!merge) {
      setPast(prev => [...prev.slice(-(HISTORY_LIMIT - 1)), { draft: snapshot.draft!, changes: snapshot.changes, productEdits: snapshot.productEdits }])
    }
    setFuture([])
    const nextEdits = { ...snapshot.productEdits, [id]: { ...snapshot.productEdits[id], ...patch } }
    current.current = { ...snapshot, productEdits: nextEdits }
    setProductEdits(nextEdits)
  }, [])

  const change = useCallback((path: string, value: unknown) => changeMany([[path, value]], path), [changeMany])

  const liveEdit = useMemo(() => ({
    onChange: (path: string, value: string) => change(path, value),
    onEditProduct: (id: string) => setEditingProduct(id),
  }), [change])

  const handleSave = async () => {
    if (!draft || !dirty) return
    if (!draft.name?.trim()) {
      showToast(t('liveEditor.nameRequired'), 'error')
      return
    }
    // Los temas premium se pueden mirar con el plan gratis, pero no aplicar (igual que en Apariencia).
    const theme = themes.find(th => th.id === (draft.themeId || 'minimal'))
    if (changes.themeId && theme?.isPremium && draft.plan === 'free') {
      showToast(t('liveEditor.themePremium'), 'error')
      return
    }
    setSaving(true)
    try {
      // Los valores salen del borrador. Si un campo y uno de sus hijos cambiaron
      // los dos (activar las insignias y despues tocar una), va solo el padre:
      // Firestore rechaza escribir las dos rutas a la vez.
      const paths = Object.keys(changes)
      const payload: Record<string, unknown> = Object.fromEntries(
        paths
          .filter(path => !paths.some(other => path.startsWith(other + '.')))
          .map(path => {
            const value = getIn(draft, path)
            return [path, value === undefined || value === '' ? deleteField() : value]
          })
      )
      if (paths.length) await updateDoc(doc(db, 'stores', draft.id), { ...payload, updatedAt: new Date() })
      // Productos: uno por documento. Un precio anterior vacio se borra del producto.
      await Promise.all(Object.entries(productEdits).map(([id, patch]) => {
        const data = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
        return updateDoc(doc(db, 'stores', draft.id, 'products', id), { ...data, updatedAt: new Date() })
      }))
      setProducts(prev => prev.map(p => (productEdits[p.id] ? { ...p, ...productEdits[p.id] } : p)))
      setProductEdits({})
      setSaved(draft)
      setChanges({})
      // El historial se armo contra lo guardado antes: despues de guardar ya no sirve.
      resetHistory()
      showToast(t('liveEditor.saved'), 'success')
    } catch (error) {
      console.error('Error saving live editor changes:', error)
      showToast(t('liveEditor.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const resetHistory = () => {
    setPast([])
    setFuture([])
    lastEdit.current = null
  }

  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev || !draft) return
    setFuture(f => [{ draft, changes, productEdits }, ...f])
    setPast(p => p.slice(0, -1))
    setDraft(prev.draft)
    setChanges(prev.changes)
    setProductEdits(prev.productEdits)
    lastEdit.current = null
  }

  const redo = () => {
    const next = future[0]
    if (!next || !draft) return
    setPast(p => [...p, { draft, changes, productEdits }])
    setFuture(f => f.slice(1))
    setDraft(next.draft)
    setChanges(next.changes)
    setProductEdits(next.productEdits)
    lastEdit.current = null
  }

  // Atajos de teclado. Dentro de un campo de texto se deja el deshacer propio del navegador.
  const shortcuts = useRef({ undo, redo })
  useEffect(() => { shortcuts.current = { undo, redo } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = historyActionFromKey(e)
      if (!action) return
      e.preventDefault()
      shortcuts.current[action]()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleDiscard = () => {
    setDraft(saved)
    setChanges({})
    setProductEdits({})
    resetHistory()
  }

  // Foto principal del producto: como en Productos, es la primera de la galeria.
  const handleProductFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const id = editingProduct
    if (!file || !id) return
    setUploadingProduct(true)
    try {
      const url = await uploadImage(file, { folder: 'shopifree/products' })
      const base = products.find(p => p.id === id)
      const gallery = productEdits[id]?.images ?? base?.images ?? (base?.image ? [base.image] : [])
      changeProduct(id, { image: url, images: [url, ...gallery.slice(1)] }, 'image')
    } catch (error) {
      console.error('Error uploading product image:', error)
      showToast(t('liveEditor.uploadError'), 'error')
    } finally {
      setUploadingProduct(false)
    }
  }

  const pickImage = (field: ImageField) => {
    setImageField(field)
    fileInput.current?.click()
  }

  const uploadAndSet = async (field: ImageField, file: Blob, name: string) => {
    setUploading(field)
    try {
      const url = await uploadImage(new File([file], name, { type: file.type }), {
        folder: `shopifree/${IMAGE_FIELDS[field].folder}`,
        // Las portadas se ven a todo el ancho de la pantalla: mas margen que el tope general.
        ...(IMAGE_FIELDS[field].folder === 'heroes' ? { maxDimension: 2560 } : {}),
      })
      change(field, url)
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast(t('liveEditor.uploadError'), 'error')
    } finally {
      setUploading(null)
    }
  }

  const handleFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !imageField) return
    // El logo horizontal ya viene con su proporcion: recortarlo lo arruinaria.
    if (IMAGE_FIELDS[imageField].aspect === null) uploadAndSet(imageField, file, file.name)
    else setCropSrc(URL.createObjectURL(file))
  }

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  // Clic en una imagen de la vista previa: el logo (header o footer) o la portada.
  const handlePreviewClick = (e: MouseEvent<HTMLDivElement>) => {
    const field = imageFieldFromClick(e.target as HTMLElement, draft)
    if (!field) return
    e.preventDefault()
    e.stopPropagation()
    pickImage(field)
  }

  // Vista de celular: lo que manda el iframe (ediciones, imagenes, deshacer).
  const fromFrame = useRef({ change, pickImage, undo, redo })
  useEffect(() => { fromFrame.current = { change, pickImage, undo, redo } })
  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      const msg = e.data
      if (msg?.type === 'sf-ready') setFrameReady(true)
      else if (msg?.type === 'sf-change') fromFrame.current.change(msg.path, msg.value)
      else if (msg?.type === 'sf-pick-image') fromFrame.current.pickImage(msg.field)
      else if (msg?.type === 'sf-edit-product') setEditingProduct(msg.productId)
      else if (msg?.type === 'sf-history') fromFrame.current[msg.action]()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Cada cambio del borrador se le manda al iframe.
  useEffect(() => {
    if (device !== 'mobile' || !frameReady || !draft) return
    const message: PreviewMessage = { type: 'sf-state', store: toCloneable(draft), products: toCloneable(previewProducts), categories: toCloneable(categories) }
    frame.current?.contentWindow?.postMessage(message, window.location.origin)
  }, [device, frameReady, draft, previewProducts, categories])

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
  const currentTheme = themes.find(th => th.id === themeId)
  const themeName = currentTheme?.name || themeId
  const themeIndex = themes.findIndex(th => th.id === themeId)
  const stepTheme = (delta: number) => {
    const next = themes[(themeIndex + delta + themes.length) % themes.length]
    change('themeId', next.id)
  }
  const themeLocked = !!currentTheme?.isPremium && draft.plan === 'free'
  const headerColors = getHeaderColors(draft)
  const headingFont = getHeadingFont(draft)
  const footerColors = getFooterColors(draft)
  const announcement = draft.announcement
  const paidPlan = draft.plan !== 'free'
  const trustBadges = draft.trustBadges
  const flashSale = draft.flashSale
  // Primera vez que se activan las insignias: todas prendidas, como en Apariencia.
  const toggleTrustBadges = (enabled: boolean) => {
    if (trustBadges) change('trustBadges.enabled', enabled)
    else change('trustBadges', { enabled, badges: ALL_BADGE_IDS.map(id => ({ id, enabled: true })) })
  }
  // <input type="datetime-local"> trabaja en hora local sin zona; se guarda en ISO como en Apariencia.
  const toLocalInput = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

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
        <div className="hidden sm:flex items-center p-0.5 bg-[#F6F9FC] rounded-lg border border-[#E6EBF1]">
          {(['desktop', 'mobile'] as const).map(d => (
            <button
              key={d}
              onClick={() => { setDevice(d); setFrameReady(false) }}
              className={`p-1.5 rounded-md ${device === d ? 'bg-white shadow-sm' : 'opacity-50 hover:opacity-80'}`}
              title={t(`liveEditor.device.${d}`)}
            >
              <svg className="w-4 h-4 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                {d === 'desktop'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />}
              </svg>
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <button onClick={undo} disabled={!past.length} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" title={t('liveEditor.undo')}>
            <svg className="w-5 h-5 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button onClick={redo} disabled={!future.length} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30" title={t('liveEditor.redo')}>
            <svg className="w-5 h-5 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
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
        {device === 'mobile' ? (
          <div className="relative flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto">
            {/* Marco de telefono: 390x844 es el tamano de un iPhone actual. */}
            <iframe
              ref={frame}
              src="/editor-preview"
              title={t('liveEditor.device.mobile')}
              className="w-[390px] h-[844px] max-h-full shrink-0 bg-white rounded-[2.5rem] border-[10px] border-[#1e293b] shadow-2xl"
            />
          </div>
        ) : (
          <div className="relative flex-1 min-h-0 [transform:translateZ(0)] bg-white">
            <div className="absolute inset-0 overflow-auto live-edit-root" onClickCapture={handlePreviewClick}>
              <LiveEditProvider value={liveEdit}>
                <ThemeComponent store={draft} products={previewProducts} categories={categories} />
              </LiveEditProvider>
            </div>
          </div>
        )}

        {/* Panel de colores */}
        <aside className="w-full md:w-72 shrink-0 max-h-[40vh] md:max-h-none overflow-auto bg-white border-t md:border-t-0 md:border-l border-[#E6EBF1] p-4 space-y-6">
          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f] mb-3">{t('liveEditor.theme')}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => stepTheme(-1)}
                className="p-2 rounded-lg border border-[#E6EBF1] hover:bg-gray-50 shrink-0"
                title={t('liveEditor.prevTheme')}
              >
                <svg className="w-4 h-4 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <select
                value={themeId}
                onChange={e => change('themeId', e.target.value)}
                className="min-w-0 flex-1 px-2 py-2 text-sm border border-[#E6EBF1] rounded-lg bg-white focus:outline-none focus:border-[#1e3a5f]"
              >
                {themes.map(th => (
                  <option key={th.id} value={th.id}>{th.name}{th.isPremium ? ' ★' : ''}</option>
                ))}
              </select>
              <button
                onClick={() => stepTheme(1)}
                className="p-2 rounded-lg border border-[#E6EBF1] hover:bg-gray-50 shrink-0"
                title={t('liveEditor.nextTheme')}
              >
                <svg className="w-4 h-4 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {themeLocked ? (
              <p className="mt-2 text-[0.7rem] text-amber-700">
                {t('liveEditor.themePremiumHint')}{' '}
                <a href={localePath('/dashboard/plan')} className="font-semibold underline">{t('liveEditor.upgrade')}</a>
              </p>
            ) : changes.themeId !== undefined && (
              <p className="mt-2 text-[0.7rem] text-[#8898AA]">{t('liveEditor.themeUnsaved')}</p>
            )}
          </section>

          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.images')}</h2>
            <p className="text-[0.7rem] text-[#8898AA] mb-3">{t('liveEditor.imagesHint')}</p>
            {(Object.keys(IMAGE_FIELDS) as ImageField[]).map(field => (
              <ImageSlot
                key={field}
                label={t(`liveEditor.image.${field}`)}
                src={draft[field]}
                wide={field !== 'logo'}
                uploading={uploading === field}
                onChange={() => pickImage(field)}
                onRemove={() => change(field, undefined)}
                changeLabel={t('liveEditor.change')}
                removeLabel={t('liveEditor.remove')}
                uploadingLabel={t('liveEditor.uploading')}
              />
            ))}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFileChosen} />
          </section>

          {/* Respaldo: algunos temas muestran el nombre como decoracion (iniciales,
              marquesinas) o esconden el eslogan si esta vacio. Desde aca siempre se puede. */}
          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f] mb-3">{t('liveEditor.texts')}</h2>
            <TextField
              label={t('liveEditor.name')}
              value={draft.name}
              onChange={v => change('name', v)}
            />
            <TextField
              label={t('liveEditor.slogan')}
              value={draft.about?.slogan || ''}
              onChange={v => change('about.slogan', v)}
            />
            <TextField
              label={t('liveEditor.description')}
              value={draft.about?.description || ''}
              onChange={v => change('about.description', v)}
              multiline
            />
          </section>

          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.palettes')}</h2>
            <p className="text-[0.7rem] text-[#8898AA] mb-3">{t('liveEditor.palettesHint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map(palette => {
                const active = getPrimaryColor(draft) === palette.primary
                  && headerColors.background === palette.header.background
                  && footerColors.background === palette.footer.background
                return (
                  <button
                    key={palette.id}
                    onClick={() => changeMany(paletteEntries(themeId, palette))}
                    className={`text-left rounded-lg border p-1.5 transition-colors ${active ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20' : 'border-[#E6EBF1] hover:border-[#8898AA]'}`}
                  >
                    <div className="flex h-6 rounded overflow-hidden border border-black/5">
                      <span className="flex-1" style={{ backgroundColor: palette.header.background }} />
                      <span className="flex-1" style={{ backgroundColor: palette.primary }} />
                      <span className="flex-1" style={{ backgroundColor: palette.footer.background }} />
                    </div>
                    <span className="block mt-1 text-[0.7rem] text-[#425466]">{t(`liveEditor.palette.${palette.id}`)}</span>
                  </button>
                )
              })}
              <button
                onClick={() => changeMany(paletteEntries(themeId, null))}
                className="rounded-lg border border-dashed border-[#E6EBF1] p-1.5 text-[0.7rem] text-[#8898AA] hover:border-[#8898AA] hover:text-[#425466]"
              >
                {t('liveEditor.paletteReset')}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.primary')}</h2>
            <p className="text-[0.7rem] text-[#8898AA] mb-3">{t('liveEditor.primaryHint')}</p>
            <ColorField
              label={t('liveEditor.primaryLabel')}
              value={getPrimaryColor(draft)}
              fallback={currentTheme?.colors?.primary || '#111827'}
              onChange={v => change(`themeSettings.primaryColors.${themeId}`, v)}
              resetLabel={t('liveEditor.reset')}
            />
          </section>

          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.font')}</h2>
            <p className="text-[0.7rem] text-[#8898AA] mb-3">{t('liveEditor.fontHint')}</p>
            <select
              value={headingFont?.id || ''}
              onChange={e => change(`themeSettings.headingFonts.${themeId}`, e.target.value || undefined)}
              className="w-full px-2 py-2 text-sm border border-[#E6EBF1] rounded-lg bg-white focus:outline-none focus:border-[#1e3a5f]"
            >
              <option value="">{t('liveEditor.fontTheme')}</option>
              {HEADING_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {headingFont && (
              <>
                <link rel="stylesheet" href={googleFontUrl(headingFont)} precedence="default" />
                <p className="mt-2 text-xl text-[#1e3a5f] truncate" style={{ fontFamily: headingFont.family }}>{draft.name}</p>
              </>
            )}
          </section>

          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.header')}</h2>
            <p className="text-[0.7rem] text-[#8898AA] mb-3">{t('liveEditor.headerPerTheme', { theme: themeName })}</p>
            <ColorField
              label={t('liveEditor.background')}
              value={headerColors.background}
              fallback="#ffffff"
              onChange={v => change(`themeSettings.headerColors.${themeId}.background`, v)}
              resetLabel={t('liveEditor.reset')}
            />
            <ColorField
              label={t('liveEditor.text')}
              value={headerColors.text}
              fallback="#111827"
              onChange={v => change(`themeSettings.headerColors.${themeId}.text`, v)}
              resetLabel={t('liveEditor.reset')}
            />
          </section>

          <section>
            <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.footer')}</h2>
            <p className="text-[0.7rem] text-[#8898AA] mb-3">{t('liveEditor.headerPerTheme', { theme: themeName })}</p>
            <ColorField
              label={t('liveEditor.background')}
              value={footerColors.background}
              fallback={currentTheme?.colors?.background || '#ffffff'}
              onChange={v => change(`themeSettings.footerColors.${themeId}.background`, v)}
              resetLabel={t('liveEditor.reset')}
            />
            <ColorField
              label={t('liveEditor.text')}
              value={footerColors.text}
              fallback="#111827"
              onChange={v => change(`themeSettings.footerColors.${themeId}.text`, v)}
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

          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.trustBadges')}</h2>
              <label className={`flex items-center gap-2 text-xs text-[#425466] ${paidPlan ? 'cursor-pointer' : 'opacity-50'}`}>
                <input type="checkbox" disabled={!paidPlan} checked={!!trustBadges?.enabled} onChange={e => toggleTrustBadges(e.target.checked)} />
                {t('liveEditor.show')}
              </label>
            </div>
            {!paidPlan ? (
              <PlanNote text={t('liveEditor.paidOnly')} link={localePath('/dashboard/plan')} linkLabel={t('liveEditor.upgrade')} />
            ) : trustBadges?.enabled && (
              <>
                <p className="text-[0.7rem] text-[#8898AA] mb-2">{t('liveEditor.trustBadgesHint')}</p>
                <div className="space-y-1.5">
                  {trustBadges.badges.map((badge, i) => (
                    <label key={badge.id} className="flex items-center gap-2 text-xs text-[#425466] cursor-pointer">
                      <input type="checkbox" checked={badge.enabled} onChange={e => change(`trustBadges.badges.${i}.enabled`, e.target.checked)} />
                      <span className="truncate">{badge.text || getTrustBadgeText(badge.id, draft.language || 'es')}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[0.8rem] font-semibold text-[#1e3a5f]">{t('liveEditor.flashSale')}</h2>
              <label className={`flex items-center gap-2 text-xs text-[#425466] ${paidPlan ? 'cursor-pointer' : 'opacity-50'}`}>
                <input type="checkbox" disabled={!paidPlan} checked={!!flashSale?.enabled} onChange={e => change('flashSale.enabled', e.target.checked)} />
                {t('liveEditor.show')}
              </label>
            </div>
            {!paidPlan ? (
              <PlanNote text={t('liveEditor.paidOnly')} link={localePath('/dashboard/plan')} linkLabel={t('liveEditor.upgrade')} />
            ) : flashSale?.enabled && (
              <>
                <p className="text-[0.7rem] text-[#8898AA] mb-2">{t('liveEditor.flashSaleHint')}</p>
                <label className="block mb-3">
                  <span className="text-xs text-[#425466]">{t('liveEditor.flashSaleEnd')}</span>
                  <input
                    type="datetime-local"
                    value={toLocalInput(flashSale.endDate)}
                    onChange={e => e.target.value && change('flashSale.endDate', new Date(e.target.value).toISOString())}
                    className="mt-1 w-full px-3 py-2 text-sm border border-[#E6EBF1] rounded-lg focus:outline-none focus:border-[#1e3a5f]"
                  />
                </label>
                {flashSale.endDate && new Date(flashSale.endDate).getTime() < Date.now() && (
                  <p className="-mt-2 mb-3 text-[0.7rem] text-amber-700">{t('liveEditor.flashSaleEnded')}</p>
                )}
                <ColorField
                  label={t('liveEditor.background')}
                  value={flashSale.backgroundColor}
                  fallback={getPrimaryColor(draft) || currentTheme?.colors?.primary || '#111827'}
                  onChange={v => change('flashSale.backgroundColor', v)}
                  resetLabel={t('liveEditor.reset')}
                />
                <ColorField
                  label={t('liveEditor.text')}
                  value={flashSale.textColor}
                  fallback="#ffffff"
                  onChange={v => change('flashSale.textColor', v)}
                  resetLabel={t('liveEditor.reset')}
                />
              </>
            )}
          </section>
        </aside>
      </div>

      {editingProduct && (() => {
        const base = products.find(p => p.id === editingProduct)
        if (!base) return null
        return (
          <ProductQuickEdit
            key={editingProduct}
            product={{ ...base, ...productEdits[editingProduct] }}
            uploading={uploadingProduct}
            onChange={(patch, field) => changeProduct(editingProduct, patch, field)}
            onPickImage={() => productFileInput.current?.click()}
            onClose={() => setEditingProduct(null)}
            fullFormHref={localePath(`/dashboard/products/${editingProduct}`)}
          />
        )
      })()}
      <input ref={productFileInput} type="file" accept="image/*" className="hidden" onChange={handleProductFile} />

      {cropSrc && imageField && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={IMAGE_FIELDS[imageField].aspect || 1}
          title={t(IMAGE_FIELDS[imageField].crop === 'logo' ? 'branding.logo.cropTitle' : 'branding.hero.cropTitle')}
          description={t(IMAGE_FIELDS[imageField].crop === 'logo' ? 'branding.logo.cropDescription' : 'branding.hero.cropDescription')}
          onCancel={closeCrop}
          onCrop={blob => {
            const field = imageField
            closeCrop()
            uploadAndSet(field, blob, field === 'logo' ? 'logo.png' : 'hero.jpg')
          }}
        />
      )}
    </div>
  )
}

function PlanNote({ text, link, linkLabel }: { text: string; link: string; linkLabel: string }) {
  return (
    <p className="text-[0.7rem] text-amber-700">
      {text} <a href={link} className="font-semibold underline">{linkLabel}</a>
    </p>
  )
}

interface ImageSlotProps {
  label: string
  src: string | undefined
  wide: boolean
  uploading: boolean
  onChange: () => void
  onRemove: () => void
  changeLabel: string
  removeLabel: string
  uploadingLabel: string
}

function ImageSlot({ label, src, wide, uploading, onChange, onRemove, changeLabel, removeLabel, uploadingLabel }: ImageSlotProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <button
        onClick={onChange}
        disabled={uploading}
        className={`${wide ? 'w-16' : 'w-10'} h-10 shrink-0 rounded-lg border border-[#E6EBF1] bg-[#F6F9FC] overflow-hidden flex items-center justify-center`}
      >
        {src
          ? <img src={optimizeImage(src, 'logo')} alt="" className="w-full h-full object-cover" />
          : <svg className="w-4 h-4 text-[#8898AA]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#425466] truncate">{label}</p>
        {uploading ? (
          <p className="text-[0.7rem] text-[#8898AA]">{uploadingLabel}</p>
        ) : (
          <div className="flex gap-3 text-[0.7rem]">
            <button onClick={onChange} className="text-[#2d6cb5] hover:underline">{changeLabel}</button>
            {src && <button onClick={onRemove} className="text-[#8898AA] hover:text-[#425466]">{removeLabel}</button>}
          </div>
        )}
      </div>
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}

function TextField({ label, value, onChange, multiline }: TextFieldProps) {
  const className = 'mt-1 w-full px-3 py-2 text-sm border border-[#E6EBF1] rounded-lg focus:outline-none focus:border-[#1e3a5f]'
  return (
    <label className="block mb-3">
      <span className="text-xs text-[#425466]">{label}</span>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={`${className} resize-none`} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className={className} />}
    </label>
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
