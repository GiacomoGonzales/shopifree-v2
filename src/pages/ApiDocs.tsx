import { useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Public API documentation page.
 *
 * Lives at /api-docs (no language prefix, no auth required). Target audience
 * is developers integrating Cobrify or any external system that wants to
 * push products and pull orders from a Shopifree store.
 *
 * Content is in Spanish since the immediate target market is Peru/Cobrify.
 * If we ever need English we can split into /es/api-docs and /en/api-docs.
 *
 * No fancy doc generator — just JSX with copy-pasteable curl examples. The
 * content is the value, not the chrome.
 */

const TOC = [
  { id: 'intro', label: 'Introducción' },
  { id: 'auth', label: 'Autenticación' },
  { id: 'base-url', label: 'Base URL' },
  { id: 'store', label: 'GET /store' },
  { id: 'products-post', label: 'POST /products' },
  { id: 'products-delete', label: 'DELETE /products' },
  { id: 'orders-get', label: 'GET /orders' },
  { id: 'orders-sync', label: 'POST /orders (sync)' },
  { id: 'errors', label: 'Códigos de error' },
  { id: 'limits', label: 'Límites' },
  { id: 'best-practices', label: 'Buenas prácticas' },
]

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'DELETE' }) {
  const colors = {
    GET: 'bg-green-100 text-green-800 border-green-200',
    POST: 'bg-blue-100 text-blue-800 border-blue-200',
    DELETE: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] uppercase tracking-wide border ${colors[method]}`}>
      {method}
    </span>
  )
}

function CodeBlock({ children, language = 'bash' }: { children: string; language?: 'bash' | 'json' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-white text-[11px] px-2 py-1 rounded"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
        <code>{children}</code>
      </pre>
    </div>
  )
}

function Endpoint({
  method,
  path,
  id,
  children,
}: {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  id: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 mb-12">
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <MethodBadge method={method} />
        <code className="text-base font-mono font-semibold text-gray-900">{path}</code>
      </div>
      <div className="space-y-4 text-[15px] text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mb-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-4 text-[15px] text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg">shopifree</span>
            </Link>
            <span className="px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide border border-gray-200 text-gray-600">
              API Docs
            </span>
          </div>
          <Link to="/es/dashboard/api" className="text-sm text-gray-600 hover:text-gray-900">
            ← Volver al dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 py-8">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <nav className="text-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">Contenido</p>
            <ul className="space-y-0.5">
              {TOC.map(item => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block px-2 py-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="max-w-3xl">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Shopifree API v1</h1>
          <p className="text-base text-gray-600 mb-10">
            Push productos, recibí pedidos. Integrá Shopifree con tu sistema de gestión, ERP o POS.
          </p>

          {/* ───────────────── Intro ───────────────── */}
          <Section id="intro" title="Introducción">
            <p>
              La API pública de Shopifree permite que un sistema externo (Cobrify, un ERP, un POS,
              o cualquier herramienta de gestión) sincronice productos hacia el catálogo de la tienda
              y reciba los pedidos que entran por el storefront.
            </p>
            <p>El flujo típico:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>El dueño de la tienda genera una API key en su dashboard de Shopifree</li>
              <li>La pega en tu app — tu app la guarda y la usa para autenticar todas las requests</li>
              <li>Tu app empuja productos a Shopifree con <code className="bg-gray-100 px-1.5 py-0.5 rounded">POST /products</code></li>
              <li>Tu app hace polling de pedidos con <code className="bg-gray-100 px-1.5 py-0.5 rounded">GET /orders</code> cada N minutos</li>
              <li>Cuando procesás un pedido (creás la factura), confirmás con <code className="bg-gray-100 px-1.5 py-0.5 rounded">POST /orders</code> (acción <code>sync</code>)</li>
            </ol>
          </Section>

          {/* ───────────────── Auth ───────────────── */}
          <Section id="auth" title="Autenticación">
            <p>
              Todas las requests requieren un header <code className="bg-gray-100 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code>.
              El API key se genera desde el dashboard del dueño de la tienda (sección "API & Webhooks").
            </p>
            <p>Formato del key: <code className="bg-gray-100 px-1.5 py-0.5 rounded">sfk_</code> + 64 caracteres hex.</p>
            <CodeBlock>
              {`Authorization: Bearer sfk_60a6b02efcc90d9831a7f431e6b4d2fe9502178b4bbdd1c9872cbea14eaea462`}
            </CodeBlock>
            <p className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
              <strong>Importante:</strong> Shopifree solo almacena el hash SHA-256 del key. Si el dueño lo
              pierde, tiene que generar uno nuevo (lo cual invalida el anterior). Guardalo cifrado en tu base
              de datos — no lo logueés ni lo expongas en URLs.
            </p>
          </Section>

          {/* ───────────────── Base URL ───────────────── */}
          <Section id="base-url" title="Base URL">
            <CodeBlock>{`https://shopifree.app/api/v1`}</CodeBlock>
            <p>Todos los paths que ves abajo son relativos a esta base.</p>
          </Section>

          {/* ───────────────── GET /store ───────────────── */}
          <Endpoint method="GET" path="/store" id="store">
            <p>
              Devuelve datos básicos de la tienda asociada al API key. Útil al pegar el key por
              primera vez para validarlo y mostrar al usuario "Conectado a: [Nombre de la tienda]".
            </p>
            <h4 className="font-medium text-gray-900 mt-4">Ejemplo</h4>
            <CodeBlock>
{`curl https://shopifree.app/api/v1/store \\
  -H "Authorization: Bearer sfk_..."`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Respuesta 200</h4>
            <CodeBlock language="json">
{`{
  "store": {
    "id": "mJe3zuUhY8ggu8FxnKWyVP5fI3Z2",
    "name": "AlienStore",
    "subdomain": "alienstore",
    "customDomain": null,
    "currency": "PEN",
    "language": "es",
    "plan": "business",
    "country": "PE"
  }
}`}
            </CodeBlock>
          </Endpoint>

          {/* ───────────────── POST /products ───────────────── */}
          <Endpoint method="POST" path="/products" id="products-post">
            <p>
              Crea o actualiza productos en bulk. Cada producto se identifica por el campo
              <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1">externalId</code>, que es el ID
              estable en tu sistema. Si ya existe en Shopifree se actualiza; si no, se crea.
            </p>
            <h4 className="font-medium text-gray-900 mt-4">Body</h4>
            <CodeBlock language="json">
{`{
  "products": [
    {
      "externalId": "cobrify-prod-123",   // requerido — ID en tu sistema
      "name": "Camiseta Roja",             // requerido
      "price": 49.90,                       // requerido (PEN si la tienda es PE)
      "sku": "SHIRT-RED-M",                 // opcional
      "description": "Algodón premium...",
      "shortDescription": "Camiseta cómoda",
      "stock": 25,
      "trackStock": true,
      "comparePrice": 79.90,                // precio tachado "antes"
      "images": ["https://...", "..."],     // primer URL = imagen principal
      "categoryName": "Camisas",            // se crea automáticamente si no existe
      "brand": "Acme",
      "tags": ["verano", "cotton"],
      "active": true
    }
  ]
}`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Respuesta 200</h4>
            <CodeBlock language="json">
{`{
  "created": 5,
  "updated": 3,
  "errors": [
    { "externalId": "xyz", "error": "name is required (string)" }
  ]
}`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Notas</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Máximo <strong>200 productos por request</strong></li>
              <li>Si un producto del batch falla validación, los demás siguen procesándose (no se rompe todo)</li>
              <li>Las categorías se buscan por nombre exacto y se crean si no existen</li>
              <li>
                Los productos creados via API quedan <strong>read-only</strong> en el dashboard del dueño —
                tu sistema es la fuente de verdad
              </li>
              <li>Re-enviá el producto completo en cada POST (semántica de PUT, no PATCH)</li>
            </ul>
          </Endpoint>

          {/* ───────────────── DELETE /products ───────────────── */}
          <Endpoint method="DELETE" path="/products?externalId=X" id="products-delete">
            <p>Elimina un producto API-managed por su <code className="bg-gray-100 px-1.5 py-0.5 rounded">externalId</code>.</p>
            <CodeBlock>
{`curl -X DELETE "https://shopifree.app/api/v1/products?externalId=cobrify-prod-123" \\
  -H "Authorization: Bearer sfk_..."`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Respuestas</h4>
            <CodeBlock language="json">
{`// 200 OK
{ "deleted": true }

// 404 Not Found — el producto no existe o no fue creado via API
{ "error": "Not found" }`}
            </CodeBlock>
            <p className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900">
              <strong>Safety:</strong> este endpoint solo borra productos cuyo
              <code className="bg-blue-100 px-1 py-0.5 rounded mx-1">externalSource === "api"</code>.
              Nunca puede borrar un producto que el merchant creó manualmente en Shopifree, aunque
              el ID coincida por casualidad.
            </p>
          </Endpoint>

          {/* ───────────────── GET /orders ───────────────── */}
          <Endpoint method="GET" path="/orders" id="orders-get">
            <p>
              Lista los pedidos de la tienda, ordenados por fecha de creación descendente. Diseñado para
              polling: pasá la fecha del pedido más reciente que recibiste como <code className="bg-gray-100 px-1.5 py-0.5 rounded">since</code>
              en la próxima llamada para obtener solo los nuevos.
            </p>
            <h4 className="font-medium text-gray-900 mt-4">Query params</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>since</code> — ISO-8601 timestamp. Devuelve solo pedidos con <code>createdAt &gt;= since</code>. Opcional.</li>
              <li><code>status</code> — filtra por estado: <code>pending</code>, <code>confirmed</code>, <code>preparing</code>, <code>ready</code>, <code>delivered</code>, <code>cancelled</code>. Opcional.</li>
              <li><code>limit</code> — máx 500, default 100.</li>
            </ul>
            <CodeBlock>
{`curl "https://shopifree.app/api/v1/orders?since=2026-05-01T00:00:00Z&limit=50" \\
  -H "Authorization: Bearer sfk_..."`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Respuesta 200</h4>
            <CodeBlock language="json">
{`{
  "orders": [
    {
      "id": "ord_abc",
      "orderNumber": "ORD-001",
      "createdAt": "2026-05-01T16:48:22.269Z",
      "updatedAt": "2026-05-01T16:48:22.269Z",
      "status": "pending",
      "paymentStatus": "paid",
      "paymentMethod": "mercadopago",
      "paidAt": "2026-05-01T16:49:10.000Z",
      "channel": null,
      "customer": {
        "name": "Juan Pérez",
        "phone": "+51987654321",
        "email": "juan@ejemplo.pe"
      },
      "items": [
        {
          "productId": "api_cobrify-prod-123",
          "productExternalId": "cobrify-prod-123",
          "productName": "Camiseta Roja",
          "productImage": "https://...",
          "price": 49.90,
          "quantity": 2,
          "itemTotal": 99.80,
          "selectedVariations": null,
          "selectedModifiers": null,
          "combinationId": null,
          "combinationSku": null
        }
      ],
      "deliveryMethod": "delivery",
      "deliveryAddress": {
        "street": "Av. Larco 123",
        "state": "Lima",
        "city": "Lima",
        "district": "Miraflores",
        "reference": "Cerca al parque"
      },
      "subtotal": 99.80,
      "shippingCost": 10,
      "discount": null,
      "total": 109.80,
      "notes": "Sin cebolla",
      "externalInvoice": null
    }
  ],
  "count": 1
}`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Notas</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Cada item incluye <code>productExternalId</code> (con el prefijo <code>api_</code> ya quitado del{' '}
                <code>productId</code>) para que matchees directo con tu catálogo
              </li>
              <li>
                <code>externalInvoice</code> aparece solo si ya marcaste el pedido como sincronizado
                vía <code>POST /orders</code>. Usalo para skippear pedidos ya procesados
              </li>
              <li>Polling recomendado: cada 2-5 minutos con <code>since</code> = createdAt más reciente</li>
            </ul>
          </Endpoint>

          {/* ───────────────── POST /orders (sync) ───────────────── */}
          <Endpoint method="POST" path="/orders" id="orders-sync">
            <p>
              Marca un pedido de Shopifree como sincronizado con tu sistema. Pasá el ID de la factura/venta
              que generaste de tu lado para tener trazabilidad de ida y vuelta.
            </p>
            <h4 className="font-medium text-gray-900 mt-4">Body</h4>
            <CodeBlock language="json">
{`{
  "action": "sync",
  "orderId": "ord_abc",                  // id del pedido en Shopifree
  "externalInvoiceId": "F001-00123"      // id en tu sistema (ej. número de factura)
}`}
            </CodeBlock>
            <h4 className="font-medium text-gray-900 mt-4">Respuesta 200</h4>
            <CodeBlock language="json">{`{ "synced": true }`}</CodeBlock>
            <p>
              Después de esto, las futuras <code>GET /orders</code> que devuelvan este pedido incluirán
              <code className="bg-gray-100 px-1.5 py-0.5 rounded mx-1">externalInvoice</code> con el id y
              timestamp del sync. Idempotente — si lo llamás dos veces con distintos invoice IDs, el segundo gana.
            </p>
          </Endpoint>

          {/* ───────────────── Errors ───────────────── */}
          <Section id="errors" title="Códigos de error">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-700">Status</th>
                  <th className="px-3 py-2 font-medium text-gray-700">Significado</th>
                  <th className="px-3 py-2 font-medium text-gray-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 font-mono">400</td>
                  <td className="px-3 py-2">Request mal formado (body inválido, falta param)</td>
                  <td className="px-3 py-2">Revisar el payload contra estos docs</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">401</td>
                  <td className="px-3 py-2">API key inválido o ausente</td>
                  <td className="px-3 py-2">Pedirle al usuario que regenere el key</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">404</td>
                  <td className="px-3 py-2">Recurso no encontrado (producto, pedido)</td>
                  <td className="px-3 py-2">Validar que el ID existe</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">405</td>
                  <td className="px-3 py-2">Método HTTP no soportado en ese path</td>
                  <td className="px-3 py-2">Revisar GET/POST/DELETE arriba</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">500</td>
                  <td className="px-3 py-2">Error del servidor de Shopifree</td>
                  <td className="px-3 py-2">Reintentar con backoff exponencial</td>
                </tr>
              </tbody>
            </table>
            <p>El body de error siempre tiene la forma:</p>
            <CodeBlock language="json">{`{ "error": "Mensaje legible" }`}</CodeBlock>
          </Section>

          {/* ───────────────── Limits ───────────────── */}
          <Section id="limits" title="Límites">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>200 productos</strong> por request en POST /products</li>
              <li><strong>500 pedidos</strong> por request en GET /orders (default 100)</li>
              <li>Sin rate limit explícito por ahora, pero usá polling sensato (cada 2-5 min, no cada segundo)</li>
              <li>Timeouts: las funciones tienen 60s. Batches grandes pueden tardar varios segundos — diseñá retries con timeout amplio</li>
            </ul>
          </Section>

          {/* ───────────────── Best practices ───────────────── */}
          <Section id="best-practices" title="Buenas prácticas">
            <h4 className="font-medium text-gray-900 mt-4">Sincronización de productos</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>On change, no en batch nocturno:</strong> cuando el usuario edita un producto en
                tu sistema, hacé el POST inmediatamente. Mantiene Shopifree fresco sin latencia
              </li>
              <li>
                <strong>Re-sync periódico de defensa:</strong> además de los pushes en tiempo real,
                hacé un full re-sync una vez al día por si se perdió alguno
              </li>
              <li>
                <strong>Guardá el response:</strong> los <code>errors</code> que devuelve te dicen
                exactamente qué productos no se aceptaron y por qué — logueálos
              </li>
            </ul>

            <h4 className="font-medium text-gray-900 mt-4">Pull de pedidos</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Trackeá el último <code>since</code>:</strong> guardá el <code>createdAt</code>{' '}
                del pedido más reciente que procesaste; usalo como <code>since</code> en la próxima llamada
              </li>
              <li>
                <strong>Filtrá ya-sincronizados:</strong> si el pedido devuelve <code>externalInvoice ≠ null</code>,
                skippealo — ya lo procesaste en una iteración anterior
              </li>
              <li>
                <strong>Confirmá con sync:</strong> después de generar tu factura, llamá a
                <code>POST /orders</code> con la acción <code>sync</code>. Esto evita
                doble-procesamiento si tu cron se reinicia o el orden de eventos se desordena
              </li>
            </ul>

            <h4 className="font-medium text-gray-900 mt-4">Seguridad</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Almacená el API key cifrado en tu BD (igual que un password)</li>
              <li>Nunca lo expongas al cliente — todas las requests salen de tu backend</li>
              <li>Nunca lo loguées en archivos de log ni lo mandes en URLs (siempre header)</li>
              <li>Si sospechás que se filtró, pedile al usuario que regenere desde su dashboard de Shopifree</li>
            </ul>
          </Section>

          <hr className="my-12 border-gray-200" />
          <p className="text-sm text-gray-500">
            ¿Encontraste un bug o algo poco claro?{' '}
            <a href="https://github.com/GiacomoGonzales/shopifree-v2/issues" className="underline" target="_blank" rel="noopener noreferrer">
              Abrí un issue en GitHub
            </a>
            .
          </p>
        </main>
      </div>
    </div>
  )
}
