# Revisión de la app ShopiChat en Meta — guía lista para usar

Cuándo: después de que Meta apruebe la verificación de la empresa (Shopifree Group LLC) y completes "Conviértete en proveedor de tecnología".

Dónde: developers.facebook.com → app **ShopiChat** → **Revisión de la app → Permisos y funciones** → pedir **acceso avanzado** a:
- `whatsapp_business_messaging`
- `whatsapp_business_management`

No pidas otros permisos: pedir de más es la causa de rechazo más común.

Reglas de Meta para los videos:
- **Un video por permiso** (no mezclar los dos en el mismo video).
- Tiene que ser **grabación de pantalla**, no capturas.
- Cada permiso necesita **video + descripción escrita**.
- Al final, tocar **Enviar** (no dejarlo en borrador).

---

## Datos generales de la app (revisa que estén completos antes de enviar)

| Campo | Valor |
|---|---|
| Nombre | ShopiChat |
| Correo de contacto | admin@shopifree.app |
| Política de privacidad | https://shopifree.app/es/privacy |
| Condiciones del servicio | https://shopifree.app/es/terms |
| Eliminación de datos | https://shopifree.app/es/privacy#data-deletion |
| Categoría | Negocios y páginas |
| Ícono | Logo de Shopifree/ShopiChat 1024×1024 |
| Dominio | shopifree.app |

---

## Permiso 1: `whatsapp_business_messaging`

### Descripción (copiar y pegar — está en inglés porque Meta revisa en inglés)

> Shopifree (operated by Shopifree Group LLC) is an e-commerce platform where small businesses create their online store. ShopiChat is the WhatsApp inbox inside the Shopifree merchant dashboard. After a merchant connects their own WhatsApp Business number through Embedded Signup, we use whatsapp_business_messaging to let that merchant:
> 1. Receive their customers' WhatsApp messages (text, images, audio, documents) in the ShopiChat inbox via webhooks.
> 2. Reply to their customers from the inbox: text, images, voice notes, documents and product cards from their own catalog, within the 24-hour customer service window.
> 3. Send approved utility templates about the customer's own orders (order received, confirmed, shipped, ready for pickup, delivered, payment reminder) when the merchant enables these notifications.
> 4. Optionally use an AI assistant that suggests replies to the merchant, or answers customer questions about the merchant's own products and orders, with handoff to a human.
> Messages are only sent on behalf of the merchant who owns the connected number, to customers who contacted that business or placed an order with it. We do not send marketing campaigns on behalf of merchants in this version.

### Guion del video (1–2 minutos)

Prepara: navegador con shopifree.app en ShopiChat (cuenta AlienStore) y tu celular con WhatsApp abierto (o WhatsApp Web en otra ventana visible en pantalla).

1. Muestra la URL **shopifree.app/es/dashboard/shopichat** con el número conectado arriba.
2. **Desde tu celular** escribe al número conectado: "Hola, ¿tienen la mochila en stock?" → muestra cómo **aparece el mensaje en ShopiChat** (recepción por webhook).
3. En ShopiChat escribe una respuesta y toca **Enviar**.
4. Muestra **el celular (o WhatsApp Web) recibiendo ese mensaje**. ← Es lo que Meta más mira.
5. Opcional (suma): **"+" → Producto** → manda una tarjeta de producto y muéstrala llegando al WhatsApp.
6. Termina mostrando el mensaje con los ticks de entregado/leído en ShopiChat.

Tip: si grabas con el celular en la mano, que se vea bien la pantalla; lo más claro es tener **WhatsApp Web** abierto en una ventana al lado.

---

## Permiso 2: `whatsapp_business_management`

### Descripción (copiar y pegar)

> We use whatsapp_business_management to access the WhatsApp Business Account (WABA) of each merchant who onboards to ShopiChat through Embedded Signup, only for that merchant's own assets:
> 1. Read the phone numbers of the merchant's WABA to link the connected number to their Shopifree store and show its display name and status.
> 2. Subscribe our app to the merchant's WABA webhooks so their incoming messages and message statuses reach their inbox.
> 3. Create and list message templates in the merchant's WABA: ShopiChat creates the utility templates used for order notifications (order received, confirmed, shipped, ready for pickup, delivered, payment reminder) from the ShopiChat settings, and shows each template's review status (approved, pending, rejected) so the merchant can enable notifications.
> 4. Unsubscribe the app when the merchant disconnects the number or deletes their account.
> We never access assets of businesses that have not onboarded, and each merchant only sees and manages their own account.

### Guion del video (1–2 minutos)

1. En ShopiChat toca el **engranaje ⚙️ (Configuración)** → muestra **"Número conectado"** (datos leídos de la WABA).
2. Baja a **"Avisos automáticos"** y toca **"Crear / revisar plantillas"** → muestra cómo aparecen las plantillas con su estado (**Pendiente → Aprobada**). Este es el paso clave: *crear una plantilla desde la app*.
3. Abre **WhatsApp Manager** (business.facebook.com → WhatsApp Manager → Plantillas de mensajes) y muestra que **las mismas plantillas aparecen creadas ahí** con su estado.
4. Vuelve a ShopiChat y activa uno de los avisos (por ejemplo "Pedido confirmado").
5. Opcional: cambia un pedido de prueba a "Confirmado" en Pedidos y muestra el aviso llegando al WhatsApp.

Nota: si al grabar ya estaban creadas, primero bórralas en WhatsApp Manager para que el video muestre la creación desde cero (o crea una plantilla nueva adicional desde WhatsApp Manager, que Meta también acepta).

---

## Usuario de prueba para el revisor

Meta prueba con usuarios que tengan rol **administrador o desarrollador** en la app. En "Revisión de la app" suele pedir instrucciones; pega esto:

> Test steps: log in at https://shopifree.app/es/login with the test account provided in the reviewer notes, open ShopiChat from the left menu (/es/dashboard/shopichat). The store already has a WhatsApp test number connected. To test messaging, send a WhatsApp message to the connected number and reply from the inbox. To test templates, open Settings (gear icon) → Automatic notifications → "Create / review templates".

Si Meta pide una cuenta de prueba, dime y creamos una cuenta de revisor en una tienda de prueba (no uses tu cuenta personal).

---

## Después de la aprobación

1. En la app de Meta: **Publicar** (modo en vivo).
2. Yo activo el lanzamiento: `VITE_SHOPICHAT_PUBLIC=true` y `SHOPICHAT_PUBLIC=true` en Vercel → ShopiChat aparece para todas las tiendas Business, en la landing y en Sofía.
3. Probamos el botón **"Conectar mi WhatsApp"** con un número real de WhatsApp Business (coexistencia con QR).
