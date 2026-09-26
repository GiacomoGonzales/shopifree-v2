import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Seccion de ShopiChat en la landing (se monta solo con VITE_SHOPICHAT_PUBLIC).
 * Usa las clases slp-* que define Landing.tsx (misma linea visual: bandas con
 * hairlines, marco de navegador y mockup en CSS, sin capturas). Los textos
 * viven en landing.json → shopichat.
 */

interface Benefit { title: string; description: string }
interface MockChat { name: string; preview: string; time: string }

// Un icono por beneficio, en el mismo orden que shopichat.benefits del i18n.
const BENEFIT_ICONS = [
  // Todos los chats en un lugar
  'M8 10h8M8 14h5M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z',
  // Perfil del cliente
  'M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0',
  // Vender desde el chat
  'M3 3h2l3 14h11l3-9H6M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z',
  // Avisos automaticos
  'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  // Asistente IA
  'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z',
]

const AVATAR_COLORS = ['#0284C7', '#7C3AED', '#16A34A', '#B45309']

const WaGlyph = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z" />
  </svg>
)

export default function ShopiChatShowcase({ registerPath }: { registerPath: string }) {
  const { t } = useTranslation('landing')
  const benefits = t('shopichat.benefits', { returnObjects: true }) as Benefit[]
  const chats = t('shopichat.mockup.chats', { returnObjects: true }) as MockChat[]
  const m = (key: string) => t(`shopichat.mockup.${key}`)

  return (
    <section id="shopichat" className="slp-section py-20 lg:py-24" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="slp-container">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-12 lg:gap-14 items-center">
          {/* Texto + beneficios */}
          <div className="slpr">
            <p className="slp-eyebrow">{t('shopichat.badge')}</p>
            <h2 className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
              {t('shopichat.title')}
            </h2>
            <p className="mt-4 text-lg leading-relaxed max-w-lg" style={{ color: 'var(--body)' }}>
              {t('shopichat.subtitle')}
            </p>
            <ul className="mt-8 space-y-5">
              {benefits.map((b, i) => (
                <li key={b.title} className="flex items-start gap-3.5">
                  <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={BENEFIT_ICONS[i] || BENEFIT_ICONS[0]} />
                    </svg>
                  </span>
                  <div>
                    <p className="font-bold text-[0.97rem]">{b.title}</p>
                    <p className="text-[0.9rem] leading-snug mt-0.5" style={{ color: 'var(--body)' }}>{b.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link to={registerPath} className="slp-btn slp-primary">
                {t('shopichat.cta')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            <p className="mt-4 text-[0.82rem] max-w-md" style={{ color: 'var(--muted)' }}>{t('shopichat.note')}</p>
          </div>

          {/* Mockup CSS de la bandeja, en marco de navegador */}
          <div className="slpr relative" style={{ transitionDelay: '.12s' }} aria-hidden="true">
            <div className="slp-browser">
              <div className="slp-browser-bar">
                <span className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }}></span>
                  <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }}></span>
                  <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }}></span>
                </span>
                <span className="slp-url">shopifree.app/dashboard/shopichat</span>
                <span className="w-12"></span>
              </div>

              <div className="flex" style={{ background: '#fff', minHeight: 360 }}>
                {/* Lista de conversaciones */}
                <div className="hidden sm:flex flex-col w-[160px] shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
                  <div className="p-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="rounded-lg px-2.5 py-1.5 text-[0.58rem]" style={{ background: 'var(--soft)', color: 'var(--muted)' }}>{m('search')}</div>
                    <div className="flex gap-1 mt-2">
                      {(['open', 'pending', 'done'] as const).map((k, i) => (
                        <span key={k} className="text-[0.52rem] font-bold rounded-full px-1.5 py-0.5 whitespace-nowrap"
                          style={i === 0 ? { background: '#E0F2FE', color: 'var(--sky-deep)' } : { color: 'var(--muted)' }}>
                          {m(k)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {chats.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 px-2.5 py-2"
                      style={{ background: i === 0 ? '#F0F9FF' : undefined, borderBottom: '1px solid var(--border)' }}>
                      <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[0.55rem] font-extrabold text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {c.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[0.6rem] font-bold truncate">{c.name}</p>
                          <span className="text-[0.48rem] shrink-0" style={{ color: i === 0 ? '#16A34A' : 'var(--muted)' }}>{c.time}</span>
                        </div>
                        <p className="text-[0.54rem] truncate" style={{ color: 'var(--muted)' }}>{c.preview}</p>
                      </div>
                      {i === 0 && <span className="w-3.5 h-3.5 rounded-full shrink-0 text-[0.45rem] font-bold text-white flex items-center justify-center" style={{ background: '#25D366' }}>2</span>}
                    </div>
                  ))}
                </div>

                {/* Conversacion */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-extrabold text-white" style={{ background: AVATAR_COLORS[0] }}>
                      {chats[0]?.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.64rem] font-bold leading-none">{chats[0]?.name}</p>
                      <p className="text-[0.5rem] mt-0.5" style={{ color: '#16A34A' }}>{m('online')}</p>
                    </div>
                    <span className="ml-auto" style={{ color: '#25D366' }}><WaGlyph className="w-3.5 h-3.5" /></span>
                  </div>

                  <div className="flex-1 p-3 space-y-2" style={{ background: '#F4F1EC' }}>
                    {/* Mensaje del cliente */}
                    <div className="max-w-[78%] rounded-lg rounded-tl-sm px-2.5 py-1.5 text-[0.6rem] bg-white" style={{ boxShadow: '0 1px 1px rgba(0,0,0,.06)' }}>
                      {m('msgIn')}
                    </div>
                    {/* Respuesta + tarjeta de producto + link de pago */}
                    <div className="ml-auto max-w-[78%] space-y-1.5">
                      <div className="rounded-lg rounded-tr-sm px-2.5 py-1.5 text-[0.6rem]" style={{ background: '#D9FDD3', boxShadow: '0 1px 1px rgba(0,0,0,.06)' }}>
                        {m('msgOut')}
                      </div>
                      <div className="rounded-lg overflow-hidden flex" style={{ background: '#D9FDD3', boxShadow: '0 1px 1px rgba(0,0,0,.06)' }}>
                        <span className="w-14 shrink-0" style={{ background: 'linear-gradient(135deg,#E9D5C3,#C8A98B)' }} />
                        <div className="px-2 py-1.5 min-w-0">
                          <p className="text-[0.6rem] font-bold truncate">{m('productName')}</p>
                          <p className="text-[0.58rem] font-extrabold" style={{ color: '#16A34A' }}>{m('productPrice')}</p>
                          <p className="text-[0.5rem] mt-0.5" style={{ color: 'var(--sky-deep)' }}>{m('productLink')}</p>
                        </div>
                      </div>
                      <div className="rounded-lg px-2.5 py-1.5 text-[0.58rem] font-semibold" style={{ background: '#D9FDD3', color: 'var(--sky-deep)', boxShadow: '0 1px 1px rgba(0,0,0,.06)' }}>
                        {m('payLink')}
                      </div>
                    </div>
                  </div>

                  {/* Sugerencia de la IA + caja de texto */}
                  <div className="px-3 pt-2 pb-2.5 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="rounded-lg px-2.5 py-1.5 flex items-start gap-1.5" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                      <svg className="w-3 h-3 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="#7C3AED" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={BENEFIT_ICONS[4]} /></svg>
                      <p className="text-[0.56rem] leading-snug"><span className="font-bold" style={{ color: '#7C3AED' }}>{m('aiLabel')} · </span><span style={{ color: 'var(--body)' }}>{m('aiText')}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full px-3 py-1.5 text-[0.56rem]" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>{m('composer')}</div>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--navy)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" /></svg>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Perfil del cliente */}
                <div className="hidden xl:block w-[140px] shrink-0 p-2.5 space-y-2" style={{ borderLeft: '1px solid var(--border)', background: 'var(--soft)' }}>
                  <p className="text-[0.52rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>{m('customer')}</p>
                  <div className="bg-white rounded-lg p-2 text-center" style={{ border: '1px solid var(--border)' }}>
                    <span className="w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[0.6rem] font-extrabold text-white" style={{ background: AVATAR_COLORS[0] }}>
                      {chats[0]?.name.charAt(0)}
                    </span>
                    <p className="text-[0.6rem] font-bold mt-1">{chats[0]?.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white rounded-lg p-1.5" style={{ border: '1px solid var(--border)' }}>
                      <p className="text-[0.72rem] font-extrabold leading-none">4</p>
                      <p className="text-[0.46rem] mt-0.5" style={{ color: 'var(--muted)' }}>{m('orders')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5" style={{ border: '1px solid var(--border)' }}>
                      <p className="text-[0.72rem] font-extrabold leading-none">$186</p>
                      <p className="text-[0.46rem] mt-0.5" style={{ color: 'var(--muted)' }}>{m('spent')}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5" style={{ border: '1px solid var(--border)' }}>
                    <p className="text-[0.48rem]" style={{ color: 'var(--muted)' }}>{m('lastOrder')}</p>
                    <div className="flex items-center justify-between mt-0.5 gap-1">
                      <span className="text-[0.56rem] font-bold">#1038</span>
                      <span className="text-[0.46rem] font-bold rounded-full px-1.5 py-0.5" style={{ background: '#DCFCE7', color: '#16A34A' }}>{m('delivered')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Toast flotante: aviso automatico de pedido */}
            <div className="absolute -bottom-5 left-4 sm:-left-5 bg-white rounded-xl px-3 py-2 flex items-center gap-2.5" style={{ border: '1px solid var(--border)', boxShadow: '0 18px 36px -16px rgba(30,58,95,.3)' }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: '#25D366' }}>
                <WaGlyph className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-extrabold leading-none">{m('notifTitle')}</p>
                <p className="text-[0.58rem] mt-1" style={{ color: 'var(--body)' }}>{m('notifBody')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
