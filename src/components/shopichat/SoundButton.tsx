/**
 * Prender o apagar el sonido de los mensajes nuevos (portado de Cobrify,
 * components/chat/BotonSonido.jsx). El icono dice cómo ESTÁ. Si está prendido
 * pero el navegador todavía no deja sonar a la página, se vuelve un botón con
 * texto: si no, uno creería que suena y se perdería los mensajes.
 */
import { useTranslation } from 'react-i18next'
import { useShopiChatSound } from '../../lib/shopichatSound'
import { IconVolume, IconVolumeOff } from './icons'

export default function SoundButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation('dashboard')
  const { enabled, blocked, toggle, unlock } = useShopiChatSound()

  if (blocked) {
    return (
      <button
        type="button"
        onClick={unlock}
        title={t('shopichat.sound.blockedHint')}
        className={`inline-flex flex-none items-center gap-1.5 rounded-full border border-[#E6EBF1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#425466] hover:bg-[#F6F9FC] ${className}`}
      >
        <IconVolumeOff className="w-3 h-3" />
        {t('shopichat.sound.enable')}
      </button>
    )
  }

  const label = enabled ? t('shopichat.sound.mute') : t('shopichat.sound.unmute')
  return (
    <button
      type="button"
      onClick={toggle}
      className={`p-1.5 rounded-lg text-[#8898AA] hover:bg-[#F6F9FC] hover:text-[#1e3a5f] ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={enabled}
    >
      {enabled ? <IconVolume className="w-4 h-4" /> : <IconVolumeOff className="w-4 h-4" />}
    </button>
  )
}
