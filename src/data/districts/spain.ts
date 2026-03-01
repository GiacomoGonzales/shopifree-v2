// España: Comunidad → Provincia/Ciudad → Barrio/Distrito
// Estructura para delivery: barrios y distritos de ciudades principales

export const spainDistricts: Record<string, Record<string, string[]>> = {
  // Madrid
  'Madrid': {
    'Madrid': [
      'Arganzuela', 'Barajas', 'Carabanchel', 'Centro', 'Chamartín',
      'Chamberí', 'Ciudad Lineal', 'Fuencarral-El Pardo', 'Hortaleza', 'Latina',
      'Moncloa-Aravaca', 'Moratalaz', 'Puente de Vallecas', 'Retiro', 'Salamanca',
      'San Blas-Canillejas', 'Tetuán', 'Usera', 'Vicálvaro', 'Villa de Vallecas', 'Villaverde'
    ],
    'Alcalá de Henares': ['Centro', 'Chorrillo', 'El Val', 'Ensanche', 'La Garena', 'Reyes Católicos'],
    'Alcobendas': ['Centro', 'El Encinar', 'La Moraleja', 'Valdelasfuentes'],
    'Alcorcón': ['Centro', 'Parque Lisboa', 'Parque Oeste', 'San José de Valderas'],
    'Fuenlabrada': ['Centro', 'El Naranjo', 'La Serna', 'Loranca', 'Parque Miraflores'],
    'Getafe': ['Buenavista', 'Centro', 'El Bercial', 'Juan de la Cierva', 'Las Margaritas', 'Sector III'],
    'Leganés': ['Centro', 'El Carrascal', 'La Fortuna', 'San Nicasio', 'Zarzaquemada'],
    'Móstoles': ['Centro', 'El Soto', 'Parque Coimbra', 'Villafontana'],
    'Parla': ['Centro', 'Fuentebella', 'Las Américas', 'Parla Este'],
    'Torrejón de Ardoz': ['Centro', 'Fresnos', 'Parque Cataluña', 'Veredillas']
  },

  // Cataluña
  'Cataluña': {
    'Barcelona': [
      'Ciutat Vella', 'Eixample', 'Sants-Montjuïc', 'Les Corts', 'Sarrià-Sant Gervasi',
      'Gràcia', 'Horta-Guinardó', 'Nou Barris', 'Sant Andreu', 'Sant Martí'
    ],
    'Girona': ['Barri Vell', 'Centre', 'Eixample Nord', 'Montjuïc', 'Sant Narcís', 'Santa Eugènia'],
    'Lleida': ['Cappont', 'Centre Històric', 'Pardinyes', 'Secà de Sant Pere'],
    'Tarragona': ['Centre', 'Eixample', 'Sant Pere i Sant Pau', 'Torreforta']
  },

  // Comunidad Valenciana
  'Comunidad Valenciana': {
    'Valencia': [
      'Benicalap', 'Benimaclet', 'Campanar', 'Ciutat Vella', 'El Pla del Real',
      'Extramurs', 'Jesús', 'L\'Eixample', 'L\'Olivereta', 'La Saïdia',
      'Patraix', 'Poblats Marítims', 'Quatre Carreres', 'Rascanya'
    ],
    'Alicante': ['Benalúa', 'Campoamor', 'Centro', 'El Pla', 'Florida', 'San Blas', 'San Juan'],
    'Castellón': ['Centro', 'Grao', 'Rafalafena', 'San Agustín', 'Universidad']
  },

  // Andalucía
  'Andalucía': {
    'Sevilla': [
      'Casco Antiguo', 'Cerro-Amate', 'Este-Alcosa-Torreblanca', 'Los Remedios',
      'Macarena', 'Nervión', 'Norte', 'Palmera-Bellavista', 'San Pablo-Santa Justa',
      'Sur', 'Triana'
    ],
    'Málaga': [
      'Bailén-Miraflores', 'Campanillas', 'Carretera de Cádiz', 'Centro',
      'Churriana', 'Ciudad Jardín', 'Cruz de Humilladero', 'Este', 'Palma-Palmilla',
      'Puerto de la Torre', 'Teatro Romano-La Malagueta', 'Teatinos'
    ],
    'Granada': ['Albaicín', 'Beiro', 'Centro', 'Chana', 'Genil', 'Norte', 'Ronda', 'Zaidín'],
    'Córdoba': ['Centro', 'Fuensanta', 'Levante', 'Norte-Sierra', 'Poniente-Norte', 'Poniente-Sur', 'Sur'],
    'Cádiz': ['Bahía Blanca', 'Centro', 'La Laguna', 'La Paz', 'Loreto', 'Puerta Tierra', 'San Juan'],
    'Almería': ['Centro', 'El Zapillo', 'Nueva Almería', 'Oliveros', 'Retamar'],
    'Huelva': ['Centro', 'El Molino', 'La Orden', 'Tartessos', 'Zona Sur'],
    'Jaén': ['Alcázar', 'Centro', 'El Tomillo', 'La Gloria', 'San Felipe', 'Santa Isabel']
  },

  // País Vasco
  'País Vasco': {
    'Álava': ['Vitoria-Gasteiz'],
    'Guipúzcoa': ['San Sebastián', 'Irún', 'Errenteria', 'Eibar', 'Zarautz'],
    'Vizcaya': ['Bilbao', 'Barakaldo', 'Getxo', 'Portugalete', 'Santurtzi', 'Basauri']
  },

  // Galicia
  'Galicia': {
    'A Coruña': ['Centro', 'Ciudad Vieja', 'Ensanche', 'Los Mallos', 'Monte Alto', 'Riazor'],
    'Lugo': ['A Milagrosa', 'As Gándaras', 'Centro', 'O Ceao'],
    'Ourense': ['A Ponte', 'Centro', 'Couto', 'O Vinteún'],
    'Pontevedra': ['Centro', 'Monte Porreiro', 'Poio', 'San Roque']
  },

  // Castilla y León
  'Castilla y León': {
    'Valladolid': ['Arturo León', 'Centro', 'Delicias', 'Huerta del Rey', 'La Rondilla', 'Parquesol', 'Pajarillos'],
    'Burgos': ['Capiscol', 'Centro', 'Gamonal', 'San Cristóbal', 'San Pedro de la Fuente', 'Vista Alegre', 'Villímar'],
    'Salamanca': ['Centro', 'Garrido', 'Pizarrales', 'Rollo', 'San Bernardo', 'San José'],
    'León': ['Centro', 'El Crucero', 'El Ejido', 'La Chantría', 'Mariano Andrés', 'Oteruelo'],
    'Ávila': ['Centro', 'Santo Tomás', 'Zona Norte', 'Zona Sur'],
    'Palencia': ['Ave María', 'Centro', 'Cristo', 'Pan y Guindas', 'San Antonio'],
    'Segovia': ['Centro', 'Nueva Segovia', 'San Lorenzo', 'Santo Tomás'],
    'Soria': ['Centro', 'Las Casas', 'Los Pajaritos', 'Santa Bárbara'],
    'Zamora': ['Cabañales', 'Centro', 'La Candelaria', 'San José Obrero']
  },

  // Aragón
  'Aragón': {
    'Zaragoza': [
      'Actur-Rey Fernando', 'Casco Antiguo', 'Centro', 'Delicias', 'El Rabal',
      'La Almozara', 'Las Fuentes', 'Oliver-Valdefierro', 'San José', 'Torrero-La Paz', 'Universidad'
    ],
    'Huesca': ['Centro', 'María Auxiliadora', 'Perpetuo Socorro', 'San Lorenzo'],
    'Teruel': ['Arrabal', 'Centro', 'Ensanche', 'San León']
  },

  // Murcia
  'Murcia': {
    'Murcia': [
      'Barriomar', 'Cabezo de Torres', 'Centro', 'El Carmen', 'El Palmar',
      'Espinardo', 'Guadalupe', 'Infante Juan Manuel', 'La Flota', 'Vista Alegre'
    ],
    'Cartagena': ['Barrio de la Concepción', 'Centro', 'Ensanche', 'Lo Campano', 'San Antón', 'Santa Lucía'],
    'Lorca': ['Centro', 'La Viña', 'San Cristóbal', 'San Diego'],
    'Molina de Segura': ['Centro', 'El Llano', 'La Alcayna'],
    'Alcantarilla': ['Centro', 'Campoamor', 'San Pedro']
  },

  // Castilla-La Mancha
  'Castilla-La Mancha': {
    'Toledo': ['Azucaica', 'Buenavista', 'Casco Histórico', 'Palomarejos', 'Santa Bárbara', 'Santa María de Benquerencia'],
    'Albacete': ['Carretas', 'Centro', 'El Pilar', 'Fátima', 'Hermanos Falcó', 'San Pablo', 'Villacerrada'],
    'Ciudad Real': ['Centro', 'El Pilar', 'La Granja', 'Nuevo Parque', 'Puerta de Toledo'],
    'Cuenca': ['Centro', 'San Antón', 'San Fernando', 'Tiradores'],
    'Guadalajara': ['Adoratrices', 'Centro', 'Los Manantiales', 'Balconcillo']
  },

  // Canarias
  'Canarias': {
    'Las Palmas': ['Centro', 'Ciudad Alta', 'Guanarteme', 'Isleta', 'La Isleta', 'Schamann', 'Tamaraceite', 'Vegueta'],
    'Santa Cruz de Tenerife': ['Anaga', 'Centro', 'Ifara', 'La Salud', 'Ofra', 'Salamanca', 'Suroeste']
  },

  // Baleares
  'Baleares': {
    'Palma de Mallorca': ['Casco Antiguo', 'El Arenal', 'El Molinar', 'La Vileta', 'Portixol', 'Son Dameto', 'Son Espanyolet'],
    'Ibiza': ['Centro', 'Figueretas', 'Playa d\'en Bossa', 'Talamanca'],
    'Mahón': ['Centro', 'Es Castell', 'Sant Climent'],
    'Manacor': ['Centro', 'Fartàritx', 'Sa Torre'],
    'Inca': ['Centro', 'Crist Rei', 'Es Blanquer']
  },

  // Asturias
  'Asturias': {
    'Oviedo': ['Buenavista', 'Centro', 'Ciudad Naranco', 'El Cristo', 'La Argañosa', 'Teatinos', 'Vallobín'],
    'Gijón': ['Centro', 'Cimadevilla', 'El Coto', 'El Llano', 'La Arena', 'La Calzada', 'Nuevo Gijón'],
    'Avilés': ['Centro', 'La Luz', 'Sabugo', 'Versalles'],
    'Mieres': ['Centro', 'La Villa', 'Santullano'],
    'Langreo': ['Centro', 'La Felguera', 'Sama']
  },

  // Cantabria
  'Cantabria': {
    'Santander': ['Alisal', 'Castilla-Hermida', 'Centro', 'El Sardinero', 'General Dávila', 'Monte', 'Nueva Montaña', 'Numancia'],
    'Torrelavega': ['Centro', 'La Inmobiliaria', 'Mies de Vega', 'Sierrapando'],
    'Castro Urdiales': ['Brazomar', 'Centro', 'Cotolino'],
    'Camargo': ['Escobedo', 'Herrera', 'Maliaño']
  },

  // Extremadura
  'Extremadura': {
    'Badajoz': ['Centro', 'Cerro de Reyes', 'La Paz', 'San Fernando', 'San Roque', 'Valdepasillas'],
    'Cáceres': ['Aldea Moret', 'Centro', 'Mejostilla', 'Nuevo Cáceres', 'San Blas']
  },

  // Navarra
  'Navarra': {
    'Pamplona': ['Azpilagaña', 'Buztintxuri', 'Casco Antiguo', 'Chantrea', 'Ensanche', 'Iturrama', 'Mendebaldea', 'Rochapea', 'San Jorge', 'San Juan'],
    'Tudela': ['Centro', 'Griseras', 'Lourdes', 'Virgen de la Cabeza'],
    'Barañáin': ['Centro', 'San Andrés'],
    'Burlada': ['Centro', 'Santa Engracia'],
    'Estella': ['Centro', 'San Miguel', 'San Pedro']
  },

  // La Rioja
  'La Rioja': {
    'Logroño': ['Casco Antiguo', 'Centro', 'El Cubo', 'Madre de Dios', 'San Adrián', 'Siete Infantes de Lara', 'Yagüe'],
    'Calahorra': ['Centro', 'La Planilla', 'San Andrés'],
    'Arnedo': ['Centro', 'Fátima', 'San Blas'],
    'Haro': ['Centro', 'El Mazo', 'La Vega']
  },

  // Ceuta
  'Ceuta': {
    'Ceuta': ['Benzú', 'Campo Exterior', 'Centro', 'Hadú', 'San José', 'Sarchal']
  },

  // Melilla
  'Melilla': {
    'Melilla': ['Barrio Hebreo', 'Centro', 'Industrial', 'Real', 'Reina Regente']
  }
}
