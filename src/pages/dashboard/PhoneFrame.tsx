import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { readableTextOn } from '../../themes/shared/themeColors'
import { bezel, systemInsets, type Device } from './devices'

/**
 * Carcasa de celular para la vista previa del editor. La pantalla mide lo
 * mismo que el celular real (en pixeles CSS), asi la tienda se acomoda igual;
 * si no entra en el espacio disponible, se achica todo el conjunto con una
 * escala, sin cambiar ese tamano.
 */
interface Props {
  device: Device
  /** Color detras de la barra de estado (el fondo de la tienda). */
  statusBg: string
  /** El iframe con la tienda: ocupa la pantalla menos la barra de estado y la zona de inicio. */
  children: ReactNode
}

const MARGIN = 24

export default function PhoneFrame({ device, statusBg, children }: Props) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const b = bezel(device.shape)
  const insets = systemInsets(device.shape)
  const frameWidth = device.width + b.side * 2
  const frameHeight = device.height + b.top + b.bottom
  const scale = area.width && area.height
    ? Math.min(1, (area.width - MARGIN) / frameWidth, (area.height - MARGIN) / frameHeight)
    : 1
  const ink = readableTextOn(statusBg)
  const isIos = device.shape !== 'punchHole'
  const frameColor = isIos ? '#1f1f22' : '#141414'

  return (
    <div ref={areaRef} className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
      {/* Caja con el tamano ya escalado, para que el layout no reserve el alto real. */}
      <div style={{ width: frameWidth * scale, height: frameHeight * scale }} className="relative shrink-0">
        <div
          className="absolute top-0 left-0 shadow-2xl"
          style={{
            width: frameWidth,
            height: frameHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundColor: frameColor,
            borderRadius: device.radius ? device.radius + b.side : 44,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.08)',
          }}
        >
          {/* Botones laterales */}
          {isIos ? (
            <>
              <span className="absolute -left-[3px] w-[3px] rounded-l" style={{ top: 120, height: 32, backgroundColor: frameColor }} />
              <span className="absolute -left-[3px] w-[3px] rounded-l" style={{ top: 175, height: 60, backgroundColor: frameColor }} />
              <span className="absolute -left-[3px] w-[3px] rounded-l" style={{ top: 245, height: 60, backgroundColor: frameColor }} />
              <span className="absolute -right-[3px] w-[3px] rounded-r" style={{ top: 190, height: 95, backgroundColor: frameColor }} />
            </>
          ) : (
            <>
              <span className="absolute -right-[3px] w-[3px] rounded-r" style={{ top: 150, height: 90, backgroundColor: frameColor }} />
              <span className="absolute -right-[3px] w-[3px] rounded-r" style={{ top: 265, height: 55, backgroundColor: frameColor }} />
            </>
          )}

          {/* iPhone SE: parlante y camara arriba, boton de inicio abajo */}
          {device.shape === 'homeButton' && (
            <>
              <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#3a3a3d]" style={{ top: 34, width: 56, height: 6 }} />
              <span className="absolute rounded-full bg-[#2a2a2e] ring-1 ring-white/10" style={{ top: 30, left: frameWidth / 2 - 62, width: 12, height: 12 }} />
              <span className="absolute left-1/2 -translate-x-1/2 rounded-full ring-2 ring-white/15" style={{ bottom: 10, width: 52, height: 52 }} />
            </>
          )}

          {/* Pantalla */}
          <div
            className="absolute overflow-hidden flex flex-col bg-white"
            style={{ top: b.top, left: b.side, width: device.width, height: device.height, borderRadius: device.radius }}
          >
            <StatusBar height={insets.top} background={statusBg} ink={ink} shape={device.shape} />
            {device.shape === 'island' && (
              <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black z-10" style={{ top: 11, width: 124, height: 36 }} />
            )}
            {device.shape === 'punchHole' && (
              <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black z-10" style={{ top: 10, width: 12, height: 12 }} />
            )}
            <div className="relative flex-1 min-h-0">{children}</div>
            {insets.bottom > 0 && (
              <div className="shrink-0 flex items-center justify-center" style={{ height: insets.bottom, backgroundColor: statusBg }}>
                <span className="rounded-full" style={{ width: isIos ? 134 : 72, height: isIos ? 5 : 4, backgroundColor: ink, opacity: 0.85 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBar({ height, background, ink, shape }: { height: number; background: string; ink: string; shape: Device['shape'] }) {
  const ios = shape !== 'punchHole'
  // Cada tipo de celular acomoda la barra distinto: con isla va mas abajo y a los
  // costados; el iPhone SE tiene una barra finita; Android, una intermedia.
  const padding = shape === 'island' ? '14px 30px 0 34px' : shape === 'homeButton' ? '0 8px' : '2px 18px 0 22px'
  const fontSize = shape === 'island' ? 16 : shape === 'homeButton' ? 12 : 13
  return (
    <div
      className="shrink-0 flex items-center justify-between font-semibold select-none"
      style={{
        height,
        backgroundColor: background,
        color: ink,
        padding,
        fontSize,
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        {/* senal */}
        <svg width={ios ? 18 : 15} height={shape === 'homeButton' ? 9 : 11} viewBox="0 0 18 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* wifi */}
        <svg width={ios ? 16 : 14} height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <path d="M8 11.5l2.2-2.6a3.3 3.3 0 00-4.4 0L8 11.5zM3.6 6.4l1.5 1.8a4.6 4.6 0 015.8 0l1.5-1.8a6.9 6.9 0 00-8.8 0zM.8 3.1l1.5 1.8a9 9 0 0111.4 0l1.5-1.8A11.3 11.3 0 00.8 3.1z" />
        </svg>
        {/* bateria */}
        <svg width={ios ? 27 : 22} height="13" viewBox="0 0 27 13" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" />
          <path d="M24.5 4.5v4a2 2 0 000-4z" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  )
}
