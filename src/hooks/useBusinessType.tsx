import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  type BusinessType,
  type BusinessTypeFeatures,
  type BusinessTypeLabels,
  type BusinessTypeConfig,
  getBusinessTypeConfig,
  getBusinessTypeFeatures,
  getBusinessTypeLabels,
  normalizeBusinessType,
  hasFeature as hasFeatureFn,
} from '../config/businessTypes'

interface BusinessTypeContextValue {
  /** The normalized business type */
  businessType: BusinessType
  /** Raw business type from store (may be legacy value) */
  rawBusinessType: string | undefined
  /** Full configuration for this business type */
  config: BusinessTypeConfig
  /** Feature flags for this business type */
  features: BusinessTypeFeatures
  /** Check if a specific feature is enabled */
  hasFeature: (feature: keyof BusinessTypeFeatures) => boolean
  /** Labels for this business type in the current language */
  labels: BusinessTypeLabels
  /** Current language */
  language: 'es' | 'en' | 'pt'
}

const BusinessTypeContext = createContext<BusinessTypeContextValue | null>(null)

interface BusinessTypeProviderProps {
  businessType: string | undefined
  language?: string
  children: ReactNode
}

/**
 * Provider for business type context
 * Wraps the theme provider to provide business type features
 */
export function BusinessTypeProvider({
  businessType: rawBusinessType,
  language = 'es',
  children,
}: BusinessTypeProviderProps) {
  const value = useMemo(() => {
    const normalizedType = normalizeBusinessType(rawBusinessType)
    const config = getBusinessTypeConfig(normalizedType)
    const features = getBusinessTypeFeatures(normalizedType)
    const lang = (language === 'pt' ? 'pt' : language === 'en' ? 'en' : 'es') as 'es' | 'en' | 'pt'
    const labels = getBusinessTypeLabels(normalizedType, lang)

    return {
      businessType: normalizedType,
      rawBusinessType,
      config,
      features,
      hasFeature: (feature: keyof BusinessTypeFeatures) => hasFeatureFn(normalizedType, feature),
      labels,
      language: lang,
    }
  }, [rawBusinessType, language])

  return (
    <BusinessTypeContext.Provider value={value}>
      {children}
    </BusinessTypeContext.Provider>
  )
}

/**
 * Hook to access business type context
 * Must be used within a BusinessTypeProvider
 */
export function useBusinessType(): BusinessTypeContextValue {
  const context = useContext(BusinessTypeContext)
  if (!context) {
    throw new Error('useBusinessType must be used within a BusinessTypeProvider')
  }
  return context
}

/**
 * Hook to check if we're in a BusinessTypeProvider
 * Returns null if not in a provider (useful for optional usage)
 */
export function useBusinessTypeOptional(): BusinessTypeContextValue | null {
  return useContext(BusinessTypeContext)
}

// Re-export types and utilities for convenience
export type { BusinessType, BusinessTypeFeatures, BusinessTypeLabels, BusinessTypeConfig }
export {
  getBusinessTypeConfig,
  getBusinessTypeFeatures,
  getBusinessTypeLabels,
  normalizeBusinessType,
  hasFeature as hasFeatureFn,
  getAllBusinessTypes,
  BUSINESS_TYPES,
} from '../config/businessTypes'
