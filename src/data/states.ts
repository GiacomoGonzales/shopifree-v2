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

// Default currency per country
export const currencyByCountry: Record<string, string> = {
  PE: 'PEN',
  MX: 'MXN',
  CO: 'COP',
  AR: 'ARS',
  CL: 'CLP',
  EC: 'USD',
  VE: 'USD',
  US: 'USD',
  ES: 'EUR'
}

// Label for the state field per country (in Spanish)
export const stateLabel: Record<string, { es: string; en: string; pt: string }> = {
  PE: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  MX: { es: 'Estado', en: 'State', pt: 'Estado' },
  CO: { es: 'Departamento', en: 'Department', pt: 'Departamento' },
  AR: { es: 'Provincia', en: 'Province', pt: 'Província' },
  CL: { es: 'Región', en: 'Region', pt: 'Região' },
  EC: { es: 'Provincia', en: 'Province', pt: 'Província' },
  VE: { es: 'Estado', en: 'State', pt: 'Estado' },
  US: { es: 'Estado', en: 'State', pt: 'Estado' },
  ES: { es: 'Comunidad', en: 'Community', pt: 'Comunidade' }
}
