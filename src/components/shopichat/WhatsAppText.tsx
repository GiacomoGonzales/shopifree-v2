/**
 * Texto de un mensaje con el formato de WhatsApp (portado de Cobrify,
 * components/chat/TextoWhatsapp.jsx).
 *
 * WhatsApp marca el formato con caracteres: *negrita*, _cursiva_, ~tachado~ y
 * ```monoespaciado```. El cliente los escribe así y su app se los muestra
 * formateados; si la bandeja no los interpreta, el comerciante ve los
 * asteriscos pelados. Además vuelve clicables los enlaces, los correos y los
 * teléfonos (con `onPhoneClick`, el clic se lo pasa a la pantalla, que lo
 * copia).
 *
 * Sin HTML inyectado: el texto se parte en pedazos y cada uno se renderiza
 * como elemento de React.
 */
import type { ReactNode } from 'react'

const EMAIL = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}'

// Cualquier número con + y código de país, o un celular de 9 cifras que
// empieza en 9 (Perú), pegado o de a tres.
const PHONE =
  '\\+[0-9]{1,3}(?:[ -]?\\([0-9]{1,4}\\))?[ -]?[0-9]{1,4}(?:[ -]?[0-9]{2,4}){1,5}' +
  '|9[0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}'

// El enlace primero y el correo enseguida, para que el `_` de juan_perez@x.com
// no sea cursiva. El teléfono después del correo: 987654321@gmail.com es correo.
const PATTERN = new RegExp(
  [
    'https?:\\/\\/[^\\s<>"]+',
    EMAIL,
    PHONE,
    '\\*[^*\\n]+\\*',
    '_[^_\\n]+_',
    '~[^~\\n]+~',
    '```[^`]+```',
  ].join('|'),
  'g'
)

const EMAIL_WHOLE = new RegExp(`^${EMAIL}$`)
const PHONE_WHOLE = new RegExp(`^(?:${PHONE})$`)
const LETTER_OR_DIGIT = /[\p{L}\p{M}\p{N}]/u
const isLetterOrDigit = (c?: string) => c !== undefined && LETTER_OR_DIGIT.test(c)

/** El número limpio para copiar/llamar. Null si no da para teléfono. */
function cleanPhone(t: string): string | null {
  const digits = t.replace(/[^0-9]/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return t.startsWith('+') ? `+${digits}` : digits
}

interface Props {
  text?: string | null
  linkClassName?: string
  onPhoneClick?: (phone: string) => void
  className?: string
}

export default function WhatsAppText({ text, linkClassName, onPhoneClick, className }: Props) {
  if (!text) return null
  const src = String(text)
  const parts: ReactNode[] = []
  let cursor = 0
  let key = 0
  const linkCls = linkClassName || 'underline break-all'

  for (const m of src.matchAll(PATTERN)) {
    const index = m.index ?? 0
    if (index > cursor) parts.push(src.slice(cursor, index))
    const t = m[0]

    if (t.startsWith('http')) {
      // El punto o coma final suele ser puntuación de la frase, no del enlace.
      const clean = t.replace(/[).,;!?]+$/, '')
      const rest = t.slice(clean.length)
      parts.push(
        <a key={key++} href={clean} target="_blank" rel="noopener noreferrer" className={linkCls}>
          {clean}
        </a>
      )
      if (rest) parts.push(rest)
    } else if (EMAIL_WHOLE.test(t)) {
      parts.push(<a key={key++} href={`mailto:${t}`} className={linkCls}>{t}</a>)
    } else if (PHONE_WHOLE.test(t)) {
      // Pegado a letras o a más cifras no es un teléfono (un código, una cuenta).
      const glued = isLetterOrDigit(src[index - 1]) || isLetterOrDigit(src[index + t.length])
      const phone = glued ? null : cleanPhone(t)
      parts.push(
        phone ? (
          <a
            key={key++}
            href={`tel:${phone}`}
            onClick={onPhoneClick ? e => { e.preventDefault(); e.stopPropagation(); onPhoneClick(phone) } : undefined}
            className={`${linkClassName || 'underline'} whitespace-nowrap`}
          >
            {t}
          </a>
        ) : t
      )
    } else if (t.startsWith('```')) {
      parts.push(<code key={key++} className="font-mono text-[13px] bg-black/10 rounded px-1">{t.slice(3, -3)}</code>)
    } else if (t.startsWith('*')) {
      parts.push(<strong key={key++}>{t.slice(1, -1)}</strong>)
    } else if (t.startsWith('_')) {
      parts.push(<em key={key++}>{t.slice(1, -1)}</em>)
    } else if (t.startsWith('~')) {
      parts.push(<s key={key++}>{t.slice(1, -1)}</s>)
    }
    cursor = index + t.length
  }
  if (cursor < src.length) parts.push(src.slice(cursor))

  return <p className={className || 'text-[14px] leading-snug whitespace-pre-wrap break-words'}>{parts}</p>
}
