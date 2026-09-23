/**
 * Vista de celular del editor en vivo. La carga el editor (/dashboard/editor)
 * dentro de un iframe del ancho de un telefono: los temas eligen su diseno
 * movil segun el ancho de la ventana, y achicar un div no alcanza para eso.
 *
 * No lee nada de la base: el editor le manda el borrador por postMessage y
 * esta pagina le devuelve las ediciones. Solo acepta mensajes de su propio
 * origen y de la ventana que la contiene.
 */

import { createElement, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import type { Store, Product, Category } from '../types'
import { getThemeComponent } from '../themes/components'
import { LiveEditProvider } from '../components/catalog'
import { imageFieldFromClick, historyActionFromKey, type PreviewMessage } from './dashboard/liveEditorShared'
import '../themes/shared/animations.css'
import './dashboard/liveEditor.css'

function send(message: PreviewMessage) {
  window.parent.postMessage(message, window.location.origin)
}

export default function EditorPreview() {
  const [state, setState] = useState<{ store: Store; products: Product[]; categories: Category[] } | null>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return
      if (e.data?.type === 'sf-state') {
        setState({ store: e.data.store, products: e.data.products as Product[], categories: e.data.categories as Category[] })
      }
    }
    // Deshacer/rehacer con el foco dentro del iframe: el teclado no llega al editor.
    const onKey = (e: KeyboardEvent) => {
      const action = historyActionFromKey(e)
      if (!action) return
      e.preventDefault()
      send({ type: 'sf-history', action })
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('keydown', onKey)
    send({ type: 'sf-ready' })
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const liveEdit = useMemo(() => ({
    onChange: (path: string, value: string) => send({ type: 'sf-change', path, value }),
    onEditProduct: (productId: string) => send({ type: 'sf-edit-product', productId }),
  }), [])

  if (!state) return null

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const field = imageFieldFromClick(e.target as HTMLElement, state.store)
    if (!field) return
    e.preventDefault()
    e.stopPropagation()
    send({ type: 'sf-pick-image', field })
  }

  return (
    <div className="live-edit-root" onClickCapture={handleClick}>
      <LiveEditProvider value={liveEdit}>
        {/* createElement: el tema sale de un registro fijo, no se crea en cada render. */}
        {createElement(getThemeComponent(state.store.themeId || 'minimal'), { store: state.store, products: state.products, categories: state.categories })}
      </LiveEditProvider>
    </div>
  )
}
