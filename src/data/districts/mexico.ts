// México: Estado → Municipio → Colonia
// Estructura para delivery: colonias de ciudades principales

export const mexicoDistricts: Record<string, Record<string, string[]>> = {
  // Ciudad de México (CDMX) - 16 alcaldías con sus colonias principales
  'Ciudad de México': {
    'Álvaro Obregón': ['Florida', 'Guadalupe Inn', 'Las Águilas', 'Lomas de Santa Fe', 'Olivar de los Padres', 'San Ángel', 'San Ángel Inn', 'Santa Fe', 'Tlacopac'],
    'Azcapotzalco': ['Clavería', 'Coltongo', 'Del Recreo', 'Industrial Vallejo', 'Nueva Santa María', 'Popotla', 'Pro Hogar', 'San Álvaro', 'Santa Catarina'],
    'Benito Juárez': ['Álamos', 'Del Valle', 'Insurgentes Mixcoac', 'Letrán Valle', 'Nápoles', 'Narvarte', 'Portales', 'San José Insurgentes', 'Xoco'],
    'Coyoacán': ['Campestre Churubusco', 'Copilco Universidad', 'Del Carmen', 'Educación', 'Pedregal de Santo Domingo', 'Romero de Terreros', 'Santa Úrsula Coapa', 'Villa Coyoacán'],
    'Cuajimalpa': ['Bosques de las Lomas', 'Contadero', 'Cuajimalpa Centro', 'El Yaqui', 'La Pila', 'Lomas de Vista Hermosa', 'San Mateo Tlaltenango', 'Santa Fe Cuajimalpa'],
    'Cuauhtémoc': ['Centro Histórico', 'Condesa', 'Doctores', 'Guerrero', 'Hipódromo', 'Juárez', 'Roma Norte', 'Roma Sur', 'San Rafael', 'Santa María la Ribera', 'Tabacalera', 'Zona Rosa'],
    'Gustavo A. Madero': ['Aragón', 'Bondojito', 'Campestre Aragón', 'Guadalupe Tepeyac', 'Industrial', 'La Villa', 'Lindavista', 'Martín Carrera', 'San Juan de Aragón', 'Valle del Tepeyac'],
    'Iztacalco': ['Agrícola Oriental', 'Agrícola Pantitlán', 'Campamento 2 de Octubre', 'Central de Abasto', 'Gabriel Ramos Millán', 'Granjas México', 'Iztaccihuatl', 'Pantitlán'],
    'Iztapalapa': ['Apatlaco', 'Cabeza de Juárez', 'El Salado', 'Escuadrón 201', 'Leyes de Reforma', 'Paraje San Juan', 'Santa Cruz Meyehualco', 'Santa Martha Acatitla', 'Tepalcates'],
    'Magdalena Contreras': ['Barranca Seca', 'El Rosal', 'La Malinche', 'Lomas de San Bernabé', 'San Jerónimo Aculco', 'San Nicolás Totolapan'],
    'Miguel Hidalgo': ['Anzures', 'Argentina Poniente', 'Chapultepec Morales', 'Escandón', 'Granada', 'Irrigación', 'Lomas de Chapultepec', 'Polanco', 'Tacuba', 'Tacubaya', 'Verónica Anzures'],
    'Milpa Alta': ['San Antonio Tecómitl', 'San Pablo Oztotepec', 'San Pedro Atocpan', 'Santa Ana Tlacotenco', 'Villa Milpa Alta'],
    'Tláhuac': ['Del Mar', 'La Nopalera', 'Los Olivos', 'Miguel Hidalgo', 'San Francisco Tlaltenco', 'San Juan Ixtayopan', 'Santa Catarina Yecahuizotl'],
    'Tlalpan': ['Ajusco', 'Coapa', 'Fuentes del Pedregal', 'Héroes de Padierna', 'Isidro Fabela', 'Jardines del Pedregal', 'Pedregal de San Ángel', 'San Andrés Totoltepec', 'Toriello Guerra'],
    'Venustiano Carranza': ['20 de Noviembre', 'Aeropuerto', 'Balbuena', 'Jardín Balbuena', 'Moctezuma', 'Morelos', 'Peñón de los Baños', 'Romero Rubio', 'Valle Gómez'],
    'Xochimilco': ['Ampliación Tepepan', 'Barrio 18', 'La Noria', 'San Gregorio Atlapulco', 'San Lorenzo Atemoaya', 'San Luis Tlaxialtemalco', 'Santa Cruz Acalpixca', 'Santiago Tepalcatlalpan']
  },

  // Estado de México - Zona Metropolitana
  'Estado de México': {
    'Atizapán de Zaragoza': ['Arboledas', 'Ciudad López Mateos', 'El Potrero', 'La Herradura', 'Las Alamedas', 'Lomas de Atizapán', 'México Nuevo', 'Pedregal de Atizapán', 'Sayavedra'],
    'Coacalco': ['Bosques del Valle', 'El Laurel', 'Los Héroes', 'San Lorenzo Tetlixtac', 'Villa de las Flores'],
    'Cuautitlán': ['Centro', 'El Molino', 'Industrial Cuautitlán', 'Real del Sol', 'San Antonio'],
    'Cuautitlán Izcalli': ['Centro Urbano', 'Cumbria', 'Hacienda del Parque', 'La Piedad', 'Las Alamedas', 'Las Américas', 'Lázaro Cárdenas', 'Real del Bosque', 'San Francisco Tepojaco'],
    'Ecatepec': ['Chicoloapan Centro', 'Ciudad Azteca', 'El Chamizal', 'Granjas Valle de Guadalupe', 'Jardines de Casa Nueva', 'Jardines de Morelos', 'La Mora', 'Las Américas', 'San Agustín', 'Santa Clara', 'Valle de Aragón'],
    'Huixquilucan': ['Bosques de las Palmas', 'El Pedregal', 'Hacienda de las Palmas', 'Interlomas', 'Jesús del Monte', 'La Herradura', 'Lomas Anáhuac', 'Lomas del Sol', 'Tecamachalco'],
    'Naucalpan': ['Ciudad Satélite', 'Echegaray', 'El Molinito', 'Fraccionamiento Industrial Alce Blanco', 'La Florida', 'Las Arboledas', 'Lomas Verdes', 'San Agustín', 'Satélite'],
    'Nezahualcóyotl': ['Agua Azul', 'Benito Juárez', 'El Sol', 'Evolución', 'Impulsora Popular', 'Jardines de Guadalupe', 'La Perla', 'Plazas de Aragón', 'Rey Nezahualcóyotl', 'Valle de Aragón'],
    'Tlalnepantla': ['Centro Industrial Tlalnepantla', 'El Tenayo', 'Industrial Vallejo', 'La Presa', 'Las Armas', 'Loma Bonita', 'San Andrés Atenco', 'San Juan Ixtacala', 'Santa Mónica', 'Valle Dorado'],
    'Toluca': ['Cacalomacan', 'Centro', 'Colón', 'Industrial Toluca', 'La Merced', 'Moderna de la Cruz', 'Pilares', 'San Buenaventura', 'Seminario', 'Universidad'],
    'Tultitlán': ['Buenavista', 'Centro', 'Lechería', 'San Antonio', 'San Marcos', 'Valle de Tules']
  },

  // Jalisco
  'Jalisco': {
    'Guadalajara': ['Americana', 'Arcos Vallarta', 'Centro', 'Chapalita', 'Circunvalación Oblatos', 'Colinas de la Normal', 'Country Club', 'Del Fresno', 'Del Valle', 'Jardines del Bosque', 'Jardines del Country', 'La Estancia', 'Ladrón de Guevara', 'Lomas del Valle', 'Mezquitan Country', 'Monraz', 'Oblatos', 'Providencia', 'Santa Teresita', 'Zona Industrial'],
    'Zapopan': ['Arcos de Guadalupe', 'Bugambilias', 'Ciudad Bugambilias', 'Colomos Providencia', 'Colonia Seattle', 'El Colli', 'Jardines del Sol', 'La Tuzanía', 'Las Águilas', 'Loma Bonita', 'Los Girasoles', 'Nuevo México', 'Paseos del Sol', 'Pinar de la Calma', 'Puerta de Hierro', 'Royal Country', 'Santa Margarita', 'Valle Real'],
    'Tlaquepaque': ['Alamo Industrial', 'Centro', 'El Tapatío', 'La Duraznera', 'Loma Dorada', 'Los Meseros', 'Revolución', 'San Sebastianito', 'Santa María Tequepexpan'],
    'Tonalá': ['Arroyo de en Medio', 'Cañadas del Nilo', 'Centro', 'Chulavista', 'El Rosario', 'Jauja', 'Loma Bonita', 'Santa Paula']
  },

  // Nuevo León
  'Nuevo León': {
    'Monterrey': ['Alta Vista', 'Buenos Aires', 'Centro', 'Centrika', 'Chepevera', 'Cumbres', 'Del Valle', 'Independencia', 'Las Brisas', 'Linda Vista', 'Mitras Centro', 'Mitras Norte', 'Obispado', 'Roma', 'San Jerónimo', 'Santa María', 'Tecnológico', 'Valle Oriente', 'Vista Hermosa'],
    'San Nicolás de los Garza': ['Anáhuac', 'Casa Blanca', 'Constituyentes de Querétaro', 'Del Vidrio', 'El Roble', 'La Fe', 'Los Altos', 'Pedregal del Topo Chico', 'Residencial Anáhuac', 'Santo Domingo', 'Valle de Anáhuac'],
    'San Pedro Garza García': ['Centro', 'Chipinque', 'Del Valle', 'El Obispo', 'Fuentes del Valle', 'La Ladera', 'Las Villas', 'Residencial San Agustín', 'San Gabriel', 'Valle de San Angel', 'Valle del Campestre'],
    'Apodaca': ['Cosmópolis', 'El Mezquital', 'Huinalá', 'La Encarnación', 'Pueblo Nuevo', 'Valle de Huinalá', 'Valle de las Palmas'],
    'Guadalupe': ['Contry', 'Contry Sol', 'Del Maestro', 'La Pastora', 'Las Quintas', 'Lomas de Tolteca', 'Paraíso', 'Plutarco Elías Calles', 'Riberas de la Purísima', 'Zaragoza'],
    'Santa Catarina': ['Bosques del Valle', 'Centro', 'El Lechugal', 'La Fama', 'La Huasteca', 'Los Cristales', 'Mirador de la Silla', 'Rincón de Santa Catarina', 'Valle de Infonavit']
  },

  // Puebla
  'Puebla': {
    'Puebla': ['Analco', 'Azcárate', 'Bosques de San Sebastián', 'Centro', 'Cholula', 'El Cerrito', 'El Vergel', 'Gabriel Pastor', 'Huexotitla', 'Jardines de San Manuel', 'La Margarita', 'La Paz', 'Las Ánimas', 'Las Cuartillas', 'Los Héroes de Puebla', 'Reforma', 'San Baltazar Campeche', 'San José Mayorazgo', 'Volcanes'],
    'San Andrés Cholula': ['Angelópolis', 'Atlixcáyotl', 'Centro', 'San Antonio Cacalotepec', 'Santa Clara Ocoyucan', 'Tlaxcalancingo'],
    'San Pedro Cholula': ['Centro', 'San Cristóbal Tepontla', 'San Juan Aquiahuac', 'Santiago Momoxpan', 'Tonantzintla']
  },

  // Querétaro
  'Querétaro': {
    'Querétaro': ['Alameda', 'Álamos 3a Sección', 'Arboledas', 'Carretas', 'Centro', 'Centro Sur', 'El Carrizal', 'El Jacal', 'El Marqués', 'Jardines de Querétaro', 'Jurica', 'La Capilla', 'Lomas de Casa Blanca', 'Milenio III', 'Real de Juriquilla', 'San Javier', 'Santa Fe'],
    'San Juan del Río': ['16 de Septiembre', 'Centro', 'El Riel', 'Industrial', 'La Cruz', 'La Luz', 'San Juan Centro', 'Santa Cruz Nieto']
  },

  // Guanajuato
  'Guanajuato': {
    'León': ['Arbide', 'Cañada de Alfaro', 'Centro', 'El Coecillo', 'Hilamas', 'Industrial', 'Jardines de Jerez', 'Jardines del Moral', 'La Ermita', 'La Luz', 'Las Flores', 'León Moderno', 'Los Castillos', 'Loza de los Padres', 'Medina', 'Obregón', 'Oriental', 'Piletas', 'San Felipe de Jesús', 'San Juan de Dios', 'San Miguel', 'Valle del Sol', 'Zona Centro'],
    'Irapuato': ['Balcones de la Joya', 'Centro', 'Galaxias', 'Jardines de Irapuato', 'La Calera', 'Las Ánimas', 'Las Reynas', 'San Cayetano', 'Solidaridad', 'Valle de las Trojes'],
    'Celaya': ['Centro', 'Cortijo de la Gloria', 'El Sauz', 'Jardines de Celaya', 'Las Fuentes', 'Las Huertas', 'Lindavista', 'Real del Valle', 'Valle del Sol']
  },

  // Veracruz
  'Veracruz': {
    'Veracruz': ['Antón Lizardo', 'Boca del Río', 'Centro', 'Costa de Oro', 'Costa Verde', 'El Coyol', 'Floresta', 'Formando Hogar', 'Fracc. Virginia', 'Las Vegas', 'Mocambo', 'Playa Linda', 'Ricardo Flores Magón', 'Zaragoza'],
    'Xalapa': ['Animas', 'Arco Iris', 'Centro', 'El Olmo', 'Jardines de las Ánimas', 'Las Hayas', 'Lomas del Estadio', 'Rafael Lucio', 'Revolución', 'Tamborrel', 'USBI'],
    'Coatzacoalcos': ['Centro', 'El Tesoro', 'Gaviotas Sur', 'Las Vegas', 'Mundo Nuevo', 'Puerto México', 'Terranova']
  },

  // Yucatán
  'Yucatán': {
    'Mérida': ['Altabrisa', 'Campestre', 'Centro', 'Cholul', 'Chuburná', 'Ciudad Caucel', 'Emiliano Zapata Norte', 'Francisco de Montejo', 'García Ginerés', 'Gran Santa Fe', 'Itzimná', 'Jardines de Mérida', 'Las Américas', 'Montebello', 'Montes de Amé', 'San Pedro Cholul', 'Santa Gertrudis Copó', 'Temozon Norte', 'Xcumpich'],
    'Cancún': ['Centro', 'El Table', 'Pok Ta Pok', 'Puerto Juárez', 'Región 94', 'Región 97', 'Supermanzana 20', 'Supermanzana 30', 'Zona Hotelera']
  },

  // Quintana Roo
  'Quintana Roo': {
    'Cancún': ['Centro', 'El Table', 'Pok Ta Pok', 'Puerto Juárez', 'Región 94', 'Región 97', 'Supermanzana 20', 'Supermanzana 30', 'Zona Hotelera'],
    'Playa del Carmen': ['Centro', 'Chemuyil', 'Ejidal', 'El Cielo', 'Gonzalo Guerrero', 'Playacar', 'Puerto Aventuras', 'Villas del Sol'],
    'Chetumal': ['Caribe', 'Centro', 'David Gustavo', 'Del Bosque', 'Payo Obispo', 'Santa María']
  },

  // Baja California
  'Baja California': {
    'Tijuana': ['Altamira', 'Cacho', 'Camino Verde', 'Castillo', 'Centro', 'Chapultepec', 'El Florido', 'Hipódromo', 'La Mesa', 'Libertad', 'Los Alamos', 'Otay', 'Playas de Tijuana', 'Soler', 'Zona Río', 'Zona Centro'],
    'Mexicali': ['Centro', 'Centro Cívico', 'Esperanza', 'Industrial', 'Los Pinos', 'Nacozari', 'Nueva', 'Pueblo Nuevo', 'Revolución', 'Santorini'],
    'Ensenada': ['Bahía', 'Centro', 'El Sauzal', 'Maneadero', 'Misión', 'Moderna', 'Obrera', 'Playa Hermosa', 'Valle Dorado']
  },

  // Sonora
  'Sonora': {
    'Hermosillo': ['Balderrama', 'Bugambilias', 'Centro', 'Cerro de la Campana', 'El Llano', 'La Verbena', 'Las Quintas', 'Olivares', 'Palo Verde', 'Pitic', 'Sahuaro', 'San Benito', 'Villa de Seris', 'Villa Satélite'],
    'Ciudad Obregón': ['Bella Vista', 'Centro', 'Cuauhtémoc', 'El Diamante', 'Fonhapo', 'La Barca', 'Las Palmas', 'Misión del Real', 'Urbi Villa del Rey']
  },

  // Sinaloa
  'Sinaloa': {
    'Culiacán': ['Bachigualato', 'Centro', 'Chapultepec', 'Colinas de San Miguel', 'El Palmito', 'Guadalupe', 'Humaya', 'Industrial', 'Infonavit Barrancos', 'Las Quintas', 'Loma Linda', 'Miguel Alemán', 'Tierra Blanca'],
    'Mazatlán': ['Centro', 'Centro Histórico', 'El Dorado', 'El Toreo', 'Flamingos', 'Francisco Villa', 'Gaviotas', 'Infonavit Playas', 'Marina Mazatlán', 'Sábalo Country', 'Zona Dorada'],
    'Los Mochis': ['Centro', 'Centro Histórico', 'Jiquilpan', 'Las Fuentes', 'Loma Linda', 'Parque Industrial', 'Scally']
  },

  // Aguascalientes
  'Aguascalientes': {
    'Aguascalientes': ['Alameda', 'Barrio de la Salud', 'Bulevar', 'Canteras de San Javier', 'Centro', 'Colinas del Río', 'Constitución', 'Del Valle', 'Desarrollo San Pablo', 'España', 'Fracc. la Salud', 'Jardines de la Cruz', 'Los Bosques', 'Morelos', 'Ojocaliente', 'Pulgas Pandas', 'Real de Haciendas', 'Villa de Nuestra Señora de la Asunción']
  },

  // Chihuahua
  'Chihuahua': {
    'Chihuahua': ['Altavista', 'Centro', 'Cumbres', 'Dale', 'El Palomar', 'Industrial', 'Kennedy', 'Las Granjas', 'Lomas del Valle', 'Nuevo Chihuahua', 'Pacifico', 'Panamericana', 'Paseos de Chihuahua', 'Quintas del Valle', 'San Felipe', 'Santa Rosa'],
    'Ciudad Juárez': ['Altavista', 'Centro', 'Chavena', 'Del Real', 'Industrial', 'Las Misiones', 'Los Nogales', 'Mariano Escobedo', 'Morelos', 'Parajes del Sur', 'Partido Romero', 'Pronaf', 'Salvárcar', 'San Lorenzo', 'Zona Centro']
  },

  // Coahuila
  'Coahuila': {
    'Torreón': ['Alamedas', 'Campestre La Rosita', 'Centro', 'El Tajito', 'Jardines del Sol', 'La Joya', 'La Rosita', 'Las Carolinas', 'Los Viñedos', 'Navarro', 'Nueva Los Angeles', 'Residencial del Norte', 'San Isidro'],
    'Saltillo': ['Acueducto', 'Ampliación Lourdes', 'Centro', 'Chapultepec', 'Galerías', 'La Aurora', 'La Florida', 'La Luz', 'Lomas de Lourdes', 'Nazario Ortiz Garza', 'República', 'Roma', 'San Lorenzo', 'Valle Real']
  },

  // Tamaulipas
  'Tamaulipas': {
    'Reynosa': ['Azteca', 'Centro', 'Del Valle', 'Hidalgo', 'Industrial', 'Las Brisas', 'Las Granjas', 'Longoria', 'Rodríguez', 'Unidad Nacional', 'Vista Hermosa'],
    'Tampico': ['Altamira', 'Arboledas', 'Centro', 'Ciudad Madero', 'Esfuerzo Obrero', 'Francisco Javier Mina', 'Jardín', 'Laguna de la Puerta', 'Loma del Gallo', 'Petrolera', 'Unidad Nacional'],
    'Matamoros': ['Buena Vista', 'Centro', 'El Porvenir', 'Las Granjas', 'Nueva Amanecer', 'Solidaridad', 'Valle Alto', 'Victoria']
  },

  // Morelos
  'Morelos': {
    'Cuernavaca': ['Ahuatepec', 'Burgos', 'Centro', 'Chapultepec', 'Delicias', 'El Empleado', 'Jardines de Cuernavaca', 'Las Palmas', 'Lomas de Cortés', 'Lomas de Cuernavaca', 'Reforma', 'Vista Hermosa'],
    'Cuautla': ['Ampliación Emiliano Zapata', 'Centro', 'Cuautlixco', 'El Calvario', 'Las Palmas', 'Narciso Mendoza', 'Paraíso', 'San José Alto']
  },

  // San Luis Potosí
  'San Luis Potosí': {
    'San Luis Potosí': ['Alameda', 'Centro', 'De los Reyes', 'Himno Nacional', 'Industrial Aviación', 'Insurgentes', 'Jardín', 'Las Águilas', 'Lomas', 'Los Filtros', 'Modelo', 'Progreso', 'San Felipe', 'Tangamanga', 'Valle Dorado', 'Valle del Potosí']
  },

  // Michoacán
  'Michoacán': {
    'Morelia': ['Álvaro Obregón', 'Camelinas', 'Centro', 'Chapultepec Norte', 'Ciudad Jardín', 'Cuauhtémoc', 'Del Empleado', 'Félix Ireta', 'Infonavit Camelinas', 'Las Flores', 'Manantiales', 'Tres Puentes', 'Vasco de Quiroga'],
    'Uruapan': ['Centro', 'Eduardo Ruiz', 'Emiliano Zapata', 'Jardines del Cupatitzio', 'Lomas del Valle', 'Ramón Farías', 'San Francisco']
  },

  // Oaxaca
  'Oaxaca': {
    'Oaxaca de Juárez': ['Centro', 'Del Maestro', 'El Ex-Marquesado', 'Jardín', 'La Cascada', 'La Reforma', 'Las Flores', 'Monte Albán', 'San Felipe del Agua', 'Tres Cruces']
  },

  // Chiapas
  'Chiapas': {
    'Tuxtla Gutiérrez': ['Bienestar Social', 'Centro', 'El Retiro', 'Jardines de Tuxtla', 'Las Granjas', 'Las Palmas', 'Moctezuma', 'Plan de Ayala', 'San José', 'Terán'],
    'San Cristóbal de las Casas': ['Barrio de Cuxtitali', 'Barrio de Guadalupe', 'Centro', 'El Cerrillo', 'La Hormiga', 'María Auxiliadora', 'Real del Monte']
  },

  // Hidalgo
  'Hidalgo': {
    'Pachuca': ['Ampliación Santa Julia', 'Centro', 'El Lobo', 'Ex Hacienda de Coscotitlán', 'Los Tuzos', 'Nuevo Hidalgo', 'Real de Pachuca', 'Santa Julia', 'Valle de San Javier', 'Villas de Pachuca']
  }
}
