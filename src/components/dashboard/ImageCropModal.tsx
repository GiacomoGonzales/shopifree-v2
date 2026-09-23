import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// Image Crop Modal Component - supports different aspect ratios
interface ImageCropModalProps {
  imageSrc: string
  onCrop: (blob: Blob) => void
  onCancel: () => void
  aspectRatio: number // width/height ratio: 1 for square, 16/5 for desktop hero, 3/2 for mobile hero
  title: string
  description: string
}

export default function ImageCropModal({ imageSrc, onCrop, onCancel, aspectRatio, title, description }: ImageCropModalProps) {
  const { t } = useTranslation('dashboard')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  // Calculate crop dimensions based on aspect ratio
  // Max width is 400px for wide images, height adjusts based on ratio
  const maxWidth = aspectRatio >= 1 ? 400 : 280
  const cropWidth = aspectRatio >= 1 ? maxWidth : Math.round(maxWidth * aspectRatio)
  const cropHeight = aspectRatio >= 1 ? Math.round(maxWidth / aspectRatio) : maxWidth

  // Output dimensions for different types
  const getOutputDimensions = () => {
    if (aspectRatio === 1) {
      return { width: 512, height: 512 } // Logo
    } else if (aspectRatio > 2) {
      // Desktop hero (16:5 = 3.2). Bumped 1920 → 2560 to feed the 2560w + 3840w srcset widths
      // without upscaling, keeping retina desktops sharp.
      return { width: 2560, height: Math.round(2560 / aspectRatio) }
    } else {
      return { width: 1200, height: Math.round(1200 / aspectRatio) } // Mobile hero (3:2 = 1.5)
    }
  }

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img

      // Calculate initial scale to cover crop area
      const scaleX = cropWidth / img.width
      const scaleY = cropHeight / img.height
      const initialScale = Math.max(scaleX, scaleY)
      setScale(initialScale)

      // Center image
      setPosition({
        x: (cropWidth - img.width * initialScale) / 2,
        y: (cropHeight - img.height * initialScale) / 2
      })

      setImageLoaded(true)
    }
    img.src = imageSrc
  }, [imageSrc, cropWidth, cropHeight])

  // Draw preview
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, cropWidth, cropHeight)

    // Draw image
    const img = imageRef.current
    ctx.drawImage(
      img,
      position.x,
      position.y,
      img.width * scale,
      img.height * scale
    )
  }, [scale, position, imageLoaded, cropWidth, cropHeight])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
  }, [position])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Zoom handlers
  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 5))
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.1))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale(s => Math.min(s * 1.1, 5))
    } else {
      setScale(s => Math.max(s / 1.1, 0.1))
    }
  }, [])

  // Generate cropped image
  const handleCrop = () => {
    if (!imageRef.current) return

    const { width: outputWidth, height: outputHeight } = getOutputDimensions()
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outputWidth
    outputCanvas.height = outputHeight
    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return

    // White/transparent background
    ctx.fillStyle = aspectRatio === 1 ? '#ffffff' : '#f3f4f6'
    ctx.fillRect(0, 0, outputWidth, outputHeight)

    // Calculate scale factor from preview to output
    const scaleFactorX = outputWidth / cropWidth
    const scaleFactorY = outputHeight / cropHeight

    // Draw image with same transform but scaled
    const img = imageRef.current
    ctx.drawImage(
      img,
      position.x * scaleFactorX,
      position.y * scaleFactorY,
      img.width * scale * scaleFactorX,
      img.height * scale * scaleFactorY
    )

    // Convert to blob (use JPEG for hero images for smaller file size)
    const format = aspectRatio === 1 ? 'image/png' : 'image/jpeg'
    const quality = aspectRatio === 1 ? 1 : 0.9
    outputCanvas.toBlob((blob) => {
      if (blob) onCrop(blob)
    }, format, quality)
  }

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EBF1]">
          <h3 className="text-lg font-semibold text-[#1e3a5f]">
            {title}
          </h3>
          <p className="text-sm text-[#8898AA] mt-1">
            {description}
          </p>
        </div>

        {/* Crop area */}
        <div className="p-6 overflow-x-auto">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-xl bg-[#F1F5F9]"
            style={{ width: cropWidth, height: cropHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              width={cropWidth}
              height={cropHeight}
              className="cursor-move"
            />

            {/* Overlay guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-[#2d6cb5] rounded-xl" />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#2d6cb5] rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#2d6cb5] rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#2d6cb5] rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#2d6cb5] rounded-br-xl" />
            </div>

            {/* Loading indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#F1F5F9]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]" />
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E1E8EF] transition-colors"
              title={t('branding.logo.zoomOut', 'Alejar')}
            >
              <svg className="w-5 h-5 text-[#425466]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32 h-2 bg-[#E1E8EF] rounded-lg appearance-none cursor-pointer accent-[#2d6cb5]"
            />

            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E1E8EF] transition-colors"
              title={t('branding.logo.zoomIn', 'Acercar')}
            >
              <svg className="w-5 h-5 text-[#425466]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#E6EBF1] flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-[#E6EBF1] rounded-xl text-[#425466] font-medium hover:bg-[#F6F9FC] transition-colors"
          >
            {t('branding.logo.cancel', 'Cancelar')}
          </button>
          <button
            onClick={handleCrop}
            disabled={!imageLoaded}
            className="flex-1 px-4 py-3 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#2d6cb5] transition-all disabled:opacity-50"
          >
            {t('branding.logo.apply', 'Aplicar')}
          </button>
        </div>
      </div>
    </div>
  )
}
