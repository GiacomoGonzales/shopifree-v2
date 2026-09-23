import { useState, useEffect } from 'react'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { EditableText } from './LiveEdit'
import { useLiveEdit } from './liveEditContext'

function getTimeRemaining(endDate: string, now: number) {
  const total = new Date(endDate).getTime() - now
  if (total <= 0) return null
  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  return { days, hours, minutes, seconds }
}

export default function FlashSaleBar() {
  const { store, theme, language } = useTheme()
  const t = getThemeTranslations(language)
  const flashSale = store.flashSale
  const editing = useLiveEdit()

  // El reloj avanza cada segundo y el tiempo restante se calcula al pintar:
  // asi un cambio de fecha (en el editor) se ve al instante, sin esperar el tick.
  const [now, setNow] = useState(() => Date.now())
  const time = flashSale?.endDate ? getTimeRemaining(flashSale.endDate, now) : null
  const running = !!flashSale?.enabled && !!time

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [running])

  // En el editor la barra se ve aunque falte la fecha o ya haya terminado, para poder editarla.
  if (store.plan === 'free' || !flashSale?.enabled) return null
  if (!editing && (!flashSale.endDate || !time)) return null
  const shown = time || { days: 0, hours: 0, minutes: 0, seconds: 0 }

  const bg = flashSale.backgroundColor || theme.colors.primary
  const text = flashSale.textColor || theme.colors.textInverted

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      data-sf-section="flash"
      className="w-full py-2.5 px-4"
      style={{ backgroundColor: bg, color: text }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-sm">
        <EditableText path="flashSale.text" value={flashSale.text} fallback="Flash Sale!" className="font-semibold" />
        <span>{t.flashSaleEndsIn}</span>
        <span className="font-mono font-bold tracking-wider">
          {shown.days > 0 && `${shown.days}d `}
          {pad(shown.hours)}h {pad(shown.minutes)}m {pad(shown.seconds)}s
        </span>
      </div>
    </div>
  )
}
