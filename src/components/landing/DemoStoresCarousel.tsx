import { useState, useEffect, useRef } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface DemoStore {
  id: string
  name: string
  subdomain: string
  theme: string
  screenshot: string
  color: string
  order: number
}

// Fallback data in case Firebase is empty
const fallbackStores: DemoStore[] = [
  { id: '1', name: 'Alien Store', subdomain: 'alienstore', theme: 'Urban', screenshot: '/demos/alienstore.jpg', color: '#CCFF00', order: 0 },
  { id: '2', name: 'La Braseria del Abuelo', subdomain: 'braseriadelabuelo', theme: 'Bistro', screenshot: '/demos/braseria.jpg', color: '#B87333', order: 1 },
]

export default function DemoStoresCarousel() {
  const [demoStores, setDemoStores] = useState<DemoStore[]>(fallbackStores)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // Fetch demo stores from Firebase
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'demoStores'))
        if (!snapshot.empty) {
          const stores = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as DemoStore))
            .filter(store => store.screenshot && store.subdomain) // Only show stores with data
            .sort((a, b) => a.order - b.order)

          if (stores.length > 0) {
            setDemoStores(stores)
          }
        }
      } catch (error) {
        console.error('Error fetching demo stores:', error)
        // Keep fallback data on error
      }
    }

    fetchStores()
  }, [])

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % demoStores.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    setIsAutoPlaying(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - go next
        setActiveIndex((prev) => (prev + 1) % demoStores.length)
      } else {
        // Swipe right - go prev
        setActiveIndex((prev) => (prev - 1 + demoStores.length) % demoStores.length)
      }
    }

    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

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
        className="relative flex items-center justify-center min-h-[500px] md:min-h-[600px] touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                  ${isActive ? 'z-30 scale-100' : 'z-10 scale-[0.7] brightness-75 hover:brightness-90'}
                  ${isPrev ? '-translate-x-[55%] md:-translate-x-[75%]' : ''}
                  ${isNext ? 'translate-x-[55%] md:translate-x-[75%]' : ''}
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
              </a>
            )
          })}
        </div>

        {/* Navigation arrows - hidden on mobile, visible on desktop */}
        <button
          onClick={goToPrev}
          className="absolute left-8 z-40 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hidden md:flex items-center justify-center text-[#1e3a5f] hover:bg-white hover:scale-110 transition-all"
          aria-label="Previous store"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-8 z-40 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hidden md:flex items-center justify-center text-[#1e3a5f] hover:bg-white hover:scale-110 transition-all"
          aria-label="Next store"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Swipe hint for mobile */}
      <p className="text-center text-xs text-gray-400 mt-2 md:hidden">
        Desliza para ver más tiendas
      </p>

      {/* Dots navigation */}
      <div className="flex items-center justify-center gap-2 mt-6">
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
    </div>
  )
}
