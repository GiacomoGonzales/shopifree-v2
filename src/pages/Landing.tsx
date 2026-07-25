import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'
import LanguageSelector from '../components/common/LanguageSelector'

// Landing rediseñada — dirección B2B premium estilo Stripe (misma línea que la
// landing V2 de Cobrify): fondo blanco, navy de marca, degradado animado sutil
// solo en el hero, bandas alternadas blanco/#F6F9FC con hairlines de 1px,
// sombras teñidas de navy, tipografía Plus Jakarta Sans y reveals discretos.
// Todo el copy sale de i18n (landing + common) — no se tocaron los textos.

const ArrowRight = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
)

const CheckIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
)

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z" />
  </svg>
)

export default function Landing() {
  const { t } = useTranslation(['landing', 'common'])
  const { localePath } = useLanguage()
  const { firebaseUser, store, loading: authLoading } = useAuth()

  // If authenticated, go straight to dashboard (or register if no store yet)
  const authTarget = firebaseUser ? (store ? localePath('/dashboard') : localePath('/register')) : localePath('/login')

  // Reveal discreto al hacer scroll (se desactiva con prefers-reduced-motion)
  useEffect(() => {
    const els = document.querySelectorAll('.slpr')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.classList.add('slpr-in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('slpr-in')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const steps = [
    { n: '1', title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.description') },
    { n: '2', title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.description') },
    { n: '3', title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.description') },
  ]

  const features = [
    {
      title: t('features.mobileCatalog.title'),
      desc: t('features.mobileCatalog.description'),
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    },
    {
      title: t('features.customLink.title'),
      desc: t('features.customLink.description'),
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    },
    {
      title: t('features.qrCode.title'),
      desc: t('features.qrCode.description'),
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>,
    },
    {
      title: t('features.categories.title'),
      desc: t('features.categories.description'),
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
    },
    {
      title: t('features.directWhatsApp.title'),
      desc: t('features.directWhatsApp.description'),
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    },
    {
      title: t('features.statistics.title'),
      desc: t('features.statistics.description'),
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    },
  ]

  const freeFeatures = [
    t('pricing.free.features.products'), t('pricing.free.features.whatsappOrders'),
    t('pricing.free.features.shareableLink'), t('pricing.free.features.qrCode'),
    t('pricing.free.features.onePhoto'), t('pricing.free.features.threeCategories'),
  ]
  const proFeatures = [
    t('pricing.pro.features.products'), t('pricing.pro.features.paymentGateway'),
    t('pricing.pro.features.coupons'), t('pricing.pro.features.customDomain'),
    t('pricing.pro.features.multiplePhotos'), t('pricing.pro.features.advancedStats'),
  ]
  const businessFeatures = [
    t('pricing.business.features.everythingPro'), t('pricing.business.features.unlimitedProducts'),
    t('pricing.business.features.noBranding'), t('pricing.business.features.ownApp'),
    t('pricing.business.features.prioritySupport'),
  ]

  return (
    <div className="slp-root min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .slp-root {
          --navy: #1e3a5f;
          --navy-deep: #16304f;
          --body: #425466;
          --muted: #8898AA;
          --soft: #F6F9FC;
          --border: #E6EBF1;
          --sky: #38bdf8;
          --sky-deep: #0284C7;
          background: #fff;
          color: var(--navy);
          font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        .slp-container { max-width: 73rem; margin: 0 auto; padding-left: 1.5rem; padding-right: 1.5rem; }
        .slp-section { scroll-margin-top: 96px; }
        .slp-eyebrow {
          font-size: .8rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: var(--sky-deep); margin-bottom: 1rem;
        }

        /* ===== Degradado animado del hero (sutil, confinado) ===== */
        .slp-hero-bg { position: absolute; inset: 0 0 auto 0; height: 780px; overflow: hidden; pointer-events: none; }
        .slp-ribbon {
          position: absolute; left: -10%; right: -10%; top: -42%; height: 115%;
          transform: skewY(-8deg); transform-origin: top left;
          background:
            radial-gradient(42% 60% at 18% 42%, rgba(56, 189, 248, .22), transparent 70%),
            radial-gradient(38% 55% at 62% 28%, rgba(14, 165, 233, .16), transparent 70%),
            radial-gradient(46% 62% at 88% 58%, rgba(99, 102, 241, .12), transparent 70%),
            linear-gradient(100deg, #F2F9FF 0%, #EAF6FE 45%, #F3F4FF 100%);
          background-size: 160% 160%;
          animation: slp-mesh 16s ease-in-out infinite alternate;
        }
        .slp-ribbon::after {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(30% 45% at 40% 70%, rgba(34, 211, 238, .14), transparent 70%),
            radial-gradient(26% 40% at 75% 20%, rgba(56, 189, 248, .16), transparent 70%);
          background-size: 170% 170%;
          animation: slp-mesh 22s ease-in-out infinite alternate-reverse;
        }
        @keyframes slp-mesh {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        /* ===== Botones ===== */
        .slp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
          padding: .8rem 1.45rem; border-radius: 999px; font-weight: 600; font-size: .95rem;
          text-decoration: none; transition: background .18s ease, box-shadow .18s ease, transform .18s ease, color .18s ease, border-color .18s ease;
          white-space: nowrap;
        }
        .slp-btn:active { transform: translateY(1px); }
        .slp-primary { background: var(--navy); color: #fff; box-shadow: 0 4px 14px -4px rgba(30, 58, 95, .5); }
        .slp-primary:hover { background: var(--navy-deep); box-shadow: 0 8px 22px -6px rgba(30, 58, 95, .55); transform: translateY(-1px); }
        .slp-secondary { background: #fff; color: var(--navy); border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(30, 58, 95, .08); }
        .slp-secondary:hover { border-color: #C9D4E3; box-shadow: 0 4px 12px rgba(30, 58, 95, .1); transform: translateY(-1px); }
        .slp-ondark { background: #fff; color: var(--navy); }
        .slp-ondark:hover { background: #EAF1FA; transform: translateY(-1px); }

        /* ===== Tarjetas ===== */
        .slp-card {
          background: #fff; border: 1px solid var(--border); border-radius: 14px;
          transition: box-shadow .22s ease, transform .22s ease, border-color .22s ease;
        }
        .slp-card:hover {
          box-shadow: 0 18px 36px -16px rgba(30, 58, 95, .16), 0 4px 10px rgba(30, 58, 95, .05);
          transform: translateY(-3px); border-color: #D8E1EC;
        }
        .slp-icon {
          width: 2.6rem; height: 2.6rem; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: #E0F2FE; color: var(--sky-deep); margin-bottom: 1.1rem;
        }

        /* ===== Marco de navegador (simulaciones del producto) ===== */
        .slp-browser {
          background: #fff; border-radius: 14px; border: 1px solid var(--border); overflow: hidden;
          box-shadow: 0 50px 100px -24px rgba(50, 50, 93, .28), 0 24px 48px -28px rgba(30, 58, 95, .3);
        }
        .slp-browser-bar {
          display: flex; align-items: center; gap: .9rem; padding: .65rem 1rem;
          background: #F6F9FC; border-bottom: 1px solid var(--border);
        }
        .slp-url {
          flex: 1; max-width: 22rem; margin: 0 auto; background: #fff; border: 1px solid var(--border);
          border-radius: 999px; font-size: .72rem; color: var(--body); padding: .28rem .9rem; text-align: center;
        }

        /* ===== Texto degradado del hero ===== */
        .slp-grad {
          background: linear-gradient(92deg, #0EA5E9 0%, #38bdf8 55%, #6366F1 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        /* ===== Reveal ===== */
        .slpr { opacity: 0; transform: translateY(22px); transition: opacity .65s ease, transform .65s cubic-bezier(.2, .7, .2, 1); }
        .slpr-in { opacity: 1; transform: none; }

        /* ===== Marquee sobrio ===== */
        .slp-marquee { overflow: hidden; position: relative; }
        .slp-marquee::before, .slp-marquee::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 7rem; z-index: 1; pointer-events: none;
        }
        .slp-marquee::before { left: 0; background: linear-gradient(90deg, #fff, transparent); }
        .slp-marquee::after { right: 0; background: linear-gradient(-90deg, #fff, transparent); }
        .slp-marquee-track { display: flex; width: max-content; animation: slp-marquee 44s linear infinite; }
        @keyframes slp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .slp-logo { filter: grayscale(1); opacity: .55; transition: filter .25s ease, opacity .25s ease; }
        .slp-logo:hover { filter: none; opacity: 1; }

        @media (prefers-reduced-motion: reduce) {
          .slp-ribbon, .slp-ribbon::after, .slp-marquee-track { animation: none !important; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <header className="fixed top-0 w-full z-40" style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <nav className="slp-container flex items-center justify-between py-3.5">
          <Link to={localePath('/')} className="flex items-center flex-shrink-0">
            <img src="/newlogo.png" alt="Shopifree" className="h-7 sm:h-8" />
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-5">
            <LanguageSelector />
            <Link to={localePath('/blog')} className="hidden md:inline text-[0.93rem] font-semibold transition-colors hover:text-[var(--sky-deep)]" style={{ color: 'var(--body)' }}>
              Blog
            </Link>
            {!authLoading && (
              <Link to={authTarget} className="hidden sm:inline text-[0.93rem] font-semibold transition-colors hover:text-[var(--sky-deep)]" style={{ color: 'var(--navy)' }}>
                {firebaseUser ? t('common:nav.dashboard', 'Mi panel') : t('common:nav.login')}
              </Link>
            )}
            <Link to={localePath('/register')} className="slp-btn slp-primary !py-2.5 !px-4 text-sm">
              <span className="hidden sm:inline">{t('common:nav.createCatalog')}</span>
              <span className="sm:hidden">{t('common:nav.createFree')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative pt-28 lg:pt-36 pb-10">
        <div className="slp-hero-bg" aria-hidden="true">
          <div className="slp-ribbon"></div>
        </div>

        <div className="slp-container relative">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-6 items-center">
            <div className="max-w-2xl">
              <div className="slpr inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 mb-7 text-[0.8rem] font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--body)', boxShadow: '0 1px 3px rgba(30,58,95,.06)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--sky)' }}></span>
                {t('hero.badge')}
              </div>
              <h1 className="slpr font-extrabold leading-[1.04] tracking-tight" style={{ fontSize: 'clamp(2.5rem, 5.6vw, 4.1rem)', transitionDelay: '.07s' }}>
                {t('hero.title')} <span className="slp-grad">{t('hero.titleHighlight')}</span>
              </h1>
              <p className="slpr mt-6 text-lg lg:text-xl leading-relaxed max-w-xl" style={{ color: 'var(--body)', transitionDelay: '.14s' }}>
                {t('hero.subtitle')}
                <span className="font-semibold" style={{ color: 'var(--navy)' }}> {t('hero.noCommissions')}</span>
              </p>
              <div className="slpr mt-9 flex flex-col sm:flex-row gap-3.5" style={{ transitionDelay: '.21s' }}>
                <Link to={localePath('/register')} className="slp-btn slp-primary">
                  {t('common:buttons.createMyCatalog')} <ArrowRight />
                </Link>
                <a href="#como-funciona" className="slp-btn slp-secondary">
                  {t('common:buttons.seeHowItWorks')}
                </a>
              </div>
            </div>

            {/* Mockup de teléfono: catálogo + pedido entrando por WhatsApp */}
            <div className="slpr relative mx-auto lg:mx-0 lg:justify-self-end mt-4 lg:mt-0" style={{ transitionDelay: '.18s' }} aria-hidden="true">
              <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(60% 60% at 50% 45%, rgba(56,189,248,.25), transparent 70%)' }} />

              {/* Marco titanio */}
              <div className="relative z-10" style={{ width: 258, borderRadius: '3.05rem', padding: '1px', background: 'linear-gradient(135deg,#5b5e66 0%,#23262d 18%,#0c0d11 50%,#1a1c21 78%,#3a3d44 100%)', boxShadow: '0 54px 90px -28px rgba(30,58,95,.55), 0 10px 22px -10px rgba(0,0,0,.5)' }}>
                <div style={{ background: '#050608', borderRadius: '3rem', padding: '5px' }}>
                  <div className="relative overflow-hidden" style={{ borderRadius: '2.65rem', background: '#fff' }}>
                    {/* Isla dinámica */}
                    <div className="absolute left-1/2 z-30" style={{ top: '11px', transform: 'translateX(-50%)', width: '84px', height: '24px', borderRadius: '999px', background: '#050608' }} />
                    {/* Reflejo */}
                    <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,0) 30%)' }} />

                    {/* Barra de estado */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1">
                      <span className="text-[0.62rem] font-bold" style={{ color: '#0B1220' }}>9:41</span>
                      <span className="flex items-center gap-1" style={{ color: '#0B1220' }}>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h3v-8H2v8zm5.5 0h3V9h-3v11zm5.5 0h3V4h-3v16zm5.5 0h3v-6h-3v6z"/></svg>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l3.5-4.5c-1-.75-2.2-1.2-3.5-1.2s-2.5.45-3.5 1.2L12 21zm0-18C7.4 3 3.2 4.6 0 7.3l2 2.6C4.7 7.6 8.2 6.3 12 6.3s7.3 1.3 10 3.6l2-2.6C20.8 4.6 16.6 3 12 3zm0 6.6c-3 0-5.8 1-8 2.8l2 2.6c1.6-1.3 3.7-2.1 6-2.1s4.4.8 6 2.1l2-2.6c-2.2-1.8-5-2.8-8-2.8z"/></svg>
                        <svg className="w-4 h-3.5" viewBox="0 0 28 24" fill="currentColor"><rect x="1" y="7" width="21" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6"/><rect x="3.2" y="9.2" width="16.6" height="5.6" rx="1.2"/><path d="M24 10.5v3c1.1-.3 1.9-.8 1.9-1.5s-.8-1.2-1.9-1.5z"/></svg>
                      </span>
                    </div>

                    {/* Cabecera de la tienda */}
                    <div className="px-4 pt-2 pb-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-extrabold" style={{ background: 'linear-gradient(135deg,#38bdf8,#6366F1)' }}>A</span>
                        <div className="leading-tight">
                          <p className="text-[0.72rem] font-extrabold">Amaranto Store</p>
                          <p className="text-[0.55rem]" style={{ color: 'var(--muted)' }}>amaranto.shopifree.app</p>
                        </div>
                      </div>
                    </div>

                    {/* Chips de categorías */}
                    <div className="flex gap-1.5 px-4 pt-2.5 pb-2 flex-wrap">
                      {['Todo', 'Ropa', 'Accesorios', 'Ofertas'].map((c, i) => (
                        <span key={c} className="text-[0.56rem] font-bold rounded-full px-2 py-0.5"
                          style={i === 0 ? { background: 'var(--navy)', color: '#fff' } : { border: '1px solid var(--border)', color: 'var(--body)' }}>
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* Grid de productos */}
                    <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                      {[
                        { g: 'linear-gradient(135deg,#FDE7EF,#FBCFE8)', n: 'Vestido Lino', p: '$ 39.00' },
                        { g: 'linear-gradient(135deg,#E0F2FE,#BAE6FD)', n: 'Blusa Celeste', p: '$ 25.00' },
                        { g: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', n: 'Bolso Tejido', p: '$ 32.00' },
                        { g: 'linear-gradient(135deg,#DCFCE7,#BBF7D0)', n: 'Aretes Flora', p: '$ 12.00' },
                      ].map((p) => (
                        <div key={p.n} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                          <div className="aspect-square relative" style={{ background: p.g }}>
                            <span className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 30% 25%, rgba(255,255,255,.55), transparent 70%)' }} />
                          </div>
                          <div className="p-1.5">
                            <p className="text-[0.6rem] font-bold leading-tight truncate">{p.n}</p>
                            <p className="text-[0.62rem] font-extrabold mt-0.5" style={{ color: 'var(--sky-deep)' }}>{p.p}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botón pedir por WhatsApp */}
                    <div className="px-4 pb-3">
                      <div className="rounded-xl py-2 flex items-center justify-center gap-1.5 text-white text-[0.68rem] font-bold" style={{ background: '#16A34A', boxShadow: '0 8px 18px -8px rgba(22,163,74,.6)' }}>
                        <WhatsAppIcon className="w-3.5 h-3.5" /> {t('mockup.orderViaWhatsApp')}
                      </div>
                    </div>

                    {/* Indicador home */}
                    <div className="flex justify-center pb-2 pt-0.5">
                      <span style={{ width: '92px', height: '4px', borderRadius: '999px', background: '#0B1220', opacity: .85 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Toast flotante: nuevo pedido */}
              <div className="absolute z-20 -left-10 sm:-left-24 top-16 bg-white rounded-2xl p-3 flex items-center gap-2.5" style={{ border: '1px solid var(--border)', boxShadow: '0 20px 40px -16px rgba(30,58,95,.25)' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: '#16A34A' }}>
                  <WhatsAppIcon className="w-4 h-4" />
                </span>
                <div className="leading-tight pr-1">
                  <p className="text-[0.7rem] font-extrabold whitespace-nowrap">{t('mockup.newOrder')}</p>
                  <p className="text-[0.62rem] whitespace-nowrap" style={{ color: 'var(--muted)' }}>{t('mockup.orderMessage')}</p>
                </div>
              </div>

              {/* Chip flotante: visitas */}
              <div className="absolute z-20 -right-8 sm:-right-14 bottom-24 bg-white rounded-2xl px-3 py-2 flex items-center gap-2" style={{ border: '1px solid var(--border)', boxShadow: '0 20px 40px -16px rgba(30,58,95,.25)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5"/></svg>
                <p className="text-[0.66rem] font-extrabold whitespace-nowrap">{t('mockup.visitsToday')}</p>
              </div>
            </div>
          </div>

          {/* Simulación del dashboard (mockup CSS) en marco de navegador */}
          <div className="slpr mt-16 lg:mt-20" style={{ transitionDelay: '.28s' }}>
            <div className="slp-browser max-w-5xl mx-auto">
              <div className="slp-browser-bar">
                <span className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }}></span>
                  <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }}></span>
                  <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }}></span>
                </span>
                <span className="slp-url">shopifree.app/dashboard</span>
                <span className="w-12"></span>
              </div>

              <div aria-hidden="true" className="flex" style={{ background: 'var(--soft)' }}>
                {/* Sidebar del dashboard */}
                <aside className="hidden md:block w-[150px] shrink-0 bg-white" style={{ borderRight: '1px solid var(--border)' }}>
                  <div className="flex items-center px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <img src="/newlogo.png" className="h-4 w-auto object-contain" alt="" />
                  </div>
                  <nav className="p-2 space-y-0.5">
                    {[
                      ['M3 12l9-9 9 9M5 10v10h14V10', 'Inicio', true],
                      ['M20 7l-8-4-8 4v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10', 'Productos', false],
                      ['M3 3h2l3 14h11l3-9H6', 'Pedidos', false],
                      ['M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0', 'Clientes', false],
                      ['M9 19V9m6 10V5M3 19h18', 'Estadísticas', false],
                      ['M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2', 'Apariencia', false],
                      ['M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z', 'Pagos', false],
                      ['M3 9l1-5h16l1 5M4 9v10h16V9M9 19v-5h6v5', 'Mi Negocio', false],
                    ].map(([d, label, active]) => (
                      <div key={label as string} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.66rem] font-semibold"
                        style={active ? { background: '#E0F2FE', color: 'var(--sky-deep)' } : { color: 'var(--body)' }}>
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={d as string} />
                        </svg>
                        <span className="truncate">{label}</span>
                      </div>
                    ))}
                  </nav>
                </aside>

                <div className="flex-1 min-w-0">
                  {/* Cabecera */}
                  <div className="flex items-center justify-between bg-white px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-[0.88rem] font-extrabold leading-none">Inicio</p>
                      <p className="text-[0.62rem] mt-1" style={{ color: 'var(--muted)' }}>Resumen de tu tienda · Hoy</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[0.6rem] font-bold rounded-lg px-2.5 py-1 hidden sm:block" style={{ border: '1px solid var(--border)', color: 'var(--body)' }}>Últimos 7 días ▾</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#8898AA" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[0.58rem] font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#38bdf8,#6366F1)' }}>A</span>
                    </div>
                  </div>

                  <div className="p-3 lg:p-4 space-y-3">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {[
                        { d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.5 12C4.3 7.9 7.9 5 12 5s7.7 2.9 9.5 7c-1.8 4.1-5.4 7-9.5 7s-7.7-2.9-9.5-7z', l: 'Visitas hoy', v: '312', delta: '+18%', up: true, bg: '#E0F2FE', tx: '#0284C7' },
                        { d: 'M3 3h2l3 14h11l3-9H6', l: 'Pedidos', v: '24', delta: '+12%', up: true, bg: '#EDE9FE', tx: '#7C3AED' },
                        { d: 'M12 8c-3.3 0-6 1.3-6 3s2.7 3 6 3 6-1.3 6-3-2.7-3-6-3zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5', l: 'Ingresos', v: '$ 1,240', delta: '+9%', up: true, bg: '#DCFCE7', tx: '#16A34A' },
                        { d: 'M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z', l: 'Pendientes', v: '3', delta: 'por confirmar', up: null, bg: '#FEF3C7', tx: '#B45309' },
                      ].map((k) => (
                        <div key={k.l} className="bg-white rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={k.tx} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={k.d} /></svg>
                            </span>
                            {k.up !== null && (
                              <span className="flex items-center gap-0.5 text-[0.56rem] font-bold" style={{ color: '#16A34A' }}>
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5"/></svg>
                                {k.delta}
                              </span>
                            )}
                          </div>
                          <p className="text-[1.05rem] font-extrabold mt-2 leading-none">{k.v}</p>
                          <p className="text-[0.58rem] mt-1" style={{ color: 'var(--muted)' }}>{k.up === null ? `${k.l} · ${k.delta}` : k.l}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reportes */}
                    <div className="grid lg:grid-cols-[1.55fr_1fr] gap-2.5">
                      {/* Barras: ventas de la semana */}
                      <div className="bg-white rounded-xl p-3.5" style={{ border: '1px solid var(--border)' }}>
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="text-[0.7rem] font-bold">Ventas de la semana</p>
                            <p className="text-[0.55rem]" style={{ color: 'var(--muted)' }}>+18% vs. semana anterior</p>
                          </div>
                          <p className="text-[0.62rem] font-extrabold rounded-md px-2 py-0.5" style={{ background: '#E0F2FE', color: 'var(--sky-deep)' }}>$ 6,480</p>
                        </div>
                        <div className="flex gap-2 pt-5">
                          <div className="flex flex-col justify-between text-right shrink-0 text-[0.5rem] font-semibold" style={{ color: '#A9B6C6', width: 24, height: '5.5rem' }}>
                            <span>$1.5k</span><span>1k</span><span>500</span><span>0</span>
                          </div>
                          <div className="flex-1">
                            <div className="relative" style={{ height: '5.5rem' }}>
                              {[33.3, 66.6, 100].map((p) => (
                                <div key={p} className="absolute left-0 right-0" style={{ bottom: `${p}%`, borderTop: '1px dashed var(--border)' }} />
                              ))}
                              <div className="relative flex items-end gap-2" style={{ height: '100%' }}>
                                {[[46, '690'], [58, '870'], [40, '600'], [70, '1.0k'], [90, '1.4k'], [78, '1.2k'], [36, '540']].map(([pct, val], i) => (
                                  <div key={i} className="relative flex-1 rounded-t-md" style={{ height: `${pct}%`, background: i === 4 ? 'linear-gradient(180deg,#22D3EE,#0284C7)' : 'linear-gradient(180deg,#BAE6FD,#38bdf8)', opacity: i === 4 ? 1 : .85 }}>
                                    <span className="absolute left-1/2 text-[0.5rem] font-bold whitespace-nowrap" style={{ bottom: 'calc(100% + 3px)', transform: 'translateX(-50%)', color: i === 4 ? 'var(--sky-deep)' : '#8898AA' }}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-1">
                              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                <span key={i} className="flex-1 text-center text-[0.5rem] font-semibold" style={{ color: '#8898AA' }}>{d}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Donut: fuentes de tráfico + pedidos recientes */}
                      <div className="space-y-2.5">
                        <div className="bg-white rounded-xl p-3.5" style={{ border: '1px solid var(--border)' }}>
                          <p className="text-[0.7rem] font-bold mb-2.5">Fuentes de tráfico</p>
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0" style={{ width: 58, height: 58 }}>
                              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'conic-gradient(#16A34A 0 46%, #EC4899 46% 80%, #38bdf8 80% 100%)' }}></div>
                              <div className="absolute flex items-center justify-center" style={{ inset: 11, borderRadius: '50%', background: '#fff' }}>
                                <span className="text-[0.58rem] font-extrabold">312</span>
                              </div>
                            </div>
                            <div className="space-y-1 text-[0.6rem] font-semibold">
                              <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#16A34A' }}></span>WhatsApp <span style={{ color: '#8898AA' }}>46%</span></p>
                              <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#EC4899' }}></span>Instagram <span style={{ color: '#8898AA' }}>34%</span></p>
                              <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#38bdf8' }}></span>Directo <span style={{ color: '#8898AA' }}>20%</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-3.5" style={{ border: '1px solid var(--border)' }}>
                          <p className="text-[0.7rem] font-bold mb-2">Pedidos recientes</p>
                          <div className="space-y-1.5">
                            {[
                              { id: '#1042', n: 'María T.', s: 'Entregado', bg: '#DCFCE7', tx: '#16A34A' },
                              { id: '#1041', n: 'Lucía R.', s: 'Pendiente', bg: '#FEF3C7', tx: '#B45309' },
                            ].map((o) => (
                              <div key={o.id} className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--border)' }}>
                                <span className="text-[0.62rem] font-bold truncate">{o.id} · {o.n}</span>
                                <span className="text-[0.54rem] font-bold rounded-full px-2 py-0.5 whitespace-nowrap" style={{ background: o.bg, color: o.tx }}>{o.s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Stats ===== */}
      <section className="py-12 sm:py-16" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="slp-container">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            {[
              ['500+', t('stats.catalogsCreated')],
              ['10k+', t('stats.productsPublished')],
              ['0%', t('stats.commissionPerSale')],
            ].map(([v, l], i) => (
              <div key={l} className="slpr" style={{ transitionDelay: `${i * 0.07}s` }}>
                <p className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-1 sm:mb-2">{v}</p>
                <p className="text-[0.68rem] sm:text-[0.78rem] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Integraciones (marquee sobrio) ===== */}
      <section className="py-14 sm:py-18">
        <p className="text-center text-[0.8rem] font-semibold uppercase tracking-[0.14em] mb-8 px-4" style={{ color: 'var(--muted)' }}>
          {t('integrations.subtitle')}
        </p>
        <div className="slp-marquee" aria-hidden="true">
          <div className="slp-marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-12 sm:gap-16 px-6 sm:px-8">
                <img src="/mercadopago-logo.webp" alt="MercadoPago" className="slp-logo h-9 w-auto rounded-lg" />
                <img src="/stripe-logo.png" alt="Stripe" className="slp-logo h-9 w-auto" />
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25D366" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span className="text-base font-bold" style={{ color: '#25D366' }}>WhatsApp</span>
                </span>
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-7" viewBox="0 0 24 24" fill="#E37400"><path d="M22.84 2.9v18.2c0 .5-.4.9-.84.9-.2 0-.37-.1-.53-.2l-.03-.02c-.13-.12-.24-.3-.28-.48V3.7c0-.5.4-.9.84-.9.46 0 .84.4.84.9v-.8zM17.16 7.8v13.3c0 .5-.4.9-.84.9-.47 0-.84-.4-.84-.9V7.8c0-.5.37-.9.84-.9.44 0 .84.4.84.9zM11.5 12.7v8.4c0 .5-.4.9-.84.9-.47 0-.84-.4-.84-.9v-8.4c0-.5.37-.9.84-.9.44 0 .84.4.84.9zM5.84 17.1v3.98c0 .5-.4.92-.84.92-.47 0-.84-.4-.84-.9V17.1c0-.5.37-.9.84-.9.44 0 .84.4.84.9z"/></svg>
                  <span className="text-base font-bold" style={{ color: '#E37400' }}>Analytics</span>
                </span>
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-7" viewBox="0 0 24 24" fill="#000"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34A6.34 6.34 0 0015.83 15.3V8.75a8.18 8.18 0 003.76.92V6.69z"/></svg>
                  <span className="text-base font-bold text-gray-800">TikTok Pixel</span>
                </span>
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-7" viewBox="0 0 24 24" fill="#0081FB"><path d="M6.915 4.03c-1.968 0-3.412 1.06-4.26 2.605C1.826 8.114 1.5 10.103 1.5 12c0 1.896.326 3.885 1.155 5.365.848 1.545 2.292 2.605 4.26 2.605 1.47 0 2.598-.723 3.403-1.66.718-.836 1.257-1.904 1.682-2.935.425 1.031.964 2.1 1.682 2.936.805.936 1.933 1.659 3.403 1.659 1.968 0 3.412-1.06 4.26-2.605.829-1.48 1.155-3.469 1.155-5.365 0-1.897-.326-3.886-1.155-5.365C20.497 5.09 19.053 4.03 17.085 4.03c-1.47 0-2.598.723-3.403 1.66-.718.835-1.257 1.903-1.682 2.934-.425-1.031-.964-2.099-1.682-2.935C9.513 4.753 8.385 4.03 6.915 4.03z"/></svg>
                  <span className="text-base font-bold" style={{ color: '#0081FB' }}>Meta Pixel</span>
                </span>
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-7" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z"/>
                    <path fill="#34A853" d="M14.499 12.707l2.302 2.302-10.937 6.333 8.635-8.635z"/>
                    <path fill="#FBBC04" d="M17.698 9.508l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 12l2.302-2.492z"/>
                    <path fill="#EA4335" d="M5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
                  </svg>
                  <span className="text-base font-bold text-gray-800">Play Store</span>
                </span>
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-7" viewBox="0 0 24 24" fill="#333"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <span className="text-base font-bold text-gray-800">App Store</span>
                </span>
                <span className="slp-logo flex items-center gap-2 flex-shrink-0">
                  <svg className="h-7" viewBox="0 0 24 24">
                    <path fill="#FFA000" d="M3.89 15.67L6.07 2.35a.46.46 0 01.87-.07l2.26 4.27L3.89 15.67z"/>
                    <path fill="#F57C00" d="M12.56 8.83L10.11 4.2 3.89 15.67l8.67-6.84z"/>
                    <path fill="#FFCA28" d="M17.58 5.27a.46.46 0 01.79.33l1.74 15.07L5.1 22.89a.46.46 0 01-.53-.31L3.89 15.67l8.67-6.84 5.02-3.56z"/>
                  </svg>
                  <span className="text-base font-bold" style={{ color: '#F57C00' }}>Firebase</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Cómo funciona ===== */}
      <section id="como-funciona" className="slp-section py-20 lg:py-24" style={{ background: 'var(--soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="slp-container">
          <div className="slpr max-w-2xl mb-14">
            <p className="slp-eyebrow">{t('howItWorks.subtitle')}</p>
            <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
              {t('howItWorks.title')}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 lg:gap-14">
            {steps.map((s, i) => (
              <div key={s.n} className="slpr" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--navy)' }}>{s.n}</span>
                  <span className="hidden md:block flex-1 h-px" style={{ background: i < 2 ? '#D8E1EC' : 'transparent' }}></span>
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-[0.95rem] leading-relaxed" style={{ color: 'var(--body)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tiendas virtuales (simulaciones con temas distintos) ===== */}
      <section className="slp-section py-20 lg:py-24">
        <div className="slp-container">
          <div className="slpr flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div className="max-w-xl">
              <p className="slp-eyebrow">{t('storesShowcase.subtitle')}</p>
              <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
                {t('storesShowcase.title')}
              </h2>
            </div>
            <p className="max-w-sm text-[0.95rem] leading-relaxed" style={{ color: 'var(--body)' }}>
              {t('storesShowcase.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5" aria-hidden="true">
            {/* Boutique — tema claro rosado */}
            <div className="slpr slp-card overflow-hidden" style={{ borderRadius: 14 }}>
              <div className="slp-browser-bar">
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }}></span>
                </span>
                <span className="slp-url !max-w-[11rem]">flora.shopifree.app</span>
              </div>
              <div style={{ background: '#FFF7F5' }}>
                <div className="text-center pt-5 pb-3">
                  <p className="text-[1.05rem] tracking-[0.28em] font-semibold" style={{ color: '#9F5C68', fontFamily: 'Georgia, serif' }}>FLORA</p>
                  <p className="text-[0.55rem] mt-0.5 tracking-widest uppercase" style={{ color: '#C9A0A9' }}>Moda femenina</p>
                </div>
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  {[
                    { g: 'linear-gradient(135deg,#FBE4E8,#F5C6CF)', n: 'Vestido Dalia', p: '$ 45' },
                    { g: 'linear-gradient(135deg,#F7E8DD,#EFD3BE)', n: 'Falda Lino', p: '$ 32' },
                    { g: 'linear-gradient(135deg,#EFE0EA,#DFC2D6)', n: 'Blusa Seda', p: '$ 38' },
                    { g: 'linear-gradient(135deg,#FDEFE3,#F8DCC4)', n: 'Pañuelo', p: '$ 14' },
                  ].map((p) => (
                    <div key={p.n} className="rounded-lg overflow-hidden bg-white" style={{ border: '1px solid #F3DDE1' }}>
                      <div className="aspect-[4/3] relative" style={{ background: p.g }}>
                        <span className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 30% 25%, rgba(255,255,255,.5), transparent 70%)' }} />
                      </div>
                      <div className="px-1.5 py-1.5 text-center">
                        <p className="text-[0.56rem] leading-tight truncate" style={{ color: '#7A4E58', fontFamily: 'Georgia, serif' }}>{p.n}</p>
                        <p className="text-[0.6rem] font-bold" style={{ color: '#9F5C68' }}>{p.p}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-full py-1.5 text-center text-white text-[0.6rem] font-bold tracking-wide" style={{ background: '#B76E79' }}>
                    {t('mockup.orderViaWhatsApp')}
                  </div>
                </div>
              </div>
            </div>

            {/* Tech — tema oscuro */}
            <div className="slpr slp-card overflow-hidden" style={{ borderRadius: 14, transitionDelay: '.07s' }}>
              <div className="slp-browser-bar">
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }}></span>
                </span>
                <span className="slp-url !max-w-[11rem]">nova.shopifree.app</span>
              </div>
              <div style={{ background: '#0B1220' }}>
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <p className="text-[0.95rem] font-extrabold tracking-tight text-white">NOVA<span style={{ color: '#22D3EE' }}>TECH</span></p>
                  <span className="text-[0.52rem] font-bold rounded-full px-2 py-0.5" style={{ background: 'rgba(34,211,238,.15)', color: '#22D3EE' }}>Envío gratis</span>
                </div>
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  {[
                    { g: 'linear-gradient(135deg,#1E293B,#0F172A)', n: 'Audífonos Pro', p: '$ 59', a: '#22D3EE' },
                    { g: 'linear-gradient(135deg,#172554,#0F172A)', n: 'Smartwatch X', p: '$ 89', a: '#818CF8' },
                    { g: 'linear-gradient(135deg,#134E4A,#0F172A)', n: 'Parlante Mini', p: '$ 35', a: '#2DD4BF' },
                    { g: 'linear-gradient(135deg,#312E81,#0F172A)', n: 'Cargador 65W', p: '$ 22', a: '#A78BFA' },
                  ].map((p) => (
                    <div key={p.n} className="rounded-lg overflow-hidden" style={{ background: '#111A2E', border: '1px solid #1E293B' }}>
                      <div className="aspect-[4/3] relative" style={{ background: p.g }}>
                        <span className="absolute inset-0" style={{ background: `radial-gradient(55% 45% at 70% 30%, ${p.a}33, transparent 70%)` }} />
                      </div>
                      <div className="px-1.5 py-1.5">
                        <p className="text-[0.56rem] font-semibold leading-tight truncate text-white">{p.n}</p>
                        <p className="text-[0.6rem] font-extrabold" style={{ color: p.a }}>{p.p}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg py-1.5 text-center text-[0.6rem] font-bold" style={{ background: '#22D3EE', color: '#0B1220' }}>
                    {t('mockup.orderViaWhatsApp')}
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurante — tema cálido */}
            <div className="slpr slp-card overflow-hidden" style={{ borderRadius: 14, transitionDelay: '.14s' }}>
              <div className="slp-browser-bar">
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }}></span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }}></span>
                </span>
                <span className="slp-url !max-w-[11rem]">sabor.shopifree.app</span>
              </div>
              <div style={{ background: '#FFFBF3' }}>
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[0.95rem] font-extrabold" style={{ color: '#7C2D12' }}>Sabor Criollo</p>
                    <p className="text-[0.55rem]" style={{ color: '#B45309' }}>Cocina de casa · Delivery</p>
                  </div>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] font-extrabold" style={{ background: '#EA580C' }}>S</span>
                </div>
                <div className="px-4 pb-4 space-y-2 pt-1">
                  {[
                    { g: 'linear-gradient(135deg,#FDE68A,#F59E0B)', n: 'Lomo Saltado', d: 'Con papas doradas', p: '$ 9.50' },
                    { g: 'linear-gradient(135deg,#FECACA,#EF4444)', n: 'Ají de Gallina', d: 'Receta de la abuela', p: '$ 8.00' },
                    { g: 'linear-gradient(135deg,#D9F99D,#84CC16)', n: 'Causa Limeña', d: 'Entrada fría', p: '$ 6.50' },
                  ].map((m) => (
                    <div key={m.n} className="flex items-center gap-2.5 bg-white rounded-xl p-2" style={{ border: '1px solid #FDE9D0' }}>
                      <span className="w-10 h-10 rounded-lg shrink-0 relative overflow-hidden" style={{ background: m.g }}>
                        <span className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 30% 25%, rgba(255,255,255,.45), transparent 70%)' }} />
                      </span>
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-[0.62rem] font-bold truncate" style={{ color: '#7C2D12' }}>{m.n}</p>
                        <p className="text-[0.54rem] truncate" style={{ color: '#B45309' }}>{m.d}</p>
                      </div>
                      <span className="text-[0.62rem] font-extrabold whitespace-nowrap" style={{ color: '#EA580C' }}>{m.p}</span>
                    </div>
                  ))}
                  <div className="rounded-xl py-1.5 text-center text-white text-[0.6rem] font-bold" style={{ background: '#EA580C' }}>
                    {t('mockup.orderViaWhatsApp')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Funciones ===== */}
      <section className="slp-section py-20 lg:py-24" style={{ background: 'var(--soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="slp-container">
          <div className="slpr max-w-2xl mb-14">
            <p className="slp-eyebrow">{t('features.subtitle')}</p>
            <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
              {t('features.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={f.title} className="slpr slp-card p-7" style={{ transitionDelay: `${(i % 3) * 0.07}s` }}>
                <div className="slp-icon">{f.icon}</div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-[0.92rem] leading-relaxed" style={{ color: 'var(--body)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Precios ===== */}
      <section id="precios" className="slp-section py-20 lg:py-24">
        <div className="slp-container">
          <div className="slpr max-w-2xl mb-14">
            <p className="slp-eyebrow">{t('pricing.subtitle')}</p>
            <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
              {t('pricing.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {/* Gratis */}
            <div className="slpr slp-card p-8">
              <h3 className="text-lg font-bold mb-4">{t('pricing.free.name')}</h3>
              <p className="text-4xl font-extrabold tracking-tight">$0</p>
              <p className="text-sm mt-1 mb-7" style={{ color: 'var(--muted)' }}>{t('pricing.forever')}</p>
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#E0F2FE' }}>
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span style={{ color: 'var(--body)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to={localePath('/register')} className="slp-btn slp-secondary w-full">
                {t('common:buttons.startFree')}
              </Link>
            </div>

            {/* Pro (destacado) */}
            <div className="slpr relative rounded-[14px] p-8 text-white" style={{ background: 'linear-gradient(160deg, #24466e 0%, var(--navy) 55%, #14283f 100%)', boxShadow: '0 32px 64px -24px rgba(30,58,95,.5)', transitionDelay: '.07s' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 text-white text-xs font-semibold rounded-full uppercase tracking-wider" style={{ background: 'var(--sky-deep)', boxShadow: '0 6px 16px -6px rgba(2,132,199,.7)' }}>
                  {t('pricing.popular')}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-4">{t('pricing.pro.name')}</h3>
              <p className="text-4xl font-extrabold tracking-tight">$4.99</p>
              <p className="text-sm mt-1 mb-3" style={{ color: '#7dd3fc' }}>{t('pricing.perMonth')}</p>
              {/* El registro otorga 7 días de prueba Pro automática — se dice aquí
                  para que la promesa coincida con lo que realmente pasa. */}
              <p className="inline-block bg-white/10 text-white/90 text-xs font-medium px-3 py-1 rounded-full mb-6">
                {t('pricing.trialNote')}
              </p>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(56,189,248,.25)' }}>
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span className="text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to={localePath('/register')} className="slp-btn slp-ondark w-full">
                {t('common:buttons.tryFree')} <ArrowRight />
              </Link>
            </div>

            {/* Business */}
            <div className="slpr slp-card p-8" style={{ transitionDelay: '.14s' }}>
              <h3 className="text-lg font-bold mb-4">{t('pricing.business.name')}</h3>
              <p className="text-4xl font-extrabold tracking-tight">$9.99</p>
              <p className="text-sm mt-1 mb-7" style={{ color: 'var(--muted)' }}>{t('pricing.perMonth')}</p>
              <ul className="space-y-3 mb-8">
                {businessFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#E0F2FE' }}>
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span style={{ color: 'var(--body)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to={localePath('/register')} className="slp-btn slp-secondary w-full">
                {t('common:buttons.tryFree')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== App móvil ===== */}
      <section className="slp-section py-20 lg:py-24" style={{ background: 'var(--soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="slp-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="slpr">
              <p className="slp-eyebrow">{t('appPromo.badge')}</p>
              <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
                {t('appPromo.title')}
              </h2>
              <p className="mt-4 text-lg leading-relaxed max-w-lg" style={{ color: 'var(--body)' }}>
                {t('appPromo.subtitle')}
              </p>
              <div className="mt-7 space-y-4">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white" style={{ background: 'var(--navy)' }}>{num}</span>
                    <span className="text-[0.97rem] font-medium pt-1" style={{ color: 'var(--body)' }}>{t(`appPromo.step${num}`)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
                <Link to={localePath('/register')} className="slp-btn slp-primary">
                  {t('appPromo.cta')} <ArrowRight />
                </Link>
                <div className="flex items-center gap-1">
                  <img src="/badges/google-play-badge.png" alt="Get it on Google Play" className="h-[46px] w-auto -mr-1" />
                  <img src="/badges/app-store-badge.svg" alt="Download on the App Store" className="h-[32px] w-auto" />
                </div>
              </div>
            </div>
            <div className="slpr flex justify-center lg:justify-end" style={{ transitionDelay: '.12s' }}>
              <div className="relative">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(56,189,248,.22), transparent 70%)' }} />
                <img
                  src="/landingapp.png"
                  alt="App de tu tienda"
                  className="relative w-full max-w-[260px] h-auto rounded-2xl"
                  style={{ filter: 'drop-shadow(0 40px 70px rgba(30,58,95,.35))' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Testimonios ===== */}
      <section className="slp-section py-20 lg:py-24">
        <div className="slp-container">
          <div className="slpr max-w-2xl mb-14">
            <p className="slp-eyebrow">{t('testimonials.subtitle')}</p>
            <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
              {t('testimonials.title')}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {(['1', '2', '3'] as const).map((num, i) => (
              <div key={num} className="slpr slp-card p-7 flex flex-col" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[0.94rem] leading-relaxed flex-1 mb-6" style={{ color: 'var(--body)' }}>
                  "{t(`testimonials.${num}.quote`)}"
                </p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: 'var(--navy)' }}>
                    {(t(`testimonials.${num}.name`) as string).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t(`testimonials.${num}.name`)}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{t(`testimonials.${num}.role`)} · {t(`testimonials.${num}.location`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA final (banda navy) ===== */}
      <section className="py-20 lg:py-28" style={{ background: 'var(--navy)' }}>
        <div className="slp-container text-center">
          <h2 className="slpr font-extrabold leading-[1.08] tracking-tight text-white" style={{ fontSize: 'clamp(2.1rem, 4.8vw, 3.4rem)' }}>
            {t('cta.title')}
          </h2>
          <p className="slpr mt-5 text-lg max-w-xl mx-auto" style={{ color: '#9DB2CC', transitionDelay: '.08s' }}>
            {t('cta.subtitle')}
          </p>
          <div className="slpr mt-9 flex justify-center" style={{ transitionDelay: '.16s' }}>
            <Link to={localePath('/register')} className="slp-btn slp-ondark">
              {t('common:buttons.createMyCatalog')} <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-white" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="slp-container">
          <div className="py-12 grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
            <div>
              <img src="/newlogo.png" alt="Shopifree" className="h-8 mb-4" />
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--body)' }}>
                {t('hero.subtitle')}
              </p>
            </div>
            <div>
              <h4 className="text-[0.78rem] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--muted)' }}>{t('footer.product')}</h4>
              <ul className="space-y-2.5 text-sm font-medium" style={{ color: 'var(--body)' }}>
                <li><Link to={localePath('/register')} className="hover:text-[var(--sky-deep)] transition-colors">{t('common:nav.createCatalog')}</Link></li>
                <li><Link to={authTarget} className="hover:text-[var(--sky-deep)] transition-colors">{t('common:nav.login')}</Link></li>
                <li><Link to={localePath('/blog')} className="hover:text-[var(--sky-deep)] transition-colors">Blog</Link></li>
                <li><a href="#precios" className="hover:text-[var(--sky-deep)] transition-colors">{t('pricing.title')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[0.78rem] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--muted)' }}>{t('footer.legal')}</h4>
              <ul className="space-y-2.5 text-sm font-medium" style={{ color: 'var(--body)' }}>
                <li><a href="#" className="hover:text-[var(--sky-deep)] transition-colors">{t('common:footer.terms')}</a></li>
                <li><Link to={localePath('/privacy')} className="hover:text-[var(--sky-deep)] transition-colors">{t('common:footer.privacy')}</Link></li>
                <li><a href="#" className="hover:text-[var(--sky-deep)] transition-colors">{t('common:footer.contact')}</a></li>
              </ul>
            </div>
          </div>
          <div className="py-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
            <p>{t('common:footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
