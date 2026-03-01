// Argentina: Provincia → Ciudad → Barrio/Localidad
// Estructura para delivery: barrios y zonas dentro de ciudades principales

export const argentinaDistricts: Record<string, Record<string, string[]>> = {
  // Ciudad Autónoma de Buenos Aires - 48 barrios oficiales
  'CABA': {
    'Buenos Aires': [
      'Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano',
      'Boedo', 'Caballito', 'Chacarita', 'Coghlan', 'Colegiales',
      'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal',
      'Liniers', 'Mataderos', 'Monte Castro', 'Montserrat', 'Nueva Pompeya',
      'Núñez', 'Palermo', 'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas',
      'Parque Patricios', 'Puerto Madero', 'Recoleta', 'Retiro', 'Saavedra',
      'San Cristóbal', 'San Nicolás', 'San Telmo', 'Vélez Sarsfield', 'Versalles',
      'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre',
      'Villa Lugano', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón',
      'Villa Real', 'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza'
    ]
  },

  // Buenos Aires (Provincia) - Partidos del Gran Buenos Aires y principales ciudades
  'Buenos Aires': {
    'Avellaneda': ['Avellaneda Centro', 'Dock Sud', 'Gerli', 'Piñeyro', 'Sarandí', 'Villa Domínico', 'Wilde'],
    'Bahía Blanca': ['Aldea Romana', 'Bahía Blanca Centro', 'Barrio Parque Palihue', 'Ingeniero White', 'Noroeste', 'Tiro Federal', 'Villa Mitre'],
    'Berazategui': ['Berazategui Centro', 'El Pato', 'Hudson', 'Juan María Gutiérrez', 'Pereyra', 'Plátanos', 'Ranelagh', 'Sourigues', 'Villa España'],
    'Esteban Echeverría': ['9 de Abril', 'Canning', 'El Jagüel', 'Luis Guillón', 'Monte Grande'],
    'Ezeiza': ['Aeropuerto', 'Carlos Spegazzini', 'Ezeiza Centro', 'La Unión', 'Tristán Suárez'],
    'Florencio Varela': ['Bosques', 'Florencio Varela Centro', 'Gobernador Costa', 'Ingeniero Allan', 'Villa Brown', 'Villa San Luis', 'Villa Vatteone', 'Zeballos'],
    'General San Martín': ['Billinghurst', 'Chilavert', 'Ciudad del Libertador', 'José León Suárez', 'San Andrés', 'San Martín Centro', 'Villa Ballester', 'Villa Lynch', 'Villa Maipú'],
    'Hurlingham': ['Hurlingham Centro', 'Villa Santos Tesei', 'William C. Morris'],
    'Ituzaingó': ['Ituzaingó Centro', 'Villa Udaondo'],
    'José C. Paz': ['José C. Paz Centro', 'Del Viso'],
    'La Matanza': ['Ciudad Evita', 'González Catán', 'Gregorio de Laferrere', 'Isidro Casanova', 'La Tablada', 'Lomas del Mirador', 'Rafael Castillo', 'Ramos Mejía', 'San Justo', 'Tapiales', 'Villa Luzuriaga', 'Villa Madero', 'Virrey del Pino'],
    'La Plata': ['Abasto', 'Altos de San Lorenzo', 'Berisso', 'City Bell', 'El Mondongo', 'Ensenada', 'Gonnet', 'La Plata Centro', 'Los Hornos', 'Ringuelet', 'San Carlos', 'Tolosa', 'Villa Elisa', 'Villa Elvira'],
    'Lanús': ['Gerli', 'Lanús Este', 'Lanús Oeste', 'Monte Chingolo', 'Remedios de Escalada', 'Valentín Alsina'],
    'Lomas de Zamora': ['Banfield', 'Llavallol', 'Lomas de Zamora Centro', 'Temperley', 'Turdera'],
    'Malvinas Argentinas': ['Grand Bourg', 'Ingeniero Adolfo Sourdeaux', 'Los Polvorines', 'Pablo Nogués', 'Tierras Altas', 'Villa de Mayo', 'Tortuguitas'],
    'Mar del Plata': ['Alfar', 'Camet', 'Centro', 'Chapadmalal', 'Constitución', 'Don Bosco', 'El Grosellar', 'Faro Norte', 'La Perla', 'Las Avenidas', 'Los Troncos', 'Pinos de Anchorena', 'Playa Grande', 'Punta Mogotes', 'San Carlos', 'San Juan', 'Sierra de los Padres'],
    'Merlo': ['Libertad', 'Mariano Acosta', 'Merlo Centro', 'Parque San Martín', 'Pontevedra', 'San Antonio de Padua'],
    'Moreno': ['Cuartel V', 'Francisco Álvarez', 'La Reja', 'Moreno Centro', 'Paso del Rey', 'Trujui'],
    'Morón': ['Castelar', 'El Palomar', 'Haedo', 'Morón Centro', 'Villa Sarmiento'],
    'Pilar': ['Del Viso', 'Fátima', 'La Lonja', 'Manzanares', 'Manuel Alberti', 'Pilar Centro', 'President Derqui', 'Tortuguitas', 'Villa Astolfi', 'Villa Rosa'],
    'Quilmes': ['Bernal', 'Don Bosco', 'Ezpeleta', 'Quilmes Centro', 'Quilmes Oeste', 'San Francisco Solano', 'Villa La Florida'],
    'San Fernando': ['San Fernando Centro', 'Victoria', 'Virreyes'],
    'San Isidro': ['Acassuso', 'Beccar', 'Boulogne', 'La Horqueta', 'Martínez', 'San Isidro Centro', 'Villa Adelina'],
    'San Miguel': ['Bella Vista', 'Campo de Mayo', 'Muñiz', 'San Miguel Centro', 'Santa María'],
    'San Nicolás': ['La Emilia', 'San Nicolás de los Arroyos'],
    'Tandil': ['Cerro Centinela', 'Tandil Centro', 'Villa Italia', 'Villa del Lago'],
    'Tigre': ['Benavídez', 'Don Torcuato', 'El Talar', 'General Pacheco', 'Nordelta', 'Rincón de Milberg', 'Tigre Centro', 'Troncos del Talar'],
    'Tres de Febrero': ['Caseros', 'Ciudadela', 'El Libertador', 'José Ingenieros', 'Loma Hermosa', 'Martín Coronado', 'Pablo Podestá', 'Sáenz Peña', 'Santos Lugares', 'Villa Bosch', 'Villa Raffo'],
    'Vicente López': ['Carapachay', 'Florida', 'La Lucila', 'Munro', 'Olivos', 'Vicente López Centro', 'Villa Adelina', 'Villa Martelli'],
    'Zárate': ['Lima', 'Zárate Centro']
  },

  // Córdoba
  'Córdoba': {
    'Córdoba': [
      'Alberdi', 'Alta Córdoba', 'Argüello', 'Barrio Jardín', 'Bella Vista',
      'Centro', 'Cerro de las Rosas', 'Cofico', 'General Bustos', 'General Paz',
      'Güemes', 'Juniors', 'Los Boulevares', 'Los Naranjos', 'Marqués de Sobremonte',
      'Nueva Córdoba', 'Observatorio', 'Pueyrredón', 'San Martín', 'San Vicente',
      'Villa Belgrano', 'Villa Cabrera', 'Villa Carlos Paz', 'Villa El Libertador',
      'Yofre Norte', 'Yofre Sur'
    ],
    'Villa Carlos Paz': ['Centro', 'Costanera', 'San Antonio', 'Villa del Lago', 'Villa Independencia'],
    'Río Cuarto': ['Alberdi', 'Banda Norte', 'Centro', 'Las Delicias', 'Palermo'],
    'Villa María': ['Centro', 'Las Acacias', 'Nicolás Avellaneda', 'San Martín']
  },

  // Santa Fe
  'Santa Fe': {
    'Rosario': [
      'Abasto', 'Alberdi', 'Alberto Olmedo', 'Belgrano', 'Centro', 'Echesortu',
      'Fisherton', 'La Florida', 'Lourdes', 'Luis Agote', 'Parque España',
      'Parque Independencia', 'Pichincha', 'Puerto Norte', 'Refinería', 'Remedios de Escalada',
      'República de la Sexta', 'Sarmiento', 'Tiro Suizo', 'Urquiza'
    ],
    'Santa Fe': ['Barranquitas', 'Candioti', 'Centro', 'Guadalupe', 'La Guardia', 'Mayoraz', 'Roma', 'Sur', 'Villa Setúbal'],
    'Rafaela': ['Alberdi', 'Centro', 'Italia', 'Pizzurno', 'Sarmiento']
  },

  // Mendoza
  'Mendoza': {
    'Mendoza': [
      'Bombal', 'Centro', 'Cuarta Sección', 'Parque Central', 'Primera Sección',
      'Quinta Sección', 'Segunda Sección', 'Sexta Sección', 'Tercera Sección'
    ],
    'Godoy Cruz': ['Benegas', 'Centro', 'Gobernador Benegas', 'Presidente Sarmiento', 'Villa Marini'],
    'Guaymallén': ['Bermejo', 'Dorrego', 'El Bermejo', 'Las Cañas', 'Pedro Molina', 'San José', 'Villa Nueva'],
    'Las Heras': ['El Challao', 'El Plumerillo', 'El Resguardo', 'Las Heras Centro', 'Panquehua'],
    'San Rafael': ['Centro', 'Cuadro Nacional', 'Rama Caída', 'Villa Atuel']
  },

  // Tucumán
  'Tucumán': {
    'San Miguel de Tucumán': [
      'Barrio Norte', 'Barrio Sur', 'Centro', 'Ciudadela', 'El Corte',
      'Floresta', 'Mate de Luna', 'Parque 9 de Julio', 'Villa 9 de Julio', 'Yerba Buena'
    ],
    'Yerba Buena': ['Centro', 'Country', 'Marcos Paz', 'Villa Carmela']
  },

  // Salta
  'Salta': {
    'Salta': [
      'Aráoz', 'Balcarce', 'Castañares', 'Centro', 'Ciudad del Milagro',
      'El Huaico', 'El Tribuno', 'Grand Bourg', 'La Loma', 'Parque Belgrano',
      'Portezuelo', 'San Bernardo', 'Tres Cerritos', 'Villa Las Rosas', 'Villa San Antonio'
    ]
  },

  // Entre Ríos
  'Entre Ríos': {
    'Paraná': ['Bajada Grande', 'Centro', 'La Floresta', 'La Picada', 'Paracao', 'San Agustín', 'San Benito'],
    'Concordia': ['Centro', 'Las Piedras', 'Villa Adela', 'Villa Zorraquín'],
    'Gualeguaychú': ['Centro', 'Costa Uruguay Sur', 'Golf', 'Suburbio Sur']
  },

  // Neuquén
  'Neuquén': {
    'Neuquén': ['Alta Barda', 'Bouquet Roldán', 'Centro', 'El Progreso', 'Parque Industrial', 'San Patricio', 'Valentina Norte', 'Villa Ceferino', 'Villa Farrell'],
    'San Martín de los Andes': ['Centro', 'Costa del Lago', 'Las Pendientes', 'Vega Plana']
  },

  // Río Negro
  'Río Negro': {
    'San Carlos de Bariloche': [
      'Centro', 'El Cóndor', 'Km 5', 'Km 8', 'Las Victorias',
      'Llao Llao', 'Melipal', 'Ñireco', 'Playa Bonita', 'Villa Los Coihues'
    ],
    'Viedma': ['Centro', 'El Cóndor', 'Mi Bandera', 'Zatti']
  },

  // Chubut
  'Chubut': {
    'Comodoro Rivadavia': ['Centro', 'General Mosconi', 'Km 3', 'Km 5', 'Próspero Palazzo', 'Rada Tilly', 'San Cayetano'],
    'Trelew': ['Centro', 'Don Bosco', 'Norte', 'Planta de Gas', 'Sur']
  },

  // Corrientes
  'Corrientes': {
    'Corrientes': ['Barrio Ferré', 'Barrio Laguna Seca', 'Centro', 'Molina Punta', 'Santa Catalina', 'Villa Raquel']
  },

  // Misiones
  'Misiones': {
    'Posadas': ['Centro', 'El Brete', 'Itaembé Miní', 'Miguel Lanús', 'Palomar', 'Villa Cabello', 'Villa Sarita'],
    'Puerto Iguazú': ['1° de Mayo', 'Centro', 'Puerto Libertad', 'Villa Alta']
  },

  // San Juan
  'San Juan': {
    'San Juan': ['Centro', 'Concepción', 'Desamparados', 'Rivadavia', 'Santa Lucía', 'Trinidad']
  },

  // San Luis
  'San Luis': {
    'San Luis': ['Barrio Rawson', 'Centro', 'Eva Perón', 'Jardines del Sur', 'La Punta'],
    'Villa Mercedes': ['Barrio Sur', 'Centro', 'Justo Daract']
  },

  // Santiago del Estero
  'Santiago del Estero': {
    'Santiago del Estero': ['Autonomía', 'Belgrano', 'Centro', 'Huaico Hondo', 'Jorge Newbery', 'La Banda'],
    'La Banda': ['Centro', 'Independencia', 'Moreno']
  },

  // Jujuy
  'Jujuy': {
    'San Salvador de Jujuy': ['Alto Comedero', 'Alto La Viña', 'Centro', 'Ciudad de Nieva', 'Coronel Arias', 'Los Perales', 'San Pedrito']
  },

  // Catamarca
  'Catamarca': {
    'San Fernando del Valle de Catamarca': ['Banda de Varela', 'Centro', 'Parque América', 'Valle Chico', 'Villa Cubas']
  },

  // La Rioja
  'La Rioja': {
    'La Rioja': ['Barrio Facundo Quiroga', 'Centro', 'Juan Domingo Perón', 'Vargas']
  },

  // Formosa
  'Formosa': {
    'Formosa': ['Centro', 'Eva Perón', 'Liborsi', 'San Martín', 'Villa del Carmen']
  },

  // Chaco
  'Chaco': {
    'Resistencia': ['Barranqueras', 'Centro', 'Fontana', 'Puerto Vilelas', 'Villa Río Negro'],
    'Presidencia Roque Sáenz Peña': ['Centro', 'El Triángulo', 'Norte', 'Sur']
  },

  // La Pampa
  'La Pampa': {
    'Santa Rosa': ['Centro', 'Villa Germinal', 'Villa Santillán']
  },

  // Santa Cruz
  'Santa Cruz': {
    'Río Gallegos': ['Barrio Belgrano', 'Centro', 'Güer Aike', 'Nuestra Señora del Carmen'],
    'El Calafate': ['Centro', 'Los Álamos', 'Los Notros', 'Virgen de Luján']
  },

  // Tierra del Fuego
  'Tierra del Fuego': {
    'Ushuaia': ['Centro', 'Los Ñires', 'Andino', 'Bahía Golondrina'],
    'Río Grande': ['Centro', 'Chacra II', 'Chacra IV', 'Margen Sur']
  }
}
