import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'

/**
 * Help — searchable FAQ page for merchants.
 *
 * Born from the feedback "no tenéis un apartado que vaya explicando las
 * cosas". Rather than a generic docs portal, this answers the specific
 * questions merchants have actually hit, in the order they hit them.
 *
 * Each FAQ has a deep-link via `id` so we can wire HelpTip → "Más
 * información →" buttons directly to the right section.
 */

interface Faq {
  id: string
  q: string
  // Plain text or React node for the answer body. Kept inline so this file
  // is self-contained — no separate JSON/markdown loading needed.
  a: React.ReactNode
}

const FAQS_ES: Faq[] = [
  {
    id: 'modificar-stock',
    q: '¿Cómo modifico el stock de mis productos sin hacer una compra entera?',
    a: (
      <>
        Desde <Link to="/es/dashboard/products" className="text-[#2d6cb5] underline">Dashboard → Productos</Link>, cada tarjeta tiene un botón <strong>Stock</strong> (en color ámbar). Pulsa ahí, edita las cantidades por variante (talla / color), y guarda. No necesitas pasar por Compras.
        <br /><br />
        Si quieres ajustes con histórico y razón documentada, también puedes ir a <strong>Finanzas → Inventario</strong>.
      </>
    ),
  },
  {
    id: 'agotado-con-stock',
    q: 'Pongo 1 unidad pero la tienda muestra "AGOTADO". ¿Por qué?',
    a: (
      <>
        Era un bug conocido que ya está corregido. Si todavía ves productos marcados como agotados con stock real disponible, escribe al soporte para que ejecuten una resincronización en tu tienda — toma menos de un minuto y arregla cualquier desincronización histórica.
        <br /><br />
        A partir de ahora, cuando edites stock desde el botón <strong>Stock</strong> de Productos, los cambios se reflejan inmediatamente en la tienda pública.
      </>
    ),
  },
  {
    id: 'pedidos-prueba',
    q: '¿Cómo hago pedidos de prueba sin que se mezclen con las ventas reales?',
    a: (
      <>
        En <Link to="/es/dashboard/orders" className="text-[#2d6cb5] underline">Pedidos</Link> → <strong>+ Nueva venta</strong>, marca la casilla ámbar <strong>"Es una venta de prueba"</strong>.
        <br /><br />
        Las pruebas:
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>NO descuentan stock</li>
          <li>NO cuentan en estadísticas ni ingresos</li>
          <li>Quedan ocultas por defecto en el listado</li>
          <li>Se pueden ver activando "Mostrar pedidos de prueba" en Filtros</li>
        </ul>
      </>
    ),
  },
  {
    id: 'borrar-pedido',
    q: '¿Cómo borro un pedido (de prueba o real)?',
    a: (
      <>
        Click sobre el pedido para abrir el detalle → al final del panel hay un botón rojo <strong>"Eliminar pedido"</strong>. Pide confirmación y se borra para siempre.
        <br /><br />
        Importante: si el pedido descontó stock real, eliminarlo NO lo devuelve automáticamente. Para eso, también ajusta el stock manualmente desde el botón <strong>Stock</strong> en Productos.
      </>
    ),
  },
  {
    id: 'crear-categoria',
    q: 'Estoy creando un producto y no tengo categorías. ¿Tengo que salir del formulario?',
    a: (
      <>
        No. En la sección <strong>Catálogo</strong> del formulario del producto, junto al selector de categoría, verás un enlace <strong>+ Nueva</strong>. Te aparece un input para escribir el nombre, pulsas Enter y la categoría queda creada y asignada al producto en el mismo paso.
      </>
    ),
  },
  {
    id: 'subir-variantes',
    q: '¿Cómo añado tallas y colores a un producto?',
    a: (
      <>
        En el formulario del producto, sección <strong>Variantes</strong>:
        <ol className="list-decimal ml-5 mt-1 space-y-1">
          <li>Pulsa "Agregar variante"</li>
          <li>Elige el tipo (Talla, Color, Material) o escribe uno personalizado</li>
          <li>Añade las opciones (XL, L, M / Negro, Blanco, etc.)</li>
          <li>Repite para una segunda variante si quieres combinarlas</li>
          <li>La tabla de <strong>Combinaciones</strong> se genera sola debajo</li>
          <li>Si tienes "Controlar stock" activado, asigna cantidades en la columna Stock</li>
        </ol>
      </>
    ),
  },
  {
    id: 'subir-rapido',
    q: '¿Hay forma de subir muchos productos rápido?',
    a: (
      <>
        Sí: en <Link to="/es/dashboard/products" className="text-[#2d6cb5] underline">Productos</Link> arriba a la derecha hay un botón <strong>Importar</strong> que acepta CSV. También puedes duplicar productos desde el listado para crear variaciones rápidas.
      </>
    ),
  },
  {
    id: 'editar-producto-todo',
    q: '¿Puedo cambiar precios, stock e imágenes desde el mismo formulario del producto?',
    a: (
      <>
        Sí. El formulario del producto está unificado: precio, imágenes, descripción, variantes, stock por combinación, categoría, SEO — todo desde una sola pantalla. No tienes que ir a otros apartados.
      </>
    ),
  },
]

const FAQS_EN: Faq[] = FAQS_ES.map(f => ({ ...f })) // Placeholder — uses Spanish text in English locale. Can be translated later.

export default function Help() {
  const { i18n } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es'

  const allFaqs = lang === 'en' ? FAQS_EN : FAQS_ES
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allFaqs
    return allFaqs.filter(f =>
      f.q.toLowerCase().includes(q) || String(f.a).toLowerCase().includes(q)
    )
  }, [allFaqs, search])

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">
          {lang === 'en' ? 'Help & FAQs' : 'Ayuda y preguntas frecuentes'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === 'en'
            ? 'Quick answers to the most common questions, written from real merchant feedback.'
            : 'Respuestas rápidas a las dudas más frecuentes, escritas a partir del feedback real de comerciantes.'}
        </p>
      </header>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={lang === 'en' ? 'Search…' : 'Buscar…'}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            {lang === 'en' ? 'No results.' : 'Sin resultados.'}
          </p>
        ) : (
          filtered.map(faq => (
            <details
              key={faq.id}
              id={faq.id}
              className="group bg-white border border-gray-200/60 rounded-xl overflow-hidden open:shadow-sm transition-shadow"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <span className="text-sm font-medium text-[#1e3a5f]">{faq.q}</span>
                <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 pt-1 text-sm text-gray-700 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))
        )}
      </div>

      <footer className="pt-6 border-t border-gray-100 text-sm text-gray-500">
        {lang === 'en' ? '¿' : ''}
        {lang === 'en'
          ? "Couldn't find what you needed? Reach out via "
          : '¿No encontraste lo que buscabas? Escríbenos por '}
        <Link to={localePath('/dashboard/support-chats')} className="text-[#2d6cb5] underline">
          {lang === 'en' ? 'support chat' : 'el chat de soporte'}
        </Link>.
      </footer>
    </div>
  )
}
