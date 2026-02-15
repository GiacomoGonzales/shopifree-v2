import { useState, useEffect } from 'react'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'

function getTimeRemaining(endDate: string) {
  const total = new Date(endDate).getTime() - Date.now()
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

  const [time, setTime] = useState(() =>
    flashSale?.endDate ? getTimeRemaining(flashSale.endDate) : null
  )

  useEffect(() => {
    if (!flashSale?.enabled || !flashSale.endDate) return
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(flashSale.endDate)
      setTime(remaining)
      if (!remaining) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [flashSale?.enabled, flashSale?.endDate])

  if (store.plan === 'free' || !flashSale?.enabled || !flashSale.endDate || !time) return null

  const bg = flashSale.backgroundColor || theme.colors.primary
  const text = flashSale.textColor || theme.colors.textInverted
  const label = flashSale.text || 'Flash Sale!'

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      className="w-full py-2.5 px-4"
      style={{ backgroundColor: bg, color: text }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span>{t.flashSaleEndsIn}</span>
        <span className="font-mono font-bold tracking-wider">
          {time.days > 0 && `${time.days}d `}
          {pad(time.hours)}h {pad(time.minutes)}m {pad(time.seconds)}s
        </span>
      </div>
    </div>
  )
}
