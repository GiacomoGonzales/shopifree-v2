import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { ThemeProvider } from '../../components/catalog/ThemeContext'
import StorePrivacy from '../../components/catalog/StorePrivacy'
import type { Store } from '../../types'
import type { ThemeConfig } from '../../components/catalog/ThemeContext'

interface Props {
  subdomainStore?: string
  customDomain?: string
}

const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#111827',
    primaryHover: '#1f2937',
    accent: '#111827',
    background: '#ffffff',
    surface: '#f9fafb',
    surfaceHover: '#f3f4f6',
    text: '#111827',
    textMuted: '#6b7280',
    textInverted: '#ffffff',
    border: '#e5e7eb',
    badge: '#ef4444',
  },
  radius: { sm: '6px', md: '10px', lg: '16px', full: '9999px' },
  shadow: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.07)' },
}

export default function StorePrivacyPage({ subdomainStore, customDomain }: Props) {
  const [store, setStore] = useState<Store | null>(null)

  useEffect(() => {
    const fetchStore = async () => {
      if (!subdomainStore && !customDomain) return
      const storesRef = collection(db, 'stores')
      const q = customDomain
        ? query(storesRef, where('customDomain', '==', customDomain))
        : query(storesRef, where('subdomain', '==', subdomainStore))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const doc = snap.docs[0]
        setStore({ id: doc.id, ...doc.data() } as Store)
      }
    }
    fetchStore()
  }, [subdomainStore, customDomain])

  if (!store) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }

  const theme: ThemeConfig = {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: store.themeSettings?.primaryColor || defaultTheme.colors.primary,
    },
  }

  return (
    <ThemeProvider theme={theme} store={store}>
      <StorePrivacy />
    </ThemeProvider>
  )
}
