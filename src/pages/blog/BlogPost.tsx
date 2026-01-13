import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'
import { blogPosts } from './blogData'
import { useLanguage } from '../../hooks/useLanguage'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { localePath } = useLanguage()

  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return <Navigate to={localePath('/blog')} replace />
  }

  // Get related posts (same tags, excluding current)
  const relatedPosts = blogPosts
    .filter(p => p.slug !== slug && p.tags.some(tag => post.tags.includes(tag)))
    .slice(0, 3)

  return (
    <>
      <Helmet>
        <title>{post.title} | Blog Shopifree</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.tags.join(', ')} />
        <link rel="canonical" href={`https://shopifree.app/es/blog/${post.slug}`} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:image" content={post.image} />
        <meta property="og:url" content={`https://shopifree.app/es/blog/${post.slug}`} />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={post.image} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#f0f7ff] to-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to={localePath('/')} className="flex items-center gap-2">
                <img src="/newlogo.png" alt="Shopifree" className="h-8" />
                <span className="font-bold text-[#1e3a5f]">Shopifree</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  to={localePath('/blog')}
                  className="text-sm text-gray-600 hover:text-[#1e3a5f] transition-colors"
                >
                  Blog
                </Link>
                <Link
                  to={localePath('/register')}
                  className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Crear tienda gratis
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Article */}
        <article className="py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <ol className="flex items-center gap-2 text-sm text-gray-500">
                <li>
                  <Link to={localePath('/')} className="hover:text-[#2d6cb5]">Inicio</Link>
                </li>
                <li>/</li>
                <li>
                  <Link to={localePath('/blog')} className="hover:text-[#2d6cb5]">Blog</Link>
                </li>
                <li>/</li>
                <li className="text-gray-700 truncate max-w-[200px]">{post.title}</li>
              </ol>
            </nav>

            {/* Header */}
            <header className="mb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#f0f7ff] text-[#2d6cb5] text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{post.date}</span>
                <span>·</span>
                <span>{post.readTime} min de lectura</span>
                <span>·</span>
                <span>Por {post.author}</span>
              </div>
            </header>

            {/* Featured Image */}
            <div className="aspect-video rounded-2xl overflow-hidden mb-8 shadow-lg">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-[#1e3a5f] mt-8 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-bold text-[#1e3a5f] mt-10 mb-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-bold text-[#1e3a5f] mt-8 mb-3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 my-4 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 my-4 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-[#1e3a5f]">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-[#2d6cb5] hover:underline">{children}</a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-[#38bdf8] pl-4 my-4 italic text-gray-600">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-8 border-gray-200" />
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-[#f0f7ff]">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#1e3a5f] border-b border-gray-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">
                      {children}
                    </td>
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* CTA Box */}
            <div className="mt-12 p-6 sm:p-8 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] rounded-2xl text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Listo para crear tu tienda online?
              </h3>
              <p className="text-white/80 mb-6">
                Empieza gratis hoy. Sin comisiones, sin complicaciones.
              </p>
              <Link
                to={localePath('/register')}
                className="inline-block px-8 py-4 bg-white text-[#1e3a5f] rounded-xl font-bold hover:shadow-xl transition-all"
              >
                Crear mi tienda gratis
              </Link>
            </div>

            {/* Author */}
            <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] flex items-center justify-center text-white font-bold text-xl">
                {post.author.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-[#1e3a5f]">{post.author}</p>
                <p className="text-sm text-gray-600">Equipo Shopifree</p>
              </div>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-12 bg-white border-t border-gray-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">
                Articulos relacionados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {relatedPosts.map(related => (
                  <Link
                    key={related.slug}
                    to={localePath(`/blog/${related.slug}`)}
                    className="group"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden mb-3">
                      <img
                        src={related.image}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="font-semibold text-[#1e3a5f] group-hover:text-[#2d6cb5] transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 bg-[#1e3a5f]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-white/60 text-sm">
              {new Date().getFullYear()} Shopifree. Todos los derechos reservados.
            </p>
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
          "dateModified": post.date,
          "author": {
            "@type": "Person",
            "name": post.author
          },
          "publisher": {
            "@type": "Organization",
            "name": "Shopifree",
            "logo": {
              "@type": "ImageObject",
              "url": "https://shopifree.app/newlogo.png"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://shopifree.app/es/blog/${post.slug}`
          }
        })}
      </script>
    </>
  )
}
