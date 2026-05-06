import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

interface AppDownloadCardProps {
  url: string
  label: string
  qrFilenameSlug: string
  accentColor: string
  scanLabel: string
  downloadQrLabel: string
  icon: React.ReactNode
}

/**
 * Card combining the store-listing button with a downloadable QR code so
 * merchants can paste either the URL or the QR onto flyers and social
 * posts without leaving the dashboard. The QR is rendered as a canvas
 * (not SVG) so toDataURL hands us a PNG download in one click.
 *
 * Used by both the merchant-facing /dashboard/mi-app page and the admin
 * preview at /admin/stores/:id/app-preview.
 */
export default function AppDownloadCard({
  url,
  label,
  qrFilenameSlug,
  accentColor,
  scanLabel,
  downloadQrLabel,
  icon,
}: AppDownloadCardProps) {
  // We render qrcode.react's canvas inside this div and then read it back
  // for downloads. Querying for the canvas at click time avoids ref-
  // forwarding edge cases between qrcode.react versions.
  const qrContainerRef = useRef<HTMLDivElement>(null)

  const handleDownloadQr = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${qrFilenameSlug}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 block">{label}</span>
          <p className="text-xs text-gray-400 truncate">{url}</p>
        </div>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      <div className="flex flex-col items-center gap-2 pt-3 border-t border-gray-200/60">
        <div ref={qrContainerRef} className="bg-white p-2 rounded-lg">
          <QRCodeCanvas value={url} size={144} level="M" includeMargin={false} />
        </div>
        <p className="text-[11px] text-gray-500 text-center px-2">{scanLabel}</p>
        <button
          type="button"
          onClick={handleDownloadQr}
          className="text-xs font-medium text-gray-700 hover:text-gray-900 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {downloadQrLabel}
        </button>
      </div>
    </div>
  )
}
