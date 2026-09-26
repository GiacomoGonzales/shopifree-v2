import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { canSeeShopiChat } from '../../lib/shopichatAccess'

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
          <li>NO cuentan en estadísticas, ingresos, Clientes ni Finanzas</li>
          <li>Quedan ocultas por defecto en el listado</li>
          <li>Arriba del listado aparece un aviso con <strong>Ver</strong> (para mostrarlas) y <strong>Eliminar todas</strong> (las borra para siempre)</li>
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
        Si el pedido había reservado stock y todavía no estaba pagado ni entregado, al eliminarlo el stock vuelve solo. Si ya estaba pagado o entregado, el stock no se devuelve (la mercadería salió): ajústalo desde el botón <strong>Stock</strong> en Productos si hace falta.
        <br /><br />
        Para borrar todas las ventas de prueba de una vez, usa <strong>Eliminar todas</strong> en el aviso ámbar de arriba del listado.
      </>
    ),
  },
  {
    id: 'precio-por-cantidad',
    q: '¿Puedo cobrar más barato si el cliente lleva más unidades (precio por mayoreo)?',
    a: (
      <>
        Sí. En el formulario del producto, sección <strong>Precios por cantidad (mayoreo)</strong>, pulsa <strong>+ Agregar</strong> y pon desde cuántas unidades aplica y el precio por unidad. Por ejemplo: precio normal $100 y <em>desde 2 unidades</em> $95 c/u. Puedes agregar varios escalones (desde 7 unidades $90 c/u, etc.) o usar un % de descuento.
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>La ficha del producto muestra la tabla de precios a tus clientes</li>
          <li>El carrito aplica el precio solo, contando todas las unidades del producto aunque sean de distintas variantes</li>
          <li>También se aplica al registrar una venta con <strong>+ Nueva venta</strong></li>
        </ul>
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
        Sí: en <Link to="/es/dashboard/products" className="text-[#2d6cb5] underline">Productos</Link> arriba a la derecha hay un botón <strong>Importar</strong> que acepta CSV o Excel (.csv, .xlsx, .xls), con una plantilla descargable para completar. Si lo que quieres son tallas o colores del mismo producto, no hace falta crear uno por cada uno: usa las <strong>Variantes</strong> dentro del producto.
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

// ShopiChat: solo se muestra a quien ve la seccion (admins, o todos con
// VITE_SHOPICHAT_PUBLIC=true), igual que el menu.
const SHOPICHAT_FAQ_ES: Faq = {
  id: 'shopichat',
  q: '¿Cómo conecto mi WhatsApp a ShopiChat y cuánto cuesta?',
  a: (
    <>
      ShopiChat es el WhatsApp de tu tienda dentro de Shopifree (plan <strong>Business</strong>): respondes desde la computadora o el celular, con los pedidos de cada cliente a la vista, y sigues usando la app WhatsApp Business en tu teléfono.
      <br /><br />
      Necesitas una cuenta de Facebook y la app <strong>WhatsApp Business</strong> en tu celular con el número de la tienda (si usas el WhatsApp normal, puedes <a href="https://faq.whatsapp.com/663543925287107" target="_blank" rel="noopener noreferrer" className="text-[#2d6cb5] underline">pasarte a WhatsApp Business sin perder tus chats</a>). Desde la computadora:
      <ol className="list-decimal ml-5 mt-1 space-y-1">
        <li>Entra a <Link to="/es/dashboard/shopichat" className="text-[#2d6cb5] underline">ShopiChat</Link> y toca <strong>Conectar mi WhatsApp</strong></li>
        <li>Inicia sesión con Facebook en la ventana de Meta</li>
        <li>Elige conectar la app WhatsApp Business que ya usas</li>
        <li>Escanea el código QR con tu celular desde WhatsApp Business</li>
      </ol>
      <br />
      Costos: responder dentro de las 24 horas desde el último mensaje del cliente es gratis. Las plantillas (para escribir pasadas las 24 horas y los avisos automáticos de pedidos) las cobra Meta a la tarjeta de tu cuenta de WhatsApp Business.
      <br /><br />
      En la configuración de ShopiChat (ícono de engranaje) están los <strong>avisos automáticos de pedidos</strong>, el <strong>asistente IA</strong> (copiloto o piloto automático, con la IA incluida o la tuya) y la opción para desconectar el número cuando quieras.
    </>
  ),
}

const FAQS_EN: Faq[] = FAQS_ES.map(f => ({ ...f })) // Placeholder — uses Spanish text in English locale. Can be translated later.

export default function Help() {
  const { i18n } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { firebaseUser } = useAuth()
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es'
  const showShopiChat = canSeeShopiChat(firebaseUser?.email)

  const allFaqs = useMemo(() => {
    const base = lang === 'en' ? FAQS_EN : FAQS_ES
    return showShopiChat ? [...base, SHOPICHAT_FAQ_ES] : base
  }, [lang, showShopiChat])
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
        <p className="text-sm text-[#8898AA] mt-1">
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
        className="w-full px-4 py-2.5 border border-[#E6EBF1] rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-[#8898AA] text-center py-12">
            {lang === 'en' ? 'No results.' : 'Sin resultados.'}
          </p>
        ) : (
          filtered.map(faq => (
            <details
              key={faq.id}
              id={faq.id}
              className="group bg-white border border-[#E6EBF1] rounded-xl overflow-hidden open:shadow-sm transition-shadow"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-[#F6F9FC]/50 transition-colors">
                <span className="text-sm font-medium text-[#1e3a5f]">{faq.q}</span>
                <svg className="w-4 h-4 text-[#A9B6C6] transition-transform group-open:rotate-180 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 pt-1 text-sm text-[#425466] leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))
        )}
      </div>

      <footer className="pt-6 border-t border-[#EEF2F6] text-sm text-[#8898AA]">
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
