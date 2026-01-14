import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface DemoStore {
  name: string
  subdomain: string
  theme: string
  screenshot: string
  color: string
}

const demoStores: DemoStore[] = [
  {
    name: 'Alien Store',
    subdomain: 'alienstore',
    theme: 'Urban',
    screenshot: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=800&fit=crop',
    color: '#1a1a2e'
  },
  {
    name: 'Fashion Boutique',
    subdomain: 'demo-boutique',
    theme: 'Boutique',
    screenshot: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=800&fit=crop',
    color: '#f8f4f0'
  },
  {
    name: 'Tech Store',
    subdomain: 'demo-tech',
    theme: 'Minimal',
    screenshot: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=800&fit=crop',
    color: '#0f172a'
  },
  {
    name: 'Café Delicia',
    subdomain: 'demo-cafe',
    theme: 'Metro',
    screenshot: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=800&fit=crop',
    color: '#78350f'
  },
  {
    name: 'Vintage Shop',
    subdomain: 'demo-vintage',
    theme: 'Vintage',
    screenshot: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=800&fit=crop',
    color: '#451a03'
  }
]

export default function DemoStoresCarousel() {
  const { t } = useTranslation('landing')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % demoStores.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goToSlide = (index: number) => {
    setActiveIndex(index)
    setIsAutoPlaying(false)
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + demoStores.length) % demoStores.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % demoStores.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  return (
    <div className="relative">
      {/* Carousel container */}
      <div
        ref={carouselRef}
        className="relative flex items-center justify-center min-h-[500px] md:min-h-[600px]"
      >
        {/* Background glow effect */}
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            background: `radial-gradient(ellipse at center, ${demoStores[activeIndex].color}15 0%, transparent 70%)`
          }}
        />

        {/* Phone mockups */}
        <div className="relative flex items-center justify-center w-full">
          {demoStores.map((store, index) => {
            const offset = index - activeIndex
            const isActive = index === activeIndex
            const isPrev = offset === -1 || (activeIndex === 0 && index === demoStores.length - 1)
            const isNext = offset === 1 || (activeIndex === demoStores.length - 1 && index === 0)
            const isVisible = isActive || isPrev || isNext

            if (!isVisible) return null

            return (
              <a
                key={store.subdomain}
                href={`https://${store.subdomain}.shopifree.app`}
                target="_blank"
                rel="noopener noreferrer"
                className={`absolute transition-all duration-500 ease-out cursor-pointer
                  ${isActive ? 'z-30 scale-100 opacity-100' : 'z-10 scale-75 opacity-50 hover:opacity-70'}
                  ${isPrev ? '-translate-x-[60%] md:-translate-x-[80%]' : ''}
                  ${isNext ? 'translate-x-[60%] md:translate-x-[80%]' : ''}
                `}
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault()
                    goToSlide(index)
                  }
                }}
              >
                {/* iPhone Frame */}
                <div className="relative">
                  {/* Phone outer frame */}
                  <div className="relative w-[220px] md:w-[280px] rounded-[40px] md:rounded-[50px] bg-gradient-to-b from-gray-800 to-gray-900 p-[8px] md:p-[10px] shadow-2xl">
                    {/* Phone inner bezel */}
                    <div className="relative rounded-[32px] md:rounded-[40px] bg-black overflow-hidden">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] md:w-[120px] h-[25px] md:h-[30px] bg-black rounded-b-2xl z-20" />

                      {/* Screen */}
                      <div className="relative aspect-[9/19.5] overflow-hidden bg-gray-100">
                        {/* Screenshot */}
                        <img
                          src={store.screenshot}
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Store info overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-xs rounded-full mb-2">
                            Tema {store.theme}
                          </span>
                          <h3 className="font-bold text-lg">{store.name}</h3>
                          <p className="text-xs text-white/70">{store.subdomain}.shopifree.app</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reflection effect */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-gradient-to-t from-transparent to-black/10 blur-xl rounded-full" />
                </div>

                {/* Visit button (only on active) */}
                {isActive && (
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg text-sm font-medium text-[#1e3a5f] hover:shadow-xl transition-shadow">
                      Visitar tienda
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </span>
                  </div>
                )}
              </a>
            )
          })}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrev}
          className="absolute left-2 md:left-8 z-40 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-[#1e3a5f] hover:bg-white hover:scale-110 transition-all"
          aria-label="Previous store"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-2 md:right-8 z-40 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-[#1e3a5f] hover:bg-white hover:scale-110 transition-all"
          aria-label="Next store"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots navigation */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {demoStores.map((store, index) => (
          <button
            key={store.subdomain}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full
              ${index === activeIndex
                ? 'w-8 h-2 bg-[#38bdf8]'
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }
            `}
            aria-label={`Go to ${store.name}`}
          />
        ))}
      </div>

      {/* Store counter */}
      <p className="text-center text-sm text-gray-500 mt-4">
        {activeIndex + 1} / {demoStores.length} tiendas
      </p>
    </div>
  )
}
