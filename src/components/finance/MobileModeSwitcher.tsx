import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../../hooks/useLanguage'

interface MobileModeSwitcherProps {
  mode: 'ecommerce' | 'finance'
}

export default function MobileModeSwitcher({ mode }: MobileModeSwitcherProps) {
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const [fading, setFading] = useState(false)

  const handleSwitch = () => {
    if (fading) return
    setFading(true)
    setTimeout(() => {
      navigate(mode === 'ecommerce' ? localePath('/finance') : localePath('/dashboard'))
    }, 200)
  }

  // Show the icon of the OTHER mode (the one you'll switch to)
  const targetIcon = mode === 'ecommerce' ? '/finanzas.png' : '/tienda.png'
  const label = mode === 'ecommerce' ? 'Ir a Finanzas' : 'Ir a Tienda'

  return (
    <button
      onClick={handleSwitch}
      className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
      title={label}
    >
      <img
        src={targetIcon}
        alt={label}
        className={`w-5 h-5 object-contain transition-all duration-300 ease-in-out ${
          fading ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
        }`}
      />
    </button>
  )
}
