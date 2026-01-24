import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

interface DemoStore {
  id: string
  name: string
  subdomain: string
  theme: string
  screenshot: string
  color: string
  order: number
}

const fallbackStores: DemoStore[] = [
  { id: '1', name: 'Alien Store', subdomain: 'alienstore', theme: 'Urban', screenshot: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=800&fit=crop', color: '#1a1a2e', order: 0 },
  { id: '2', name: 'Fashion Boutique', subdomain: 'demo-boutique', theme: 'Boutique', screenshot: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=800&fit=crop', color: '#f8f4f0', order: 1 },
  { id: '3', name: 'Tech Store', subdomain: 'demo-tech', theme: 'Minimal', screenshot: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=800&fit=crop', color: '#0f172a', order: 2 },
]

export default function MobileWelcome() {
  const navigate = useNavigate()
  const { localePath } = useLanguage()
  const [stores, setStores] = useState<DemoStore[]>(fallbackStores)
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Configure status bar for native
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark })
      StatusBar.setBackgroundColor({ color: '#0f172a' })
    }

    // Fetch demo stores
    const fetchStores = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'demoStores'))
        if (!snapshot.empty) {
          const fetched = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as DemoStore))
            .filter(s => s.screenshot && s.subdomain)
            .sort((a, b) => a.order - b.order)
          if (fetched.length > 0) setStores(fetched)
        }
      } catch (e) {
        console.error('Error fetching stores:', e)
      }
    }
    fetchStores()
  }, [])

  // Handle scroll to update active index
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const cardWidth = 200 + 16 // card width + gap
      const newIndex = Math.round(scrollLeft / cardWidth)
      setActiveIndex(Math.min(newIndex, stores.length - 1))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] flex flex-col">
      {/* Safe area top padding */}
      <div className="h-[env(safe-area-inset-top)]" />

      {/* Header */}
      <div className="flex-shrink-0 pt-8 pb-4 px-6 text-center">
        <img
          src="/newlogo.png"
          alt="Shopifree"
          className="h-10 mx-auto brightness-0 invert mb-4"
        />
        <h1 className="text-2xl font-bold text-white mb-2">
          Tu tienda online gratis
        </h1>
        <p className="text-slate-400 text-sm">
          Crea tu catalogo digital en minutos y empieza a vender hoy
        </p>
      </div>

      {/* Demo Stores Carousel */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <p className="text-center text-xs text-slate-500 mb-4 uppercase tracking-wider">
          Tiendas creadas con Shopifree
        </p>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {stores.map((store, index) => (
            <a
              key={store.id}
              href={`https://${store.subdomain}.shopifree.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 snap-center"
            >
              <div
                className={`w-[200px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
                  index === activeIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
                }`}
                style={{
                  boxShadow: index === activeIndex ? `0 20px 60px -15px ${store.color}80` : undefined
                }}
              >
                {/* Phone Frame */}
                <div className="bg-gray-900 rounded-3xl p-1.5">
                  <div className="bg-black rounded-[20px] overflow-hidden">
                    {/* Notch */}
                    <div className="h-6 bg-black flex items-center justify-center">
                      <div className="w-16 h-4 bg-black rounded-full" />
                    </div>
                    {/* Screen */}
                    <div className="aspect-[9/16] relative">
                      <img
                        src={store.screenshot}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      {/* Store info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full backdrop-blur-sm">
                          {store.theme}
                        </span>
                        <h3 className="font-semibold text-sm mt-1">{store.name}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {stores.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-6 bg-[#38bdf8]'
                  : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="flex-shrink-0 px-6 pb-8">
        {/* Main CTA */}
        <button
          onClick={() => navigate(localePath('/register'))}
          className="w-full py-4 bg-[#38bdf8] text-white font-semibold text-lg rounded-2xl shadow-lg shadow-[#38bdf8]/30 active:scale-[0.98] transition-transform"
        >
          Crear mi tienda gratis
        </button>

        {/* Secondary CTA */}
        <button
          onClick={() => navigate(localePath('/login'))}
          className="w-full py-4 mt-3 bg-transparent text-slate-300 font-medium rounded-2xl border border-slate-700 active:bg-slate-800 transition-colors"
        >
          Ya tengo cuenta
        </button>

        {/* Terms */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Al registrarte aceptas nuestros terminos y condiciones
        </p>
      </div>

      {/* Safe area bottom padding */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  )
}
