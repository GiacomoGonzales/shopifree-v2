// Ecuador: Provincia → Cantón → Barrio/Parroquia Urbana
// Estructura para delivery: barrios de ciudades principales

export const ecuadorDistricts: Record<string, Record<string, string[]>> = {
  // Pichincha
  'Pichincha': {
    'Quito': [
      'Centro Histórico', 'La Mariscal', 'La Floresta', 'González Suárez', 'Iñaquito',
      'La Carolina', 'Bellavista', 'Rumipamba', 'Jipijapa', 'Cochapamba',
      'Concepción', 'Kennedy', 'Comité del Pueblo', 'El Condado', 'Carcelén',
      'Cotocollao', 'Ponceano', 'La Ecuatoriana', 'Quitumbe', 'Chillogallo',
      'Solanda', 'La Argelia', 'Chimbacalle', 'La Magdalena', 'San Bartolo',
      'La Ferroviaria', 'Guamaní', 'Turubamba', 'El Bosque', 'El Inca',
      'Nayón', 'Cumbayá', 'Tumbaco', 'Conocoto', 'San Rafael'
    ],
    'Rumiñahui': ['Sangolquí Centro', 'San Pedro de Taboada', 'San Rafael', 'Selva Alegre', 'Fajardo'],
    'Cayambe': ['Centro', 'Ayora', 'Juan Montalvo', 'Cangahua', 'Olmedo'],
    'Mejía': ['Machachi', 'Aloag', 'Aloasí', 'Cutuglahua', 'Tambillo', 'Uyumbicho']
  },

  // Guayas
  'Guayas': {
    'Guayaquil': [
      'Centro', 'Urdesa', 'Kennedy', 'Alborada', 'Sauces', 'Samanes',
      'Ceibos', 'La Garzota', 'Tarqui', 'Ciudadela Universitaria', 'Mapasingue',
      'Prosperina', 'Bastión Popular', 'Guasmo', 'Suburbio', 'Las Orquídeas',
      'Mucho Lote', 'Perimetral', 'Samborondón', 'Puerto Santa Ana', 'Las Peñas',
      'Centenario', 'Ximena', 'García Moreno', 'Febres Cordero', 'Letamendi',
      'Ayacucho', 'Bolívar', 'Olmedo', 'Rocafuerte', 'Roca', 'Sucre', 'Tarqui'
    ],
    'Durán': ['Centro', 'Abel Gilbert', 'El Recreo', 'Las Acacias', 'Los Helechos', 'Primavera'],
    'Samborondón': ['Centro', 'Ciudad Celeste', 'Entre Ríos', 'La Puntilla', 'Tornero'],
    'Daule': ['Centro', 'La Aurora', 'Limonal', 'Los Vergeles', 'Petrillo'],
    'Milagro': ['Centro', 'Chirijos', 'Las Piñas', 'Los Vergeles', 'Mariscal Sucre', 'San Francisco']
  },

  // Azuay
  'Azuay': {
    'Cuenca': [
      'Centro Histórico', 'El Batán', 'El Ejido', 'El Vergel', 'Gil Ramírez Dávalos',
      'Hermano Miguel', 'Machángara', 'Monay', 'San Blas', 'San Sebastián',
      'Sucre', 'Totoracocha', 'Yanuncay', 'Bellavista', 'Cañaribamba',
      'Huayna Cápac', 'Sayausí', 'San Joaquín', 'Turi', 'Valle'
    ],
    'Gualaceo': ['Centro', 'Daniel Córdova', 'Jadán', 'Luis Cordero Vega', 'Mariano Moreno', 'Zhidmad'],
    'Paute': ['Centro', 'Bulán', 'Chicán', 'El Cabo', 'Guarainag', 'San Cristóbal']
  },

  // Manabí
  'Manabí': {
    'Portoviejo': [
      'Centro', '12 de Marzo', '18 de Octubre', 'Abdón Calderón', 'Andrés de Vera',
      'Colón', 'Francisco Pacheco', 'Los Tamarindos', 'Mejía', 'San Pablo',
      'Simón Bolívar', 'Velasco Ibarra'
    ],
    'Manta': [
      'Centro', 'Barbasquillo', 'Córdova', 'El Murciélago', 'Los Esteros',
      'Manta 2000', 'San Mateo', 'Tarqui', 'Umiña', 'Urbirrios'
    ],
    'Montecristi': ['Centro', 'Bajo de Afuera', 'El Pueblito', 'La Pila', 'Las Cañitas', 'San Eloy'],
    'Chone': ['Centro', 'Canuto', 'Convento', 'Eloy Alfaro', 'Ricaurte', 'San Antonio', 'Santa Rita'],
    'El Carmen': ['Centro', 'El Paraíso', 'La Fortuna', 'San Pedro de Suma', 'Wilfrido Loor']
  },

  // El Oro
  'El Oro': {
    'Machala': [
      'Centro', '10 de Agosto', 'El Cambio', 'El Porteño', 'Jubones',
      'La Providencia', 'Las Brisas', 'Nueve de Mayo', 'Puerto Bolívar', 'Rayito de Luz'
    ],
    'Pasaje': ['Centro', 'Buenavista', 'Casacay', 'El Progreso', 'La Peaña', 'Loma de Franco'],
    'Santa Rosa': ['Centro', 'Bellavista', 'Jambelí', 'La Avanzada', 'Nuevo Santa Rosa', 'Torata'],
    'Huaquillas': ['Centro', 'El Cisne', 'Milton Reyes', 'Primero de Mayo', 'Unión Lojana']
  },

  // Tungurahua
  'Tungurahua': {
    'Ambato': [
      'Centro', 'Atocha', 'Celiano Monge', 'Ficoa', 'Huachi Chico',
      'Huachi Grande', 'Ingahurco', 'La Merced', 'La Matriz', 'La Península',
      'Pishilata', 'San Francisco', 'Santa Rosa', 'Totoras'
    ],
    'Baños de Agua Santa': ['Centro', 'Lligua', 'Río Negro', 'Río Verde', 'Ulba'],
    'Pelileo': ['Centro', 'Benítez', 'Cotaló', 'García Moreno', 'Guambaló', 'Salasaca']
  },

  // Loja
  'Loja': {
    'Loja': [
      'Centro Histórico', 'El Pedestal', 'El Sagrario', 'El Valle', 'La Pradera',
      'Motupe', 'Punzara', 'San Sebastián', 'Sucre', 'Valle'
    ],
    'Catamayo': ['Centro', 'El Tambo', 'Guayquichuma', 'San José', 'San Pedro de la Bendita', 'Zambi'],
    'Macará': ['Centro', 'La Victoria', 'Larama', 'Sabiango']
  },

  // Imbabura
  'Imbabura': {
    'Ibarra': [
      'Centro', 'Alpachaca', 'Azaya', 'Caranqui', 'El Sagrario',
      'Huertos Familiares', 'La Victoria', 'Los Ceibos', 'Priorato', 'San Francisco',
      'Yacucalle', 'Yaguarcocha'
    ],
    'Otavalo': ['Centro', 'El Jordán', 'El Empedrado', 'La Joya', 'San Juan de Ilumán', 'San Pablo del Lago'],
    'Cotacachi': ['Centro', 'El Sagrario', 'Imantag', 'Quiroga', 'San Francisco'],
    'Antonio Ante': ['Atuntaqui Centro', 'Andrade Marín', 'Chaltura', 'Natabuela', 'San José de Chaltura']
  },

  // Chimborazo
  'Chimborazo': {
    'Riobamba': [
      'Centro', 'Lizarzaburu', 'Maldonado', 'Velasco', 'Veloz', 'Yaruquíes',
      'La Condamine', 'San Juan', 'Santa Rosa', 'Terminal'
    ],
    'Guano': ['Centro', 'El Rosario', 'La Matriz', 'San Andrés', 'San Isidro de Patulú'],
    'Chambo': ['Centro', 'La Matriz', 'San Francisco']
  },

  // Esmeraldas
  'Esmeraldas': {
    'Esmeraldas': [
      'Centro', '15 de Marzo', 'Aire Libre', 'Codesa', 'La Propicia',
      'Las Palmas', 'San Rafael', 'Simón Plata Torres', 'Sur', 'Vuelta Larga'
    ],
    'Atacames': ['Centro', 'Mompiche', 'Same', 'Súa', 'Tonchigüe', 'Tonsupa'],
    'Quinindé': ['Centro', 'Cube', 'La Unión', 'Malimpia', 'Rosa Zárate', 'Viche']
  },

  // Santo Domingo de los Tsáchilas
  'Santo Domingo de los Tsáchilas': {
    'Santo Domingo': [
      'Centro', 'Abraham Calazacón', 'Bombolí', 'Chigüilpe', 'Del Toachi',
      'Julio Moreno', 'Kasama', 'Los Rosales', 'Nueva Aurora', 'Río Toachi',
      'Río Verde', 'San Jacinto del Búa', 'Santo Domingo de los Colorados', 'Zaracay'
    ]
  },

  // Santa Elena
  'Santa Elena': {
    'Santa Elena': ['Centro', 'Atahualpa', 'Ballenita', 'Colonche', 'Manglaralto', 'San José de Ancón', 'Simón Bolívar'],
    'La Libertad': ['Centro', 'Enríquez Gallo', 'General Alberto Enríquez', 'La Carioca', 'San Lorenzo'],
    'Salinas': ['Chipipe', 'General Enríquez Gallo', 'José Luis Tamayo', 'Mar Bravo', 'Punta Carnero', 'Santa Rosa']
  },

  // Los Ríos
  'Los Ríos': {
    'Babahoyo': [
      'Centro', 'Barreiro', 'Camilo Ponce', 'Clemente Baquerizo', 'El Salto',
      'Febres Cordero', 'La Unión', 'Pimocha'
    ],
    'Quevedo': [
      'Centro', '24 de Mayo', 'El Guayacán', 'Nicolás Infante Díaz', 'San Camilo',
      'San Cristóbal', 'Siete de Octubre', 'Venus del Río Quevedo', 'Viva Alfaro'
    ],
    'Ventanas': ['Centro', 'Chacarita', 'Los Ángeles', 'Zapotal'],
    'Vinces': ['Centro', 'Antonio Sotomayor', 'Abras de Mantequilla', 'Palenque Nuevo']
  },

  // Cotopaxi
  'Cotopaxi': {
    'Latacunga': [
      'Centro', 'Eloy Alfaro', 'Ignacio Flores', 'Juan Montalvo', 'La Matriz',
      'San Buenaventura', 'San Felipe'
    ],
    'Salcedo': ['Centro', 'Cusubamba', 'Mulalillo', 'Mulliquindil', 'Panzaleo', 'San Miguel'],
    'La Maná': ['Centro', 'El Carmen', 'El Triunfo', 'Guasaganda', 'Pucayacu']
  },

  // Carchi
  'Carchi': {
    'Tulcán': [
      'Centro', 'González Suárez', 'Julio Andrade', 'Pioter', 'Santa Martha de Cuba',
      'Tufiño', 'Urbina'
    ],
    'Montúfar': ['Centro', 'Chitán de Navarrete', 'Cristóbal Colón', 'Fernández Salvador', 'La Paz', 'San Gabriel']
  },

  // Sucumbíos
  'Sucumbíos': {
    'Lago Agrio': [
      'Centro', 'El Eno', 'General Farfán', 'Nueva Loja', 'Pacayacu',
      'Presley Baquerizo', 'Santa Cecilia'
    ],
    'Shushufindi': ['Centro', 'Limoncocha', 'Pañacocha', 'San Pedro de los Cofanes', 'San Roque', 'Siete de Julio']
  },

  // Napo
  'Napo': {
    'Tena': ['Centro', 'Ahuano', 'Archidona', 'Misahuallí', 'Muyuna', 'Puerto Napo', 'San Juan de Muyuna'],
    'Archidona': ['Centro', 'Cotundo', 'San Pablo de Ushpayacu']
  },

  // Orellana
  'Orellana': {
    'Francisco de Orellana': [
      'Centro', 'Dayuma', 'El Dorado', 'Inés Arango', 'La Belleza',
      'Nuevo Paraíso', 'Puerto Francisco de Orellana', 'San José de Guayusa', 'Taracoa'
    ],
    'La Joya de los Sachas': ['Centro', 'Enokanki', 'Pompeya', 'San Carlos', 'San Sebastián del Coca', 'Tres de Noviembre']
  },

  // Pastaza
  'Pastaza': {
    'Pastaza': [
      'Centro', 'Canelos', 'Fátima', 'Montalvo', 'Puyo Centro',
      'Río Corrientes', 'Río Tigre', 'Sarayacu', 'Simón Bolívar', 'Tarqui', 'Teniente Hugo Ortiz', 'Veracruz'
    ]
  },

  // Morona Santiago
  'Morona Santiago': {
    'Morona': [
      'Macas Centro', 'Alshi', 'General Proaño', 'Río Blanco', 'San Isidro',
      'Sevilla Don Bosco', 'Sinaí', 'Zuña'
    ],
    'Sucúa': ['Centro', 'Asunción', 'Huambi', 'Santa Marianita de Jesús']
  },

  // Zamora-Chinchipe
  'Zamora-Chinchipe': {
    'Zamora': ['Centro', 'Cumbaratza', 'El Limón', 'Guadalupe', 'Imbana', 'Sabanilla', 'San Carlos de las Minas', 'Timbara'],
    'Yantzaza': ['Centro', 'Chicaña', 'Los Encuentros']
  },

  // Cañar
  'Cañar': {
    'Azogues': ['Centro', 'Aurelio Bayas', 'Borrero', 'Cojitambo', 'Guapán', 'Luis Cordero', 'San Francisco'],
    'La Troncal': ['Centro', 'La Puntilla', 'Manuel de J. Calle', 'Pancho Negro'],
    'Cañar': ['Centro', 'Chontamarca', 'Chorocopte', 'General Morales', 'Gualleturo', 'Honorato Vásquez', 'Ingapirca', 'Juncal', 'San Antonio', 'Zhud']
  },

  // Bolívar
  'Bolívar': {
    'Guaranda': ['Centro', 'Ángel Polibio Chaves', 'Gabriel Ignacio de Veintimilla', 'Guanujo', 'Julio E. Moreno', 'Salinas', 'San Lorenzo', 'San Simón', 'Santafé', 'Simiatug'],
    'San Miguel': ['Centro', 'Balsapamba', 'Bilován', 'Regulo de Mora', 'San Pablo de Atenas', 'San Vicente', 'Santiago']
  },

  // Galápagos
  'Galápagos': {
    'Santa Cruz': ['Puerto Ayora', 'Baltra', 'Bellavista', 'Santa Rosa'],
    'San Cristóbal': ['Puerto Baquerizo Moreno', 'El Progreso', 'Isla Floreana'],
    'Isabela': ['Puerto Villamil', 'Santo Tomás']
  }
}
