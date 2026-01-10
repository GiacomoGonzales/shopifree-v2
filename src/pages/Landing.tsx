import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen relative">
      {/* Animated background gradient mesh */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: -1 }}>
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbff] via-[#eef6ff] to-[#e0f0ff]"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f08_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f08_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>

        {/* Gradient blobs - more visible */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-[#38bdf8] rounded-full blur-[150px] opacity-40"></div>
        <div className="absolute top-[20%] -right-40 w-[600px] h-[600px] bg-[#6366f1] rounded-full blur-[150px] opacity-30"></div>
        <div className="absolute top-[60%] left-[10%] w-[500px] h-[500px] bg-[#a78bfa] rounded-full blur-[150px] opacity-25"></div>
        <div className="absolute -bottom-40 right-[20%] w-[600px] h-[600px] bg-[#0ea5e9] rounded-full blur-[150px] opacity-35"></div>
        <div className="absolute bottom-[30%] -left-40 w-[400px] h-[400px] bg-[#22d3ee] rounded-full blur-[120px] opacity-30"></div>
      </div>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src="/newlogo.png" alt="Shopifree" className="h-7 sm:h-9" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/login" className="text-[#1e3a5f] hover:text-[#38bdf8] font-medium transition text-sm sm:text-base">
                Ingresar
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full hover:shadow-lg hover:shadow-[#38bdf8]/25 transition-all duration-300 text-sm sm:text-base whitespace-nowrap"
              >
                <span className="hidden sm:inline">Crear catálogo gratis</span>
                <span className="sm:hidden">Crear gratis</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 overflow-hidden relative">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#38bdf8]/20 to-transparent rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#1e3a5f]/10 to-transparent rounded-full blur-3xl -z-10"></div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#38bdf8]/10 text-[#1e3a5f] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-[#38bdf8] rounded-full animate-pulse"></span>
            Más de 500 catálogos creados
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#1e3a5f] mb-6 leading-tight">
            Crea tu catálogo y vende por{' '}
            <span className="text-gradient-brand">WhatsApp</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            En 3 minutos tienes tu catálogo online. Comparte el link y recibe pedidos directo en tu WhatsApp.
            <span className="text-[#1e3a5f] font-semibold"> Sin comisiones.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/register"
              className="group bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:shadow-[#38bdf8]/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Crear mi catálogo gratis
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#como-funciona"
              className="border-2 border-[#1e3a5f]/20 text-[#1e3a5f] px-8 py-4 rounded-full text-lg font-semibold hover:border-[#38bdf8] hover:bg-[#38bdf8]/5 transition-all duration-300"
            >
              Ver cómo funciona
            </a>
          </div>

          {/* Phone mockup with catalog */}
          <div className="relative max-w-4xl mx-auto">
            {/* Floating notifications */}
            <div className="absolute -left-4 top-20 bg-white rounded-2xl shadow-xl p-4 animate-bounce-slow z-10 hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nuevo pedido</p>
                  <p className="text-xs text-gray-500">María pidió 3 productos</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-40 bg-white rounded-2xl shadow-xl p-4 animate-bounce-slow-delayed z-10 hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#38bdf8] rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">+45 visitas hoy</p>
                  <p className="text-xs text-gray-500">Tu catálogo está creciendo</p>
                </div>
              </div>
            </div>

            {/* Phone frame - iPhone 15 Pro style */}
            <div className="relative mx-auto w-[280px] md:w-[300px]">
              {/* Glow effect behind phone */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#38bdf8]/20 via-transparent to-[#1e3a5f]/20 blur-3xl scale-150 -z-10"></div>

              {/* Phone outer frame - Titanium style */}
              <div className="relative bg-gradient-to-b from-[#2a2a2c] via-[#1d1d1f] to-[#2a2a2c] rounded-[55px] p-[12px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset,0_-3px_10px_rgba(255,255,255,0.05)_inset]">
                {/* Titanium edge highlight */}
                <div className="absolute inset-0 rounded-[55px] bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>

                {/* Side buttons - more realistic */}
                <div className="absolute -left-[1.5px] top-[100px] w-[3px] h-7 bg-gradient-to-r from-[#3a3a3c] to-[#2a2a2c] rounded-l-sm shadow-sm"></div>
                <div className="absolute -left-[1.5px] top-[140px] w-[3px] h-14 bg-gradient-to-r from-[#3a3a3c] to-[#2a2a2c] rounded-l-sm shadow-sm"></div>
                <div className="absolute -left-[1.5px] top-[195px] w-[3px] h-14 bg-gradient-to-r from-[#3a3a3c] to-[#2a2a2c] rounded-l-sm shadow-sm"></div>
                <div className="absolute -right-[1.5px] top-[155px] w-[3px] h-20 bg-gradient-to-l from-[#3a3a3c] to-[#2a2a2c] rounded-r-sm shadow-sm"></div>

                {/* Screen bezel */}
                <div className="relative bg-black rounded-[46px] p-[2px] overflow-hidden">
                  {/* Screen */}
                  <div className="relative bg-white rounded-[44px] overflow-hidden">
                    {/* Dynamic Island */}
                    <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[90px] h-[28px] bg-black rounded-full z-20 flex items-center justify-center gap-2">
                      <div className="w-[8px] h-[8px] rounded-full bg-[#1a1a1a] ring-1 ring-gray-800"></div>
                      <div className="w-[6px] h-[6px] rounded-full bg-[#0a3d2e]"></div>
                    </div>

                    {/* Status bar icons */}
                    <div className="absolute top-[14px] left-6 right-6 flex justify-between items-center z-10 text-white text-[10px] font-semibold">
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                        <div className="flex items-center">
                          <div className="w-6 h-3 border border-white rounded-sm flex items-center p-[1px]">
                            <div className="h-full w-4/5 bg-white rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Store header */}
                    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] px-5 pt-14 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-lg">🧁</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-[13px]">Dulces María</p>
                          <p className="text-[#7dd3fc] text-[10px]">dulcesmaria.shopifree.app</p>
                        </div>
                      </div>
                    </div>

                    {/* Catalog preview */}
                    <div className="p-3 space-y-2.5 bg-gray-50/80">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop', name: 'Torta Chocolate', price: 'S/ 45' },
                          { img: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=200&h=200&fit=crop', name: 'Cupcakes x6', price: 'S/ 25' },
                          { img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop', name: 'Brownies x4', price: 'S/ 18' },
                          { img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200&h=200&fit=crop', name: 'Cookies x12', price: 'S/ 20' },
                        ].map((product, i) => (
                          <div key={i} className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
                            <div className="aspect-square rounded-lg mb-1.5 overflow-hidden">
                              <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[10px] font-medium text-gray-800 truncate px-0.5">{product.name}</p>
                            <p className="text-[10px] font-bold text-[#1e3a5f] px-0.5">{product.price}</p>
                          </div>
                        ))}
                      </div>
                      {/* WhatsApp button */}
                      <div className="bg-[#25D366] text-white text-center py-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-md">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        </svg>
                        Pedir por WhatsApp
                      </div>
                    </div>

                    {/* Home indicator */}
                    <div className="bg-gray-50/80 pb-2 pt-1">
                      <div className="mx-auto w-28 h-[4px] bg-black/80 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Screen reflection */}
                <div className="absolute inset-[12px] rounded-[46px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <p className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">500+</p>
              <p className="text-[#38bdf8] text-xs sm:text-base">Catálogos creados</p>
            </div>
            <div>
              <p className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">10k+</p>
              <p className="text-[#38bdf8] text-xs sm:text-base">Productos publicados</p>
            </div>
            <div>
              <p className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">0%</p>
              <p className="text-[#38bdf8] text-xs sm:text-base">Comisión por venta</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-4 relative overflow-hidden">
        {/* Gradient decorations */}
        <div className="absolute top-20 -right-40 w-[400px] h-[400px] bg-gradient-to-bl from-[#38bdf8]/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -left-40 w-[350px] h-[350px] bg-gradient-to-tr from-[#a78bfa]/20 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">
              Así de fácil
            </h2>
            <p className="text-gray-600 text-lg">
              Solo 3 pasos para empezar a vender
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Sube tus productos',
                description: 'Foto, nombre y precio. Listo.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: 'Comparte tu link',
                description: 'En WhatsApp, Instagram, donde quieras.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )
              },
              {
                step: '3',
                title: 'Recibe pedidos',
                description: 'Directo en tu WhatsApp. Sin intermediarios.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )
              }
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:border-[#38bdf8]/50 hover:shadow-xl hover:shadow-[#38bdf8]/10 transition-all duration-300 shadow-lg shadow-gray-200/30">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#38bdf8]/20 to-[#1e3a5f]/10 rounded-2xl flex items-center justify-center text-[#1e3a5f] mb-6 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="absolute top-6 right-6 w-8 h-8 bg-[#38bdf8] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Gradient decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#38bdf8]/10 via-[#a78bfa]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-20 w-[300px] h-[300px] bg-gradient-to-tl from-[#06b6d4]/20 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">
              Todo lo que necesitas
            </h2>
            <p className="text-gray-600 text-lg">
              Funciones pensadas para emprendedores
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Catálogo móvil',
                desc: 'Optimizado para celulares',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              },
              {
                title: 'Link personalizado',
                desc: 'tutienda.shopifree.app',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              },
              {
                title: 'Código QR',
                desc: 'Para tu local o tarjetas',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              },
              {
                title: 'Categorías',
                desc: 'Organiza tus productos',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              },
              {
                title: 'WhatsApp directo',
                desc: 'Pedidos al instante',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              },
              {
                title: 'Estadísticas',
                desc: 'Ve quién visita tu catálogo',
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-6 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8]/20 to-[#1e3a5f]/10 rounded-xl flex items-center justify-center text-[#1e3a5f] flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[#1e3a5f] mb-1">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Gradient decorations */}
        <div className="absolute top-40 -left-40 w-[400px] h-[400px] bg-gradient-to-br from-[#1e3a5f]/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-40 w-[450px] h-[450px] bg-gradient-to-tl from-[#38bdf8]/20 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">
              Planes simples
            </h2>
            <p className="text-gray-600 text-lg">
              Empieza gratis, crece cuando quieras
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/50 hover:border-[#38bdf8]/30 transition-colors shadow-lg shadow-gray-200/50">
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">Gratis</h3>
              <p className="text-4xl font-bold text-[#1e3a5f] mb-1">
                $0
              </p>
              <p className="text-gray-400 text-sm mb-6">Para siempre</p>
              <ul className="space-y-3 mb-8">
                {['Hasta 20 productos', 'Pedidos por WhatsApp', 'Link compartible', 'Código QR'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 bg-[#38bdf8]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center border-2 border-[#1e3a5f] text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#1e3a5f] hover:text-white transition-all duration-300"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] rounded-3xl p-8 text-white relative overflow-hidden transform md:scale-105 shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#38bdf8]/20 rounded-full blur-3xl"></div>
              <div className="flex justify-center mb-4">
                <span className="bg-[#38bdf8] text-white text-sm px-4 py-1 rounded-full font-medium shadow-lg">
                  Popular
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-4xl font-bold mb-1">
                $4.99
              </p>
              <p className="text-[#38bdf8] text-sm mb-6">por mes</p>
              <ul className="space-y-3 mb-8">
                {['Productos ilimitados', 'Sin marca Shopifree', 'Múltiples fotos', 'Categorías ilimitadas', 'Estadísticas básicas', 'Soporte por email'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 bg-[#38bdf8]/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center bg-white text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#38bdf8] hover:text-white transition-all duration-300"
              >
                Probar 7 días gratis
              </Link>
            </div>

            {/* Business */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/50 hover:border-[#38bdf8]/30 transition-colors shadow-lg shadow-gray-200/50">
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">Business</h3>
              <p className="text-4xl font-bold text-[#1e3a5f] mb-1">
                $9.99
              </p>
              <p className="text-gray-400 text-sm mb-6">por mes</p>
              <ul className="space-y-3 mb-8">
                {['Todo lo de Pro', 'Cupones de descuento', 'Analytics avanzados', 'Dominio personalizado', 'Pagos en línea', 'Soporte prioritario'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 bg-[#38bdf8]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center border-2 border-[#1e3a5f] text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#1e3a5f] hover:text-white transition-all duration-300"
              >
                Probar 7 días gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-r from-[#1e3a5f] via-[#2d6cb5] to-[#38bdf8] relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ¿Listo para empezar a vender?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Crea tu catálogo en menos de 3 minutos. Es gratis.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-[#1e3a5f] px-10 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Crear mi catálogo gratis
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#1e3a5f]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/newlogo.png" alt="Shopifree" className="h-8 brightness-0 invert" />
            </div>
            <p className="text-[#38bdf8]/60 text-sm">
              © 2024 Shopifree. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-white/60 hover:text-[#38bdf8] transition text-sm">Términos</a>
              <a href="#" className="text-white/60 hover:text-[#38bdf8] transition text-sm">Privacidad</a>
              <a href="#" className="text-white/60 hover:text-[#38bdf8] transition text-sm">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
