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
      <section className="py-12 sm:py-16 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <p className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">500+</p>
              <p className="text-[#38bdf8] text-xs sm:text-base">{t('stats.catalogsCreated')}</p>
            </div>
            <div>
              <p className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">10k+</p>
              <p className="text-[#38bdf8] text-xs sm:text-base">{t('stats.productsPublished')}</p>
            </div>
            <div>
              <p className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">0%</p>
              <p className="text-[#38bdf8] text-xs sm:text-base">{t('stats.commissionPerSale')}</p>
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
              {t('howItWorks.title')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: t('howItWorks.step1.title'),
                description: t('howItWorks.step1.description'),
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: t('howItWorks.step2.title'),
                description: t('howItWorks.step2.description'),
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )
              },
              {
                step: '3',
                title: t('howItWorks.step3.title'),
                description: t('howItWorks.step3.description'),
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
              {t('features.title')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: t('features.mobileCatalog.title'),
                desc: t('features.mobileCatalog.description'),
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              },
              {
                title: t('features.customLink.title'),
                desc: t('features.customLink.description'),
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              },
              {
                title: t('features.qrCode.title'),
                desc: t('features.qrCode.description'),
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              },
              {
                title: t('features.categories.title'),
                desc: t('features.categories.description'),
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              },
              {
                title: t('features.directWhatsApp.title'),
                desc: t('features.directWhatsApp.description'),
                icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              },
              {
                title: t('features.statistics.title'),
                desc: t('features.statistics.description'),
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
              {t('pricing.title')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/50 hover:border-[#38bdf8]/30 transition-colors shadow-lg shadow-gray-200/50">
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
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] rounded-3xl p-8 text-white relative overflow-hidden transform md:scale-105 shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#38bdf8]/20 rounded-full blur-3xl"></div>
              <div className="flex justify-center mb-4">
                <span className="bg-[#38bdf8] text-white text-sm px-4 py-1 rounded-full font-medium shadow-lg">
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
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/50 hover:border-[#38bdf8]/30 transition-colors shadow-lg shadow-gray-200/50">
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{t('pricing.business.name')}</h3>
              <p className="text-4xl font-bold text-[#1e3a5f] mb-1">
                $9.99
              </p>
              <p className="text-gray-400 text-sm mb-6">{t('pricing.perMonth')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.business.features.everythingPro'), t('pricing.business.features.unlimitedProducts'), t('pricing.business.features.noBranding'), t('pricing.business.features.prioritySupport')].map((item, i) => (
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

      {/* Testimonials */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-[#38bdf8]/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-[#a78bfa]/15 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1e3a5f] mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {['1', '2', '3'].map((num) => (
              <div key={num} className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg shadow-gray-200/30 hover:shadow-xl hover:border-[#38bdf8]/30 transition-all duration-300 flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 leading-relaxed flex-1 mb-6">
                  "{t(`testimonials.${num}.quote`)}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8] to-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(t(`testimonials.${num}.name`) as string).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1e3a5f] text-sm">{t(`testimonials.${num}.name`)}</p>
                    <p className="text-xs text-gray-500">{t(`testimonials.${num}.role`)} · {t(`testimonials.${num}.location`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-r from-[#1e3a5f] via-[#2d6cb5] to-[#38bdf8] relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white/80 mb-10">
            {t('cta.subtitle')}
          </p>
          <Link
            to={localePath('/register')}
            className="inline-flex items-center gap-2 bg-white text-[#1e3a5f] px-10 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            {t('common:buttons.createMyCatalog')}
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
