// Districts/Neighborhoods by Province and Department
// Perú: Departamento → Provincia → Distrito

import { peruDistricts } from './peru'

// Export districts by country
// Structure: Record<CountryCode, Record<State, Record<City, string[]>>>
export const districtsByCountry: Record<string, Record<string, Record<string, string[]>>> = {
  PE: peruDistricts
}

// Helper to get districts for a specific state and city
export function getDistricts(
  countryCode: string,
  state: string,
  city: string
): string[] {
  return districtsByCountry[countryCode]?.[state]?.[city] || []
}

// Check if a country has district-level data
export function hasDistricts(countryCode: string): boolean {
  return countryCode in districtsByCountry
}

// Label for the district field per country
export const districtLabel: Record<string, { es: string; en: string; pt: string }> = {
  PE: { es: 'Distrito', en: 'District', pt: 'Distrito' },
  // Future countries can be added here
  // CO: { es: 'Barrio', en: 'Neighborhood', pt: 'Bairro' },
  // MX: { es: 'Colonia', en: 'Colony', pt: 'Colônia' },
}
