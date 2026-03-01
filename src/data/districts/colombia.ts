// Colombia: Departamento → Municipio → Barrio
// Estructura para delivery: barrios de ciudades principales

export const colombiaDistricts: Record<string, Record<string, string[]>> = {
  // Bogotá D.C. - Localidades
  'Bogotá D.C.': {
    'Bogotá': [
      'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme',
      'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá',
      'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño',
      'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'
    ]
  },

  // Antioquia
  'Antioquia': {
    'Medellín': [
      'El Poblado', 'Laureles-Estadio', 'La Candelaria', 'Castilla', 'Aranjuez',
      'Doce de Octubre', 'Robledo', 'Villa Hermosa', 'Buenos Aires', 'La América',
      'San Javier', 'Guayabal', 'Belén', 'Manrique', 'Santa Cruz', 'Popular'
    ],
    'Bello': ['Centro', 'Niquía', 'Niquia Parte Alta', 'Zamora', 'La Cumbre', 'Guasimalito', 'Hato Viejo', 'París'],
    'Envigado': ['Centro', 'La Magnolia', 'Las Vegas', 'Loma del Atravesado', 'Loma del Escobero', 'San José', 'Zúñiga'],
    'Itagüí': ['Centro', 'Ditaires', 'La Feria', 'Los Naranjos', 'Samaria', 'Santa María', 'Yarumito'],
    'Sabaneta': ['Centro', 'Calle Larga', 'La Doctora', 'Las Casitas', 'Mayorca', 'Pan de Azúcar', 'Restrepo Naranjo'],
    'Rionegro': ['Centro', 'Cuatro Esquinas', 'El Porvenir', 'Gualanday', 'La Mosca', 'San Antonio', 'Los Colegios'],
    'Apartadó': ['Centro', 'Barrio Obrero', 'La Chinita', 'Alfonso López', 'Diana Turbay', 'El Bosque', 'Fundadores']
  },

  // Valle del Cauca
  'Valle del Cauca': {
    'Cali': [
      'Centro', 'San Fernando', 'El Peñón', 'Granada', 'Versalles',
      'Ciudad Jardín', 'San Antonio', 'Tequendama', 'Aguablanca', 'Siloé',
      'Alfonso López', 'El Limonar', 'La Flora', 'Meléndez', 'Pance',
      'Valle del Lili', 'Santa Mónica', 'El Ingenio', 'Capri', 'San Nicolás'
    ],
    'Palmira': ['Centro', 'La Colombina', 'Zamorano', 'Santa Bárbara', 'Llano Grande', 'La Emilia', 'Pomona'],
    'Buenaventura': ['Centro', 'El Firme', 'La Playita', 'Pueblo Nuevo', 'San Francisco', 'Cascajal', 'El Lleras'],
    'Tuluá': ['Centro', 'Alamos', 'El Principe', 'La Graciela', 'Farfán', 'Sajonia', 'Victoria'],
    'Buga': ['Centro', 'El Albergue', 'José María Cabal', 'La Merced', 'Ricaurte', 'San José', 'El Vergel'],
    'Jamundí': ['Centro', 'Alfaguara', 'Bochalema', 'Terranova', 'Ciudad Pacífica', 'El Castillo', 'Puerto Viejo']
  },

  // Atlántico
  'Atlántico': {
    'Barranquilla': [
      'Centro', 'El Prado', 'Alto Prado', 'Ciudad Jardín', 'El Golf',
      'Riomar', 'Villa Country', 'La Concepción', 'Boston', 'Las Delicias',
      'Modelo', 'San Francisco', 'Barrio Abajo', 'La Victoria', 'Soledad 2000',
      'San Vicente', 'El Recreo', 'Bellavista', 'La Pradera', 'El Tabor'
    ],
    'Soledad': ['Centro', 'Villa Katanga', 'Las Moras', 'La Central', 'El Hipódromo', 'Villa María', 'Normandía', 'Los Cusules'],
    'Malambo': ['Centro', 'Concorde', 'El Carmen', 'El Tesoro', 'La Bonga', 'La Popa', 'Mesolandia'],
    'Sabanalarga': ['Centro', 'Buenos Aires', 'Centro Alegre', 'La Paz', 'San Nicolás', 'El Carmen']
  },

  // Bolívar
  'Bolívar': {
    'Cartagena': [
      'Centro Histórico', 'Getsemaní', 'San Diego', 'Bocagrande', 'Laguito',
      'Castillogrande', 'Manga', 'El Cabrero', 'Crespo', 'Marbella',
      'Pie de la Popa', 'Torices', 'El Bosque', 'La Boquilla', 'Pozón',
      'Olaya', 'El Socorro', 'Nelson Mandela', 'San Fernando', 'La Esperanza'
    ],
    'Magangué': ['Centro', 'Aeropuerto', 'Alfonso López', 'Camilo Torres', 'El Parnaso', 'San Martín', 'Versalles'],
    'Turbaco': ['Centro', 'El Recreo', 'La Floresta', 'Los Calamares', 'Portal de las Américas', 'Villa Rosita']
  },

  // Santander
  'Santander': {
    'Bucaramanga': [
      'Centro', 'Cabecera', 'Sotomayor', 'San Francisco', 'La Concordia',
      'Pan de Azúcar', 'El Prado', 'Alvarez', 'Girardot', 'Ciudadela Real de Minas',
      'La Victoria', 'Provenza', 'La Floresta', 'Cañaveral', 'Lagos del Cacique',
      'San Alonso', 'La Aurora', 'El Jardín', 'Alfonso López', 'Kennedy'
    ],
    'Floridablanca': ['Centro', 'Cañaveral', 'Caldas', 'Lagos', 'Villabel', 'Ciudad Valencia', 'Santa Ana'],
    'Girón': ['Centro', 'El Poblado', 'Rincón de Girón', 'Hacienda San Juan', 'Portal de San Juan', 'Acapulco'],
    'Piedecuesta': ['Centro', 'La Cantera', 'La Feria', 'Paseo del Puente', 'Pinares', 'San Francisco', 'Villa Lourdes'],
    'Barrancabermeja': ['Centro', 'Buenavista', 'Colombia', 'El Comercio', 'El Rosario', 'Galán', 'La Victoria', 'Yariguíes']
  },

  // Cundinamarca
  'Cundinamarca': {
    'Soacha': ['Centro', 'Ciudadela Sucre', 'Compartir', 'San Mateo', 'León XIII', 'Terreros', 'Cazucá', 'Ciudad Verde'],
    'Chía': ['Centro', 'Samaria', 'Santa Ana', 'Tiquiza', 'Yerbabuena', 'La Valvanera', 'Fonquetá'],
    'Zipaquirá': ['Centro', 'Algarra', 'Bolívar 83', 'El Prado', 'La Paz', 'San Carlos', 'Santa Isabel'],
    'Facatativá': ['Centro', 'Cartagenita', 'El Triunfo', 'La Florida', 'Manablanca', 'San Rafael', 'Villa Miriam'],
    'Girardot': ['Centro', 'Alto del Rosario', 'Centenario', 'El Diamante', 'Kennedy', 'Miraflores', 'Santa Helena'],
    'Fusagasugá': ['Centro', 'El Edén', 'La Independencia', 'Manila', 'Pekín', 'San Antonio', 'Santa María']
  },

  // Norte de Santander
  'Norte de Santander': {
    'Cúcuta': [
      'Centro', 'Caobos', 'La Ceiba', 'San Eduardo', 'Quinta Oriental',
      'El Llano', 'San Luis', 'Blanco', 'Callejón', 'La Libertad',
      'Pescadero', 'Aeropuerto', 'Aguas Calientes', 'La Parada', 'San Rafael'
    ],
    'Los Patios': ['Centro', 'La Garita', 'Prados del Este', 'San Agustín', 'Villa del Rosario'],
    'Villa del Rosario': ['Centro', 'Boconó', 'Juan Frío', 'La Parada', 'Lomitas', 'Santander'],
    'Ocaña': ['Centro', 'Buenos Aires', 'Cristo Rey', 'El Carmen', 'La Costa', 'La Primavera', 'Villanueva']
  },

  // Risaralda
  'Risaralda': {
    'Pereira': [
      'Centro', 'Álamos', 'Circunvalar', 'Cuba', 'Los Alpes',
      'Pinares', 'San Joaquín', 'Boston', 'El Jardín', 'Kennedy',
      'Nacederos', 'Perla del Sur', 'Samaria', 'Villa del Prado', 'Corales'
    ],
    'Dosquebradas': ['Centro', 'Campestre', 'El Japón', 'La Graciela', 'Los Molinos', 'Santa Isabel', 'Valher'],
    'Santa Rosa de Cabal': ['Centro', 'Dosquebradas', 'El Español', 'La Hermosa', 'La Samaria', 'Termales']
  },

  // Tolima
  'Tolima': {
    'Ibagué': [
      'Centro', 'Ambala', 'Calambeo', 'El Salado', 'El Vergel',
      'Jordán', 'La Francia', 'La Pola', 'Picaleña', 'San Simón',
      'Santa Helena', 'Villa Café', 'Cádiz', 'El Limonar', 'Las Américas'
    ],
    'Espinal': ['Centro', 'Chicoral', 'El Carmen', 'El Triunfo', 'La Esperanza', 'San Rafael'],
    'Melgar': ['Centro', 'Alto de la Cruz', 'El Carmen', 'La Caimanera', 'San José', 'Villa Juliana']
  },

  // Caldas
  'Caldas': {
    'Manizales': [
      'Centro', 'Chipre', 'El Cable', 'La Enea', 'La Estrella',
      'Los Cámbulos', 'Milán', 'Palermo', 'San Jorge', 'Versalles',
      'Palogrande', 'Fátima', 'El Arenillo', 'Alta Suiza', 'La Francia'
    ],
    'La Dorada': ['Centro', 'Alfonso López', 'El Japón', 'Las Ferias', 'Las Palmas', 'Pitalito', 'Dorada Antigua'],
    'Villamaría': ['Centro', 'El Edén', 'La Floresta', 'Los Sauces', 'San Carlos', 'Villa del Rosario']
  },

  // Quindío
  'Quindío': {
    'Armenia': [
      'Centro', 'Centenario', 'El Bosque', 'El Cafetero', 'La Adiela',
      'La Castellana', 'Laureles', 'Nuevo Armenia', 'Pinares', 'Profesionales',
      'Quindío', 'Simón Bolívar', 'Villa del Café', 'Yulima', 'Mercedes del Norte'
    ],
    'Calarcá': ['Centro', 'Balcones del Quindío', 'La Huerta', 'La Virginia', 'Quebrada Negra', 'Villa Jardín'],
    'Montenegro': ['Centro', 'El Prado', 'La Isabela', 'La Soledad', 'Pueblo Tapao', 'San Francisco'],
    'La Tebaida': ['Centro', 'Anapoima', 'El Edén', 'La Linda', 'Los Andes', 'Paraíso']
  },

  // Huila
  'Huila': {
    'Neiva': [
      'Centro', 'Altico', 'Buganviles', 'Cándido', 'El Jardín',
      'Ipanema', 'La Floresta', 'Las Palmas', 'Los Mártires', 'Quirinal',
      'Santa Isabel', 'Santa Librada', 'Timanco', 'Villa Colombia', 'Los Pinos'
    ],
    'Pitalito': ['Centro', 'Aguadas', 'Cálamo', 'Los Andes', 'Panorama', 'San Antonio', 'Solarte'],
    'Garzón': ['Centro', 'El Carmen', 'El Progreso', 'La Gaitana', 'Las Mercedes', 'Monserrate', 'Potreritos']
  },

  // Meta
  'Meta': {
    'Villavicencio': [
      'Centro', 'Barzal', 'El Buque', 'La Esperanza', 'La Grama',
      'Los Centauros', 'Morichal', 'Nueva Floresta', 'Porfía', 'San Benito',
      'San Isidro', 'Siete de Agosto', 'Villa Julia', 'Covisán', 'Antonio Villavicencio'
    ],
    'Acacías': ['Centro', 'Bachué', 'El Dorado', 'La Independencia', 'Los Naranjos', 'Pablo Emilio Riveros', 'Porfía'],
    'Granada': ['Centro', 'La Gaitana', 'Las Ferias', 'Los Fundadores', 'San José', 'Villa Sandra']
  },

  // Nariño
  'Nariño': {
    'Pasto': [
      'Centro', 'Chapal', 'El Pilar', 'Fátima', 'La Aurora',
      'La Carolina', 'Las Cuadras', 'Lorenzo', 'Miraflores', 'Obrero',
      'Pandiaco', 'Potrerillo', 'San Andrés', 'Santa Mónica', 'Tamasagra'
    ],
    'Ipiales': ['Centro', 'Alfonso López', 'El Charco', 'La Laguna', 'Las Lajas', 'Los Chilcos', 'San Felipe'],
    'Tumaco': ['Centro', 'Bajito', 'El Morrito', 'La Ciudadela', 'Miramar', 'Panamá', 'Viento Libre']
  },

  // Córdoba
  'Córdoba': {
    'Montería': [
      'Centro', 'Alamedas del Sinú', 'Buenavista', 'Cantaclaro', 'El Dorado',
      'El Recreo', 'La Castellana', 'La Julia', 'Los Araujos', 'Mogambo',
      'Mocarí', 'Nariño', 'Rancho Grande', 'Villa Cielo', 'Villa Paz'
    ],
    'Cereté': ['Centro', 'Ciénaga de Oro', 'El Cerrito', 'La Gloria', 'La Pradera', 'Los Garzones', 'San Antonio'],
    'Lorica': ['Centro', 'El Carito', 'El Rodeo', 'Las Flores', 'Pasacaballos', 'San Sebastián', 'Villa Luz']
  },

  // Magdalena
  'Magdalena': {
    'Santa Marta': [
      'Centro Histórico', 'Rodadero', 'Taganga', 'Bello Horizonte', 'El Prado',
      'Jardín', 'Los Almendros', 'Mamatoco', 'Pescaito', 'San Fernando',
      'Santa Fe', 'Villa del Mar', 'Bastidas', 'Ciudadela 29 de Julio', 'Gaira'
    ],
    'Ciénaga': ['Centro', 'Córdoba', 'El Carmen', 'Kennedy', 'La Floresta', 'San Juan', 'Urba 1'],
    'Fundación': ['Centro', 'Bolivariana', 'El Carmen', 'La Paz', 'Palmira', 'San Martín', 'Villa Luz']
  },

  // Cesar
  'Cesar': {
    'Valledupar': [
      'Centro', 'Cañaguate', 'El Cerezo', 'El Prado', 'Garupal',
      'La Nevada', 'Las Mercedes', 'Los Andes', 'Novalito', 'Primero de Mayo',
      'San Fernando', 'Sicarare', 'Villa Clara', 'Villa Corelca', 'Villa Taxi'
    ],
    'Aguachica': ['Centro', 'El Bosque', 'La Victoria', 'Las Delicias', 'María Eugenia', 'San Eduardo', 'Villa Real']
  },

  // Sucre
  'Sucre': {
    'Sincelejo': [
      'Centro', 'Boca de la Cienaga', 'El Bosque', 'El Cortijo', 'La Campiña',
      'La Ford', 'La Narcisa', 'Las Américas', 'Mochila', 'Puerta Roja',
      'San Vicente', 'Santa Fe', 'Uribe Uribe', 'Venecia', 'Villa Mady'
    ],
    'Corozal': ['Centro', 'Alfonso López', 'El Pantano', 'El Roble', 'La Palma', 'San José', 'Villa Nueva']
  },

  // Cauca
  'Cauca': {
    'Popayán': [
      'Centro Histórico', 'Bello Horizonte', 'Calicanto', 'El Empedrado', 'El Placer',
      'La Esmeralda', 'La Paz', 'La Pamba', 'Las Américas', 'Los Sauces',
      'Moscopán', 'Pandiguando', 'San José', 'Santa Rosa', 'Valencia'
    ],
    'Santander de Quilichao': ['Centro', 'Buenos Aires', 'El Palmar', 'La María', 'San Rafael', 'Villapaz', 'Yarumales']
  },

  // Boyacá
  'Boyacá': {
    'Tunja': [
      'Centro Histórico', 'Altamira', 'Asís', 'Bello Horizonte', 'El Topo',
      'Fuente Higueras', 'La Esmeralda', 'La Florida', 'La María', 'Los Muiscas',
      'Maldonado', 'Patriotas', 'Rincón de San José', 'Santa Inés', 'Santa Lucía'
    ],
    'Duitama': ['Centro', 'Aránzazu', 'El Carmen', 'El Recreo', 'Higueras', 'La Milagrosa', 'San Fernando', 'Tocogua'],
    'Sogamoso': ['Centro', 'El Diamante', 'El Laguito', 'El Prado', 'Jorge Eliécer Gaitán', 'La Pradera', 'Santa Helena']
  },

  // La Guajira
  'La Guajira': {
    'Riohacha': [
      'Centro', 'Aeropuerto', 'Coquivacoa', 'Cuatro Vías', 'Dividivi',
      'El Paraíso', 'José Antonio Galán', 'Luis Eduardo Cuellar', 'Nuevo Horizonte', 'San Francisco'
    ],
    'Maicao': ['Centro', 'El Carmen', 'El Libertador', 'La Florida', 'Los Alpes', 'San Martín', 'Villa del Prado']
  },

  // Arauca
  'Arauca': {
    'Arauca': ['Centro', 'El Triunfo', 'La Esperanza', 'Meridiano 70', 'Nuevo Horizonte', 'Rafael Núñez', 'Simón Bolívar'],
    'Saravena': ['Centro', 'Buenos Aires', 'La Victoria', 'Los Libertadores', 'San José', 'Villa Nueva']
  },

  // Casanare
  'Casanare': {
    'Yopal': [
      'Centro', 'Bicentenario', 'El Garcero', 'El Remanso', 'La Campiña',
      'La Florida', 'Las Villas', 'Los Helechos', 'Luis Hernández', 'Mastranto',
      'San Martín', 'Villa Rocío'
    ],
    'Aguazul': ['Centro', 'Brasilia', 'El Centro', 'El Paraíso', 'La Esperanza', 'San Cristóbal', 'Villa Lucia'],
    'Villanueva': ['Centro', 'Buenos Aires', 'El Porvenir', 'La Esmeralda', 'Los Naranjos', 'San Rafael']
  },

  // Caquetá
  'Caquetá': {
    'Florencia': [
      'Centro', 'Ciudadela Siglo XXI', 'El Cunduy', 'El Rosal', 'Juan XXIII',
      'La Bocana', 'La Floresta', 'Las Malvinas', 'Los Pinos', 'Versalles',
      'Villa Mónica'
    ],
    'San Vicente del Caguán': ['Centro', 'El Timanco', 'La Libertad', 'La Paz', 'Los Cristales', 'San Isidro']
  },

  // Putumayo
  'Putumayo': {
    'Mocoa': ['Centro', 'El Progreso', 'José Homero', 'La Esmeralda', 'Pablo VI', 'San Agustín', 'Villa Rosa'],
    'Puerto Asís': ['Centro', 'Brisas del Putumayo', 'El Edén', 'La Floresta', 'Nueva Esperanza', 'San Fernando']
  },

  // Amazonas
  'Amazonas': {
    'Leticia': ['Centro', 'Castañal', 'El Progreso', 'La Esperanza', 'La Unión', 'Once de Noviembre', 'Porvenir', 'San Francisco']
  },

  // Guainía
  'Guainía': {
    'Inírida': ['Centro', 'Caño Vitina', 'El Paujil', 'La Primavera', 'Mavicure', 'Porvenir']
  },

  // Guaviare
  'Guaviare': {
    'San José del Guaviare': ['Centro', 'El Progreso', 'La Esperanza', 'Los Comuneros', 'Modelo', 'Prados del Norte', 'Villa Nueva']
  },

  // Vaupés
  'Vaupés': {
    'Mitú': ['Centro', 'Cucura', 'La Floresta', 'Matapí', 'Pucarón', 'San Antonio']
  },

  // Vichada
  'Vichada': {
    'Puerto Carreño': ['Centro', 'El Merey', 'La Primavera', 'Las Américas', 'Los Comuneros', 'Mataven']
  },

  // San Andrés y Providencia
  'San Andrés y Providencia': {
    'San Andrés': ['Centro', 'La Loma', 'North End', 'San Luis', 'Sound Bay', 'Spratt Bight', 'Tom Hooker'],
    'Providencia': ['Aguadulce', 'Bottom House', 'Freshwater', 'Santa Catalina', 'Smooth Water', 'Southwest Bay']
  }
}
