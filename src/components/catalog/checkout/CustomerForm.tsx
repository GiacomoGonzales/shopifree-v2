import { useState, useImperativeHandle, forwardRef } from 'react'
import { useTheme } from '../ThemeContext'
import type { CustomerData } from '../../../hooks/useCheckout'
import type { ThemeTranslations } from '../../../themes/shared/translations'

interface Props {
  data?: CustomerData
  onSubmit: (data: CustomerData) => void
  error?: string | null
  t: ThemeTranslations
}

export interface CustomerFormRef {
  submit: () => boolean
}

const CustomerForm = forwardRef<CustomerFormRef, Props>(({ data, onSubmit, error, t }, ref) => {
  const { theme } = useTheme()
  const [name, setName] = useState(data?.name || '')
  const [phone, setPhone] = useState(data?.phone || '')
  const [email, setEmail] = useState(data?.email || '')

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!name.trim() || !phone.trim()) {
        return false
      }
      onSubmit({ name, phone, email: email || undefined })
      return true
    }
  }))

  const inputStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: theme.radius.md
  }

  return (
    <div className="flex flex-col gap-4">
      <h3
        className="text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        {t.customerInfo}
      </h3>

      {/* Name */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: theme.colors.textMuted }}
        >
          {t.yourName} *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
          style={{
            ...inputStyle,
            boxShadow: error === 'nameRequired' ? `0 0 0 2px #ef4444` : undefined
          }}
          placeholder={t.yourName}
          required
        />
        {error === 'nameRequired' && (
          <p className="text-sm text-red-500 mt-1">{t.nameRequired}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: theme.colors.textMuted }}
        >
          {t.yourPhone} *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
          style={{
            ...inputStyle,
            boxShadow: error === 'phoneRequired' ? `0 0 0 2px #ef4444` : undefined
          }}
          placeholder="+51 999 888 777"
          required
        />
        {error === 'phoneRequired' && (
          <p className="text-sm text-red-500 mt-1">{t.phoneRequired}</p>
        )}
      </div>

      {/* Email (optional) */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: theme.colors.textMuted }}
        >
          {t.yourEmail} <span className="font-normal">({t.emailOptional})</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
          style={inputStyle}
          placeholder="email@ejemplo.com"
        />
      </div>

    </div>
  )
})

export default CustomerForm
