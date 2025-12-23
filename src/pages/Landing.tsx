import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              Shopifree
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Crear catálogo gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Crea tu catálogo y vende por{' '}
            <span className="text-green-600">WhatsApp</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            En 3 minutos tienes tu catálogo online. Comparte el link y recibe pedidos directo en tu WhatsApp. Sin comisiones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-black text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-800 transition"
            >
              Crear mi catálogo gratis
            </Link>
            <a
              href="#como-funciona"
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-50 transition"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-gray-900">500+</p>
              <p className="text-gray-600">Catálogos creados</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">10k+</p>
              <p className="text-gray-600">Productos publicados</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">0%</p>
              <p className="text-gray-600">Comisión por venta</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Así de fácil
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sube tus productos</h3>
              <p className="text-gray-600">Foto, nombre y precio. Listo.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Comparte tu link</h3>
              <p className="text-gray-600">En WhatsApp, Instagram, donde quieras.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Recibe pedidos</h3>
              <p className="text-gray-600">Directo en tu WhatsApp. Sin intermediarios.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Planes simples
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Gratis</h3>
              <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-500">/mes</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Hasta 20 productos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Pedidos por WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Link compartible
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Código QR
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full text-center border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-black text-white rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-3 py-1 rounded-full">
                Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="text-4xl font-bold mb-6">$5<span className="text-lg text-gray-400">/mes</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Productos ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Sin marca Shopifree
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Múltiples fotos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Cupones de descuento
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Analytics
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full text-center bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-100 transition"
              >
                Empezar prueba gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            ¿Listo para empezar a vender?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Crea tu catálogo en menos de 3 minutos. Es gratis.
          </p>
          <Link
            to="/register"
            className="inline-block bg-black text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-800 transition"
          >
            Crear mi catálogo gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600">© 2024 Shopifree. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-600 hover:text-gray-900">Términos</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Privacidad</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
