// Districts/Neighborhoods by Province and Department
// Perú: Departamento → Provincia → Distrito
// Argentina: Provincia → Ciudad → Barrio
// España: Comunidad → Provincia → Barrio/Distrito
// México: Estado → Municipio → Colonia
// Colombia: Departamento → Municipio → Barrio
// Chile: Región → Comuna → Sector/Población
// Ecuador: Provincia → Cantón → Barrio/Parroquia
// USA: State → City → Neighborhood

import { peruDistricts } from './peru'
import { argentinaDistricts } from './argentina'
import { spainDistricts } from './spain'
import { mexicoDistricts } from './mexico'
import { colombiaDistricts } from './colombia'
import { chileDistricts } from './chile'
import { ecuadorDistricts } from './ecuador'
import { usaDistricts } from './usa'

// Export districts by country
// Structure: Record<CountryCode, Record<State, Record<City, string[]>>>
export const districtsByCountry: Record<string, Record<string, Record<string, string[]>>> = {
  PE: peruDistricts,
  AR: argentinaDistricts,
  ES: spainDistricts,
  MX: mexicoDistricts,
  CO: colombiaDistricts,
  CL: chileDistricts,
  EC: ecuadorDistricts,
  US: usaDistricts
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
  AR: { es: 'Barrio', en: 'Neighborhood', pt: 'Bairro' },
  ES: { es: 'Barrio', en: 'Neighborhood', pt: 'Bairro' },
  MX: { es: 'Colonia', en: 'Neighborhood', pt: 'Colônia' },
  CO: { es: 'Barrio', en: 'Neighborhood', pt: 'Bairro' },
  CL: { es: 'Sector', en: 'Sector', pt: 'Setor' },
  EC: { es: 'Barrio', en: 'Neighborhood', pt: 'Bairro' },
  US: { es: 'Vecindario', en: 'Neighborhood', pt: 'Bairro' },
}
