import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogPosts } from './blogData'
import { useLanguage } from '../../hooks/useLanguage'

// Orden en que se muestran los filtros. 'Todos' es el estado inicial.
const CATEGORIES = ['Todos', 'Primeros pasos', 'Vender mas', 'Gestion', 'Comparativas'] as const

// Etiquetas con tilde para la UI; el dato guardado va sin tilde para no
// arrastrar problemas de comparacion entre archivos.
const CATEGORY_LABELS: Record<string, string> = {
  'Todos': 'Todos',
  'Primeros pasos': 'Primeros pasos',
  'Vender mas': 'Vender más',
  'Gestion': 'Gestión',
  'Comparativas': 'Comparativas',
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d} de ${meses[m - 1]} de ${y}`
}

export default function BlogList() {
  const { localePath } = useLanguage()
  const [category, setCategory] = useState<string>('Todos')
  const [query, setQuery] = useState('')

  // Mas reciente primero; el primero de la lista es el destacado.
  const sorted = useMemo(
    () => [...blogPosts].sort((a, b) => b.date.localeCompare(a.date)),
    []
  )
  const featured = sorted[0]

  const counts = useMemo(() => {
    const c: Record<string, number> = { Todos: blogPosts.length }
    blogPosts.forEach(p => { c[p.category] = (c[p.category] || 0) + 1 })
    return c
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter(p => {
      if (category !== 'Todos' && p.category !== category) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    })
  }, [sorted, category, query])

  // El destacado solo encabeza la vista sin filtrar: al filtrar o buscar, el
  // usuario espera ver todos los resultados en la grilla.
  const showFeatured = category === 'Todos' && !query.trim()
  const gridPosts = showFeatured ? filtered.filter(p => p.slug !== featured.slug) : filtered

  return (
    <>
      <Helmet>
        <title>Blog | Shopifree - Tips para Vender Online</title>
        <meta name="description" content="Aprende a vender online con nuestros articulos. Tips de ecommerce, marketing digital, WhatsApp Business y emprendimiento." />
        <meta name="keywords" content="blog ecommerce, como vender online, tips tienda online, marketing digital, whatsapp business" />
        <link rel="canonical" href="https://shopifree.app/es/blog" />
      </Helmet>

      <div className="blog-root min-h-screen">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .blog-root {
            --navy: #1e3a5f; --body: #425466; --muted: #8898AA;
            --soft: #F6F9FC; --border: #E6EBF1; --sky: #0284C7;
            background: #fff; color: var(--navy);
            font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .blog-card {
            background: #fff; border: 1px solid var(--border); border-radius: 14px;
            transition: box-shadow .22s ease, transform .22s ease, border-color .22s ease;
          }
          .blog-card:hover {
            box-shadow: 0 18px 36px -16px rgba(30,58,95,.16), 0 4px 10px rgba(30,58,95,.05);
            transform: translateY(-3px); border-color: #D8E1EC;
          }
          .blog-chip {
            border: 1px solid var(--border); background: #fff; color: var(--body);
            border-radius: 999px; padding: .45rem 1rem; font-size: .85rem; font-weight: 600;
            transition: all .18s ease; white-space: nowrap;
          }
          .blog-chip:hover { border-color: #C9D4E3; color: var(--navy); }
          .blog-chip[data-active="true"] { background: var(--navy); border-color: var(--navy); color: #fff; }
        `}</style>

        {/* Header */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <Link to={localePath('/')} className="flex items-center">
              <img src="/newlogo.png" alt="Shopifree" className="h-7 sm:h-8" />
            </Link>
            <div className="flex items-center gap-5">
              <Link to={localePath('/')} className="hidden sm:inline text-[0.92rem] font-semibold transition-colors hover:text-[var(--sky)]" style={{ color: 'var(--body)' }}>
                Inicio
              </Link>
              <Link
                to={localePath('/register')}
                className="px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--navy)', boxShadow: '0 4px 14px -4px rgba(30,58,95,.5)' }}
              >
                Crear tienda gratis
              </Link>
            </div>
          </div>
        </header>

        {/* Hero + buscador */}
        <section className="pt-14 pb-10" style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-[0.8rem] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--sky)' }}>
              Blog
            </p>
            <h1 className="font-extrabold leading-tight tracking-tight mb-4" style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)' }}>
              Aprende a vender online
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl mb-8" style={{ color: 'var(--body)' }}>
              Guías prácticas de ecommerce, pagos, marketing y gestión para que tu negocio crezca.
            </p>

            <div className="relative max-w-md">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#8898AA" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar artículos..."
                aria-label="Buscar artículos"
                className="w-full rounded-full py-3 pl-11 pr-4 text-[0.95rem] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(2,132,199,.15)]"
                style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--navy)' }}
              />
            </div>
          </div>
        </section>

        {/* Filtros por categoría */}
        <section className="py-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex gap-2.5 overflow-x-auto pb-1" role="tablist" aria-label="Categorías">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={category === c}
                  data-active={category === c}
                  onClick={() => setCategory(c)}
                  className="blog-chip"
                >
                  {CATEGORY_LABELS[c]}
                  <span className="ml-1.5 font-medium" style={{ opacity: .6 }}>{counts[c] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Artículo destacado */}
        {showFeatured && (
          <section className="py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <Link to={localePath(`/blog/${featured.slug}`)} className="blog-card block overflow-hidden group">
                <div className="grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto md:min-h-[320px] overflow-hidden">
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-7 sm:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] rounded-full px-3 py-1" style={{ background: '#E0F2FE', color: 'var(--sky)' }}>
                        Destacado
                      </span>
                      <span className="text-[0.8rem]" style={{ color: 'var(--muted)' }}>
                        {CATEGORY_LABELS[featured.category] ?? featured.category}
                      </span>
                    </div>
                    <h2 className="font-extrabold leading-tight tracking-tight mb-3" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
                      {featured.title}
                    </h2>
                    <p className="text-[0.98rem] leading-relaxed mb-5" style={{ color: 'var(--body)' }}>
                      {featured.description}
                    </p>
                    <p className="text-[0.82rem]" style={{ color: 'var(--muted)' }}>
                      {formatDate(featured.date)} · {featured.readTime} min de lectura
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Grilla de artículos */}
        <section className={showFeatured ? 'pb-16' : 'py-12'}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {query.trim() && (
              <p className="text-[0.9rem] mb-6" style={{ color: 'var(--body)' }}>
                {filtered.length === 0
                  ? <>No encontramos artículos para <strong>{query}</strong>.</>
                  : <>{filtered.length} {filtered.length === 1 ? 'artículo' : 'artículos'} para <strong>{query}</strong></>}
              </p>
            )}

            {gridPosts.length === 0 && !query.trim() && (
              <p className="text-[0.95rem]" style={{ color: 'var(--body)' }}>
                Todavía no hay artículos en esta categoría.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridPosts.map(post => (
                <Link
                  key={post.slug}
                  to={localePath(`/blog/${post.slug}`)}
                  className="blog-card overflow-hidden group flex flex-col"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'var(--sky)' }}>
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </p>
                    <h2 className="font-bold leading-snug mb-2 transition-colors group-hover:text-[var(--sky)]">
                      {post.title}
                    </h2>
                    <p className="text-[0.88rem] leading-relaxed line-clamp-2 mb-4" style={{ color: 'var(--body)' }}>
                      {post.description}
                    </p>
                    <p className="text-[0.78rem] mt-auto" style={{ color: 'var(--muted)' }}>
                      {formatDate(post.date)} · {post.readTime} min
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20" style={{ background: 'var(--navy)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-extrabold tracking-tight text-white mb-4" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}>
              ¿Listo para empezar tu tienda online?
            </h2>
            <p className="mb-8 text-lg" style={{ color: '#9DB2CC' }}>
              Crea tu tienda gratis en minutos. Sin comisiones, sin complicaciones.
            </p>
            <Link
              to={localePath('/register')}
              className="inline-block px-8 py-3.5 bg-white rounded-full font-semibold transition-transform hover:-translate-y-0.5"
              style={{ color: 'var(--navy)' }}
            >
              Crear mi tienda gratis
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-white" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            © {new Date().getFullYear()} Shopifree. Todos los derechos reservados.
          </div>
        </footer>
      </div>
    </>
  )
}
