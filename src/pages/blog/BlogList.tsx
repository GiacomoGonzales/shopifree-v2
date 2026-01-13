import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogPosts } from './blogData'
import { useLanguage } from '../../hooks/useLanguage'

export default function BlogList() {
  const { localePath } = useLanguage()

  return (
    <>
      <Helmet>
        <title>Blog | Shopifree - Tips para Vender Online</title>
        <meta name="description" content="Aprende a vender online con nuestros articulos. Tips de ecommerce, marketing digital, WhatsApp Business y emprendimiento." />
        <meta name="keywords" content="blog ecommerce, como vender online, tips tienda online, marketing digital, whatsapp business" />
        <link rel="canonical" href="https://shopifree.app/es/blog" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#f0f7ff] to-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to={localePath('/')} className="flex items-center gap-2">
                <img src="/newlogo.png" alt="Shopifree" className="h-8" />
                <span className="font-bold text-[#1e3a5f]">Shopifree</span>
              </Link>
              <Link
                to={localePath('/register')}
                className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                Crear tienda gratis
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-12 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
              Blog de Shopifree
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Aprende a crear y hacer crecer tu tienda online. Tips de ecommerce, marketing y emprendimiento.
            </p>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map(post => (
                <Link
                  key={post.slug}
                  to={localePath(`/blog/${post.slug}`)}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-[#38bdf8]/30 transition-all group"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">{post.date}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{post.readTime} min lectura</span>
                    </div>
                    <h2 className="font-bold text-[#1e3a5f] mb-2 group-hover:text-[#2d6cb5] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {post.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-[#f0f7ff] text-[#2d6cb5] text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Listo para empezar tu tienda online?
            </h2>
            <p className="text-white/80 mb-8">
              Crea tu tienda gratis en minutos. Sin comisiones, sin complicaciones.
            </p>
            <Link
              to={localePath('/register')}
              className="inline-block px-8 py-4 bg-white text-[#1e3a5f] rounded-xl font-bold hover:shadow-xl transition-all"
            >
              Crear mi tienda gratis
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-[#1e3a5f]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-white/60 text-sm">
              {new Date().getFullYear()} Shopifree. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
