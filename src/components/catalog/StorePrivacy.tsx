import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { Link } from 'react-router-dom'

export default function StorePrivacy() {
  const { theme, store, language } = useTheme()
  const t = getThemeTranslations(language)

  const contactEmail = store.email || 'soporte@shopifree.app'
  const storeName = store.name

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo ? (
              <img src={store.logo} alt={storeName} className="w-8 h-8 object-contain rounded-full" />
            ) : (
              <div
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.surfaceHover }}
              >
                <span className="text-sm font-semibold" style={{ color: theme.colors.textMuted }}>
                  {storeName.charAt(0)}
                </span>
              </div>
            )}
            <span className="font-semibold" style={{ color: theme.colors.text }}>{storeName}</span>
          </div>
          <Link to="/" className="text-sm" style={{ color: theme.colors.primary }}>
            {t.backToStore}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>
          {t.privacyTitle}
        </h1>
        <p className="text-sm mb-8" style={{ color: theme.colors.textMuted }}>
          {t.privacyLastUpdated}
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed" style={{ color: theme.colors.textMuted }}>
          <section>
            <h2 className="text-base font-semibold mt-6 mb-2" style={{ color: theme.colors.text }}>
              1. {t.privacyInfoTitle}
            </h2>
            <p>{t.privacyInfoDesc.replace('{{store}}', storeName)}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>{t.privacyInfoName}</li>
              <li>{t.privacyInfoPhone}</li>
              <li>{t.privacyInfoEmail}</li>
              <li>{t.privacyInfoAddress}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mt-6 mb-2" style={{ color: theme.colors.text }}>
              2. {t.privacyUseTitle}
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t.privacyUseOrders}</li>
              <li>{t.privacyUseDelivery}</li>
              <li>{t.privacyUseContact}</li>
              <li>{t.privacyUseImprove}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mt-6 mb-2" style={{ color: theme.colors.text }}>
              3. {t.privacyStorageTitle}
            </h2>
            <p>{t.privacyStorageDesc}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mt-6 mb-2" style={{ color: theme.colors.text }}>
              4. {t.privacySharingTitle}
            </h2>
            <p>{t.privacySharingDesc.replace('{{store}}', storeName)}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>{t.privacySharingPayment}</li>
              <li>{t.privacySharingLegal}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mt-6 mb-2" style={{ color: theme.colors.text }}>
              5. {t.privacyRightsTitle}
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t.privacyRightsAccess}</li>
              <li>{t.privacyRightsCorrect}</li>
              <li>{t.privacyRightsDelete}</li>
            </ul>
            <p className="mt-2">
              {t.privacyRightsContact.replace('{{email}}', contactEmail)}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mt-6 mb-2" style={{ color: theme.colors.text }}>
              6. {t.privacyContactTitle}
            </h2>
            <p>
              {t.privacyContactDesc.replace('{{store}}', storeName).replace('{{email}}', contactEmail)}
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 text-center text-sm" style={{ borderTop: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted }}>
          &copy; {new Date().getFullYear()} {storeName}
        </div>
      </div>
    </div>
  )
}
