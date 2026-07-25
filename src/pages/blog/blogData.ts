export interface BlogPost {
  slug: string
  /** Categoria visible en /blog. Ver CATEGORIES en BlogList. */
  category: string
  title: string
  description: string
  content: string
  image: string
  author: string
  date: string
  /** Fecha de la ultima revision, si el articulo se actualizo despues de publicarse. */
  updated?: string
  readTime: number
  tags: string[]
  relatedPosts?: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'como-crear-tienda-online-gratis',
    category: 'Primeros pasos',
    title: 'Como Crear tu Tienda Online Gratis en 2026: Guia Completa',
    description: 'Aprende paso a paso como crear tu tienda online gratis sin conocimientos tecnicos. Empieza a vender hoy mismo con esta guia completa para emprendedores.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
    author: 'Shopifree',
    date: '2025-01-13',
    updated: '2026-07-25',
    readTime: 8,
    tags: ['tienda online', 'ecommerce', 'emprendimiento', 'gratis'],
    relatedPosts: ['vender-por-whatsapp-guia-completa', 'mejores-plataformas-ecommerce-gratis-2026'],
    content: `
Crear una tienda online ya no requiere grandes inversiones ni conocimientos tecnicos avanzados. En esta guia te mostramos como puedes tener tu negocio digital funcionando en menos de una hora.

## Por que necesitas una tienda online en 2026

El comercio electronico sigue creciendo exponencialmente. Segun estudios recientes:

- El 70% de los consumidores prefieren comprar online
- Las ventas por ecommerce crecieron 25% en el ultimo ano
- Los negocios con presencia online venden 3x mas que los que no la tienen

## Paso 1: Elige la plataforma correcta

No todas las plataformas son iguales. Busca una que ofrezca:

- **Plan gratuito real** (sin costos ocultos)
- **Sin comisiones por venta** (el 100% es tuyo)
- **Facil de usar** (sin necesidad de programar)
- **Ventas por WhatsApp** (donde estan tus clientes)

## Paso 2: Configura tu tienda

Una vez elegida la plataforma:

1. Registrate con tu correo electronico
2. Elige un nombre para tu tienda
3. Sube tu logo (o crea uno gratis)
4. Selecciona un tema que represente tu marca

## Paso 3: Agrega tus productos

Para cada producto necesitas:

- Fotos de buena calidad (usa tu celular)
- Titulo descriptivo con palabras clave
- Descripcion detallada
- Precio competitivo

**Tip:** Las tiendas con buenas fotos venden hasta 40% mas.

## Paso 4: Configura tus metodos de contacto

Asegurate de configurar:

- Tu numero de WhatsApp (para recibir pedidos)
- Tus redes sociales
- Tu email de contacto

## Paso 5: Comparte y empieza a vender

Tu tienda esta lista. Ahora:

- Comparte el link en tus redes sociales
- Agregalo a tu biografia de Instagram
- Envialo a tus contactos de WhatsApp
- Crea contenido mostrando tus productos

## Errores comunes a evitar

1. **No tener fotos profesionales** - Las fotos venden
2. **Precios poco claros** - Se transparente
3. **No responder rapido** - La velocidad cierra ventas
4. **No promocionar** - Tu tienda no se promociona sola

## Conclusion

Crear una tienda online gratis es mas facil que nunca. Con las herramientas correctas, puedes estar vendiendo en el mismo dia. No esperes mas, empieza hoy.

---

**Crea tu tienda gratis en Shopifree** y empieza a vender en minutos. Sin comisiones, sin complicaciones.
    `
  },
  {
    slug: 'vender-por-whatsapp-guia-completa',
    category: 'Vender mas',
    title: 'Como Vender por WhatsApp en 2026: Guia Definitiva',
    description: 'Descubre las mejores estrategias para vender por WhatsApp. Aprende a convertir conversaciones en ventas con esta guia paso a paso.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200',
    author: 'Shopifree',
    date: '2025-01-12',
    updated: '2026-07-25',
    readTime: 10,
    tags: ['whatsapp', 'ventas', 'marketing', 'emprendimiento'],
    relatedPosts: ['como-crear-tienda-online-gratis', 'catalogo-digital-para-negocios'],
    content: `
WhatsApp tiene mas de 2 mil millones de usuarios activos. Es donde estan tus clientes. Aprende a convertirlo en tu mejor canal de ventas.

## Por que vender por WhatsApp

- **Comunicacion directa** con tus clientes
- **Tasa de apertura del 98%** (vs 20% del email)
- **Respuestas instantaneas** que cierran ventas
- **Confianza** - es personal y cercano

## Configura tu WhatsApp Business

Si aun no lo tienes:

1. Descarga WhatsApp Business (es gratis)
2. Configura tu perfil de negocio
3. Agrega tu catalogo de productos
4. Crea mensajes automaticos

## Estrategias que funcionan

### 1. Responde rapido
Los clientes esperan respuestas en minutos, no horas. Configura:
- Mensaje de bienvenida automatico
- Mensaje de ausencia
- Respuestas rapidas para preguntas frecuentes

### 2. Usa listas de difusion
Envia ofertas y novedades a multiples clientes sin crear grupos. Respeta la privacidad y evita el spam.

### 3. Comparte tu catalogo
En lugar de enviar fotos sueltas, comparte el link de tu tienda online. Es mas profesional y facilita la compra.

### 4. Crea urgencia
- "Ultimas unidades"
- "Oferta valida hasta hoy"
- "Solo 3 disponibles"

### 5. Pide testimonios
Los clientes satisfechos son tu mejor publicidad. Pide que te envien fotos usando tu producto.

## Errores a evitar

1. **Spam excesivo** - No envies mensajes todos los dias
2. **No personalizar** - Usa el nombre del cliente
3. **Respuestas roboticas** - Se humano y cercano
4. **No dar seguimiento** - Pregunta si recibieron el producto

## Metricas importantes

Mide tu exito con:
- Tiempo de respuesta promedio
- Tasa de conversion (consultas vs ventas)
- Clientes recurrentes
- Ticket promedio

## Integracion con tu tienda online

La mejor combinacion:
1. Cliente ve tu catalogo online
2. Agrega productos al carrito
3. El pedido llega a tu WhatsApp
4. Tu confirmas y coordinas entrega

Asi automatizas el proceso y te enfocas en cerrar ventas.

---

**Con Shopifree**, tus clientes pueden armar su pedido y enviartelo directo a WhatsApp. Empieza gratis hoy.
    `
  },
  {
    slug: 'catalogo-digital-para-negocios',
    category: 'Primeros pasos',
    title: 'Catalogo Digital: Que Es y Como Crear Uno para tu Negocio',
    description: 'Aprende que es un catalogo digital, sus beneficios y como crear uno profesional para tu negocio sin gastar dinero.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
    author: 'Shopifree',
    date: '2025-01-11',
    readTime: 6,
    tags: ['catalogo digital', 'negocios', 'marketing digital'],
    relatedPosts: ['como-crear-tienda-online-gratis', 'vender-por-whatsapp-guia-completa'],
    content: `
Un catalogo digital es la version moderna del catalogo impreso. Es tu vitrina online disponible 24/7.

## Que es un catalogo digital

Es una presentacion online de tus productos o servicios que incluye:
- Fotos de alta calidad
- Descripciones detalladas
- Precios actualizados
- Formas de contacto

## Beneficios del catalogo digital

### Siempre actualizado
Cambias un precio? Lo actualizas en segundos. Nuevo producto? Lo agregas al instante.

### Ahorro en impresion
No mas gastos en imprimir catalogos que quedan desactualizados.

### Facil de compartir
Un simple link que puedes enviar por WhatsApp, redes sociales o email.

### Disponible 24/7
Tus clientes pueden ver tus productos a cualquier hora, desde cualquier lugar.

### Interactivo
Los clientes pueden hacer zoom en fotos, ver detalles y contactarte directamente.

## Como crear tu catalogo digital

### Opcion 1: PDF
- Facil de crear
- Dificil de actualizar
- No interactivo
- Se ve anticuado

### Opcion 2: Redes sociales
- Gratis
- Limitado en organizacion
- No tienes control del algoritmo
- Dificil de navegar

### Opcion 3: Plataforma especializada (Recomendado)
- Profesional
- Facil de actualizar
- Interactivo
- Con carrito de compras

## Elementos de un buen catalogo

1. **Fotos de calidad** - La primera impresion cuenta
2. **Categorias claras** - Facilita la navegacion
3. **Descripciones utiles** - Responde preguntas antes de que las hagan
4. **Precios visibles** - Transparencia genera confianza
5. **Contacto facil** - Un clic para comunicarse

## Tips para destacar

- Usa fondos limpios en tus fotos
- Mantiene una estetica consistente
- Actualiza frecuentemente
- Destaca tus productos estrella
- Incluye testimonios de clientes

---

**Crea tu catalogo digital gratis con Shopifree**. Profesional, facil de usar y siempre actualizado.
    `
  },
  {
    slug: 'mejores-plataformas-ecommerce-gratis-2026',
    category: 'Comparativas',
    title: 'Las 5 Mejores Plataformas de Ecommerce Gratis en 2026',
    description: 'Comparativa actualizada de las mejores plataformas para crear tu tienda online gratis en 2026. Descubre cual es la mejor opcion para tu negocio.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200',
    author: 'Shopifree',
    date: '2026-01-27',
    readTime: 12,
    tags: ['ecommerce', 'plataformas', 'comparativa', 'gratis', '2026'],
    relatedPosts: ['como-crear-tienda-online-gratis', 'tienda-virtual-vs-marketplace'],
    content: `
El ecosistema de ecommerce sigue evolucionando. En 2026, elegir la plataforma correcta es mas importante que nunca para el exito de tu negocio online.

## Criterios de evaluacion 2026

Evaluamos cada plataforma en:
- Facilidad de uso
- Funcionalidades gratuitas
- Comisiones por venta
- Integracion con WhatsApp y redes sociales
- Personalizacion y temas
- Herramientas de IA integradas

## 1. Shopifree

**Ideal para:** Emprendedores en Latinoamerica que venden por WhatsApp

**Pros:**
- 100% gratis para empezar
- Sin comisiones por venta
- Ventas directas por WhatsApp
- +15 temas profesionales para diferentes rubros
- Vista previa de temas en tiempo real
- Facil de usar, sin codigo
- Soporte para catalogos de tecnologia, restaurantes, moda y mas

**Contras:**
- Enfocado en mercado hispanohablante

**Precio:** Gratis / Pro desde $4.99/mes

**Novedad 2026:** Nuevos temas especializados por industria y vista previa instantanea.

## 2. WooCommerce

**Ideal para:** Usuarios tecnicos con WordPress

**Pros:**
- Open source y gratuito
- Muy personalizable
- Miles de plugins

**Contras:**
- Requiere hosting (costo adicional)
- Curva de aprendizaje alta
- Necesitas conocimientos tecnicos
- Vulnerabilidades de seguridad frecuentes

**Precio:** Gratis (pero hosting ~$15/mes en 2026)

## 3. Tiendanube

**Ideal para:** Negocios medianos en Latinoamerica

**Pros:**
- Buena integracion con pagos locales
- Soporte en espanol

**Contras:**
- Plan gratis muy limitado
- Cobra comisiones por venta (2%)
- Precios aumentaron en 2026

**Precio:** Gratis limitado / Desde $35/mes

## 4. Shopify

**Ideal para:** Negocios con presupuesto establecido

**Pros:**
- Plataforma robusta
- Muchas integraciones

**Contras:**
- Sin plan gratuito real (solo prueba)
- Comisiones adicionales si no usas Shopify Payments
- Costoso para emprendedores

**Precio:** Desde $39/mes + comisiones

## 5. Square Online

**Ideal para:** Negocios en USA

**Pros:**
- Plan gratis disponible
- Integracion con POS

**Contras:**
- Comision del 2.9% + 30c por transaccion
- Limitado fuera de USA

**Precio:** Gratis (con comisiones)

## Tabla comparativa 2026

| Plataforma | Gratis Real | Comisiones | WhatsApp | Facilidad | Temas |
|------------|-------------|------------|----------|-----------|-------|
| Shopifree | Si | 0% | Si | Alta | +15 |
| WooCommerce | Si* | 0% | Plugin | Baja | Variable |
| Tiendanube | Limitado | 2% | Si | Media | Pocos |
| Shopify | No | 2%+ | App | Alta | Muchos |
| Square | Si | 2.9%+ | No | Alta | Pocos |

*Requiere hosting pagado

## Tendencias de ecommerce 2026

- **WhatsApp Commerce:** El 78% de las compras en Latinoamerica involucran WhatsApp
- **Mobile-first:** El 85% del trafico viene de dispositivos moviles
- **Sin comisiones:** Los emprendedores buscan plataformas sin fees ocultos
- **Personalizacion:** Temas especializados por tipo de negocio

## Nuestra recomendacion para 2026

Para emprendedores en Latinoamerica que quieren empezar rapido y sin costos, **Shopifree** sigue siendo la mejor opcion:

- Empieza gratis de verdad (no es prueba)
- Sin comisiones que se coman tus ganancias
- Tus clientes te contactan por WhatsApp
- Nuevos temas para tecnologia, restaurantes, moda
- Vista previa de temas antes de elegir
- Facil de usar, sin codigo

---

**Prueba Shopifree gratis** y unete a los miles de emprendedores que ya venden online sin complicaciones.
    `
  },
  {
    slug: 'como-emprender-negocio-online',
    category: 'Primeros pasos',
    title: 'Como Emprender un Negocio Online desde Cero en 2026',
    description: 'Guia completa para emprender tu negocio online desde cero. Aprende los pasos esenciales para iniciar con exito.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
    author: 'Shopifree',
    date: '2025-01-09',
    updated: '2026-07-25',
    readTime: 15,
    tags: ['emprendimiento', 'negocio online', 'startup'],
    relatedPosts: ['como-crear-tienda-online-gratis', 'mejores-plataformas-ecommerce-gratis-2026'],
    content: `
El sueno de tener tu propio negocio esta mas cerca que nunca. Internet ha democratizado el emprendimiento.

## Paso 1: Encuentra tu nicho

No intentes vender todo a todos. Encuentra un nicho especifico:

- Que te apasione
- Que tenga demanda
- Con competencia manejable
- Donde puedas destacar

**Ejemplos de nichos exitosos:**
- Ropa deportiva para mujeres
- Accesorios para mascotas
- Productos organicos
- Tecnologia refurbished

## Paso 2: Valida tu idea

Antes de invertir tiempo y dinero:

1. Busca si hay demanda (Google Trends, redes sociales)
2. Analiza la competencia
3. Pregunta a potenciales clientes
4. Haz una preventa minima

## Paso 3: Define tu modelo de negocio

Opciones populares:

### Inventario propio
- Mayor control
- Mayor inversion inicial
- Mejores margenes

### Dropshipping
- Sin inventario
- Menor inversion
- Margenes mas bajos

### Productos digitales
- Sin inventario fisico
- Escalable
- Requiere expertise

## Paso 4: Crea tu presencia online

Necesitas como minimo:

1. **Tienda online** - Tu vitrina digital
2. **Redes sociales** - Para atraer clientes
3. **WhatsApp Business** - Para cerrar ventas

## Paso 5: Estrategia de precios

Considera:
- Costo del producto
- Costo de envio
- Comisiones de plataforma (busca 0%)
- Tu margen de ganancia
- Precio de la competencia

## Paso 6: Marketing inicial

Sin gran presupuesto puedes:

- Publicar contenido en redes sociales
- Pedirle a amigos que compartan
- Ofrecer descuentos de lanzamiento
- Colaborar con microinfluencers
- Usar WhatsApp Status

## Paso 7: Primeras ventas

Tus primeros clientes probablemente seran:
- Conocidos que confian en ti
- Referidos de referidos
- Personas de grupos de Facebook/WhatsApp

Tratales increiblemente bien. Ellos traeran mas clientes.

## Errores de principiante

1. **Perfeccionismo** - Lanza rapido, mejora despues
2. **Gastar mucho al inicio** - Empieza lean
3. **No medir** - Lo que no mides no mejoras
4. **Rendirse pronto** - Los primeros meses son duros

## Mentalidad de emprendedor

- Aprende de cada fracaso
- Escucha a tus clientes
- Adapta tu oferta
- Se constante
- Celebra pequenos logros

---

**Empieza tu negocio hoy con Shopifree**. Crea tu tienda gratis en minutos y da el primer paso.
    `
  },
  {
    slug: 'tienda-virtual-vs-marketplace',
    category: 'Comparativas',
    title: 'Tienda Virtual Propia vs Marketplace: Cual Elegir en 2026',
    description: 'Descubre las ventajas y desventajas de tener tu propia tienda virtual vs vender en marketplaces como MercadoLibre o Amazon.',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200',
    author: 'Shopifree',
    date: '2025-01-08',
    updated: '2026-07-25',
    readTime: 9,
    tags: ['tienda virtual', 'marketplace', 'ecommerce', 'comparativa'],
    relatedPosts: ['mejores-plataformas-ecommerce-gratis-2026', 'como-crear-tienda-online-gratis'],
    content: `
Una de las decisiones mas importantes al empezar a vender online: tienda propia o marketplace?

## Que es un Marketplace

Plataformas donde multiples vendedores ofrecen productos:
- MercadoLibre
- Amazon
- eBay
- Facebook Marketplace

## Que es una Tienda Virtual Propia

Tu propio sitio web donde solo tu vendes:
- Tu marca
- Tu diseno
- Tus reglas

## Ventajas del Marketplace

### Trafico existente
Millones de personas ya buscan productos ahi.

### Confianza
Los compradores confian en la plataforma.

### Infraestructura
Pagos, envios, todo resuelto.

## Desventajas del Marketplace

### Comisiones altas
Entre 10% y 20% por cada venta. Si vendes $1000, te quedas con $800-$900.

### Competencia directa
Tu producto al lado de 100 similares.

### Sin control de marca
Dificil diferenciarte y crear lealtad.

### Dependencia
Cambias sus reglas, cambias tu negocio.

### Sin datos del cliente
No puedes contactarlos directamente.

## Ventajas de Tienda Propia

### Sin comisiones (o minimas)
El 100% de la venta es tuyo.

### Control total
Tu marca, tu experiencia, tus reglas.

### Relacion directa con clientes
Puedes contactarlos, fidelizarlos.

### Diferenciacion
Construyes una marca unica.

### Independencia
No dependes de algoritmos ajenos.

## Desventajas de Tienda Propia

### Generar trafico
Debes atraer clientes tu mismo.

### Mas trabajo inicial
Configurar, personalizar, promocionar.

## La mejor estrategia: Ambos

Usa marketplace para:
- Ganar visibilidad inicial
- Validar demanda
- Generar primeras ventas

Usa tienda propia para:
- Construir tu marca
- Clientes recurrentes
- Mejores margenes
- Independencia a largo plazo

## Caso practico

**Mes 1-3:** Vende en MercadoLibre para validar
- Ganas experiencia
- Entiendes que busca el cliente
- Generas primeras reviews

**Mes 4+:** Lanza tu tienda propia
- Redirige clientes de marketplace
- Ofrece mejor precio (sin comision)
- Construye tu lista de clientes

## Conclusion

No es uno u otro, es usar ambos estrategicamente. Pero tu meta a largo plazo debe ser **tu propia tienda** donde:
- No pagas comisiones
- Controlas la experiencia
- Construyes una marca

---

**Crea tu tienda propia gratis con Shopifree**. Sin comisiones, con ventas por WhatsApp.
    `
  },
  {
    slug: 'como-cobrar-con-tarjeta-en-tu-tienda-online',
    category: 'Vender mas',
    title: 'Cómo Cobrar con Tarjeta en tu Tienda Online: MercadoPago, Stripe y PayPal',
    description: 'Guía práctica para aceptar pagos con tarjeta en tu tienda: qué pasarela te conviene según tu país, qué comisiones cobran y cómo configurarla paso a paso.',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200',
    author: 'Shopifree',
    date: '2026-07-21',
    readTime: 9,
    tags: ['pagos', 'mercadopago', 'stripe', 'paypal', 'ecommerce'],
    relatedPosts: ['vender-por-whatsapp-guia-completa', 'como-crear-tienda-online-gratis'],
    content: `
Recibir pedidos por WhatsApp funciona muy bien, pero llega un momento en que coordinar cada cobro por mensaje te quita horas. Aceptar tarjetas hace que el cliente pague en el momento, sin que tengas que perseguirlo.

En esta guía te explicamos qué opciones tienes, cuál conviene según dónde vendes y cómo dejarla funcionando.

## Por qué aceptar pagos con tarjeta

La diferencia no es solo comodidad. Cuando el cliente puede pagar al instante:

- **Se pierden menos ventas.** Entre que el cliente dice "sí, lo quiero" y hace la transferencia, muchos se arrepienten. El pago inmediato cierra la venta.
- **Cobras a cualquier hora.** Tu tienda vende de madrugada aunque tú estés durmiendo.
- **Menos trabajo manual.** No tienes que revisar comprobantes ni confirmar transferencias una por una.
- **Vendes más lejos.** Puedes atender a alguien de otra ciudad o país sin coordinar nada especial.

## Las opciones disponibles

### MercadoPago

Es la más usada en Latinoamérica y la que mejor funciona si vendes en la región.

- **Dónde opera:** Perú, Argentina, Chile, Colombia, Uruguay, México y Brasil
- **Métodos:** tarjetas de crédito y débito, dinero en cuenta de MercadoPago, y efectivo en agentes según el país
- **A favor:** tus clientes ya la conocen y confían en ella, lo que sube la conversión

### Stripe

La opción más sólida si vendes fuera de Latinoamérica o quieres cobrar en dólares.

- **Dónde opera:** Estados Unidos, Canadá, México, Brasil y buena parte de Europa y Asia
- **Métodos:** tarjetas internacionales, y billeteras como Apple Pay y Google Pay
- **A favor:** la experiencia de pago es muy pulida y funciona bien con clientes de otros países

### PayPal

Útil como complemento porque no depende del país.

- **Dónde opera:** prácticamente en todo el mundo
- **A favor:** muchos compradores ya tienen cuenta y pagan con dos clics, sin escribir su tarjeta

### Go Cuotas (solo Argentina)

Permite pagar en cuotas sin tarjeta de crédito, algo muy valorado en el mercado argentino. Si vendes en Argentina con tickets medianos o altos, suele aumentar bastante la conversión.

## Cuál elegir

No tienes que elegir solo una. Lo habitual es:

| Si vendes... | Te conviene |
| --- | --- |
| Solo en tu país (LatAm) | MercadoPago |
| A clientes de varios países | Stripe + PayPal |
| En Argentina con ticket alto | MercadoPago + Go Cuotas |
| Productos digitales al exterior | Stripe |

Un consejo: activa dos métodos como máximo al inicio. Demasiadas opciones en el checkout confunden y bajan la conversión.

## Cómo configurarlo en Shopifree

El proceso es el mismo para todas las pasarelas:

1. Entra a **Pagos** en el menú lateral de tu panel
2. Elige la pasarela que quieras activar
3. Crea tu cuenta de desarrollador en esa plataforma (es gratis)
4. Copia las credenciales que te dan y pégalas en Shopifree
5. Activa el **modo de prueba** y haz una compra de prueba tú mismo
6. Si todo funciona, desactiva el modo de prueba y ya estás cobrando

Cada pasarela pide credenciales distintas: MercadoPago pide Public Key y Access Token, Stripe pide Publishable Key y Secret Key, PayPal pide Client ID y Secret.

> Haz siempre una compra de prueba completa antes de anunciar que aceptas tarjetas. Es la única forma de detectar un dato mal copiado antes de que lo haga un cliente real.

## Sobre las comisiones

Todas las pasarelas cobran un porcentaje por transacción, que varía según el país y el método de pago. Consulta las tarifas vigentes en la web de cada una antes de decidir, porque cambian con el tiempo.

Ten en cuenta que esa comisión es de la pasarela, no de la plataforma: **Shopifree no cobra comisión por tus ventas**. Lo que cobra la pasarela es por procesar el pago, igual que un POS físico.

## Errores comunes al empezar

- **Dejar el modo de prueba activado.** Los pagos parecen funcionar pero el dinero nunca llega. Revísalo el primer día.
- **Copiar mal las credenciales.** Un espacio de más al pegar y los pagos fallan. Copia y pega, no escribas a mano.
- **No avisar que aceptas tarjetas.** Si tus clientes están acostumbrados a coordinar por WhatsApp, díselo: ponlo en tu barra de anuncios y en tus redes.
- **Ofrecer demasiados métodos.** Dos opciones claras convierten mejor que cinco.

## Y si prefieres seguir con WhatsApp

No hay problema. Aceptar tarjetas no reemplaza los pedidos por WhatsApp: conviven. Muchos negocios dejan ambos, y el cliente elige. Lo importante es no obligarlo a un solo camino.

Los pagos con tarjeta están disponibles desde el plan Pro. Si aún estás en el plan Gratis, puedes seguir recibiendo pedidos por WhatsApp sin límite y activar las tarjetas cuando tu volumen lo justifique.
    `
  },
  {
    slug: 'conectar-dominio-propio-tienda-online',
    category: 'Gestion',
    title: 'Cómo Conectar tu Dominio Propio a tu Tienda Online (Paso a Paso)',
    description: 'Aprende a conectar tu dominio .com a tu tienda online: qué registros DNS configurar, cuánto tarda en funcionar y cómo resolver los errores más frecuentes.',
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200',
    author: 'Shopifree',
    date: '2026-07-18',
    readTime: 8,
    tags: ['dominio', 'dns', 'marca', 'ecommerce'],
    relatedPosts: ['como-crear-tienda-online-gratis', 'catalogo-digital-para-negocios'],
    content: `
Pasar de \`mitienda.shopifree.app\` a \`mitienda.com\` cambia cómo te ven tus clientes. Es la diferencia entre parecer un proyecto y parecer una empresa.

La buena noticia: no necesitas saber de servidores. Son dos registros que copias y pegas.

## Por qué vale la pena

- **Confianza.** Un dominio propio transmite que el negocio es serio y estable.
- **Es tuyo.** Si algún día cambias de plataforma, te lo llevas contigo con todo su posicionamiento.
- **Se recuerda mejor.** Es más fácil que alguien recuerde tu nombre corto que una dirección larga.
- **Publicidad.** Queda mucho mejor en una tarjeta, en una bolsa o en un anuncio.

## Paso 1: Compra tu dominio

Si aún no lo tienes, cómpralo en un registrador. Los más sencillos de usar son GoDaddy, Namecheap y Hostinger.

Al elegir el nombre:

- **Corto y fácil de dictar.** Si tienes que deletrearlo por teléfono, es demasiado largo.
- **Sin guiones ni números.** \`mi-tienda-2.com\` se ve improvisado y se escribe mal.
- **.com si está libre.** Es el que la gente escribe por instinto. Si no, usa la extensión de tu país (.pe, .mx, .ar, .co).

## Paso 2: Agrégalo en tu panel

Entra a **Dominio** en el menú lateral, escribe tu dominio y haz clic en conectar. La pantalla te mostrará los registros DNS que tienes que configurar.

Deja esa pantalla abierta: vas a copiar esos valores en el paso siguiente.

## Paso 3: Configura los DNS

Entra al panel de donde compraste el dominio y busca la sección de DNS (suele llamarse "DNS", "Zona DNS" o "Registros DNS"). Ahí vas a crear dos registros:

**Registro A** — apunta el dominio principal:
- Nombre / Host: \`@\` (o déjalo vacío según el proveedor)
- Valor: la dirección IP que te muestra tu panel
- TTL: automático

**Registro CNAME** — apunta la versión con www:
- Nombre / Host: \`www\`
- Valor: el destino que te muestra tu panel
- TTL: automático

> Copia siempre los valores desde tu panel de Dominio, no de un tutorial. Pueden cambiar con el tiempo, y tu panel siempre muestra los vigentes.

### Dónde encontrar esa sección

- **GoDaddy:** Mis productos → DNS (al lado del dominio) → Registros
- **Namecheap:** Dashboard → Manage → pestaña Advanced DNS
- **Hostinger:** hPanel → Dominios → tu dominio → DNS / Nameservers

Si tu proveedor no aparece aquí, busca "DNS" en su panel. Todos tienen esa sección aunque la llamen distinto.

## Paso 4: Espera y verifica

Los cambios de DNS tardan en propagarse por internet. Normalmente están listos en menos de una hora, aunque técnicamente pueden tardar hasta 48.

Vuelve a **Dominio** en tu panel y haz clic en verificar. Cuando esté conectado, el certificado de seguridad (el candado del navegador) se genera solo: no tienes que hacer nada extra ni pagar aparte.

## Errores frecuentes

**"Ya pasaron horas y no funciona"**
Casi siempre es un registro A viejo que quedó apuntando a otro lado. Revisa que no haya dos registros A con el mismo nombre y borra el que sobra.

**"Funciona con www pero no sin www" (o al revés)**
Falta uno de los dos registros. Necesitas ambos: el A para el dominio pelado y el CNAME para www.

**"Escribí mal el valor del CNAME"**
Es el error más común. Revisa que no falte ni sobre ningún punto y que no haya espacios al inicio o al final.

**"Mi proveedor no me deja usar @"**
Algunos piden que dejes el campo vacío en vez de escribir @. Significan lo mismo.

## Después de conectarlo

Cuando tu dominio esté funcionando:

1. **Actualiza tus redes sociales** con la nueva dirección
2. **Cambia el link de tu bio** en Instagram y TikTok
3. **Avisa a tus clientes frecuentes** por WhatsApp
4. **Actualiza tu código QR** si lo tienes impreso en el local

Tu dirección anterior de \`.shopifree.app\` sigue funcionando, así que nadie se queda sin poder entrar mientras haces el cambio.

El dominio propio está disponible desde el plan Pro. El dominio en sí lo compras aparte, en el registrador que prefieras: no lo vendemos nosotros, y así queda 100% a tu nombre.
    `
  },
  {
    slug: 'como-controlar-el-stock-de-tu-tienda',
    category: 'Gestion',
    title: 'Cómo Controlar el Stock de tu Tienda sin Volverte Loco',
    description: 'Variantes, almacenes y quiebres de stock explicados simple. Aprende a llevar el inventario de tu tienda online para no vender lo que ya no tienes.',
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200',
    author: 'Shopifree',
    date: '2026-07-15',
    readTime: 8,
    tags: ['inventario', 'stock', 'gestion', 'ecommerce'],
    relatedPosts: ['como-crear-tienda-online-gratis', 'catalogo-digital-para-negocios'],
    content: `
Vender algo que ya no tienes es de las peores experiencias que le puedes dar a un cliente. Tienes que escribirle, disculparte, devolverle el dinero, y esa persona probablemente no vuelva.

Llevar el stock ordenado evita eso. Y no es tan complicado como parece.

## Empieza por lo básico

Si recién arrancas, no necesitas un sistema complejo. Solo necesitas responder tres preguntas:

1. ¿Cuánto tengo de cada producto?
2. ¿Qué se está por acabar?
3. ¿Qué no se mueve hace meses?

Con eso ya tomas mejores decisiones que la mayoría.

## Variantes: cuando un producto es varios

Aquí es donde se complica la mayoría. Un polo no es "un producto": es talla S, M, L y XL, y quizá en tres colores. Eso son doce combinaciones distintas, cada una con su propio stock.

Si llevas un solo número para "polo", vas a vender una talla S que se acabó hace una semana.

Lo correcto es manejar el stock **por combinación**: talla M color negro tiene 4 unidades, talla S color negro tiene 0. Así tu tienda muestra automáticamente como agotada solo la combinación que se acabó, y el resto se sigue vendiendo.

En Shopifree puedes crear variantes por talla, color o material, y asignarle stock a cada combinación desde la ficha del producto.

## Almacenes: cuando tienes stock en varios lugares

Si guardas mercadería en tu casa y en el local, o tienes dos sucursales, necesitas saber qué hay en cada sitio. No es lo mismo tener 10 unidades repartidas que 10 en un solo lugar cuando alguien pide 8.

Manejar almacenes por separado te permite:

- Saber desde dónde despachar cada pedido
- Detectar si te conviene mover mercadería entre locales
- Hacer inventarios parciales sin parar todo el negocio

## Cuándo el stock baja solo

Este es el punto que más confunde, así que vale la pena entenderlo bien:

- **Si el cliente paga online** (tarjeta, MercadoPago, PayPal), el stock se descuenta automáticamente cuando el pago se confirma. No tienes que hacer nada.
- **Si el pedido llega por WhatsApp**, el stock **no** baja solo. Tiene sentido: mucha gente pregunta y no compra. Tú confirmas el pedido en el panel cuando la venta se concreta.

Esa diferencia es a propósito. Si el stock bajara con cada consulta de WhatsApp, tu inventario sería un desastre en una semana.

## Registra también lo que vendes fuera

Si tienes local físico o vendes en ferias, esas ventas también salen de tu stock. Si no las registras, tu inventario online va a decir que tienes cosas que ya no están.

Puedes registrar una venta manual desde la sección de Pedidos y el stock se ajusta igual que con una venta online.

## Cómo hacer un inventario sin morir en el intento

Una vez al mes, tómate una hora:

1. **Cuenta físicamente** lo que tienes, producto por producto
2. **Compáralo** con lo que dice tu panel
3. **Ajusta las diferencias** y anota por qué (rotura, robo, error de conteo, regalo)
4. **Revisa qué no se movió** en 90 días y decide si liquidarlo

Ese último punto es el más rentable. La mercadería parada es dinero congelado: muchas veces conviene liquidarla al costo y usar esa plata en algo que sí rota.

## Señales de que tu stock está mal llevado

- Te enteras de que algo se acabó cuando un cliente ya lo compró
- Compras de nuevo un producto del que todavía te quedaban cajas
- No sabes cuánto dinero tienes invertido en mercadería
- Cada vez que alguien pregunta por disponibilidad tienes que ir a mirar

Si te pasa alguna, empieza por lo simple: carga el stock real de tus 20 productos que más rotan. No intentes ordenar todo el catálogo el primer día.

## Cuando el negocio crece

Cuando ya manejas volumen, el control de stock se conecta con el resto: compras a proveedores, costos, producción y flujo de caja. Ahí es donde ves de verdad si estás ganando dinero, porque una venta alta con mala rotación de inventario puede dejarte sin liquidez.

Empieza simple. Un stock básico bien llevado es infinitamente mejor que un sistema complejo que no actualizas.
    `
  },
  {
    slug: 'fotos-de-productos-con-el-celular',
    category: 'Vender mas',
    title: 'Fotos de Productos con tu Celular: Guía Práctica para Vender Más',
    description: 'No necesitas cámara profesional ni estudio. Aprende a tomar fotos de producto que venden usando solo tu celular, luz natural y materiales que ya tienes en casa.',
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1200',
    author: 'Shopifree',
    date: '2026-07-11',
    readTime: 7,
    tags: ['fotografia', 'productos', 'tips', 'ventas'],
    relatedPosts: ['catalogo-digital-para-negocios', 'como-crear-tienda-online-gratis'],
    content: `
En una tienda online, la foto hace el trabajo que en un local hace el producto en la mano. El cliente no puede tocarlo ni probárselo: solo ve la imagen.

Por eso una buena foto vende y una mala espanta, aunque el producto sea excelente. Y no, no necesitas comprar una cámara.

## La luz es el 80% del resultado

Si te quedas con una sola idea de este artículo, que sea esta: **usa luz natural y apaga el flash**.

- **Ponte cerca de una ventana**, con la luz entrando de costado, no de frente ni de atrás.
- **Evita el sol directo del mediodía.** Hace sombras muy duras. Mejor temprano en la mañana o a media tarde.
- **Los días nublados son ideales.** Las nubes funcionan como un difusor gigante y la luz queda pareja.
- **Nunca uses el flash del celular.** Aplasta el producto, cambia los colores y grita "foto casera".

Si necesitas suavizar una sombra, pon una cartulina blanca del lado opuesto a la ventana. Rebota la luz y rellena. Cuesta un sol y funciona igual que un equipo profesional.

## El fondo: mientras más simple, mejor

El protagonista es el producto, no tu cocina.

- **Una cartulina blanca** curvada contra la pared es el fondo más versátil y barato que existe.
- **Un color liso** que contraste también funciona: un producto claro sobre fondo oscuro se ve muy bien.
- **Madera o tela lisa** si tu marca es más artesanal.
- **Nada de desorden.** Que no salga el cargador, la taza ni el gato.

Lo importante es la **consistencia**: si todas tus fotos tienen el mismo fondo, tu catálogo se ve profesional aunque cada foto por separado sea sencilla.

## Cómo encuadrar

- **Limpia el lente** antes de empezar. Tu celular vive en el bolsillo y el lente está lleno de huellas. Este solo paso mejora todas tus fotos.
- **Toca la pantalla sobre el producto** para que enfoque ahí y ajuste la luz.
- **Usa la cámara trasera**, nunca la frontal: tiene mucha mejor calidad.
- **No uses zoom digital.** Acércate tú. El zoom del celular pierde definición.
- **Deja aire alrededor** del producto para poder recortar después.
- **Dispara en cuadrado (1:1)** si puedes: es el formato que mejor se ve en catálogos y redes.

## Cuántas fotos por producto

Una foto no alcanza. El cliente quiere ver:

1. **La principal:** producto completo, fondo limpio, bien iluminado
2. **Un detalle:** la textura, la costura, el acabado, el material
3. **En contexto:** alguien usándolo o el producto en su entorno real
4. **La escala:** junto a un objeto conocido, para que se entienda el tamaño

Esa tercera foto —el producto en uso— suele ser la que más convierte, porque le permite al cliente imaginarse con él.

## Edición: menos es más

Con la edición del propio celular alcanza:

- **Sube un poco el brillo** si quedó oscura
- **Ajusta ligeramente el contraste**
- **Endereza** si quedó torcida
- **Recorta** para que el producto ocupe la mayor parte del cuadro

Lo que **no** debes hacer: saturar los colores hasta que el producto se vea de un tono que no es. Si el cliente recibe algo de otro color, vas a tener una devolución y una mala reseña.

## Errores que cuestan ventas

- **Fotos oscuras.** Es el error número uno. Ante la duda, más luz.
- **Fondos con desorden.** Distraen y se ven descuidados.
- **Cada foto de un tamaño y estilo distinto.** El catálogo se ve desordenado.
- **Marcas de agua enormes.** Molestan más de lo que protegen.
- **Fotos sacadas de internet.** Además de ser problema legal, el cliente nota que no es tu producto real.

## Un truco para catálogos grandes

Si tienes muchos productos, no los fotografíes de a uno cada día. Arma tu montaje una sola vez —ventana, cartulina, celular— y fotografía 30 productos seguidos en la misma sesión.

Además de ahorrarte horas, todas van a tener la misma luz y el mismo fondo, y ahí es cuando tu catálogo empieza a verse realmente profesional.

## Cuántas fotos puedes subir

En Shopifree puedes subir 1 foto por producto en el plan Gratis, 5 en el plan Pro y 10 en Business. Si recién empiezas, una buena foto es suficiente: es mejor una imagen bien hecha que cinco malas.
    `
  },
  {
    slug: 'cupones-y-promociones-que-si-venden',
    category: 'Vender mas',
    title: 'Cupones y Promociones que Sí Venden (y las que Solo te Hacen Perder Plata)',
    description: 'Cómo usar cupones de descuento en tu tienda online sin regalar tu margen. Qué promociones funcionan, cuándo lanzarlas y los errores que arruinan la rentabilidad.',
    image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1200',
    author: 'Shopifree',
    date: '2026-07-08',
    readTime: 7,
    tags: ['cupones', 'promociones', 'marketing', 'ventas'],
    relatedPosts: ['vender-por-whatsapp-guia-completa', 'como-emprender-negocio-online'],
    content: `
Un descuento mal pensado no te trae clientes nuevos: le regala plata a los que igual te iban a comprar. Y una vez que tus clientes se acostumbran a esperar la oferta, ya no compran a precio normal.

La diferencia entre una promoción que suma y una que resta está en para qué la usas.

## Primero: ¿qué problema quieres resolver?

Antes de crear un cupón, define qué buscas. No es lo mismo:

- **Conseguir el primer pedido** de alguien que nunca te compró
- **Subir el ticket promedio** de quien ya está comprando
- **Recuperar clientes** que no vuelven hace meses
- **Liquidar stock** que está parado hace demasiado

Cada objetivo pide un tipo de promoción distinto. Si lanzas un descuento general "porque sí", estás resolviendo todos a medias y perdiendo margen en el camino.

## Promociones que funcionan

### Descuento de bienvenida
Un porcentaje pequeño para la primera compra. Sirve para que alguien que duda se anime a probar. Con 10% suele alcanzar; no necesitas dar 30%.

### Envío gratis desde cierto monto
De las más efectivas que existen. Si tu ticket promedio es 50, pon el envío gratis desde 70: mucha gente agrega algo más para llegar. Subes el ticket sin tocar el precio de tus productos.

### Promoción por tiempo limitado
La urgencia real funciona. Un descuento de fin de semana, con fecha de vencimiento visible, empuja a decidir hoy en vez de "lo pienso".

Lo importante: que sea **real**. Si tu oferta "por hoy" lleva tres meses, tus clientes dejan de creerte.

### Liquidación de lo que no rota
Ese producto que compraste hace ocho meses y sigue ahí es dinero congelado. Liquidarlo al costo no es perder: es recuperar plata para invertirla en algo que sí se vende.

### Cupón para clientes frecuentes
Un código exclusivo para quienes ya te compraron varias veces. Cuesta mucho menos retener que conseguir un cliente nuevo, y genera lealtad real.

## Promociones que te hacen perder

**El descuento permanente.** Si siempre hay 20% off, ese es tu precio real y perdiste el margen para siempre.

**Descontar sobre lo que ya vuela.** Si un producto se vende bien a precio lleno, un descuento solo reduce lo que ganas por unidad. Descuenta lo que no se mueve.

**Regalar demasiado.** Un 50% de descuento puede dejarte vendiendo por debajo del costo. Saca la cuenta antes: cuánto te queda después del descuento, del envío y de la comisión de la pasarela.

**Cupones sin límite.** Sin fecha de vencimiento ni tope de usos, un código que se filtra en un grupo de ofertas puede costarte muy caro.

**Descuentos que nadie ve.** Si creas la promoción y no la comunicas, no pasa nada. La promoción es la mitad del trabajo; avisarla es la otra mitad.

## Cómo protegerte al crear un cupón

Cuando crees un cupón, define siempre:

- **Fecha de vencimiento.** Toda promoción debe terminar.
- **Monto mínimo de compra.** Evita que usen un cupón de 10 en una compra de 12.
- **Tope de usos.** Limita cuántas veces se puede canjear en total.
- **Un código difícil de adivinar** si es exclusivo para un cliente.

En Shopifree puedes crear cupones por porcentaje o por monto fijo, y configurar todo eso desde la sección de Cupones.

## Saca la cuenta antes de lanzar

Un ejercicio rápido que evita disgustos:

1. Precio de venta: **100**
2. Costo del producto: **60** → tu margen es **40**
3. Aplicas 20% de descuento → cobras **80**, tu margen baja a **20**
4. Si además el envío te cuesta 10 → te quedan **10**

Con ese 20% de descuento pasaste de ganar 40 a ganar 10. Necesitas vender **cuatro veces más** solo para ganar lo mismo. ¿La promoción va a cuadruplicar tus ventas? Si la respuesta es no, revisa el número.

## Dónde anunciarla

Una vez creada, que se vea:

- **La barra de anuncios** de tu tienda, arriba de todo
- **Tus estados de WhatsApp**, donde están tus clientes reales
- **Instagram y TikTok**, en publicación e historia
- **Un mensaje directo** a tus mejores clientes: es el que mejor convierte

## En resumen

Los descuentos son una herramienta, no una estrategia. Úsalos con un objetivo claro, con límites definidos y por tiempo determinado.

Si tu negocio solo vende cuando hay promoción, el problema no se arregla con más descuentos: hay que revisar el precio, el producto o cómo lo estás mostrando.

Los cupones están disponibles desde el plan Pro.
    `
  },
  {
    slug: 'como-conseguir-tus-primeros-clientes',
    category: 'Vender mas',
    title: 'Cómo Conseguir tus Primeros 10 Clientes (sin Gastar en Publicidad)',
    description: 'Tu tienda ya está lista pero nadie compra. Guía práctica para conseguir tus primeras ventas usando los contactos y redes que ya tienes, sin invertir en anuncios.',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1200',
    author: 'Shopifree',
    date: '2026-07-25',
    readTime: 9,
    tags: ['clientes', 'ventas', 'marketing', 'emprendimiento'],
    relatedPosts: ['vender-por-whatsapp-guia-completa', 'cupones-y-promociones-que-si-venden'],
    content: `
Terminaste tu tienda, subiste los productos, quedó bonita. Compartes el link y... no pasa nada. Es el momento más frustrante de emprender, y le pasa absolutamente a todos.

La buena noticia: tus primeras ventas casi nunca vienen de desconocidos. Vienen de gente que ya te conoce. Y no necesitas presupuesto para llegar a ellos.

## Antes de salir a vender: revisa esto

Si mandas tráfico a una tienda que no está lista, quemas oportunidades. Chequea rápido:

- **Cada producto tiene foto, precio y descripción.** Sin precio no hay venta: la gente no pregunta, se va.
- **Tu WhatsApp está bien configurado.** Prueba tú mismo hacer un pedido y confirma que te llega.
- **Tienes al menos 6 u 8 productos.** Una tienda con dos cosas parece abandonada.
- **Se ve bien en el celular.** Es donde va a entrar el 90% de tu gente.

## Paso 1: tu círculo cercano (los primeros 3)

Empieza por donde es más fácil. No para que te compren por lástima, sino porque son quienes te van a dar feedback honesto y las primeras reseñas.

- **Mándalo por mensaje directo, uno por uno.** Un mensaje personal convierte muchísimo más que una publicación general.
- **No pidas que compren, pide opinión.** "Acabo de abrir mi tienda, ¿le das una mirada y me dices qué te parece?" Muchos terminan comprando solos.
- **Ofrece algo por ser los primeros.** Un descuento de lanzamiento genuino para las primeras 10 personas.

## Paso 2: tus estados de WhatsApp

Esta es la herramienta más subestimada que existe, y es gratis.

Tus contactos ya te conocen y ya te tienen agendado. Un estado lo ven decenas o cientos de personas sin que tengas que pagar nada.

Qué publicar:

- **El producto en uso**, no solo la foto de catálogo
- **El detrás de escena**: preparando pedidos, empacando, llegando mercadería
- **Los pedidos que van saliendo** (con permiso del cliente), porque genera prueba social
- **Tu link**, siempre visible

Un consejo: no publiques solo cuando quieres vender. Si tus estados son puro catálogo, la gente deja de mirarlos.

## Paso 3: Instagram y TikTok

No necesitas ser creador de contenido. Necesitas ser constante.

- **Pon tu link en la bio.** Es el error número uno: perfiles llenos de productos sin forma de comprar.
- **Publica el producto en contexto**, no solo sobre fondo blanco. La gente compra lo que se imagina usando.
- **Usa video corto.** Desempacar, mostrar texturas, mostrar cómo queda puesto. Convierte mucho más que la foto fija.
- **Responde todos los comentarios y mensajes.** El algoritmo premia la conversación, y además cada respuesta es una venta potencial.

## Paso 4: los grupos donde ya está tu cliente

Grupos de barrio en WhatsApp o Facebook, comunidades de tu rubro, grupos del colegio de tus hijos, del trabajo, del edificio.

La regla de oro: **participa antes de vender**. Si entras a un grupo y lo primero que haces es tirar tu link, te van a sacar. Aporta un tiempo, y cuando corresponda menciona lo que haces.

## Paso 5: el mundo físico

Si tienes local, atiendes ferias o entregas en persona, tienes una ventaja que los negocios 100% online no tienen.

- **Código QR impreso** en el mostrador, en la bolsa, en la tarjeta
- **Un volante pequeño** dentro de cada pedido, invitando a seguirte
- **Pídele a cada cliente que te siga** en redes cuando le entregas

Tu tienda genera un QR automáticamente desde el panel: imprímelo y pégalo donde tu cliente ya está.

## El paso que casi todos saltan: pedir la recompra

Conseguir un cliente nuevo cuesta mucho más que hacer que uno vuelva. Cuando alguien ya te compró:

1. **Escríbele unos días después** para saber si todo llegó bien. No para vender, para preguntar.
2. **Pídele una foto o una reseña.** Es tu mejor material de marketing y es gratis.
3. **Avísale primero** cuando llegue mercadería nueva. Que se sienta cliente frecuente, no un número.

## Qué esperar de verdad

Tus primeras 10 ventas van a ser lentas y casi todas de gente conocida. Es normal, no significa que tu negocio no funcione.

Lo que sí importa es lo que aprendes en el camino: qué producto pregunta la gente, qué dudas se repiten, qué foto genera más mensajes. Esa información vale más que las primeras ventas en sí, porque es la que te dice qué vender después.

## Cuando ya tengas tráfico, mide

Cuando empieces a recibir visitas, revisa tus estadísticas: de dónde vienen, qué productos miran más y en qué punto se van sin comprar. Ahí es cuando puedes empezar a tomar decisiones con datos en vez de intuición.
    `
  },
  {
    slug: 'como-poner-precio-a-tus-productos',
    category: 'Gestion',
    title: 'Cómo Poner Precio a tus Productos sin Regalar tu Trabajo',
    description: 'Aprende a calcular el precio de tus productos considerando costos, tiempo, comisiones y envío. Con ejemplos reales y los errores que dejan a los emprendedores sin margen.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
    author: 'Shopifree',
    date: '2026-07-24',
    readTime: 10,
    tags: ['precios', 'margen', 'costos', 'gestion'],
    relatedPosts: ['cupones-y-promociones-que-si-venden', 'como-controlar-el-stock-de-tu-tienda'],
    content: `
Poner precio "a ojo" o copiando al de al lado es la razón número uno por la que muchos negocios venden mucho y no ganan nada.

Vamos a hacerlo bien, con números.

## Primero: cuánto te cuesta de verdad

La mayoría solo cuenta lo que le costó el producto. Y ahí empieza el problema, porque hay costos que no ves pero igual pagas.

**Costos directos** (los obvios):
- Lo que pagaste por el producto o los materiales
- Empaque: bolsa, caja, etiqueta, papel
- Comisión de la pasarela de pago
- Envío, si tú lo asumes

**Costos indirectos** (los que se olvidan):
- Tu tiempo (sí, tu tiempo vale)
- Internet, luz, transporte a proveedores
- Publicidad, si haces
- Roturas, pérdidas y devoluciones
- Mercadería que nunca se vendió

Ese último punto duele pero es real: si de cada 10 unidades una nunca se vende, esa pérdida tiene que estar repartida en las otras 9.

## El cálculo básico

Empecemos simple. Un producto que te cuesta 40:

| Concepto | Monto |
| --- | --- |
| Costo del producto | 40 |
| Empaque | 3 |
| Comisión de pago (≈4%) | 4 |
| **Costo total** | **47** |

Si lo vendes a 60, ganas 13. Ese 13 sobre 60 es un margen de **21%**. ¿Suficiente? Depende de cuánto vendas y de qué otros gastos tengas, pero para la mayoría de negocios pequeños es ajustado.

## Cuánto margen necesitas

Como referencia general:

- **Productos de reventa:** apunta a 40-50% de margen
- **Productos hechos por ti:** 50-70%, porque tu tiempo va incluido
- **Servicios:** depende de las horas, pero nunca menos de lo que te pagarían por ese tiempo trabajando para otro

Si tu margen está por debajo del 30%, cualquier imprevisto —una devolución, una rotura, un envío mal cobrado— te deja en cero.

## No te olvides de pagarte a ti

Este es el error más común en productos artesanales o hechos a mano.

Si haces velas y cada una te toma 40 minutos, ese tiempo es un costo. Si tu hora vale 15, esa vela lleva 10 de mano de obra **antes** de los materiales. Si no lo cuentas, no tienes un negocio: tienes un pasatiempo que te cuesta dinero.

## Cuidado con el envío

El envío se come márgenes enteros sin que te des cuenta.

Tienes tres opciones:

1. **El cliente lo paga aparte.** Lo más transparente, pero baja la conversión: a nadie le gusta ver un costo extra al final.
2. **Lo incluyes en el precio.** El producto se ve más caro, pero "envío gratis" convierte mucho mejor.
3. **Gratis desde cierto monto.** La mejor de las tres: te protege en compras chicas y empuja el ticket hacia arriba.

Si eliges la tercera, calcula bien el umbral. Si tu envío cuesta 8 y pones envío gratis desde 30, en una compra de 30 estás regalando casi todo tu margen. Pon el umbral donde el margen alcance a cubrirlo.

Puedes configurar zonas de entrega con costos distintos según el distrito, y así no pierdes en las entregas lejanas.

## Precio psicológico

Cuando ya tienes tu número, ajústalo:

- **Termina en 9.** 39 se percibe bastante más barato que 40, aunque sea un sol de diferencia.
- **No pongas precios rarísimos.** 38.47 se ve improvisado y da desconfianza.
- **Redondea en productos caros.** En tickets altos, 1,200 se ve más serio que 1,199.

## Los errores que arruinan el margen

**Copiar el precio del vecino.** No sabes sus costos. Quizá compra en volumen, quizá no le paga a nadie, quizá está perdiendo plata y no lo sabe.

**Poner precio bajo "para arrancar".** Subir precios después es durísimo: tus clientes ya se acostumbraron. Es mejor entrar con el precio correcto y dar un descuento de lanzamiento temporal.

**Olvidar la comisión de pago.** Si tu margen es 15% y la pasarela cobra 4%, se llevó más de un cuarto de tu ganancia.

**No revisar nunca.** Los costos suben. Si tu proveedor te subió el precio hace ocho meses y tú no moviste el tuyo, estás vendiendo con menos margen del que crees.

## Cuándo y cómo subir precios

Revisa tus precios al menos dos veces al año. Cuando toque subir:

- **Sube poco y seguido**, mejor que mucho de golpe
- **Avisa con tiempo** a tus clientes frecuentes: se lo van a tomar bien
- **Sube primero lo que más se vende**, que es donde tienes demanda comprobada
- **Aprovecha para mejorar algo**: mejor empaque, mejor foto, un detalle extra

Y si te da miedo: casi siempre pierdes menos clientes de los que crees. Los que se van por un 10% probablemente no eran tus clientes ideales.

## Un ejercicio que vale la pena

Toma tus 5 productos más vendidos y calcula el margen real de cada uno, con todos los costos incluidos. Casi siempre aparece una sorpresa: hay un producto que vendes muchísimo y que casi no deja nada.

Ese producto no necesariamente es malo —puede ser el que atrae gente— pero necesitas saberlo para decidir a conciencia y no por accidente.
    `
  },
  {
    slug: 'como-cobrar-los-envios-de-tu-tienda',
    category: 'Gestion',
    title: 'Envíos: Cómo Cobrar el Delivery sin Perder Dinero ni Ventas',
    description: 'Costo fijo, envío gratis desde cierto monto, zonas por distrito o retiro en tienda. Cómo elegir la estrategia de envío correcta para tu tienda online y configurarla bien.',
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200',
    author: 'Shopifree',
    date: '2026-07-23',
    readTime: 8,
    tags: ['envios', 'delivery', 'logistica', 'gestion'],
    relatedPosts: ['como-poner-precio-a-tus-productos', 'como-controlar-el-stock-de-tu-tienda'],
    content: `
El envío es donde más plata se pierde sin darse cuenta, y también donde más ventas se caen. Un costo de envío inesperado en el último paso es la razón número uno por la que la gente abandona una compra.

Vamos a ver cómo resolverlo sin regalar tu margen.

## Las cuatro estrategias

### 1. Costo fijo

Cobras lo mismo a todos, sin importar dónde vivan.

- **A favor:** simple de entender y de comunicar. El cliente sabe desde el principio qué va a pagar.
- **En contra:** pierdes en las entregas lejanas y cobras de más en las cercanas.
- **Cuándo usarlo:** si vendes en una sola ciudad y las distancias son parecidas.

### 2. Envío gratis desde cierto monto

Debajo del umbral el cliente paga; arriba, es gratis.

- **A favor:** de las herramientas que más suben el ticket promedio. La gente agrega algo más con tal de no pagar envío.
- **En contra:** si pones mal el umbral, regalas margen.
- **Cuándo usarlo:** casi siempre. Es la estrategia más equilibrada.

**Cómo calcular el umbral:** ponlo entre 1.3 y 1.5 veces tu ticket promedio. Si tu promedio es 50 y tu envío cuesta 8, un umbral de 70 hace que la gente suba de 50 a 70 (ganas 20 de venta extra y gastas 8 en envío). Si lo pusieras en 55, estarías regalando el envío en compras que ya ibas a hacer igual.

### 3. Zonas de entrega

Cobras distinto según el distrito o la zona.

- **A favor:** es lo más justo y lo más preciso. No pierdes en las entregas lejanas.
- **En contra:** requiere configurar cada zona una vez.
- **Cuándo usarlo:** si tu ciudad es grande o cubres varias provincias.

En Shopifree puedes definir zonas con su propio costo y armar la cobertura por departamento, provincia y distrito.

### 4. Retiro en tienda

El cliente pasa a recoger.

- **A favor:** cero costo de envío y el cliente entra a tu local, donde suele comprar más.
- **En contra:** solo aplica si tienes punto físico.
- **Cuándo usarlo:** siempre que tengas local, como opción adicional.

## Lo que no debes hacer

**Esconder el costo hasta el final.** Es la forma más rápida de perder una venta. Si el cliente llega al último paso y aparece un cargo que no esperaba, se va y encima queda con mala sensación.

**Ofrecer envío gratis a todos sin calcular.** "Envío gratis" suena increíble hasta que ves que en pedidos chicos estás pagando por vender.

**Cobrar el costo exacto del courier.** El envío tiene más costos que el flete: el empaque, tu tiempo llevándolo, el viaje. Súmalos.

**Prometer tiempos que no puedes cumplir.** Es mejor decir "3 a 5 días" y llegar en 3, que prometer 24 horas y llegar en 4 días.

## Cuánto cobrar

Un cálculo honesto incluye:

| Concepto | Ejemplo |
| --- | --- |
| Flete del courier | 7 |
| Empaque (caja, cinta, relleno) | 2 |
| Tu tiempo de preparación y despacho | 2 |
| **Costo real del envío** | **11** |

Si estabas cobrando 7 "porque es lo que cobra el courier", estabas perdiendo 4 en cada pedido. En 50 pedidos al mes son 200 que salieron de tu bolsillo.

## Comunica bien

La mitad del trabajo es que el cliente lo entienda antes de comprar:

- **Ponlo en tu barra de anuncios:** "Envío gratis en compras desde 70"
- **Dilo en la descripción** de tus productos más caros
- **Menciónalo en tus redes** cuando publiques
- **Sé claro con los tiempos** de entrega desde el inicio

## Empaca bien, es parte del producto

El empaque es lo primero que toca tu cliente. No hace falta gastar mucho:

- Que el producto llegue **sin dañarse**, esa es la base
- Una **nota escrita a mano** cuesta cero y genera muchísima recompra
- Un **sticker o cinta con tu marca** hace que se vea profesional
- Si es regalo, ofrece **envolverlo**: es un diferencial que casi nadie da

## Un truco que funciona

Muestra el ahorro. En vez de solo decir "envío gratis desde 70", cuando el cliente lleva 55 puedes hacerle notar que le faltan 15 para el envío gratis.

Ese recordatorio simple es una de las cosas que más sube el ticket promedio en cualquier tienda online.

## Empieza simple

Si recién arrancas: pon un costo fijo razonable y envío gratis desde un monto que te deje margen. Con eso cubres el 90% de los casos.

Cuando tengas volumen y sepas de dónde vienen tus pedidos, arma zonas y afina los costos. No intentes montar un sistema perfecto el primer día.
    `
  },
  {
    slug: 'seo-para-tiendas-online',
    category: 'Vender mas',
    title: 'SEO para Tiendas Online: Cómo Aparecer en Google sin Ser Experto',
    description: 'Guía práctica de SEO para tiendas online pequeñas: cómo escribir títulos y descripciones que Google entienda, qué palabras usar y qué esperar de verdad.',
    image: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=1200',
    author: 'Shopifree',
    date: '2026-07-20',
    readTime: 10,
    tags: ['seo', 'google', 'marketing', 'trafico'],
    relatedPosts: ['como-conseguir-tus-primeros-clientes', 'catalogo-digital-para-negocios'],
    content: `
SEO suena a cosa de expertos, pero para una tienda pequeña se reduce a algo simple: **escribir de forma que Google entienda qué vendes y a quién le sirve**.

No vas a competir con Amazon. Pero sí puedes aparecer cuando alguien de tu ciudad busca exactamente lo que tú vendes, y esa gente compra.

## Primero, expectativas realistas

- **El SEO tarda.** Entre 3 y 6 meses para ver movimiento real. No es un canal para vender esta semana.
- **No reemplaza a las redes.** Es un complemento que trabaja mientras duermes.
- **Lo específico gana.** No vas a rankear por "ropa", pero sí puedes por "vestidos de lino artesanales en Arequipa".

Si necesitas ventas ya, enfócate en WhatsApp y redes. El SEO es la inversión de fondo que se paga sola con el tiempo.

## Piensa como tu cliente, no como tu negocio

El error más común es escribir con el nombre interno de tus productos.

Tu cliente no busca "Modelo A-24 edición otoño". Busca "vestido largo para matrimonio". Escribe como busca la gente, no como catalogas tú.

Una forma fácil de encontrar esas palabras:

- **Escribe tu producto en Google** y mira las sugerencias del autocompletado: eso es lo que la gente realmente busca
- **Mira "Búsquedas relacionadas"** al final de la página de resultados
- **Revisa las preguntas** que te llegan por WhatsApp: esas son las palabras exactas de tus clientes

## Los títulos de tus productos

Este es el punto con más impacto y el más descuidado.

**Mal:** \`Vestido 001\`
**Bien:** \`Vestido largo de lino beige para verano\`

La fórmula que funciona: **qué es + característica principal + para qué o para quién**.

Piensa que ese título aparece en Google como el enlace azul. ¿Le harías clic?

## Las descripciones

Escribe de verdad, no rellenes con palabras clave. Google lleva años detectando eso y penaliza.

Una buena descripción de producto responde:

- **Qué es** y de qué está hecho
- **Qué problema resuelve** o para qué ocasión sirve
- **Medidas, tallas o especificaciones** concretas
- **Qué incluye** el envío o la compra

Con 100 a 200 palabras bien escritas alcanza. Es infinitamente mejor que 500 palabras de relleno.

## El nombre de tu tienda y tu dirección

- Tu **dominio propio** ayuda: Google le da más peso a un dominio establecido que a un subdominio.
- Usa **direcciones legibles**: \`/producto/vestido-lino-beige\` es mejor que \`/p?id=8432\`.
- Pon **tu ciudad** en la descripción de tu tienda si vendes local. "Tienda de ropa artesanal en Cusco" te posiciona para búsquedas locales, que son las que más convierten.

## Las fotos también hacen SEO

- **Nombra los archivos** antes de subirlos: \`vestido-lino-beige.jpg\`, no \`IMG_20260715.jpg\`
- **Comprime las imágenes.** Una página lenta baja en el ranking, y las fotos pesadas son la causa número uno.
- Las fotos aparecen en **Google Imágenes**, que es una fuente de tráfico que casi nadie aprovecha.

## La velocidad importa

Google mide cuánto tarda tu página en cargar, sobre todo en celular. Lo que puedes controlar:

- **No subas fotos de 5 MB.** Redimensiona antes.
- **No pongas 60 productos** en la portada si no hace falta.
- Elige un **tema limpio** en vez de uno cargado de efectos.

## Escribe contenido, no solo productos

Aquí está la oportunidad más grande y la que casi nadie usa.

Si vendes velas artesanales, además de tus productos puedes escribir sobre "cómo cuidar una vela de soya" o "qué aroma elegir según el ambiente". Esa gente todavía no está comprando, pero llega a tu tienda y te conoce.

Un artículo útil sigue trayendo visitas dos años después. Un post de Instagram vive 24 horas.

## Google Search Console: gratis y obligatorio

Es la herramienta de Google que te dice qué búsquedas te están trayendo gente. Es gratis y se conecta en cinco minutos desde la sección de Integraciones de tu panel.

Con ella ves:
- Por qué palabras estás apareciendo
- Cuánta gente te ve y cuánta hace clic
- Qué páginas funcionan y cuáles no

Es la diferencia entre adivinar y saber.

## Qué NO hacer

- **Copiar descripciones del proveedor.** Si veinte tiendas tienen el mismo texto, Google elige a una y no vas a ser tú.
- **Repetir la palabra clave veinte veces.** Se lee mal y penaliza.
- **Comprar enlaces.** Es la forma más rápida de que te castiguen.
- **Cambiar las direcciones de tus páginas** sin redirigir las viejas: pierdes todo lo ganado.

## Por dónde empezar esta semana

Si solo puedes hacer una cosa: **reescribe los títulos y descripciones de tus 10 productos más importantes** pensando en cómo los buscaría un cliente.

Es una tarde de trabajo y es lo que más mueve la aguja. El resto viene después.
    `
  },
  {
    slug: 'que-es-dropshipping-y-como-empezar',
    category: 'Comparativas',
    title: 'Qué Es el Dropshipping y Cómo Empezar sin Comprar Stock',
    description: 'Cómo funciona el dropshipping, cuánto se gana realmente, sus riesgos reales y cómo empezar con proveedores como CJ o Printful. Sin promesas de dinero fácil.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200',
    author: 'Shopifree',
    date: '2026-07-17',
    readTime: 9,
    tags: ['dropshipping', 'proveedores', 'ecommerce', 'emprendimiento'],
    relatedPosts: ['tienda-virtual-vs-marketplace', 'como-poner-precio-a-tus-productos'],
    content: `
El dropshipping es un modelo donde vendes productos que no tienes. Cuando alguien te compra, tu proveedor se lo envía directamente al cliente y tú te quedas con la diferencia.

Suena perfecto, y por eso está lleno de gente prometiendo que te vas a hacer rico. Vamos a ver cómo funciona de verdad, con sus ventajas y sus problemas.

## Cómo funciona

1. Eliges productos del catálogo de un proveedor y los publicas en tu tienda con tu precio
2. Un cliente compra en tu tienda y te paga a ti
3. Tú le pasas el pedido al proveedor y le pagas el costo
4. El proveedor lo empaca y lo envía directo a tu cliente
5. Tu ganancia es la diferencia

Nunca tocas el producto ni guardas mercadería.

## Lo bueno

- **Empiezas sin invertir en stock.** No tienes que comprar 50 unidades esperando venderlas.
- **Cero riesgo de mercadería parada.** Si algo no se vende, no perdiste nada.
- **Catálogo enorme.** Puedes ofrecer cientos de productos sin espacio físico.
- **Pruebas rápido.** Puedes ver qué funciona sin comprometerte con un producto.

## Lo que no te cuentan

Aquí es donde la mayoría se cae. Sé honesto contigo mismo sobre esto:

**Los márgenes son bajos.** Estás comprando por unidad, no por volumen, así que pagas más caro que quien importa en cantidad. Márgenes de 15-25% son lo normal, no el 300% que prometen algunos.

**Los envíos son lentos.** Si tu proveedor está en Asia, un pedido puede tardar de 2 a 5 semanas. Tu cliente está acostumbrado a plazos de días, y esa espera genera reclamos.

**No controlas la calidad.** Nunca viste el producto. Si llega mal, con defectos o distinto a la foto, el problema es tuyo: tu cliente te reclama a ti, no al proveedor.

**Tampoco controlas el stock.** El proveedor puede quedarse sin producto justo después de que vendiste.

**La competencia es feroz.** Miles de personas venden exactamente el mismo catálogo. Si compites solo por precio, es una carrera al fondo.

## Cuándo tiene sentido

El dropshipping funciona bien si:

- **Estás probando** un rubro antes de invertir en stock
- **Complementas** tu catálogo propio con productos que no quieres almacenar
- **Vendes productos personalizados bajo demanda** (polos estampados, tazas, posters), donde tener stock no tendría sentido
- **Tienes una audiencia** ya construida a la que puedes venderle

Funciona mal si esperas ingresos rápidos sin trabajo, o si tu única ventaja es el precio.

## Print on demand: la variante más sana

Es dropshipping de productos personalizados: tú subes un diseño y el proveedor lo imprime y lo envía cuando alguien compra.

Es mejor modelo que el dropshipping tradicional porque:

- **Tu diseño es tuyo**, nadie más lo vende
- **No compites por precio**, compites por creatividad
- La calidad de impresión suele ser más consistente
- Los proveedores serios están en América y Europa, así que los envíos son más rápidos

Printful es el más conocido para este modelo.

## Los proveedores

**CJ Dropshipping** — catálogo amplio de productos generales, con almacenes en varios países (lo que acorta los envíos si eliges bien).

**Printful** — print on demand: polos, tazas, posters, gorras. Calidad consistente y buena integración.

En Shopifree puedes conectar ambos desde la sección de Integraciones e importar productos directo a tu catálogo. Es una función del plan Business.

## Cómo empezar bien

**1. Elige un nicho, no "de todo".** Una tienda de "productos variados" no le interesa a nadie. Una tienda de artículos para gatos sí tiene público.

**2. Pide muestras.** Compra tú mismo 3 o 4 de los productos que vas a vender. Vas a ver la calidad real, cuánto tarda y cómo llega empacado. Este paso te ahorra decenas de reclamos.

**3. Sé transparente con los plazos.** Si el envío tarda tres semanas, dilo antes de la compra. Un cliente que sabe lo que espera no reclama; uno sorprendido, sí.

**4. Calcula bien tu precio.** Costo del producto + envío + comisión de pago + tu margen. Con márgenes bajos, cualquier descuento te deja en cero.

**5. Prepárate para atender problemas.** Van a llegar pedidos con retraso o con fallas. Tu forma de responder es lo único que te diferencia.

## Dropshipping vs. stock propio

| | Dropshipping | Stock propio |
| --- | --- | --- |
| Inversión inicial | Baja | Alta |
| Margen | 15-25% | 40-60% |
| Control de calidad | Ninguno | Total |
| Tiempo de envío | Semanas | Días |
| Riesgo de mercadería | Ninguno | Alto |
| Diferenciación | Difícil | Más fácil |

Muchos negocios sanos usan un modelo mixto: stock propio de lo que más rota y dropshipping para probar productos nuevos o cubrir la cola larga del catálogo.

## En resumen

El dropshipping es una herramienta legítima, no un atajo a la riqueza. Baja la barrera de entrada, pero a cambio te quita margen y control.

Si entras sabiendo eso, puede funcionarte muy bien. Si entras pensando que es dinero fácil, vas a perder tiempo y confianza de clientes.
    `
  },
  {
    slug: 'como-elegir-plataforma-ecommerce',
    category: 'Comparativas',
    title: 'Qué Plataforma de Ecommerce Elegir: Guía de Decisión por Tipo de Negocio',
    description: 'Guía para elegir plataforma de tienda online según tu situación real: cuántos productos vendes, si cobras online, si necesitas dominio propio y cuánto puedes invertir.',
    image: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=1200',
    author: 'Shopifree',
    date: '2026-07-22',
    readTime: 11,
    tags: ['comparativa', 'plataformas', 'ecommerce', 'decision'],
    relatedPosts: ['alternativas-a-shopify-latinoamerica', 'tienda-virtual-vs-marketplace'],
    content: `
Casi todas las comparativas de plataformas de ecommerce terminan diciendo "depende". Esta también, pero con criterios concretos para que puedas decidir hoy.

La pregunta correcta no es "cuál es la mejor", sino **"cuál resuelve mi situación actual sin cobrarme por lo que todavía no necesito"**.

## Las cuatro preguntas que definen tu elección

### 1. ¿Cuántos productos vas a publicar?

- **Menos de 20:** casi cualquier plan gratuito te sirve. No pagues por capacidad que no usarás.
- **Entre 20 y 200:** aquí empiezan los límites de los planes gratuitos. Vas a necesitar un plan pago básico.
- **Más de 500:** necesitas buscador interno, filtros e importación masiva. Ya no cualquier plataforma sirve.

### 2. ¿Cómo te van a pagar?

- **Solo coordinas por WhatsApp o efectivo:** no necesitas pasarela. Muchas plataformas te cobran por funciones de pago que no usarás.
- **Quieres cobrar con tarjeta:** revisa qué pasarelas soporta **en tu país**. Una plataforma con Stripe pero sin MercadoPago sirve de poco en Perú o Argentina.
- **Vendes al exterior:** necesitas multi-moneda y pasarelas internacionales.

### 3. ¿Necesitas dominio propio?

Si vendes a conocidos y por redes, un subdominio funciona perfecto. Si haces publicidad pagada o imprimes material, el dominio propio vale la pena.

### 4. ¿Cuánto puedes pagar al mes, de verdad?

Sé honesto. Una plataforma de 30 al mes cuando vendes 200 al mes se lleva el 15% de tu facturación antes de contar el costo del producto.

Y ojo con **las comisiones por venta**: es el costo que más crece y el que menos se mira al comparar. Un 2% sobre cada venta puede superar rápidamente lo que pagarías de suscripción.

## Los perfiles más comunes

### "Recién empiezo y no sé si esto va a funcionar"

**Necesitas:** costo cero, publicar rápido, cero curva de aprendizaje.
**Evita:** plataformas que exigen tarjeta desde el día uno o que cobran comisión por venta.
**Busca:** un plan gratuito real, con pedidos por WhatsApp y link compartible.

En este perfil, lo peor que puedes hacer es pagar por una plataforma potente que vas a usar al 5%.

### "Ya vendo y quiero profesionalizarme"

**Necesitas:** dominio propio, cobros con tarjeta, estadísticas para decidir.
**Evita:** quedarte en un plan gratuito que te limite a 10 productos.
**Busca:** un plan intermedio (entre 5 y 15 al mes) sin comisión por venta.

Es el punto donde más gente se equivoca: o se queda de más en lo gratuito y pierde ventas, o salta a un plan corporativo que no necesita.

### "Tengo local físico y quiero vender también online"

**Necesitas:** control de stock unificado, retiro en tienda, registro de ventas presenciales.
**Evita:** plataformas puramente online que no contemplen inventario ni tu local.
**Busca:** stock por almacén y posibilidad de registrar ventas hechas fuera de la web.

### "Vendo productos con variantes (ropa, calzado)"

**Necesitas:** variantes por talla y color **con stock independiente por combinación**.
**Evita:** plataformas donde la variante es solo un texto sin stock propio: vas a vender tallas agotadas.
**Busca:** que puedas ver y editar el stock de cada combinación.

### "Quiero vender sin comprar stock"

**Necesitas:** integración con proveedores de dropshipping o print on demand.
**Ten en cuenta:** los márgenes son bajos y los envíos lentos. Léelo bien antes de construir tu negocio sobre eso.

## La tabla de decisión rápida

| Tu situación | Prioriza |
| --- | --- |
| Presupuesto cero | Plan gratuito real, sin comisión por venta |
| Vendes por WhatsApp/Instagram | Catálogo compartible por link y QR |
| Quieres cobrar con tarjeta | Pasarelas disponibles **en tu país** |
| Ropa, calzado, accesorios | Stock por variante |
| Tienes local | Inventario por almacén y retiro en tienda |
| Vendes al exterior | Multi-moneda y pasarelas internacionales |
| Catálogo muy grande | Importación masiva y buscador interno |

## Lo que casi nadie mira y termina doliendo

**Las comisiones por venta.** Es lo que más encarece a largo plazo. Si vendes 3.000 al mes, un 2% son 60 mensuales: más que cualquier suscripción.

**Si puedes exportar tus datos.** Si algún día quieres irte, ¿puedes llevarte tus productos y clientes? Si la respuesta es no, estás atado.

**El idioma del soporte.** Un soporte que solo responde en inglés y en otro huso horario es un problema real cuando tu tienda se cae un sábado.

**Cómo se ve en celular.** El 90% de tus visitas van a llegar desde un teléfono. Si la plataforma no está pensada para móvil, nada más importa.

## Cómo probar sin perder tiempo

No leas más comparativas: prueba.

1. Elige **dos** plataformas, no cinco
2. Sube **los mismos 5 productos** en ambas
3. Cronometra cuánto tardas
4. Ábrelas en tu celular y compara cómo se ven
5. Haz un pedido de prueba completo en cada una
6. Escribe al soporte de ambas y mide cuánto tardan en responder

En dos horas vas a tener una respuesta mucho mejor que la de cualquier artículo.

## Y si te equivocas

No es grave. Casi todas las plataformas permiten exportar productos, y migrar 50 productos es una tarde de trabajo.

Lo que sí cuesta caro es **no empezar** por meses mientras decides. Una tienda imperfecta que ya está vendiendo vale más que la plataforma perfecta que sigues evaluando.
    `
  },
  {
    slug: 'alternativas-a-shopify-latinoamerica',
    category: 'Comparativas',
    title: 'Alternativas a Shopify para Vender en Latinoamérica',
    description: 'Shopify es potente pero no siempre es la mejor opción en LatAm. Repasamos qué alternativas existen, para qué tipo de negocio sirve cada una y cuándo conviene quedarse con Shopify.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200',
    author: 'Shopifree',
    date: '2026-07-19',
    readTime: 10,
    tags: ['comparativa', 'shopify', 'alternativas', 'plataformas'],
    relatedPosts: ['como-elegir-plataforma-ecommerce', 'tienda-virtual-vs-marketplace'],
    content: `
Shopify es probablemente la plataforma de ecommerce más conocida del mundo, y con razón: es sólida, tiene un ecosistema enorme de aplicaciones y escala sin problemas.

Pero "la más conocida" no significa "la que te conviene". Para un negocio pequeño en Latinoamérica hay fricciones concretas que vale la pena mirar antes de decidir.

## Cuándo Shopify sí es la respuesta

Seamos justos primero. Shopify es la mejor opción si:

- Facturas lo suficiente para que la suscripción sea un porcentaje pequeño de tus ventas
- Necesitas funciones muy específicas que existen como aplicaciones de terceros
- Vendes internacionalmente y con volumen alto
- Tienes quien administre la tienda de forma dedicada

Si estás en ese punto, deja de leer y quédate con Shopify.

## Dónde aprieta el zapato en LatAm

**El costo en dólares.** La suscripción se paga en dólares, y para un negocio que factura en soles, pesos o bolivianos eso es un gasto fijo que no baja cuando el mes viene flojo.

**Las comisiones si no usas su pasarela.** Shopify cobra un porcentaje adicional por transacción cuando usas una pasarela de pago externa. En países donde su procesador propio no opera, eso significa pagar dos veces.

**Está pensado para checkout, no para WhatsApp.** En Latinoamérica muchísimas ventas se cierran conversando por WhatsApp. Shopify lo resuelve con aplicaciones de terceros, y cada aplicación suma costo mensual.

**La curva de aprendizaje.** Es una herramienta profesional. Si nunca administraste una tienda online, hay bastante que aprender antes de publicar.

## Qué tipos de alternativas existen

En vez de darte una lista de nombres que envejece mal, te sirve más entender **las categorías**, porque cada una resuelve un problema distinto:

### Plataformas regionales

Hechas para Latinoamérica. Su ventaja es que integran de fábrica los medios de pago locales y cobran en moneda local. Tiendanube y Jumpseller son ejemplos conocidos en la región.

**Te convienen si** quieres una tienda completa, con checkout tradicional, y facturas lo suficiente para pagar una suscripción mensual.

### Plataformas enfocadas en WhatsApp y catálogo

Parten de cómo se vende realmente en la región: el cliente ve el catálogo y cierra por WhatsApp. Suelen tener plan gratuito real y ser mucho más simples de configurar.

**Te convienen si** vendes por redes sociales, tu ticket es pequeño o mediano, y no necesitas todavía un checkout complejo.

Es donde se ubica Shopifree: catálogo gratis, pedidos por WhatsApp, sin comisión por venta, y cobros con tarjeta cuando decides activarlos.

### Constructores web generalistas

Wix, Squarespace y similares. Traen tienda como un módulo dentro de un creador de páginas.

**Te convienen si** tu prioridad es una web bonita con contenido, y la tienda es secundaria.

### Marketplaces

Mercado Libre, Amazon. No son "tu tienda", son un lugar donde exponer tus productos.

**Te convienen si** quieres tráfico inmediato y aceptas pagar comisión alta y no ser dueño de la relación con el cliente. Lo tratamos a fondo en el artículo de tienda propia vs marketplace.

### Autogestionadas

WooCommerce sobre WordPress. Máxima flexibilidad, cero costo de licencia, pero necesitas hosting, mantenimiento y actualizaciones.

**Te convienen si** tienes conocimientos técnicos o alguien que te lo mantenga.

## Cómo comparar de verdad

En vez de comparar listas de funciones, calcula el **costo total real** durante un año:

| Concepto | Anótalo |
| --- | --- |
| Suscripción mensual × 12 | |
| Comisión por venta × tu facturación anual | |
| Aplicaciones de terceros que necesites | |
| Pasarela de pago | |
| Dominio | |
| Tu tiempo de configuración | |

Ese último renglón es el que más se subestima. Una plataforma que te toma tres semanas configurar tiene un costo real, aunque la suscripción sea barata.

> Un aviso honesto: no publicamos aquí los precios de otras plataformas porque cambian seguido y varían por país. Revísalos en sus sitios oficiales antes de decidir; una comparativa con precios viejos te lleva a una mala decisión.

## La pregunta que ordena todo

**¿Tu cuello de botella es la plataforma, o son las visitas?**

La mayoría de los negocios pequeños que "necesitan una plataforma mejor" en realidad tienen un problema de tráfico, no de tecnología. Cambiar de plataforma no trae clientes.

Si todavía no tienes ventas constantes, empieza con lo más simple y barato posible, y gasta esa energía en conseguir clientes. Cuando la plataforma sea de verdad tu límite, migrar es fácil y ya tendrás con qué pagarla.

## Migrar no es tan difícil

Si ya estás en una plataforma y quieres cambiar:

1. **Exporta tus productos** a CSV desde la plataforma actual
2. **Impórtalos** en la nueva (la mayoría acepta CSV o Excel)
3. **Configura pagos y envíos** antes de anunciar nada
4. **Prueba una compra completa** tú mismo
5. **Redirige tu dominio** cuando todo funcione
6. **Avisa a tus clientes** frecuentes

Con un catálogo de 50 productos, es cuestión de una tarde.
    `
  },
  {
    slug: 'cuanto-cuesta-tener-una-tienda-online',
    category: 'Comparativas',
    title: 'Cuánto Cuesta Tener una Tienda Online en 2026 (Costos Reales)',
    description: 'Desglose honesto de lo que cuesta abrir y mantener una tienda online: plataforma, dominio, pasarela de pago, envíos y publicidad. Con tres escenarios según el tamaño del negocio.',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200',
    author: 'Shopifree',
    date: '2026-07-16',
    readTime: 9,
    tags: ['costos', 'presupuesto', 'comparativa', 'emprendimiento'],
    relatedPosts: ['como-elegir-plataforma-ecommerce', 'como-poner-precio-a-tus-productos'],
    content: `
"¿Cuánto cuesta tener una tienda online?" tiene una respuesta incómoda: puede ser cero o pueden ser cientos al mes, y ambos extremos son legítimos según en qué etapa estés.

Vamos a desglosarlo por partes para que armes tu propio número.

## Los costos que existen

### 1. La plataforma

Va desde gratis hasta suscripciones de tres cifras. Lo importante no es el número, sino **qué incluye**: revisa el límite de productos, si hay comisión por venta y si las funciones que necesitas están en el plan que estás mirando o en uno superior.

### 2. El dominio

Un \`.com\` cuesta aproximadamente entre 10 y 15 dólares al año. Las extensiones locales (\`.pe\`, \`.mx\`, \`.com.ar\`) suelen costar algo más.

Es opcional al principio: casi todas las plataformas te dan una dirección gratuita del tipo \`tutienda.plataforma.com\`.

### 3. La pasarela de pago

No tiene costo fijo, pero cobra un porcentaje de cada venta más un monto fijo por transacción. Varía bastante por país y por método de pago.

**Este es el costo que más crece con tu facturación** y el que menos se calcula al empezar. Consulta las tarifas vigentes de MercadoPago, Stripe o PayPal en tu país.

### 4. Los envíos

Si los asumes tú, es costo directo. Si los cobras al cliente, cuida que cubra el flete **más el empaque más tu tiempo**, que es lo que casi siempre queda fuera de la cuenta.

### 5. El empaque

Bolsas, cajas, cinta, etiquetas. Parece menor pero en volumen suma. Presupuesta entre 1 y 3 por pedido según lo que vendas.

### 6. La publicidad

Es opcional y es donde más fácil se va el dinero sin retorno. Si recién empiezas, **no empieces por aquí**: usa WhatsApp, tus redes y tus contactos, que son gratis y convierten mejor al inicio.

### 7. Tu tiempo

El costo invisible. Fotografiar productos, escribir descripciones, responder mensajes, empacar. No sale de tu bolsillo pero sí de tus horas, y si no lo cuentas vas a creer que ganas más de lo que ganas.

## Tres escenarios

### Escenario A: estás validando (0 al mes)

- Plataforma: plan gratuito
- Dominio: el subdominio gratuito
- Pagos: coordinas por WhatsApp, sin pasarela
- Envíos: los cobras al cliente
- Publicidad: cero, solo redes y contactos

**Costo fijo mensual: 0.** Solo pagas empaque cuando vendes.

Es donde debería empezar todo el mundo. Sirve para responder la única pregunta que importa al inicio: ¿alguien compra esto?

### Escenario B: ya vendes de forma constante (10 a 25 al mes)

- Plataforma: plan intermedio
- Dominio propio: 1 al mes prorrateado
- Pasarela de pago: el porcentaje de tus ventas
- Empaque: según pedidos

Aquí ya conviene invertir, porque el dominio propio y el cobro con tarjeta **se pagan solos** con las ventas que destrabas.

### Escenario C: es tu negocio principal (variable)

Además de lo anterior: publicidad, quizás alguien que te ayude, mejor empaque, más herramientas.

En este punto ya no piensas en costos sino en **retorno**: cada gasto debe justificarse con lo que trae.

## El error de presupuesto más común

Gastar en lo que se ve y no en lo que vende.

Mucha gente que empieza invierte en un dominio bonito, un logo profesional y un plan premium... y sigue sin ventas, porque nadie sabe que la tienda existe.

El orden correcto de inversión es:

1. **Productos bien fotografiados** (gratis, solo tu celular y luz de ventana)
2. **Descripciones claras con precio visible** (gratis)
3. **Conseguir tus primeros clientes** (gratis: WhatsApp, redes, conocidos)
4. **Recién ahí**: dominio, plan pago, publicidad

## Cómo saber si un gasto vale la pena

Antes de pagar cualquier cosa, pregúntate: **¿esto me va a traer más ventas de lo que cuesta?**

- Un dominio de 12 al año: si haces publicidad o material impreso, sí. Si vendes solo por WhatsApp a conocidos, todavía no.
- Cobrar con tarjeta: si pierdes ventas porque la gente no quiere transferir, sí, claramente.
- Un plan superior: solo si estás topando un límite real (productos, fotos, funciones), no "por si acaso".

## Sobre las comisiones por venta

Merece su propio apartado porque es el costo que más engaña.

Una plataforma que cobra 15 al mes sin comisión es **más barata** que una gratuita que cobra 3% por venta, en cuanto factures más de 500 al mes.

Saca esa cuenta con tu facturación real antes de elegir. Es la diferencia más grande a largo plazo y casi nunca aparece en las comparativas.

## En resumen

Puedes tener una tienda online funcionando hoy sin gastar nada, y esa es la forma correcta de empezar: valida que vendes antes de invertir.

Los costos deberían crecer **después** de las ventas, nunca antes.
    `
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug)
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getBlogPost(currentSlug)
  if (!current?.relatedPosts) return []

  return current.relatedPosts
    .map(slug => getBlogPost(slug))
    .filter((post): post is BlogPost => post !== undefined)
    .slice(0, limit)
}
