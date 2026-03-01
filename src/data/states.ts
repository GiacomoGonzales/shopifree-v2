// States/Departments/Provinces by country code
// Used in checkout delivery address and store settings

export const statesByCountry: Record<string, string[]> = {
  PE: [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
    'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
    'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
    'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
    'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ],
  MX: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
    'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
    'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
    'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ],
  CO: [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.',
    'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare',
    'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
    'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
    'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre',
    'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ],
  AR: [
    'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut',
    'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
    'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
    'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
    'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'
  ],
  CL: [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
    'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', "O'Higgins",
    'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos',
    'Los Lagos', 'Aysén', 'Magallanes'
  ],
  EC: [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo',
    'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galápagos', 'Guayas',
    'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago',
    'Napo', 'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena',
    'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua',
    'Zamora-Chinchipe'
  ],
  VE: [
    'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas',
    'Bolívar', 'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital',
    'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda',
    'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira',
    'Trujillo', 'Vargas', 'Yaracuy', 'Zulia'
  ],
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida',
    'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana',
    'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
    'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin',
    'Wyoming'
  ],
  ES: [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
    'Ceuta', 'Comunidad Valenciana', 'Extremadura', 'Galicia',
    'La Rioja', 'Madrid', 'Melilla', 'Murcia', 'Navarra', 'País Vasco'
  ]
}

// Centralized country config: flag, phone code, currency, name
export interface CountryConfig {
  code: string
  flag: string
  phoneCode: string
  currency: string
  name: { es: string; en: string }
}

export const countries: CountryConfig[] = [
  // South America
  { code: 'PE', flag: '\u{1F1F5}\u{1F1EA}', phoneCode: '+51',  currency: 'PEN', name: { es: 'Peru', en: 'Peru' } },
  { code: 'CO', flag: '\u{1F1E8}\u{1F1F4}', phoneCode: '+57',  currency: 'COP', name: { es: 'Colombia', en: 'Colombia' } },
  { code: 'AR', flag: '\u{1F1E6}\u{1F1F7}', phoneCode: '+54',  currency: 'ARS', name: { es: 'Argentina', en: 'Argentina' } },
  { code: 'CL', flag: '\u{1F1E8}\u{1F1F1}', phoneCode: '+56',  currency: 'CLP', name: { es: 'Chile', en: 'Chile' } },
  { code: 'EC', flag: '\u{1F1EA}\u{1F1E8}', phoneCode: '+593', currency: 'USD', name: { es: 'Ecuador', en: 'Ecuador' } },
  { code: 'BO', flag: '\u{1F1E7}\u{1F1F4}', phoneCode: '+591', currency: 'BOB', name: { es: 'Bolivia', en: 'Bolivia' } },
  { code: 'PY', flag: '\u{1F1F5}\u{1F1FE}', phoneCode: '+595', currency: 'PYG', name: { es: 'Paraguay', en: 'Paraguay' } },
  { code: 'UY', flag: '\u{1F1FA}\u{1F1FE}', phoneCode: '+598', currency: 'UYU', name: { es: 'Uruguay', en: 'Uruguay' } },
  { code: 'VE', flag: '\u{1F1FB}\u{1F1EA}', phoneCode: '+58',  currency: 'USD', name: { es: 'Venezuela', en: 'Venezuela' } },
  { code: 'BR', flag: '\u{1F1E7}\u{1F1F7}', phoneCode: '+55',  currency: 'BRL', name: { es: 'Brasil', en: 'Brazil' } },
  // Mexico
  { code: 'MX', flag: '\u{1F1F2}\u{1F1FD}', phoneCode: '+52',  currency: 'MXN', name: { es: 'Mexico', en: 'Mexico' } },
  // Central America & Caribbean
  { code: 'GT', flag: '\u{1F1EC}\u{1F1F9}', phoneCode: '+502', currency: 'GTQ', name: { es: 'Guatemala', en: 'Guatemala' } },
  { code: 'HN', flag: '\u{1F1ED}\u{1F1F3}', phoneCode: '+504', currency: 'HNL', name: { es: 'Honduras', en: 'Honduras' } },
  { code: 'SV', flag: '\u{1F1F8}\u{1F1FB}', phoneCode: '+503', currency: 'USD', name: { es: 'El Salvador', en: 'El Salvador' } },
  { code: 'NI', flag: '\u{1F1F3}\u{1F1EE}', phoneCode: '+505', currency: 'NIO', name: { es: 'Nicaragua', en: 'Nicaragua' } },
  { code: 'CR', flag: '\u{1F1E8}\u{1F1F7}', phoneCode: '+506', currency: 'CRC', name: { es: 'Costa Rica', en: 'Costa Rica' } },
  { code: 'PA', flag: '\u{1F1F5}\u{1F1E6}', phoneCode: '+507', currency: 'USD', name: { es: 'Panama', en: 'Panama' } },
  { code: 'DO', flag: '\u{1F1E9}\u{1F1F4}', phoneCode: '+1',   currency: 'DOP', name: { es: 'Rep. Dominicana', en: 'Dominican Rep.' } },
  // Other
  { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', phoneCode: '+1',   currency: 'USD', name: { es: 'Estados Unidos', en: 'United States' } },
  { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', phoneCode: '+34',  currency: 'EUR', name: { es: 'Espana', en: 'Spain' } },
]

// Helper lookups derived from the centralized config
export const phoneCodeByCountry: Record<string, string> = Object.fromEntries(
  countries.map(c => [c.code, c.phoneCode])
)

export const currencyByCountry: Record<string, string> = Object.fromEntries(
  countries.map(c => [c.code, c.currency])
)

export const flagByCountry: Record<string, string> = Object.fromEntries(
  countries.map(c => [c.code, c.flag])
)

// Label for the state field per country
export const stateLabel: Record<string, { es: string; en: string; pt: string }> = {
  PE: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  MX: { es: 'Estado', en: 'State', pt: 'Estado' },
  CO: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  AR: { es: 'Provincia', en: 'Province', pt: 'Província' },
  CL: { es: 'Región', en: 'Region', pt: 'Região' },
  EC: { es: 'Provincia', en: 'Province', pt: 'Província' },
  BO: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  PY: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  UY: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  VE: { es: 'Estado', en: 'State', pt: 'Estado' },
  BR: { es: 'Estado', en: 'State', pt: 'Estado' },
  GT: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  HN: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  SV: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  NI: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  CR: { es: 'Provincia', en: 'Province', pt: 'Província' },
  PA: { es: 'Provincia', en: 'Province', pt: 'Província' },
  DO: { es: 'Provincia', en: 'Province', pt: 'Província' },
  US: { es: 'Estado', en: 'State', pt: 'Estado' },
  ES: { es: 'Comunidad', en: 'Community', pt: 'Comunidade' }
}

// Label for the city field per country
export const cityLabel: Record<string, { es: string; en: string; pt: string }> = {
  PE: { es: 'Provincia', en: 'Province', pt: 'Província' },
  MX: { es: 'Municipio', en: 'Municipality', pt: 'Município' },
  CO: { es: 'Municipio', en: 'Municipality', pt: 'Município' },
  AR: { es: 'Ciudad', en: 'City', pt: 'Cidade' },
  ES: { es: 'Provincia', en: 'Province', pt: 'Província' },
  CL: { es: 'Comuna', en: 'Commune', pt: 'Comuna' },
  EC: { es: 'Cantón', en: 'Canton', pt: 'Cantão' },
  US: { es: 'Ciudad', en: 'City', pt: 'Cidade' },
}
