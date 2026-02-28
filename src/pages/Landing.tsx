import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'
import DemoStoresCarousel from '../components/landing/DemoStoresCarousel'
import LanguageSelector from '../components/common/LanguageSelector'

export default function Landing() {
  const { t } = useTranslation(['landing', 'common'])
  const { localePath } = useLanguage()
  const { firebaseUser, store, loading: authLoading } = useAuth()

  // If authenticated, go straight to dashboard (or register if no store yet)
  const authTarget = firebaseUser ? (store ? localePath('/dashboard') : localePath('/register')) : localePath('/login')
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
            <Link to={localePath('/')} className="flex items-center gap-2 flex-shrink-0">
              <img src="/newlogo.png" alt="Shopifree" className="h-7 sm:h-9" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSelector />
              <Link to={localePath('/blog')} className="text-[#1e3a5f] hover:text-[#38bdf8] font-medium transition text-sm sm:text-base hidden sm:inline">
                Blog
              </Link>
              {!authLoading && (
                <Link to={authTarget} className="text-[#1e3a5f] hover:text-[#38bdf8] font-medium transition text-sm sm:text-base">
                  {firebaseUser ? t('common:nav.dashboard', 'Mi panel') : t('common:nav.login')}
                </Link>
              )}
              <Link
                to={localePath('/register')}
                className="bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full hover:shadow-lg hover:shadow-[#38bdf8]/25 transition-all duration-300 text-sm sm:text-base whitespace-nowrap"
              >
                <span className="hidden sm:inline">{t('common:nav.createCatalog')}</span>
                <span className="sm:hidden">{t('common:nav.createFree')}</span>
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
            {t('hero.badge')}
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#1e3a5f] mb-6 leading-tight">
            {t('hero.title')}{' '}
            <span className="text-gradient-brand">{t('hero.titleHighlight')}</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
            <span className="text-[#1e3a5f] font-semibold"> {t('hero.noCommissions')}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to={localePath('/register')}
              className="group bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:shadow-[#38bdf8]/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {t('common:buttons.createMyCatalog')}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#como-funciona"
              className="border-2 border-[#1e3a5f]/20 text-[#1e3a5f] px-8 py-4 rounded-full text-lg font-semibold hover:border-[#38bdf8] hover:bg-[#38bdf8]/5 transition-all duration-300"
            >
              {t('common:buttons.seeHowItWorks')}
            </a>
          </div>

          {/* Demo stores carousel */}
          <div className="relative max-w-6xl mx-auto">
            <DemoStoresCarousel />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 sm:py-20 border-y border-gray-200/60">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-5xl font-extrabold text-[#1e3a5f] mb-1 sm:mb-2">500+</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('stats.catalogsCreated')}</p>
            </div>
            <div>
              <p className="text-3xl sm:text-5xl font-extrabold text-[#1e3a5f] mb-1 sm:mb-2">10k+</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('stats.productsPublished')}</p>
            </div>
            <div>
              <p className="text-3xl sm:text-5xl font-extrabold text-[#1e3a5f] mb-1 sm:mb-2">0%</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('stats.commissionPerSale')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations marquee */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 mb-10">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t('integrations.subtitle')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">
              {t('integrations.title')}
            </h2>
          </div>
        </div>
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-[#f0f6ff] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-[#f0f6ff] to-transparent z-10 pointer-events-none" />
          {/* Scrolling track */}
          <div className="flex animate-marquee w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-12 sm:gap-20 px-6 sm:px-10">
                {/* MercadoPago */}
                <div className="flex items-center gap-2 flex-shrink-0 hover:scale-105 transition-transform">
                  <img src="/mercadopago-logo.webp" alt="MercadoPago" className="h-10 sm:h-14 w-auto rounded-xl" />
                </div>
                {/* Stripe */}
                <div className="flex items-center gap-2 flex-shrink-0 hover:scale-105 transition-transform">
                  <img src="/stripe-logo.png" alt="Stripe" className="h-10 sm:h-14 w-auto" />
                </div>
                {/* WhatsApp Business */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-10 sm:h-12" viewBox="0 0 24 24" fill="none">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25D366" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-[#25D366]">WhatsApp</span>
                </div>
                {/* Google Analytics */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24" fill="#E37400">
                    <path d="M22.84 2.9v18.2c0 .5-.4.9-.84.9-.2 0-.37-.1-.53-.2l-.03-.02c-.13-.12-.24-.3-.28-.48V3.7c0-.5.4-.9.84-.9.46 0 .84.4.84.9v-.8zM17.16 7.8v13.3c0 .5-.4.9-.84.9-.47 0-.84-.4-.84-.9V7.8c0-.5.37-.9.84-.9.44 0 .84.4.84.9zM11.5 12.7v8.4c0 .5-.4.9-.84.9-.47 0-.84-.4-.84-.9v-8.4c0-.5.37-.9.84-.9.44 0 .84.4.84.9zM5.84 17.1v3.98c0 .5-.4.92-.84.92-.47 0-.84-.4-.84-.9V17.1c0-.5.37-.9.84-.9.44 0 .84.4.84.9z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-[#E37400]">Analytics</span>
                </div>
                {/* TikTok Pixel */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24" fill="#000">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34A6.34 6.34 0 0015.83 15.3V8.75a8.18 8.18 0 003.76.92V6.69z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-gray-800">TikTok Pixel</span>
                </div>
                {/* Meta Pixel */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24" fill="#0081FB">
                    <path d="M6.915 4.03c-1.968 0-3.412 1.06-4.26 2.605C1.826 8.114 1.5 10.103 1.5 12c0 1.896.326 3.885 1.155 5.365.848 1.545 2.292 2.605 4.26 2.605 1.47 0 2.598-.723 3.403-1.66.718-.836 1.257-1.904 1.682-2.935.425 1.031.964 2.1 1.682 2.936.805.936 1.933 1.659 3.403 1.659 1.968 0 3.412-1.06 4.26-2.605.829-1.48 1.155-3.469 1.155-5.365 0-1.897-.326-3.886-1.155-5.365C20.497 5.09 19.053 4.03 17.085 4.03c-1.47 0-2.598.723-3.403 1.66-.718.835-1.257 1.903-1.682 2.934-.425-1.031-.964-2.099-1.682-2.935C9.513 4.753 8.385 4.03 6.915 4.03z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-[#0081FB]">Meta Pixel</span>
                </div>
                {/* Google Play */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z"/>
                    <path fill="#34A853" d="M14.499 12.707l2.302 2.302-10.937 6.333 8.635-8.635z"/>
                    <path fill="#FBBC04" d="M17.698 9.508l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 12l2.302-2.492z"/>
                    <path fill="#EA4335" d="M5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-gray-800">Play Store</span>
                </div>
                {/* App Store */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24" fill="#333">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-gray-800">App Store</span>
                </div>
                {/* Firebase */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24">
                    <path fill="#FFA000" d="M3.89 15.67L6.07 2.35a.46.46 0 01.87-.07l2.26 4.27L3.89 15.67z"/>
                    <path fill="#F57C00" d="M12.56 8.83L10.11 4.2 3.89 15.67l8.67-6.84z"/>
                    <path fill="#FFCA28" d="M17.58 5.27a.46.46 0 01.79.33l1.74 15.07L5.1 22.89a.46.46 0 01-.53-.31L3.89 15.67l8.67-6.84 5.02-3.56z"/>
                    <path fill="#FFA000" d="M3.89 15.67l.68 6.91a.46.46 0 00.53.31l15.01-2.22-5.55-14.4L3.89 15.67z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-[#F57C00]">Firebase</span>
                </div>
                {/* Cloudinary */}
                <div className="flex items-center gap-2.5 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg className="h-9 sm:h-11" viewBox="0 0 24 24" fill="#3448C5">
                    <path d="M12.02 6.18C10.48 3.64 7.66 2 4.5 2h-.26C1.92 6.12 2.3 11.16 5.04 14.88c.2.28.42.54.66.78A7.46 7.46 0 0112 12.06a7.46 7.46 0 016.3 3.6c.24-.24.46-.5.66-.78C21.7 11.16 22.08 6.12 19.76 2h-.26c-3.16 0-5.98 1.64-7.48 4.18z"/>
                    <path d="M12 13.56a5.96 5.96 0 00-5.1 2.88A11.94 11.94 0 0012 22a11.94 11.94 0 005.1-5.56A5.96 5.96 0 0012 13.56z"/>
                  </svg>
                  <span className="text-base sm:text-lg font-bold text-[#3448C5]">Cloudinary</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t('howItWorks.subtitle')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">
              {t('howItWorks.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: t('howItWorks.step1.title'),
                description: t('howItWorks.step1.description'),
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: t('howItWorks.step2.title'),
                description: t('howItWorks.step2.description'),
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )
              },
              {
                step: '3',
                title: t('howItWorks.step3.title'),
                description: t('howItWorks.step3.description'),
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )
              }
            ].map((item) => (
              <div key={item.step} className="group">
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-[#1e3a5f] group-hover:bg-[#1e3a5f]/5 transition-colors">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#1e3a5f] mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t('features.subtitle')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">
              {t('features.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: t('features.mobileCatalog.title'),
                desc: t('features.mobileCatalog.description'),
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              },
              {
                title: t('features.customLink.title'),
                desc: t('features.customLink.description'),
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              },
              {
                title: t('features.qrCode.title'),
                desc: t('features.qrCode.description'),
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              },
              {
                title: t('features.categories.title'),
                desc: t('features.categories.description'),
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              },
              {
                title: t('features.directWhatsApp.title'),
                desc: t('features.directWhatsApp.description'),
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              },
              {
                title: t('features.statistics.title'),
                desc: t('features.statistics.description'),
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#1e3a5f] mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-[#1e3a5f] mb-1.5">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t('pricing.subtitle')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">
              {t('pricing.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{t('pricing.free.name')}</h3>
              <p className="text-4xl font-bold text-[#1e3a5f] mb-1">
                $0
              </p>
              <p className="text-gray-400 text-sm mb-6">{t('pricing.forever')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.free.features.products'), t('pricing.free.features.whatsappOrders'), t('pricing.free.features.shareableLink'), t('pricing.free.features.qrCode'), t('pricing.free.features.onePhoto'), t('pricing.free.features.threeCategories')].map((item, i) => (
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
                to={localePath('/register')}
                className="block w-full text-center border-2 border-[#1e3a5f] text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#1e3a5f] hover:text-white transition-all duration-300"
              >
                {t('common:buttons.startFree')}
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] rounded-2xl p-8 text-white relative overflow-hidden md:scale-105 shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              <div className="flex justify-center mb-4">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-4 py-1 rounded-full font-semibold uppercase tracking-wider">
                  {t('pricing.popular')}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('pricing.pro.name')}</h3>
              <p className="text-4xl font-bold mb-1">
                $4.99
              </p>
              <p className="text-[#38bdf8] text-sm mb-6">{t('pricing.perMonth')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.pro.features.products'), t('pricing.pro.features.paymentGateway'), t('pricing.pro.features.coupons'), t('pricing.pro.features.customDomain'), t('pricing.pro.features.multiplePhotos'), t('pricing.pro.features.advancedStats')].map((item, i) => (
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
                to={localePath('/register')}
                className="block w-full text-center bg-white text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#38bdf8] hover:text-white transition-all duration-300"
              >
                {t('common:buttons.tryFree')}
              </Link>
            </div>

            {/* Business */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{t('pricing.business.name')}</h3>
              <p className="text-4xl font-bold text-[#1e3a5f] mb-1">
                $9.99
              </p>
              <p className="text-gray-400 text-sm mb-6">{t('pricing.perMonth')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.business.features.everythingPro'), t('pricing.business.features.unlimitedProducts'), t('pricing.business.features.noBranding'), t('pricing.business.features.ownApp'), t('pricing.business.features.prioritySupport')].map((item, i) => (
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
                to={localePath('/register')}
                className="block w-full text-center border-2 border-[#1e3a5f] text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#1e3a5f] hover:text-white transition-all duration-300"
              >
                {t('common:buttons.tryFree')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* App Promo */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#6366f1]/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#38bdf8]/15 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-5xl mx-auto relative">
          <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="absolute top-1/2 right-[10%] w-20 h-20 bg-white/5 rounded-full" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Left - Text */}
              <div>
                <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-semibold text-white/90 mb-4">
                  {t('appPromo.badge')}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  {t('appPromo.title')}
                </h2>
                <p className="text-white/75 text-base sm:text-lg mb-8">
                  {t('appPromo.subtitle')}
                </p>

                {/* Steps */}
                <div className="space-y-4 mb-8">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{num}</span>
                      </div>
                      <span className="text-white/90 text-sm sm:text-base">{t(`appPromo.step${num}`)}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={localePath('/register')}
                  className="inline-flex items-center gap-2 bg-white text-[#1e3a5f] px-6 py-3 rounded-xl text-sm font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  {t('appPromo.cta')}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Right - App image + store badges */}
              <div className="flex flex-col items-center gap-5">
                <img
                  src="/landingapp.png"
                  alt="App de tu tienda"
                  className="w-full max-w-[256px] h-auto drop-shadow-2xl rounded-2xl"
                />

                {/* Official store badges */}
                <div className="flex items-center gap-1">
                  <img
                    src="/badges/google-play-badge.png"
                    alt="Get it on Google Play"
                    className="h-[50px] w-auto -mr-1"
                  />
                  <img
                    src="/badges/app-store-badge.svg"
                    alt="Download on the App Store"
                    className="h-[34px] w-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t('testimonials.subtitle')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">
              {t('testimonials.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {['1', '2', '3'].map((num) => (
              <div key={num} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">
                  "{t(`testimonials.${num}.quote`)}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {(t(`testimonials.${num}.name`) as string).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e3a5f] text-sm">{t(`testimonials.${num}.name`)}</p>
                    <p className="text-xs text-gray-400">{t(`testimonials.${num}.role`)} · {t(`testimonials.${num}.location`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e3a5f] rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {t('cta.title')}
              </h2>
              <p className="text-white/60 text-base sm:text-lg mb-8 max-w-xl mx-auto">
                {t('cta.subtitle')}
              </p>
              <Link
                to={localePath('/register')}
                className="inline-flex items-center gap-2 bg-white text-[#1e3a5f] px-8 py-3.5 rounded-full text-sm font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                {t('common:buttons.createMyCatalog')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
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
              {t('common:footer.copyright')}
            </p>
            <div className="flex gap-6">
              <Link to={localePath('/blog')} className="text-white/60 hover:text-[#38bdf8] transition text-sm">Blog</Link>
              <a href="#" className="text-white/60 hover:text-[#38bdf8] transition text-sm">{t('common:footer.terms')}</a>
              <Link to={localePath('/privacy')} className="text-white/60 hover:text-[#38bdf8] transition text-sm">{t('common:footer.privacy')}</Link>
              <a href="#" className="text-white/60 hover:text-[#38bdf8] transition text-sm">{t('common:footer.contact')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
