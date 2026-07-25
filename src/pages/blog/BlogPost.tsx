import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'
import { blogPosts } from './blogData'
import { useLanguage } from '../../hooks/useLanguage'

const CATEGORY_LABELS: Record<string, string> = {
  'Primeros pasos': 'Primeros pasos',
  'Vender mas': 'Vender más',
  'Gestion': 'Gestión',
  'Comparativas': 'Comparativas',
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${y}`
}

/** Convierte un titulo en un id usable como ancla (sin tildes ni simbolos). */
function slugifyHeading(text: string) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Extrae el texto plano de los children que entrega react-markdown. */
function toText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(toText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return toText((children as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { localePath } = useLanguage()

  const post = blogPosts.find(p => p.slug === slug)

  // Indice del articulo, armado desde los encabezados de nivel 2 del markdown.
  const toc = useMemo(() => {
    if (!post) return []
    return [...post.content.matchAll(/^##\s+(.+)$/gm)]
      .map(m => m[1].trim())
      .map(title => ({ title, id: slugifyHeading(title) }))
  }, [post])

  // Relacionados: primero los declarados a mano, luego se completa con articulos
  // de la misma categoria y, si aun falta, con los que comparten tags.
  const related = useMemo(() => {
    if (!post) return []
    const picked: typeof blogPosts = []
    const add = (p: typeof blogPosts[number]) => {
      if (p.slug !== post.slug && !picked.some(x => x.slug === p.slug)) picked.push(p)
    }
    post.relatedPosts?.forEach(s => { const p = blogPosts.find(x => x.slug === s); if (p) add(p) })
    blogPosts.filter(p => p.category === post.category).forEach(add)
    blogPosts.filter(p => p.tags.some(t => post.tags.includes(t))).forEach(add)
    return picked.slice(0, 4)
  }, [post])

  if (!post) {
    return <Navigate to={localePath('/blog')} replace />
  }

  const canonical = `https://shopifree.app/es/blog/${post.slug}`

  return (
    <>
      <Helmet>
        <title>{post.title} | Blog Shopifree</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.tags.join(', ')} />
        <link rel="canonical" href={canonical} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:image" content={post.image} />
        <meta property="og:url" content={canonical} />
        <meta property="article:published_time" content={post.date} />
        {post.updated && <meta property="article:modified_time" content={post.updated} />}
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={post.image} />
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
          /* El ancla salta debajo del header fijo */
          .blog-article h2, .blog-article h3 { scroll-margin-top: 90px; }
          .blog-toc a { display: block; padding: .3rem 0 .3rem .85rem; border-left: 2px solid var(--border); color: var(--body); font-size: .85rem; line-height: 1.35; transition: color .15s ease, border-color .15s ease; }
          .blog-toc a:hover { color: var(--sky); border-left-color: var(--sky); }
        `}</style>

        {/* Header — mismo que /blog */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <Link to={localePath('/')} className="flex items-center">
              <img src="/newlogo.png" alt="Shopifree" className="h-7 sm:h-8" />
            </Link>
            <div className="flex items-center gap-5">
              <Link to={localePath('/blog')} className="hidden sm:inline text-[0.92rem] font-semibold transition-colors hover:text-[var(--sky)]" style={{ color: 'var(--body)' }}>
                Blog
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

        {/* Cabecera del articulo */}
        <section className="pt-10 pb-8" style={{ background: 'var(--soft)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav aria-label="Ruta" className="mb-6">
              <ol className="flex items-center gap-2 text-[0.82rem]" style={{ color: 'var(--muted)' }}>
                <li><Link to={localePath('/')} className="hover:text-[var(--sky)]">Inicio</Link></li>
                <li>/</li>
                <li><Link to={localePath('/blog')} className="hover:text-[var(--sky)]">Blog</Link></li>
                <li>/</li>
                <li className="truncate max-w-[180px] sm:max-w-none" style={{ color: 'var(--body)' }}>{post.title}</li>
              </ol>
            </nav>

            <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--sky)' }}>
              {CATEGORY_LABELS[post.category] ?? post.category}
            </p>
            <h1 className="font-extrabold leading-[1.12] tracking-tight max-w-3xl" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.9rem)' }}>
              {post.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed max-w-2xl" style={{ color: 'var(--body)' }}>
              {post.description}
            </p>
            <div className="mt-6 flex items-center gap-3 text-[0.85rem]" style={{ color: 'var(--muted)' }}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[0.7rem] font-extrabold" style={{ background: 'var(--navy)' }}>
                {post.author.charAt(0)}
              </span>
              <span style={{ color: 'var(--body)' }} className="font-semibold">{post.author}</span>
              <span>·</span>
              <span>{formatDate(post.date)}</span>
              <span>·</span>
              <span>{post.readTime} min de lectura</span>
              {post.updated && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="w-full sm:w-auto">Actualizado el {formatDate(post.updated)}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Cuerpo: articulo + barra lateral */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10 lg:gap-14 items-start">
            {/* Articulo */}
            <article className="min-w-0">
              <div className="rounded-2xl overflow-hidden mb-9" style={{ boxShadow: '0 24px 48px -24px rgba(30,58,95,.3)' }}>
                <img src={post.image} alt={post.title} className="w-full aspect-video object-cover" />
              </div>

              <div className="blog-article">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 id={slugifyHeading(toText(children))} className="text-3xl font-extrabold tracking-tight mt-10 mb-4">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 id={slugifyHeading(toText(children))} className="text-[1.6rem] font-extrabold tracking-tight mt-11 mb-4">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 id={slugifyHeading(toText(children))} className="text-xl font-bold mt-8 mb-3">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="leading-[1.75] mb-5 text-[1.02rem]" style={{ color: 'var(--body)' }}>{children}</p>
                    ),
                    ul: ({ children }) => <ul className="list-disc pl-6 my-5 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 my-5 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="leading-[1.7] text-[1.02rem]" style={{ color: 'var(--body)' }}>{children}</li>,
                    strong: ({ children }) => <strong className="font-bold" style={{ color: 'var(--navy)' }}>{children}</strong>,
                    a: ({ href, children }) => (
                      <a href={href} className="font-semibold underline underline-offset-2" style={{ color: 'var(--sky)' }}>{children}</a>
                    ),
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 rounded text-[0.88em] font-semibold" style={{ background: 'var(--soft)', border: '1px solid var(--border)', color: 'var(--navy)' }}>{children}</code>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-7 rounded-r-xl py-4 pr-5 pl-5" style={{ borderLeft: '3px solid var(--sky)', background: 'var(--soft)' }}>
                        <div className="[&>p]:mb-0 [&>p]:text-[0.98rem]">{children}</div>
                      </blockquote>
                    ),
                    hr: () => <hr className="my-10" style={{ borderColor: 'var(--border)' }} />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-7">
                        <table className="min-w-full text-left rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead style={{ background: 'var(--soft)' }}>{children}</thead>,
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-sm font-bold" style={{ borderBottom: '1px solid var(--border)' }}>{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--body)', borderBottom: '1px solid var(--border)' }}>{children}</td>
                    ),
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-10 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
                {post.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 text-[0.75rem] font-semibold rounded-full" style={{ background: 'var(--soft)', color: 'var(--body)', border: '1px solid var(--border)' }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-10 p-8 rounded-2xl text-center" style={{ background: 'var(--navy)' }}>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-3">
                  ¿Listo para crear tu tienda online?
                </h2>
                <p className="mb-6" style={{ color: '#9DB2CC' }}>
                  Empieza gratis hoy. Sin comisiones, sin complicaciones.
                </p>
                <Link
                  to={localePath('/register')}
                  className="inline-block px-7 py-3.5 bg-white rounded-full font-semibold transition-transform hover:-translate-y-0.5"
                  style={{ color: 'var(--navy)' }}
                >
                  Crear mi tienda gratis
                </Link>
              </div>
            </article>

            {/* Barra lateral */}
            <aside className="lg:sticky lg:top-24 space-y-8">
              {toc.length > 1 && (
                <nav className="blog-toc" aria-label="Contenido del artículo">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--muted)' }}>
                    En este artículo
                  </p>
                  <div className="space-y-0.5">
                    {toc.map(h => (
                      <a key={h.id} href={`#${h.id}`}>{h.title}</a>
                    ))}
                  </div>
                </nav>
              )}

              {related.length > 0 && (
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--muted)' }}>
                    Seguir leyendo
                  </p>
                  <div className="space-y-4">
                    {related.map(r => (
                      <Link key={r.slug} to={localePath(`/blog/${r.slug}`)} className="flex gap-3 group">
                        <img
                          src={r.image}
                          alt=""
                          loading="lazy"
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                          style={{ border: '1px solid var(--border)' }}
                        />
                        <span className="min-w-0">
                          <span className="block text-[0.68rem] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--sky)' }}>
                            {CATEGORY_LABELS[r.category] ?? r.category}
                          </span>
                          <span className="block text-[0.85rem] font-semibold leading-snug line-clamp-3 transition-colors group-hover:text-[var(--sky)]">
                            {r.title}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl p-5" style={{ background: 'var(--soft)', border: '1px solid var(--border)' }}>
                <p className="font-bold mb-1.5">Crea tu tienda gratis</p>
                <p className="text-[0.85rem] leading-relaxed mb-4" style={{ color: 'var(--body)' }}>
                  Catálogo online y pedidos por WhatsApp en minutos. Sin comisiones.
                </p>
                <Link
                  to={localePath('/register')}
                  className="block text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--navy)' }}
                >
                  Empezar gratis
                </Link>
              </div>
            </aside>
          </div>
        </div>

        {/* Mas articulos */}
        {related.length > 0 && (
          <section className="py-14" style={{ background: 'var(--soft)', borderTop: '1px solid var(--border)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-end justify-between mb-8">
                <h2 className="text-2xl font-extrabold tracking-tight">Artículos relacionados</h2>
                <Link to={localePath('/blog')} className="text-[0.9rem] font-semibold hover:underline" style={{ color: 'var(--sky)' }}>
                  Ver todos
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {related.map(r => (
                  <Link key={r.slug} to={localePath(`/blog/${r.slug}`)} className="blog-card overflow-hidden group flex flex-col">
                    <div className="aspect-video overflow-hidden">
                      <img src={r.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-[0.66rem] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--sky)' }}>
                        {CATEGORY_LABELS[r.category] ?? r.category}
                      </p>
                      <h3 className="text-[0.95rem] font-bold leading-snug line-clamp-3 transition-colors group-hover:text-[var(--sky)]">
                        {r.title}
                      </h3>
                      <p className="text-[0.75rem] mt-auto pt-3" style={{ color: 'var(--muted)' }}>
                        {r.readTime} min de lectura
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 bg-white" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            © {new Date().getFullYear()} Shopifree. Todos los derechos reservados.
          </div>
        </footer>
      </div>

      {/* JSON-LD Article Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.description,
          "image": post.image,
          "datePublished": post.date,
          "dateModified": post.updated ?? post.date,
          "articleSection": post.category,
          "author": { "@type": "Person", "name": post.author },
          "publisher": {
            "@type": "Organization",
            "name": "Shopifree",
            "logo": { "@type": "ImageObject", "url": "https://shopifree.app/newlogo.png" }
          },
          "mainEntityOfPage": { "@type": "WebPage", "@id": canonical }
        })}
      </script>
    </>
  )
}
