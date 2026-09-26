import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'
import Seo from '../components/seo/Seo'

/**
 * Términos y Condiciones de Shopifree (/es/terms y /en/terms).
 * =====================================================
 * IMPORTANTE: este texto es una base redactada para la plataforma y DEBE
 * revisarlo un abogado antes de darlo por definitivo (en especial
 * responsabilidad, reembolsos, protección al consumidor y ley aplicable).
 *
 * Los datos de la empresa están en las constantes de abajo para ajustarlos
 * en un solo lugar. No se inventa razón social ni RUC: si se agregan, van en
 * COMPANY_NAME / una constante nueva y se mencionan en la sección 1.
 * Al cambiar el texto, actualizar LAST_UPDATED.
 */
const COMPANY_NAME = 'Shopifree'
/** Titular legal de la plataforma (confirmado por el dueño, 26/09/2026). */
const LEGAL_ENTITY = 'Shopifree Group LLC'
const CONTACT_EMAIL = 'admin@shopifree.app'
const JURISDICTION = 'el estado de Wyoming, Estados Unidos'
const JURISDICTION_EN = 'the State of Wyoming, United States'
const GOVERNING_LAW = 'las leyes del estado de Wyoming, Estados Unidos (Shopifree Group LLC está constituida en Wyoming)'
const GOVERNING_LAW_EN = 'the laws of the State of Wyoming, United States (Shopifree Group LLC is organized in Wyoming)'
const LAST_UPDATED = { es: '26 de septiembre de 2026', en: 'September 26, 2026' }
const TRIAL_DAYS = 7

/** Un bloque es un párrafo (string) o una lista (string[]). */
type Block = string | string[]
interface Section { title: string; blocks: Block[] }

const CONTENT: Record<'es' | 'en', { title: string; updated: string; back: string; intro: string; sections: Section[]; rights: string }> = {
  es: {
    title: 'Términos y Condiciones',
    updated: `Última actualización: ${LAST_UPDATED.es}`,
    back: 'Volver al inicio',
    intro: `Estos Términos y Condiciones regulan el uso de ${COMPANY_NAME} (la "plataforma" o el "servicio"), disponible en shopifree.app, en sus subdominios y en sus aplicaciones móviles, operada por ${LEGAL_ENTITY} ("nosotros"). Al crear una cuenta o usar el servicio aceptas estos términos. Si no estás de acuerdo, no uses la plataforma.`,
    sections: [
      {
        title: '1. El servicio',
        blocks: [
          `${COMPANY_NAME} es una plataforma de software como servicio (SaaS) que permite a negocios ("comerciantes") crear y administrar su tienda online. Entre otras funciones, ofrece:`,
          [
            'Tienda y catálogo online con subdominio propio o dominio personalizado.',
            'Gestión de productos, inventario, pedidos, clientes y cupones.',
            'Cobros a través de pasarelas de pago de terceros (por ejemplo Stripe, Mercado Pago o PayPal) conectadas con las cuentas del propio comerciante.',
            'ShopiChat: bandeja para atender por WhatsApp a los clientes de la tienda mediante la API de WhatsApp Business de Meta, con plantillas y avisos automáticos de pedidos.',
            'Asistente de inteligencia artificial opcional para redactar textos y sugerir o enviar respuestas en ShopiChat.',
          ],
          `${COMPANY_NAME} provee la herramienta tecnológica. No es vendedor de los productos que ofrecen las tiendas, no es parte de las compraventas entre el comerciante y sus clientes y no procesa directamente sus pagos.`,
        ],
      },
      {
        title: '2. Cuentas y requisitos',
        blocks: [
          [
            'Debes tener al menos 18 años y capacidad legal para contratar, y usar la plataforma para una actividad comercial o profesional.',
            'La información que registres debe ser verdadera y mantenerse actualizada.',
            'Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta, incluidas las personas a las que des acceso.',
            'Debes avisarnos de inmediato si detectas un uso no autorizado de tu cuenta.',
          ],
        ],
      },
      {
        title: '3. Planes, prueba gratuita y facturación',
        blocks: [
          `${COMPANY_NAME} ofrece un plan gratuito con funciones limitadas y planes de pago (por ejemplo Pro y Business) con las funciones y precios publicados en la plataforma al momento de contratar.`,
          [
            `Las cuentas nuevas pueden recibir una prueba gratuita del plan Pro por ${TRIAL_DAYS} días. Al terminar la prueba, si no contrataste un plan de pago, la tienda pasa automáticamente al plan gratuito.`,
            'Los planes de pago se cobran por adelantado, de forma mensual o anual, a través de Stripe. Los datos de tu tarjeta los procesa Stripe; nosotros no los almacenamos.',
            'Las suscripciones se renuevan automáticamente al final de cada período por el mismo plazo, salvo que las canceles antes de la fecha de renovación.',
            'Puedes cancelar en cualquier momento desde la página de tu plan en el panel. La cancelación rige al final del período ya pagado y hasta entonces conservas las funciones del plan.',
            'Salvo que la ley aplicable disponga otra cosa, no se hacen reembolsos por períodos parciales, por funciones no utilizadas ni por cambios de plan a mitad de período.',
            'Podemos modificar los precios y las funciones de los planes. Los cambios de precio se comunican con anticipación razonable y se aplican a partir de la siguiente renovación.',
            'Si un cobro falla, podemos reintentarlo y, si no se regulariza, limitar la cuenta a las funciones del plan gratuito.',
            'Los precios pueden no incluir impuestos aplicables, que corren por cuenta del cliente cuando corresponda.',
          ],
        ],
      },
      {
        title: '4. Responsabilidades del comerciante',
        blocks: [
          'Como comerciante eres el único responsable de tu tienda y de tu negocio. En particular:',
          [
            'Los productos y servicios que ofreces, sus descripciones, imágenes, precios, stock, envíos, garantías, cambios y devoluciones.',
            'Cumplir las leyes que te aplican: protección al consumidor, comercio electrónico, publicidad, facturación e impuestos, protección de datos personales y cualquier permiso o licencia de tu actividad.',
            'Contar con una política de privacidad y condiciones de venta propias para tus clientes cuando la ley lo exija, y tratar sus datos conforme a ella.',
            'Tus cuentas en pasarelas de pago (Stripe, Mercado Pago, PayPal u otras): abrirlas, mantenerlas y cumplir sus condiciones. Los cobros, comisiones, contracargos, disputas y reembolsos a tus clientes se rigen por tu relación con esa pasarela.',
            'WhatsApp: cumplir las políticas de WhatsApp Business, la Política de Comercio de WhatsApp y las condiciones de Meta. Solo puedes escribir a personas que te dieron su consentimiento (opt-in) para recibir mensajes, debes respetar de inmediato a quien pida no recibir más y no puedes enviar spam, mensajes masivos no solicitados ni contenido prohibido. El uso de plantillas y conversaciones puede generar cargos de Meta a tu cuenta de WhatsApp Business.',
            'Asistente de IA: si lo activas, las respuestas y textos que genera se envían o publican en tu nombre y bajo tu responsabilidad. Revisa su configuración y supervisa su funcionamiento; la IA puede cometer errores.',
            'El contenido que subes (textos, imágenes, videos, logos): declaras que tienes los derechos para usarlo.',
          ],
        ],
      },
      {
        title: '5. Uso aceptable',
        blocks: [
          'No está permitido usar la plataforma para:',
          [
            'Vender productos o servicios ilegales, falsificados, robados o que requieran autorizaciones que no tienes, ni artículos prohibidos por las pasarelas de pago o por Meta.',
            'Fraude, estafas, phishing, lavado de dinero o suplantación de identidad.',
            'Publicar contenido que infrinja derechos de terceros, sea difamatorio, discriminatorio, violento, sexual con menores o de cualquier otro modo ilícito.',
            'Enviar spam o comunicaciones no solicitadas, por WhatsApp, correo o cualquier otro canal.',
            'Intentar vulnerar la seguridad de la plataforma, acceder a datos de otros usuarios, hacer ingeniería inversa, sobrecargar el servicio o usarlo de forma automatizada fuera de la API pública documentada.',
          ],
          'Podemos retirar contenido, suspender funciones o cerrar cuentas que incumplan estas reglas, y colaborar con las autoridades cuando la ley lo requiera.',
        ],
      },
      {
        title: '6. Servicios de terceros',
        blocks: [
          'La plataforma funciona sobre servicios de terceros, cada uno con sus propias condiciones y políticas de privacidad:',
          [
            'Meta / WhatsApp Business Platform, para ShopiChat.',
            'Stripe, para la suscripción a Shopifree y, si la conectas, para cobrar en tu tienda.',
            'Mercado Pago y PayPal, si los conectas para cobrar en tu tienda.',
            'Cloudflare (almacenamiento de imágenes y videos, dominios), Google Firebase (base de datos, autenticación y notificaciones) y Vercel (alojamiento).',
            'Proveedores de inteligencia artificial (Anthropic, OpenAI o Google) cuando activas el asistente de IA; si usas tu propia clave, también rigen las condiciones de ese proveedor con tu cuenta.',
          ],
          `No controlamos esos servicios y no respondemos por sus interrupciones, cambios, decisiones (por ejemplo, la suspensión de una cuenta de WhatsApp o de una pasarela) ni por los cargos que te cobren directamente.`,
        ],
      },
      {
        title: '7. Propiedad intelectual',
        blocks: [
          `El software, el diseño, las marcas, los temas y los demás elementos de ${COMPANY_NAME} son de su titular o de sus licenciantes. Te otorgamos una licencia limitada, no exclusiva e intransferible para usarlos mientras tengas una cuenta activa y conforme a estos términos.`,
          `El contenido de tu tienda sigue siendo tuyo. Nos otorgas una licencia no exclusiva y gratuita para alojarlo, reproducirlo y mostrarlo en la medida necesaria para prestar el servicio (por ejemplo, publicar tu catálogo o generar vistas previas). Con tu permiso podemos mostrar tu tienda como ejemplo; puedes pedirnos que dejemos de hacerlo.`,
        ],
      },
      {
        title: '8. Disponibilidad y limitación de responsabilidad',
        blocks: [
          'Trabajamos para que el servicio esté disponible y funcione bien, pero se ofrece "tal cual" y "según disponibilidad": puede haber interrupciones, mantenimientos, errores o pérdidas de datos. Te recomendamos conservar copias de tu información importante.',
          `En la máxima medida permitida por la ley, ${COMPANY_NAME} no será responsable por daños indirectos, lucro cesante, pérdida de ventas, de datos o de reputación, ni por los actos de los comerciantes, de sus clientes o de servicios de terceros. La responsabilidad total de ${COMPANY_NAME} frente a ti por cualquier reclamo relacionado con el servicio se limita al monto que nos hayas pagado en los 12 meses anteriores al hecho que lo origina.`,
          'Nada de lo anterior limita derechos que la ley aplicable no permita excluir.',
          `Te comprometes a mantener indemne a ${COMPANY_NAME} frente a reclamos de terceros derivados de tus productos, de tu contenido, de tus comunicaciones con clientes o del incumplimiento de estos términos o de la ley.`,
        ],
      },
      {
        title: '9. Suspensión y terminación',
        blocks: [
          [
            'Puedes dejar de usar el servicio y eliminar tu cuenta en cualquier momento desde "Mi Cuenta" en el panel. Si tienes una suscripción, se cancela al eliminar la cuenta.',
            'Podemos suspender o cerrar tu cuenta si incumples estos términos, si lo exige la ley o un proveedor (por ejemplo Meta o una pasarela), o si tu uso pone en riesgo la plataforma o a terceros. Cuando sea razonable, te avisaremos antes.',
            'Al terminar la cuenta, tu tienda deja de estar publicada y tus datos se eliminan según la Política de Privacidad, salvo lo que debamos conservar por ley.',
          ],
        ],
      },
      {
        title: '10. Cambios a estos términos',
        blocks: [
          'Podemos actualizar estos términos. Si los cambios son importantes, te avisaremos por correo o dentro de la plataforma antes de que entren en vigencia. Si sigues usando el servicio después de esa fecha, se entiende que los aceptas; si no estás de acuerdo, puedes cancelar tu cuenta.',
        ],
      },
      {
        title: '11. Ley aplicable y jurisdicción',
        blocks: [
          `Estos términos se rigen por ${GOVERNING_LAW}. Cualquier controversia se someterá a los tribunales estatales o federales con sede en ${JURISDICTION}, sin perjuicio de los derechos que la ley de protección al consumidor de tu país te reconozca y que no puedan renunciarse.`,
        ],
      },
      {
        title: '12. Contacto',
        blocks: [
          `Para cualquier consulta sobre estos términos, escríbenos a ${CONTACT_EMAIL} o usa el chat de soporte dentro de la aplicación.`,
        ],
      },
    ],
    rights: 'Todos los derechos reservados.',
  },
  en: {
    title: 'Terms and Conditions',
    updated: `Last updated: ${LAST_UPDATED.en}`,
    back: 'Back to home',
    intro: `These Terms and Conditions govern the use of ${COMPANY_NAME} (the "platform" or the "service"), available at shopifree.app, its subdomains and its mobile apps, operated by ${LEGAL_ENTITY} ("we", "us"). By creating an account or using the service you accept these terms. If you do not agree, do not use the platform.`,
    sections: [
      {
        title: '1. The service',
        blocks: [
          `${COMPANY_NAME} is a software-as-a-service (SaaS) platform that lets businesses ("merchants") create and manage their online store. Among other features, it offers:`,
          [
            'Online store and catalog on a subdomain or a custom domain.',
            'Management of products, inventory, orders, customers and coupons.',
            'Payments through third-party payment gateways (for example Stripe, Mercado Pago or PayPal) connected to the merchant\'s own accounts.',
            'ShopiChat: an inbox to talk to the store\'s customers on WhatsApp through Meta\'s WhatsApp Business API, with templates and automatic order notifications.',
            'An optional artificial intelligence assistant to write texts and suggest or send replies in ShopiChat.',
          ],
          `${COMPANY_NAME} provides the technology. It is not the seller of the products offered by the stores, it is not a party to the sales between merchants and their customers, and it does not directly process their payments.`,
        ],
      },
      {
        title: '2. Accounts and eligibility',
        blocks: [
          [
            'You must be at least 18 years old, have legal capacity to enter into contracts, and use the platform for a business or professional activity.',
            'The information you provide must be accurate and kept up to date.',
            'You are responsible for keeping your credentials confidential and for all activity under your account, including people you give access to.',
            'You must notify us immediately of any unauthorized use of your account.',
          ],
        ],
      },
      {
        title: '3. Plans, free trial and billing',
        blocks: [
          `${COMPANY_NAME} offers a free plan with limited features and paid plans (for example Pro and Business) with the features and prices published on the platform at the time of purchase.`,
          [
            `New accounts may receive a ${TRIAL_DAYS}-day free trial of the Pro plan. When the trial ends, if you have not subscribed to a paid plan, the store automatically moves to the free plan.`,
            'Paid plans are billed in advance, monthly or yearly, through Stripe. Your card details are processed by Stripe; we do not store them.',
            'Subscriptions renew automatically at the end of each period for the same term unless you cancel before the renewal date.',
            'You can cancel at any time from your plan page in the dashboard. Cancellation takes effect at the end of the period already paid, and you keep the plan features until then.',
            'Unless applicable law requires otherwise, there are no refunds for partial periods, unused features or mid-period plan changes.',
            'We may change plan prices and features. Price changes are communicated with reasonable notice and apply from the next renewal.',
            'If a payment fails, we may retry it and, if it is not resolved, limit the account to the free plan features.',
            'Prices may not include applicable taxes, which are borne by the customer where applicable.',
          ],
        ],
      },
      {
        title: '4. Merchant responsibilities',
        blocks: [
          'As a merchant you are solely responsible for your store and your business. In particular:',
          [
            'The products and services you offer, their descriptions, images, prices, stock, shipping, warranties, exchanges and returns.',
            'Complying with the laws that apply to you: consumer protection, e-commerce, advertising, invoicing and taxes, personal data protection and any permits or licenses for your activity.',
            'Having your own privacy policy and terms of sale for your customers where required by law, and handling their data accordingly.',
            'Your payment gateway accounts (Stripe, Mercado Pago, PayPal or others): opening and maintaining them and complying with their terms. Charges, fees, chargebacks, disputes and refunds to your customers are governed by your relationship with that gateway.',
            'WhatsApp: complying with the WhatsApp Business policies, the WhatsApp Commerce Policy and Meta\'s terms. You may only message people who have given you their consent (opt-in) to receive messages, you must immediately respect anyone who asks to stop, and you may not send spam, unsolicited bulk messages or prohibited content. Templates and conversations may incur Meta charges on your WhatsApp Business account.',
            'AI assistant: if you enable it, the replies and texts it generates are sent or published on your behalf and under your responsibility. Review its settings and monitor how it works; AI can make mistakes.',
            'The content you upload (texts, images, videos, logos): you represent that you have the rights to use it.',
          ],
        ],
      },
      {
        title: '5. Acceptable use',
        blocks: [
          'You may not use the platform to:',
          [
            'Sell illegal, counterfeit or stolen products or services, products that require authorizations you do not have, or items prohibited by the payment gateways or by Meta.',
            'Commit fraud, scams, phishing, money laundering or impersonation.',
            'Publish content that infringes third-party rights or is defamatory, discriminatory, violent, sexual involving minors or otherwise unlawful.',
            'Send spam or unsolicited communications through WhatsApp, email or any other channel.',
            'Attempt to breach the security of the platform, access other users\' data, reverse engineer, overload the service or use it in an automated way outside the documented public API.',
          ],
          'We may remove content, suspend features or close accounts that break these rules, and cooperate with authorities when required by law.',
        ],
      },
      {
        title: '6. Third-party services',
        blocks: [
          'The platform relies on third-party services, each with its own terms and privacy policies:',
          [
            'Meta / WhatsApp Business Platform, for ShopiChat.',
            'Stripe, for your Shopifree subscription and, if you connect it, to accept payments in your store.',
            'Mercado Pago and PayPal, if you connect them to accept payments in your store.',
            'Cloudflare (image and video storage, domains), Google Firebase (database, authentication and notifications) and Vercel (hosting).',
            'Artificial intelligence providers (Anthropic, OpenAI or Google) when you enable the AI assistant; if you use your own API key, that provider\'s terms with your account also apply.',
          ],
          'We do not control those services and are not responsible for their outages, changes or decisions (for example, the suspension of a WhatsApp or payment gateway account), or for charges they bill you directly.',
        ],
      },
      {
        title: '7. Intellectual property',
        blocks: [
          `The software, design, trademarks, themes and other elements of ${COMPANY_NAME} belong to their owner or licensors. We grant you a limited, non-exclusive, non-transferable license to use them while you have an active account and in accordance with these terms.`,
          'Your store content remains yours. You grant us a non-exclusive, royalty-free license to host, reproduce and display it as needed to provide the service (for example, publishing your catalog or generating previews). With your permission we may showcase your store as an example; you can ask us to stop.',
        ],
      },
      {
        title: '8. Availability and limitation of liability',
        blocks: [
          'We work to keep the service available and working well, but it is provided "as is" and "as available": there may be outages, maintenance, errors or data loss. We recommend keeping copies of your important information.',
          `To the maximum extent permitted by law, ${COMPANY_NAME} is not liable for indirect damages, lost profits, lost sales, data or goodwill, or for the acts of merchants, their customers or third-party services. ${COMPANY_NAME}'s total liability to you for any claim related to the service is limited to the amount you paid us in the 12 months before the event giving rise to the claim.`,
          'Nothing above limits rights that applicable law does not allow to be excluded.',
          `You agree to hold ${COMPANY_NAME} harmless from third-party claims arising from your products, your content, your communications with customers, or your breach of these terms or the law.`,
        ],
      },
      {
        title: '9. Suspension and termination',
        blocks: [
          [
            'You can stop using the service and delete your account at any time from "My Account" in the dashboard. If you have a subscription, it is canceled when the account is deleted.',
            'We may suspend or close your account if you breach these terms, if required by law or by a provider (for example Meta or a payment gateway), or if your use puts the platform or third parties at risk. Where reasonable, we will notify you first.',
            'When the account ends, your store is no longer published and your data is deleted according to the Privacy Policy, except what we must keep by law.',
          ],
        ],
      },
      {
        title: '10. Changes to these terms',
        blocks: [
          'We may update these terms. If the changes are significant, we will notify you by email or within the platform before they take effect. If you keep using the service after that date, you are deemed to accept them; if you do not agree, you can cancel your account.',
        ],
      },
      {
        title: '11. Governing law and jurisdiction',
        blocks: [
          `These terms are governed by ${GOVERNING_LAW_EN}. Any dispute will be submitted to the state or federal courts located in ${JURISDICTION_EN}, without prejudice to any non-waivable rights granted to you by the consumer protection law of your country.`,
        ],
      },
      {
        title: '12. Contact',
        blocks: [
          `For any questions about these terms, email us at ${CONTACT_EMAIL} or use the support chat inside the app.`,
        ],
      },
    ],
    rights: 'All rights reserved.',
  },
}

export default function Terms() {
  const { localePath, isEnglish } = useLanguage()
  const c = CONTENT[isEnglish ? 'en' : 'es']

  return (
    <div className="min-h-screen bg-white">
      <Seo
        title={`${c.title} | Shopifree`}
        description={isEnglish
          ? 'Terms and Conditions for using Shopifree: online stores, plans and billing, ShopiChat (WhatsApp) and the AI assistant.'
          : 'Términos y Condiciones de uso de Shopifree: tiendas online, planes y facturación, ShopiChat (WhatsApp) y el asistente de IA.'}
        canonical={`https://shopifree.app/${isEnglish ? 'en' : 'es'}/terms`}
        locale={isEnglish ? 'en_US' : 'es_LA'}
      />

      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to={localePath('/')} className="flex items-center gap-2">
            <img src="/shopifree-logo.png" alt="Shopifree" className="h-8 w-8" />
            <span className="text-xl font-bold text-[#1e3a5f]">Shopifree</span>
          </Link>
          <Link to={localePath('/')} className="text-sm text-[#2d6cb5] hover:underline">
            {c.back}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">{c.title}</h1>
        <p className="text-sm text-gray-400 mb-8">{c.updated}</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
          <p>{c.intro}</p>

          {c.sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">{section.title}</h2>
              {section.blocks.map((block, i) =>
                Array.isArray(block) ? (
                  <ul key={i} className="list-disc pl-6 space-y-1 mt-2">
                    {block.map(item => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p key={i} className={i > 0 ? 'mt-2' : undefined}>{block}</p>
                )
              )}
            </section>
          ))}

          <p className="mt-8">
            <Link to={localePath('/privacy')} className="text-[#2d6cb5] hover:underline">
              {isEnglish ? 'Privacy Policy' : 'Política de Privacidad'}
            </Link>
            {' · '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2d6cb5] hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">&copy; 2026 {LEGAL_ENTITY}. {c.rights}</p>
        </div>
      </div>
    </div>
  )
}
