import { useState, useRef, useEffect } from 'react'
import { optimizeImage } from '../../utils/cloudinary'

interface ProductGalleryProps {
  images: string[]
  productName: string
  variant?: 'light' | 'dark'
}

export default function ProductGallery({ images, productName, variant = 'light' }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])

  // Handle scroll to detect active image
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const width = container.offsetWidth
      const newIndex = Math.round(scrollLeft / width)
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < images.length) {
        setActiveIndex(newIndex)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeIndex, images.length])

  // Scroll to specific image when thumbnail is clicked
  const scrollToImage = (index: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const width = container.offsetWidth
    container.scrollTo({
      left: width * index,
      behavior: 'smooth'
    })
  }

  // If only one image, just show it without gallery controls
  if (images.length <= 1) {
    return (
      <div className="aspect-square bg-gray-50 relative">
        {images[0] ? (
          <img
            src={optimizeImage(images[0], 'gallery')}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className={`w-20 h-20 ${variant === 'dark' ? 'text-white/10' : 'text-gray-200'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
    )
  }

  const isDark = variant === 'dark'

  return (
    <div>
      {/* Main Image Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            ref={(el) => { imageRefs.current[index] = el }}
            className="w-full flex-shrink-0 snap-center aspect-square"
          >
            <img
              src={optimizeImage(image, 'gallery')}
              alt={`${productName} - ${index + 1}`}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Thumbnails */}
      <div className={`flex gap-2 p-3 overflow-x-auto scrollbar-hide ${isDark ? 'bg-black/50' : 'bg-gray-50'}`}>
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => scrollToImage(index)}
            className={`w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
              activeIndex === index
                ? isDark
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                  : 'ring-2 ring-gray-900 ring-offset-2'
                : isDark
                  ? 'opacity-50 hover:opacity-75'
                  : 'opacity-60 hover:opacity-100'
            }`}
          >
            <img
              src={optimizeImage(image, 'thumbnail')}
              alt={`${productName} thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Dot indicators (mobile-friendly) */}
      <div className={`flex justify-center gap-1.5 py-2 ${isDark ? 'bg-black/50' : 'bg-gray-50'}`}>
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToImage(index)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              activeIndex === index
                ? isDark
                  ? 'bg-white w-4'
                  : 'bg-gray-900 w-4'
                : isDark
                  ? 'bg-white/30'
                  : 'bg-gray-300'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
