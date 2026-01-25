import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import type { ThemeTranslations } from '../../../themes/shared/translations'

interface Props {
  t: ThemeTranslations
  bankInfo?: {
    bankName: string
    accountHolder: string
    accountNumber: string
  }
}

export default function BankTransferInfo({ t, bankInfo }: Props) {
  const { theme } = useTheme()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Default bank info (should come from store settings in production)
  const info = bankInfo || {
    bankName: 'Banco de Credito',
    accountHolder: 'Nombre del Titular',
    accountNumber: '123-456789-0-12'
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const InfoRow = ({ label, value, fieldId }: { label: string; value: string; fieldId: string }) => (
    <div
      className="flex items-center justify-between py-3 border-b last:border-b-0"
      style={{ borderColor: theme.colors.border }}
    >
      <div>
        <p className="text-sm" style={{ color: theme.colors.textMuted }}>{label}</p>
        <p className="font-medium" style={{ color: theme.colors.text }}>{value}</p>
      </div>
      <button
        onClick={() => copyToClipboard(value, fieldId)}
        className="px-3 py-1.5 text-sm font-medium transition-all"
        style={{
          backgroundColor: copiedField === fieldId ? '#dcfce7' : `${theme.colors.primary}10`,
          color: copiedField === fieldId ? '#16a34a' : theme.colors.primary,
          borderRadius: theme.radius.sm
        }}
      >
        {copiedField === fieldId ? t.copied : t.copyToClipboard}
      </button>
    </div>
  )

  return (
    <div
      className="w-full border p-4"
      style={{
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface
      }}
    >
      <h4
        className="font-semibold mb-3 flex items-center gap-2"
        style={{ color: theme.colors.text }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        {t.bankTransferInfo}
      </h4>

      <InfoRow label={t.bankName} value={info.bankName} fieldId="bank" />
      <InfoRow label={t.accountHolder} value={info.accountHolder} fieldId="holder" />
      <InfoRow label={t.accountNumber} value={info.accountNumber} fieldId="account" />
    </div>
  )
}
