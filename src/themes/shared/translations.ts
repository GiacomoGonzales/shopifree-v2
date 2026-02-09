/**
 * Theme UI Translations
 * These are the texts displayed in store themes (not product content)
 */

export type ThemeLanguage = 'es' | 'en' | 'pt'

export interface ThemeTranslations {
  // Categories
  all: string

  // Product count
  item: string
  items: string

  // Product card
  view: string
  sale: string
  hot: string

  // Empty state
  noItems: string
  checkBackSoon: string

  // Contact section
  contact: string
  followUs: string

  // Cart
  cart: string
  checkout: string
  total: string
  addToCart: string

  // Product details
  brand: string
  sku: string

  // WhatsApp messages
  whatsappOrder: string
  whatsappGreeting: string

  // CTA buttons
  hitUsUp: string
  orderViaWhatsApp: string

  // Business type specific
  book: string
  schedule: string
  customize: string

  // Powered by
  poweredBy: string

  // Checkout
  checkoutTitle: string
  customerInfo: string
  yourName: string
  yourPhone: string
  yourEmail: string
  emailOptional: string
  continueBtn: string
  backBtn: string
  sendOrderBtn: string
  goToPaymentBtn: string

  // Delivery
  howToReceive: string
  pickupInStore: string
  homeDelivery: string
  deliveryAddress: string
  streetAddress: string
  city: string
  reference: string
  referenceOptional: string
  storeAddress: string

  // Payment
  selectPayment: string
  payViaWhatsApp: string
  payViaMercadoPago: string
  payViaStripe: string
  payViaTransfer: string
  whatsappPaymentDesc: string
  mercadopagoPaymentDesc: string
  mercadopagoPaymentDescPE: string
  stripePaymentDesc: string
  transferPaymentDesc: string

  // Order confirmation
  orderPlaced: string
  orderNumber: string
  orderPending: string
  orderProcessing: string
  whatsappCTA: string
  backToStore: string

  // Receipt
  downloadReceipt: string

  // Bank transfer
  bankTransferInfo: string
  bankName: string
  accountHolder: string
  accountNumber: string
  copyToClipboard: string
  copied: string

  // Validation
  nameRequired: string
  phoneRequired: string
  addressRequired: string
  cityRequired: string

  // Order summary
  orderSummary: string
  subtotal: string
  shipping: string
  freeShipping: string
  freeShippingAbove: string

  // Observations
  observations: string
  observationsPlaceholder: string

  // Brick payment
  payWithCard: string
  paymentRejected: string
  paymentRejectedMessage: string
  redirectingToPayment: string
  paymentApproved: string

  // Search
  searchProducts: string
  searchNoResults: string

  // Shipping zones
  zoneNotAvailable: string

  // Payment return pages
  paymentSuccess: string
  paymentSuccessMessage: string
  paymentSuccessInfo: string
  paymentFailure: string
  paymentFailureMessage: string
  paymentRetry: string
  paymentPending: string
  paymentPendingMessage: string
  paymentPendingInfo: string
  paymentProcessing: string

  // WhatsApp message parts
  waGreeting: string
  waOrderNumber: string
  waOrderDetails: string
  waQuantity: string
  waUnitPrice: string
  waSubtotal: string
  waTotal: string
  waDelivery: string
  waPickup: string
  waDeliveryAddress: string
  waReference: string
  waObservations: string
  waCustomer: string
  waPhone: string
  waThankYou: string
}

export const themeTranslations: Record<ThemeLanguage, ThemeTranslations> = {
  es: {
    // Categories
    all: 'Todos',

    // Product count
    item: 'producto',
    items: 'productos',

    // Product card
    view: 'Ver',
    sale: 'Oferta',
    hot: 'Nuevo',

    // Empty state
    noItems: 'Sin productos',
    checkBackSoon: 'Vuelve pronto',

    // Contact section
    contact: 'Contacto',
    followUs: 'Siguenos',

    // Cart
    cart: 'Carrito',
    checkout: 'Pedir',
    total: 'Total',
    addToCart: 'Agregar',

    // Product details
    brand: 'Marca',
    sku: 'Codigo',

    // WhatsApp messages
    whatsappOrder: 'Hola! Quiero hacer este pedido:',
    whatsappGreeting: 'Hola! Estoy viendo',

    // CTA buttons
    hitUsUp: 'Contactanos',
    orderViaWhatsApp: 'Pedir por WhatsApp',

    // Business type specific
    book: 'Reservar',
    schedule: 'Agendar',
    customize: 'Personalizar',

    // Powered by
    poweredBy: 'Creado con Shopifree',

    // Checkout
    checkoutTitle: 'Finalizar pedido',
    customerInfo: 'Tus datos',
    yourName: 'Tu nombre',
    yourPhone: 'Tu telefono',
    yourEmail: 'Tu email',
    emailOptional: 'opcional',
    continueBtn: 'Continuar',
    backBtn: 'Atras',
    sendOrderBtn: 'Enviar pedido',
    goToPaymentBtn: 'Ir al pago',

    // Delivery
    howToReceive: 'Como quieres recibir tu pedido?',
    pickupInStore: 'Retiro en tienda',
    homeDelivery: 'Delivery a domicilio',
    deliveryAddress: 'Direccion de entrega',
    streetAddress: 'Calle y numero',
    city: 'Ciudad',
    reference: 'Referencia',
    referenceOptional: 'ej: cerca del parque',
    storeAddress: 'Direccion de la tienda',

    // Payment
    selectPayment: 'Metodo de pago',
    payViaWhatsApp: 'Coordinar por WhatsApp',
    payViaMercadoPago: 'Pagar con MercadoPago',
    payViaStripe: 'Pagar con Stripe',
    payViaTransfer: 'Transferencia bancaria',
    whatsappPaymentDesc: 'Te contactaremos para coordinar',
    mercadopagoPaymentDesc: 'Pago seguro con tarjeta o efectivo',
    mercadopagoPaymentDescPE: 'Pago seguro con tarjeta, efectivo o Yape',
    stripePaymentDesc: 'Pago seguro con tarjeta',
    transferPaymentDesc: 'Transferencia a cuenta bancaria',

    // Order confirmation
    orderPlaced: 'Pedido realizado!',
    orderNumber: 'Numero de pedido',
    orderPending: 'Tu pedido esta pendiente de pago',
    orderProcessing: 'Estamos procesando tu pedido',
    whatsappCTA: 'Haz clic para enviar tu pedido por WhatsApp',
    backToStore: 'Volver a la tienda',

    // Receipt
    downloadReceipt: 'Descargar recibo',

    // Bank transfer
    bankTransferInfo: 'Datos para transferencia',
    bankName: 'Banco',
    accountHolder: 'Titular',
    accountNumber: 'Numero de cuenta',
    copyToClipboard: 'Copiar',
    copied: 'Copiado!',

    // Validation
    nameRequired: 'El nombre es requerido',
    phoneRequired: 'El telefono es requerido',
    addressRequired: 'La direccion es requerida',
    cityRequired: 'La ciudad es requerida',

    // Order summary
    orderSummary: 'Resumen del pedido',
    subtotal: 'Subtotal',
    shipping: 'Envio',
    freeShipping: 'Gratis',
    freeShippingAbove: 'Envio gratis en compras mayores a {{amount}}',

    // Observations
    observations: 'Observaciones',
    observationsPlaceholder: 'Alguna indicacion especial para tu pedido?',

    // Brick payment
    payWithCard: 'Pagar con tarjeta',
    paymentRejected: 'Pago rechazado',
    paymentRejectedMessage: 'Tu pago fue rechazado. Por favor intenta con otra tarjeta.',
    redirectingToPayment: 'Redirigiendo al pago...',
    paymentApproved: 'Tu pago fue aprobado exitosamente',

    // Search
    searchProducts: 'Buscar productos...',
    searchNoResults: 'No se encontraron productos',

    // Shipping zones
    zoneNotAvailable: 'No realizamos envios a esta zona',

    // Payment return pages
    paymentSuccess: 'Pago completado!',
    paymentSuccessMessage: 'Tu pago ha sido procesado exitosamente.',
    paymentSuccessInfo: 'El vendedor se pondra en contacto contigo para coordinar la entrega.',
    paymentFailure: 'El pago no se pudo completar',
    paymentFailureMessage: 'Hubo un problema al procesar tu pago. Por favor, intenta nuevamente.',
    paymentRetry: 'Reintentar pago',
    paymentPending: 'Pago en proceso',
    paymentPendingMessage: 'Tu pago esta siendo procesado. Te notificaremos cuando se confirme.',
    paymentPendingInfo: 'Esto puede tomar unos minutos. No es necesario que hagas nada mas.',
    paymentProcessing: 'Procesando pago...',

    // WhatsApp message parts
    waGreeting: 'Hola! Acabo de realizar un pedido',
    waOrderNumber: 'Pedido',
    waOrderDetails: 'Detalle del pedido',
    waQuantity: 'Cantidad',
    waUnitPrice: 'Precio unitario',
    waSubtotal: 'Subtotal',
    waTotal: 'Total',
    waDelivery: 'Entrega a domicilio',
    waPickup: 'Retiro en tienda',
    waDeliveryAddress: 'Direccion de entrega',
    waReference: 'Referencia',
    waObservations: 'Observaciones',
    waCustomer: 'Cliente',
    waPhone: 'Telefono',
    waThankYou: 'Gracias por tu compra!',
  },

  en: {
    // Categories
    all: 'All',

    // Product count
    item: 'item',
    items: 'items',

    // Product card
    view: 'View',
    sale: 'Sale',
    hot: 'Hot',

    // Empty state
    noItems: 'No items',
    checkBackSoon: 'Check back soon',

    // Contact section
    contact: 'Contact',
    followUs: 'Follow us',

    // Cart
    cart: 'Cart',
    checkout: 'Checkout',
    total: 'Total',
    addToCart: 'Add to cart',

    // Product details
    brand: 'Brand',
    sku: 'SKU',

    // WhatsApp messages
    whatsappOrder: 'Hi! I want to order:',
    whatsappGreeting: "Hi! I'm checking out",

    // CTA buttons
    hitUsUp: 'Contact us',
    orderViaWhatsApp: 'Order via WhatsApp',

    // Business type specific
    book: 'Book',
    schedule: 'Schedule',
    customize: 'Customize',

    // Powered by
    poweredBy: 'Powered by Shopifree',

    // Checkout
    checkoutTitle: 'Complete order',
    customerInfo: 'Your info',
    yourName: 'Your name',
    yourPhone: 'Your phone',
    yourEmail: 'Your email',
    emailOptional: 'optional',
    continueBtn: 'Continue',
    backBtn: 'Back',
    sendOrderBtn: 'Send order',
    goToPaymentBtn: 'Go to payment',

    // Delivery
    howToReceive: 'How do you want to receive your order?',
    pickupInStore: 'Store pickup',
    homeDelivery: 'Home delivery',
    deliveryAddress: 'Delivery address',
    streetAddress: 'Street address',
    city: 'City',
    reference: 'Reference',
    referenceOptional: 'e.g: near the park',
    storeAddress: 'Store address',

    // Payment
    selectPayment: 'Payment method',
    payViaWhatsApp: 'Coordinate via WhatsApp',
    payViaMercadoPago: 'Pay with MercadoPago',
    payViaStripe: 'Pay with Stripe',
    payViaTransfer: 'Bank transfer',
    whatsappPaymentDesc: 'We will contact you to coordinate',
    mercadopagoPaymentDesc: 'Secure payment with card or cash',
    mercadopagoPaymentDescPE: 'Secure payment with card, cash or Yape',
    stripePaymentDesc: 'Secure card payment',
    transferPaymentDesc: 'Transfer to bank account',

    // Order confirmation
    orderPlaced: 'Order placed!',
    orderNumber: 'Order number',
    orderPending: 'Your order is pending payment',
    orderProcessing: 'We are processing your order',
    whatsappCTA: 'Click to send your order via WhatsApp',
    backToStore: 'Back to store',

    // Receipt
    downloadReceipt: 'Download receipt',

    // Bank transfer
    bankTransferInfo: 'Bank transfer details',
    bankName: 'Bank',
    accountHolder: 'Account holder',
    accountNumber: 'Account number',
    copyToClipboard: 'Copy',
    copied: 'Copied!',

    // Validation
    nameRequired: 'Name is required',
    phoneRequired: 'Phone is required',
    addressRequired: 'Address is required',
    cityRequired: 'City is required',

    // Order summary
    orderSummary: 'Order summary',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    freeShipping: 'Free',
    freeShippingAbove: 'Free shipping on orders over {{amount}}',

    // Observations
    observations: 'Notes',
    observationsPlaceholder: 'Any special instructions for your order?',

    // Brick payment
    payWithCard: 'Pay with card',
    paymentRejected: 'Payment rejected',
    paymentRejectedMessage: 'Your payment was rejected. Please try a different card.',
    redirectingToPayment: 'Redirecting to payment...',
    paymentApproved: 'Your payment was approved successfully',

    // Search
    searchProducts: 'Search products...',
    searchNoResults: 'No products found',

    // Shipping zones
    zoneNotAvailable: 'We do not ship to this area',

    // Payment return pages
    paymentSuccess: 'Payment completed!',
    paymentSuccessMessage: 'Your payment has been processed successfully.',
    paymentSuccessInfo: 'The seller will contact you to coordinate delivery.',
    paymentFailure: 'Payment could not be completed',
    paymentFailureMessage: 'There was a problem processing your payment. Please try again.',
    paymentRetry: 'Retry payment',
    paymentPending: 'Payment in progress',
    paymentPendingMessage: 'Your payment is being processed. We will notify you when confirmed.',
    paymentPendingInfo: 'This may take a few minutes. No further action is needed.',
    paymentProcessing: 'Processing payment...',

    // WhatsApp message parts
    waGreeting: 'Hi! I just placed an order',
    waOrderNumber: 'Order',
    waOrderDetails: 'Order details',
    waQuantity: 'Quantity',
    waUnitPrice: 'Unit price',
    waSubtotal: 'Subtotal',
    waTotal: 'Total',
    waDelivery: 'Home delivery',
    waPickup: 'Store pickup',
    waDeliveryAddress: 'Delivery address',
    waReference: 'Reference',
    waObservations: 'Notes',
    waCustomer: 'Customer',
    waPhone: 'Phone',
    waThankYou: 'Thank you for your purchase!',
  },

  pt: {
    // Categories
    all: 'Todos',

    // Product count
    item: 'item',
    items: 'itens',

    // Product card
    view: 'Ver',
    sale: 'Oferta',
    hot: 'Novo',

    // Empty state
    noItems: 'Sem produtos',
    checkBackSoon: 'Volte em breve',

    // Contact section
    contact: 'Contato',
    followUs: 'Siga-nos',

    // Cart
    cart: 'Carrinho',
    checkout: 'Finalizar',
    total: 'Total',
    addToCart: 'Adicionar',

    // Product details
    brand: 'Marca',
    sku: 'Codigo',

    // WhatsApp messages
    whatsappOrder: 'Ola! Quero fazer este pedido:',
    whatsappGreeting: 'Ola! Estou vendo',

    // CTA buttons
    hitUsUp: 'Fale conosco',
    orderViaWhatsApp: 'Pedir pelo WhatsApp',

    // Business type specific
    book: 'Reservar',
    schedule: 'Agendar',
    customize: 'Personalizar',

    // Powered by
    poweredBy: 'Criado com Shopifree',

    // Checkout
    checkoutTitle: 'Finalizar pedido',
    customerInfo: 'Seus dados',
    yourName: 'Seu nome',
    yourPhone: 'Seu telefone',
    yourEmail: 'Seu email',
    emailOptional: 'opcional',
    continueBtn: 'Continuar',
    backBtn: 'Voltar',
    sendOrderBtn: 'Enviar pedido',
    goToPaymentBtn: 'Ir para pagamento',

    // Delivery
    howToReceive: 'Como deseja receber seu pedido?',
    pickupInStore: 'Retirar na loja',
    homeDelivery: 'Entrega em domicilio',
    deliveryAddress: 'Endereco de entrega',
    streetAddress: 'Rua e numero',
    city: 'Cidade',
    reference: 'Referencia',
    referenceOptional: 'ex: perto do parque',
    storeAddress: 'Endereco da loja',

    // Payment
    selectPayment: 'Forma de pagamento',
    payViaWhatsApp: 'Combinar pelo WhatsApp',
    payViaMercadoPago: 'Pagar com MercadoPago',
    payViaStripe: 'Pagar com Stripe',
    payViaTransfer: 'Transferencia bancaria',
    whatsappPaymentDesc: 'Entraremos em contato para combinar',
    mercadopagoPaymentDesc: 'Pagamento seguro com cartao ou dinheiro',
    mercadopagoPaymentDescPE: 'Pagamento seguro com cartao, dinheiro ou Yape',
    stripePaymentDesc: 'Pagamento seguro com cartao',
    transferPaymentDesc: 'Transferencia para conta bancaria',

    // Order confirmation
    orderPlaced: 'Pedido realizado!',
    orderNumber: 'Numero do pedido',
    orderPending: 'Seu pedido esta pendente de pagamento',
    orderProcessing: 'Estamos processando seu pedido',
    whatsappCTA: 'Clique para enviar seu pedido pelo WhatsApp',
    backToStore: 'Voltar para a loja',

    // Receipt
    downloadReceipt: 'Baixar recibo',

    // Bank transfer
    bankTransferInfo: 'Dados para transferencia',
    bankName: 'Banco',
    accountHolder: 'Titular',
    accountNumber: 'Numero da conta',
    copyToClipboard: 'Copiar',
    copied: 'Copiado!',

    // Validation
    nameRequired: 'Nome e obrigatorio',
    phoneRequired: 'Telefone e obrigatorio',
    addressRequired: 'Endereco e obrigatorio',
    cityRequired: 'Cidade e obrigatoria',

    // Order summary
    orderSummary: 'Resumo do pedido',
    subtotal: 'Subtotal',
    shipping: 'Frete',
    freeShipping: 'Gratis',
    freeShippingAbove: 'Frete gratis em compras acima de {{amount}}',

    // Observations
    observations: 'Observacoes',
    observationsPlaceholder: 'Alguma instrucao especial para seu pedido?',

    // Brick payment
    payWithCard: 'Pagar com cartao',
    paymentRejected: 'Pagamento recusado',
    paymentRejectedMessage: 'Seu pagamento foi recusado. Por favor tente com outro cartao.',
    redirectingToPayment: 'Redirecionando para o pagamento...',
    paymentApproved: 'Seu pagamento foi aprovado com sucesso',

    // Search
    searchProducts: 'Buscar produtos...',
    searchNoResults: 'Nenhum produto encontrado',

    // Shipping zones
    zoneNotAvailable: 'Nao realizamos envios para esta regiao',

    // Payment return pages
    paymentSuccess: 'Pagamento concluido!',
    paymentSuccessMessage: 'Seu pagamento foi processado com sucesso.',
    paymentSuccessInfo: 'O vendedor entrara em contato para coordenar a entrega.',
    paymentFailure: 'O pagamento nao foi concluido',
    paymentFailureMessage: 'Houve um problema ao processar seu pagamento. Por favor, tente novamente.',
    paymentRetry: 'Tentar novamente',
    paymentPending: 'Pagamento em processamento',
    paymentPendingMessage: 'Seu pagamento esta sendo processado. Notificaremos quando for confirmado.',
    paymentPendingInfo: 'Isso pode levar alguns minutos. Nenhuma acao adicional e necessaria.',
    paymentProcessing: 'Processando pagamento...',

    // WhatsApp message parts
    waGreeting: 'Ola! Acabei de fazer um pedido',
    waOrderNumber: 'Pedido',
    waOrderDetails: 'Detalhes do pedido',
    waQuantity: 'Quantidade',
    waUnitPrice: 'Preco unitario',
    waSubtotal: 'Subtotal',
    waTotal: 'Total',
    waDelivery: 'Entrega em domicilio',
    waPickup: 'Retirar na loja',
    waDeliveryAddress: 'Endereco de entrega',
    waReference: 'Referencia',
    waObservations: 'Observacoes',
    waCustomer: 'Cliente',
    waPhone: 'Telefone',
    waThankYou: 'Obrigado pela compra!',
  },
}

/**
 * Get translations for a specific language
 * Falls back to Spanish if language not supported
 */
export function getThemeTranslations(language?: string): ThemeTranslations {
  const lang = (language || 'es') as ThemeLanguage
  return themeTranslations[lang] || themeTranslations.es
}
