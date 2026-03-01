// Distritos de Perú organizados por Departamento → Provincia → Distritos
// Fuente: INEI - Instituto Nacional de Estadística e Informática

export const peruDistricts: Record<string, Record<string, string[]>> = {
  // ============================================
  // LIMA
  // ============================================
  'Lima': {
    'Lima': [
      'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos',
      'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María',
      'La Molina', 'La Victoria', 'Lima', 'Lince', 'Los Olivos', 'Lurigancho',
      'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pucusana',
      'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac',
      'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho',
      'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel',
      'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco',
      'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'
    ],
    'Barranca': [
      'Barranca', 'Paramonga', 'Pativilca', 'Supe', 'Supe Puerto'
    ],
    'Cajatambo': [
      'Cajatambo', 'Copa', 'Gorgor', 'Huancapón', 'Manas'
    ],
    'Canta': [
      'Arahuay', 'Canta', 'Huamantanga', 'Huaros', 'Lachaqui', 'San Buenaventura', 'Santa Rosa de Quives'
    ],
    'Cañete': [
      'Asia', 'Calango', 'Cerro Azul', 'Chilca', 'Coayllo', 'Imperial', 'Lunahuaná',
      'Mala', 'Nuevo Imperial', 'Pacarán', 'Quilmaná', 'San Antonio', 'San Luis',
      'San Vicente de Cañete', 'Santa Cruz de Flores', 'Zúñiga'
    ],
    'Huaral': [
      'Atavillos Alto', 'Atavillos Bajo', 'Aucallama', 'Chancay', 'Huaral', 'Ihuarí',
      'Lampián', 'Pacaraos', 'San Miguel de Acos', 'Santa Cruz de Andamarca',
      'Sumbilca', 'Veintisiete de Noviembre'
    ],
    'Huarochirí': [
      'Antioquía', 'Callahuanca', 'Carampoma', 'Chicla', 'Cuenca', 'Huachupampa',
      'Huanza', 'Huarochirí', 'Lahuaytambo', 'Langa', 'Laraos', 'Mariatana',
      'Matucana', 'Ricardo Palma', 'San Andrés de Tupicocha', 'San Antonio',
      'San Bartolomé', 'San Damián', 'San Juan de Iris', 'San Juan de Tantaranche',
      'San Lorenzo de Quinti', 'San Mateo', 'San Mateo de Otao', 'San Pedro de Casta',
      'San Pedro de Huancayre', 'Sangallaya', 'Santa Cruz de Cocachacra',
      'Santa Eulalia', 'Santiago de Anchucaya', 'Santiago de Tuna', 'Santo Domingo de los Olleros', 'Surco'
    ],
    'Huaura': [
      'Ámbar', 'Caleta de Carquín', 'Checras', 'Huacho', 'Hualmay', 'Huaura',
      'Leoncio Prado', 'Paccho', 'Santa Leonor', 'Santa María', 'Sayán', 'Végueta'
    ],
    'Oyón': [
      'Andajes', 'Caujul', 'Cochamarca', 'Naván', 'Oyón', 'Pachangara'
    ],
    'Yauyos': [
      'Alis', 'Ayauca', 'Ayaviri', 'Azángaro', 'Cacra', 'Carania', 'Catahuasi',
      'Chocos', 'Cochas', 'Colonia', 'Hongos', 'Huampará', 'Huancaya', 'Huangáscar',
      'Huantán', 'Huañec', 'Laraos', 'Lincha', 'Madeán', 'Miraflores', 'Omas',
      'Putinza', 'Quinches', 'Quinocay', 'San Joaquín', 'San Pedro de Pilas',
      'Tanta', 'Tauripampa', 'Tomas', 'Tupe', 'Viñac', 'Vitis', 'Yauyos'
    ]
  },

  // ============================================
  // CALLAO
  // ============================================
  'Callao': {
    'Callao': [
      'Bellavista', 'Callao', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta',
      'Mi Perú', 'Ventanilla'
    ]
  },

  // ============================================
  // AREQUIPA
  // ============================================
  'Arequipa': {
    'Arequipa': [
      'Alto Selva Alegre', 'Arequipa', 'Cayma', 'Cerro Colorado', 'Characato',
      'Chiguata', 'Jacobo Hunter', 'José Luis Bustamante y Rivero', 'La Joya',
      'Mariano Melgar', 'Miraflores', 'Mollebaya', 'Paucarpata', 'Pocsi', 'Polobaya',
      'Quequeña', 'Sabandía', 'Sachaca', 'San Juan de Siguas', 'San Juan de Tarucani',
      'Santa Isabel de Siguas', 'Santa Rita de Siguas', 'Socabaya', 'Tiabaya',
      'Uchumayo', 'Vítor', 'Yanahuara', 'Yarabamba', 'Yura'
    ],
    'Camaná': [
      'Camaná', 'José María Quimper', 'Mariano Nicolás Valcárcel', 'Mariscal Cáceres',
      'Nicolás de Piérola', 'Ocoña', 'Quilca', 'Samuel Pastor'
    ],
    'Caravelí': [
      'Acarí', 'Atico', 'Atiquipa', 'Bella Unión', 'Cahuacho', 'Caravelí', 'Chala',
      'Chaparra', 'Huanuhuanu', 'Jaqui', 'Lomas', 'Quicacha', 'Yauca'
    ],
    'Castilla': [
      'Andagua', 'Ayo', 'Chachas', 'Chilcaymarca', 'Choco', 'Huancarqui', 'Machaguay',
      'Orcopampa', 'Pampacolca', 'Tipán', 'Uñón', 'Uraca', 'Viraco', 'Aplao'
    ],
    'Caylloma': [
      'Achoma', 'Cabanaconde', 'Callalli', 'Caylloma', 'Chivay', 'Coporaque', 'Huambo',
      'Huanca', 'Ichupampa', 'Lari', 'Lluta', 'Maca', 'Madrigal', 'Majes',
      'San Antonio de Chuca', 'Sibayo', 'Tapay', 'Tisco', 'Tuti', 'Yanque'
    ],
    'Condesuyos': [
      'Andaray', 'Cayarani', 'Chichas', 'Chuquibamba', 'Iray', 'Río Grande',
      'Salamanca', 'Yanaquihua'
    ],
    'Islay': [
      'Cocachacra', 'Deán Valdivia', 'Islay', 'Mejía', 'Mollendo', 'Punta de Bombón'
    ],
    'La Unión': [
      'Alca', 'Charcana', 'Cotahuasi', 'Huaynacotas', 'Pampamarca', 'Puyca',
      'Quechualla', 'Sayla', 'Tauria', 'Tomepampa', 'Toro'
    ]
  },

  // ============================================
  // CUSCO
  // ============================================
  'Cusco': {
    'Cusco': [
      'Ccorca', 'Cusco', 'Poroy', 'San Jerónimo', 'San Sebastián', 'Santiago',
      'Saylla', 'Wanchaq'
    ],
    'Acomayo': [
      'Acomayo', 'Acopia', 'Acos', 'Mosoc Llacta', 'Pomacanchi', 'Rondocan', 'Sangarará'
    ],
    'Anta': [
      'Ancahuasi', 'Anta', 'Cachimayo', 'Chinchaypujio', 'Huarocondo', 'Limatambo',
      'Mollepata', 'Pucyura', 'Zurite'
    ],
    'Calca': [
      'Calca', 'Coya', 'Lamay', 'Lares', 'Pisac', 'San Salvador', 'Taray', 'Yanatile'
    ],
    'Canas': [
      'Checca', 'Kunturkanki', 'Langui', 'Layo', 'Pampamarca', 'Quehue', 'Túpac Amaru', 'Yanaoca'
    ],
    'Canchis': [
      'Checacupe', 'Combapata', 'Marangani', 'Pitumarca', 'San Pablo', 'San Pedro', 'Sicuani', 'Tinta'
    ],
    'Chumbivilcas': [
      'Capacmarca', 'Chamaca', 'Colquemarca', 'Livitaca', 'Llusco', 'Quiñota',
      'Santo Tomás', 'Velille'
    ],
    'Espinar': [
      'Alto Pichigua', 'Condoroma', 'Coporaque', 'Espinar', 'Ocoruro', 'Pallpata',
      'Pichigua', 'Suyckutambo'
    ],
    'La Convención': [
      'Echarate', 'Huayopata', 'Inkawasi', 'Kimbiri', 'Maranura', 'Megantoni',
      'Ocobamba', 'Pichari', 'Quellouno', 'Santa Ana', 'Santa Teresa',
      'Villa Kintiarina', 'Villa Virgen', 'Vilcabamba'
    ],
    'Paruro': [
      'Accha', 'Ccapi', 'Colcha', 'Huanoquite', 'Omacha', 'Paccaritambo', 'Paruro',
      'Pillpinto', 'Yaurisque'
    ],
    'Paucartambo': [
      'Caicay', 'Challabamba', 'Colquepata', 'Huancarani', 'Kosñipata', 'Paucartambo'
    ],
    'Quispicanchi': [
      'Andahuaylillas', 'Camanti', 'Ccarhuayo', 'Ccatca', 'Cusipata', 'Huaro',
      'Lucre', 'Marcapata', 'Ocongate', 'Oropesa', 'Quiquijana', 'Urcos'
    ],
    'Urubamba': [
      'Chinchero', 'Huayllabamba', 'Machupicchu', 'Maras', 'Ollantaytambo',
      'Urubamba', 'Yucay'
    ]
  },

  // ============================================
  // LA LIBERTAD
  // ============================================
  'La Libertad': {
    'Trujillo': [
      'El Porvenir', 'Florencia de Mora', 'Huanchaco', 'La Esperanza', 'Laredo',
      'Moche', 'Poroto', 'Salaverry', 'Simbal', 'Trujillo', 'Víctor Larco Herrera'
    ],
    'Ascope': [
      'Ascope', 'Casa Grande', 'Chicama', 'Chocope', 'Magdalena de Cao',
      'Paiján', 'Rázuri', 'Santiago de Cao'
    ],
    'Bolívar': [
      'Bambamarca', 'Bolívar', 'Condormarca', 'Longotea', 'Uchumarca', 'Ucuncha'
    ],
    'Chepén': [
      'Chepén', 'Pacanga', 'Pueblo Nuevo'
    ],
    'Gran Chimú': [
      'Cascas', 'Lucma', 'Marmot', 'Sayapullo'
    ],
    'Julcán': [
      'Calamarca', 'Carabamba', 'Huaso', 'Julcán'
    ],
    'Otuzco': [
      'Agallpampa', 'Charat', 'Huaranchal', 'La Cuesta', 'Mache', 'Otuzco',
      'Paranday', 'Salpo', 'Sinsicap', 'Usquil'
    ],
    'Pacasmayo': [
      'Guadalupe', 'Jequetepeque', 'Pacasmayo', 'San José', 'San Pedro de Lloc'
    ],
    'Pataz': [
      'Buldibuyo', 'Chillia', 'Huancaspata', 'Huaylillas', 'Huayo', 'Ongón',
      'Parcoy', 'Pataz', 'Piás', 'Santiago de Challas', 'Taurija', 'Tayabamba', 'Urpay'
    ],
    'Sánchez Carrión': [
      'Chugay', 'Cochorco', 'Curgos', 'Huamachuco', 'Marcabal', 'Sanagoran',
      'Sarin', 'Sartimbamba'
    ],
    'Santiago de Chuco': [
      'Angasmarca', 'Cachicadán', 'Mollebamba', 'Mollepata', 'Quiruvilca',
      'Santa Cruz de Chuca', 'Santiago de Chuco', 'Sitabamba'
    ],
    'Virú': [
      'Chao', 'Guadalupito', 'Virú'
    ]
  },

  // ============================================
  // LAMBAYEQUE
  // ============================================
  'Lambayeque': {
    'Chiclayo': [
      'Cayaltí', 'Chiclayo', 'Chongoyape', 'Eten', 'Eten Puerto', 'José Leonardo Ortiz',
      'La Victoria', 'Lagunas', 'Monsefú', 'Nueva Arica', 'Oyotún', 'Pátapo', 'Picsi',
      'Pimentel', 'Pomalca', 'Pucalá', 'Reque', 'Santa Rosa', 'Saña', 'Tumán'
    ],
    'Ferreñafe': [
      'Cañaris', 'Ferreñafe', 'Incahuasi', 'Manuel Antonio Mesones Muro',
      'Pítipo', 'Pueblo Nuevo'
    ],
    'Lambayeque': [
      'Chóchope', 'Íllimo', 'Jayanca', 'Lambayeque', 'Mochumí', 'Mórrope', 'Motupe',
      'Olmos', 'Pacora', 'Salas', 'San José', 'Túcume'
    ]
  },

  // ============================================
  // PIURA
  // ============================================
  'Piura': {
    'Piura': [
      'Castilla', 'Catacaos', 'Cura Mori', 'El Tallán', 'La Arena', 'La Unión',
      'Las Lomas', 'Piura', 'Tambo Grande', 'Veintiséis de Octubre'
    ],
    'Ayabaca': [
      'Ayabaca', 'Frías', 'Jililí', 'Lagunas', 'Montero', 'Pacaipampa',
      'Paimas', 'Sapillica', 'Sicchez', 'Suyo'
    ],
    'Huancabamba': [
      'Canchaque', 'El Carmen de la Frontera', 'Huancabamba', 'Huarmaca',
      'Lalaquiz', 'San Miguel de El Faique', 'Sóndor', 'Sondorillo'
    ],
    'Morropón': [
      'Buenos Aires', 'Chalaco', 'Chulucanas', 'La Matanza', 'Morropón',
      'Salitral', 'San Juan de Bigote', 'Santa Catalina de Mossa',
      'Santo Domingo', 'Yamango'
    ],
    'Paita': [
      'Amotape', 'Arenal', 'Colán', 'La Huaca', 'Paita', 'Tamarindo', 'Vichayal'
    ],
    'Sechura': [
      'Bellavista de la Unión', 'Bernal', 'Cristo Nos Valga', 'Rinconada Llicuar',
      'Sechura', 'Vice'
    ],
    'Sullana': [
      'Bellavista', 'Ignacio Escudero', 'Lancones', 'Marcavelica', 'Miguel Checa',
      'Querecotillo', 'Salitral', 'Sullana'
    ],
    'Talara': [
      'El Alto', 'La Brea', 'Lobitos', 'Los Órganos', 'Máncora', 'Pariñas'
    ]
  },

  // ============================================
  // JUNÍN
  // ============================================
  'Junín': {
    'Huancayo': [
      'Carhuacallanga', 'Chacapampa', 'Chicche', 'Chilca', 'Chongos Alto', 'Chupuro',
      'Colca', 'Cullhuas', 'El Tambo', 'Huacrapuquio', 'Hualhuas', 'Huancán',
      'Huancayo', 'Huasicancha', 'Huayucachi', 'Ingenio', 'Pariahuanca', 'Pilcomayo',
      'Pucará', 'Quichuay', 'Quilcas', 'San Agustín', 'San Jerónimo de Tunán',
      'San Pedro de Saño', 'Saño', 'Sapallanga', 'Sicaya', 'Santo Domingo de Acobamba', 'Viques'
    ],
    'Chanchamayo': [
      'Chanchamayo', 'Perené', 'Pichanaqui', 'San Luis de Shuaro', 'San Ramón', 'Vitoc'
    ],
    'Chupaca': [
      'Ahuac', 'Chongos Bajo', 'Chupaca', 'Huachac', 'Huamancaca Chico', 'San Juan de Iscos',
      'San Juan de Jarpa', 'Tres de Diciembre', 'Yanacancha'
    ],
    'Concepción': [
      'Aco', 'Andamarca', 'Chambara', 'Cochas', 'Comas', 'Concepción', 'Heroínas Toledo',
      'Manzanares', 'Mariscal Castilla', 'Matahuasi', 'Mito', 'Nueve de Julio',
      'Orcotuna', 'San José de Quero', 'Santa Rosa de Ocopa'
    ],
    'Jauja': [
      'Acolla', 'Apata', 'Ataura', 'Canchayllo', 'Curicaca', 'El Mantaro', 'Huamalí',
      'Huaripampa', 'Huertas', 'Janjaillo', 'Jauja', 'Julcán', 'Leonor Ordóñez',
      'Llocllapampa', 'Marco', 'Masma', 'Masma Chicche', 'Molinos', 'Monobamba',
      'Muqui', 'Muquiyauyo', 'Paca', 'Paccha', 'Pancan', 'Parco', 'Pomacancha',
      'Ricran', 'San Lorenzo', 'San Pedro de Chunán', 'Sausa', 'Sincos', 'Tunan Marca', 'Yauli', 'Yauyos'
    ],
    'Junín': [
      'Carhuamayo', 'Junín', 'Ondores', 'Ulcumayo'
    ],
    'Satipo': [
      'Coviriali', 'Llaylla', 'Mazamari', 'Pampa Hermosa', 'Pangoa', 'Río Negro',
      'Río Tambo', 'Satipo', 'Vizcatán del Ene'
    ],
    'Tarma': [
      'Acobamba', 'Huaricolca', 'Huasahuasi', 'La Unión', 'Palca', 'Palcamayo',
      'San Pedro de Cajas', 'Tapo', 'Tarma'
    ],
    'Yauli': [
      'Chacapalpa', 'Huay-Huay', 'La Oroya', 'Marcapomacocha', 'Morococha',
      'Paccha', 'Santa Bárbara de Carhuacayan', 'Santa Rosa de Sacco', 'Suitucancha', 'Yauli'
    ]
  },

  // ============================================
  // ICA
  // ============================================
  'Ica': {
    'Ica': [
      'Ica', 'La Tinguiña', 'Los Aquijes', 'Ocucaje', 'Pachacútec', 'Parcona',
      'Pueblo Nuevo', 'Salas', 'San José de Los Molinos', 'San Juan Bautista',
      'Santiago', 'Subtanjalla', 'Tate', 'Yauca del Rosario'
    ],
    'Chincha': [
      'Alto Larán', 'Chavín', 'Chincha Alta', 'Chincha Baja', 'El Carmen',
      'Grocio Prado', 'Pueblo Nuevo', 'San Juan de Yanac', 'San Pedro de Huacarpana',
      'Sunampe', 'Tambo de Mora'
    ],
    'Nazca': [
      'Changuillo', 'El Ingenio', 'Marcona', 'Nazca', 'Vista Alegre'
    ],
    'Palpa': [
      'Llipata', 'Palpa', 'Río Grande', 'Santa Cruz', 'Tibillo'
    ],
    'Pisco': [
      'Huancano', 'Humay', 'Independencia', 'Paracas', 'Pisco', 'San Andrés',
      'San Clemente', 'Túpac Amaru Inca'
    ]
  },

  // ============================================
  // ÁNCASH
  // ============================================
  'Áncash': {
    'Huaraz': [
      'Cochabamba', 'Colcabamba', 'Huanchay', 'Huaraz', 'Independencia', 'Jangas',
      'La Libertad', 'Olleros', 'Pampas Grande', 'Pariacoto', 'Pira', 'Tarica'
    ],
    'Aija': [
      'Aija', 'Coris', 'Huacllán', 'La Merced', 'Succha'
    ],
    'Antonio Raymondi': [
      'Aczo', 'Chaccho', 'Chingas', 'Llamellín', 'Mirgas', 'San Juan de Rontoy'
    ],
    'Asunción': [
      'Acochaca', 'Chacas'
    ],
    'Bolognesi': [
      'Abelardo Pardo Lezameta', 'Antonio Raymondi', 'Aquia', 'Cajacay', 'Canis',
      'Chiquián', 'Colquioc', 'Huallanca', 'Huasta', 'Huayllacayán', 'La Primavera',
      'Mangas', 'Pacllón', 'San Miguel de Corpanqui', 'Ticllos'
    ],
    'Carhuaz': [
      'Acopampa', 'Amashca', 'Anta', 'Ataquero', 'Carhuaz', 'Marcará', 'Pariahuanca',
      'San Miguel de Aco', 'Shilla', 'Tinco', 'Yungar'
    ],
    'Carlos Fermín Fitzcarrald': [
      'San Luis', 'San Nicolás', 'Yauya'
    ],
    'Casma': [
      'Buena Vista Alta', 'Casma', 'Comandante Noel', 'Yaután'
    ],
    'Corongo': [
      'Aco', 'Bambas', 'Corongo', 'Cusca', 'La Pampa', 'Yánac', 'Yupán'
    ],
    'Huari': [
      'Anra', 'Cajay', 'Chavín de Huántar', 'Huacachi', 'Huacchis', 'Huachis',
      'Huántar', 'Huari', 'Masin', 'Paucas', 'Pontó', 'Rahuapampa', 'Rapayán',
      'San Marcos', 'San Pedro de Chaná', 'Uco'
    ],
    'Huarmey': [
      'Cochapeti', 'Culebras', 'Huarmey', 'Huayán', 'Malvas'
    ],
    'Huaylas': [
      'Caraz', 'Huallanca', 'Huata', 'Huaylas', 'Mato', 'Pamparomás',
      'Pueblo Libre', 'Santa Cruz', 'Santo Toribio', 'Yuracmarca'
    ],
    'Mariscal Luzuriaga': [
      'Casca', 'Eleazar Guzmán Barrón', 'Fidel Olivas Escudero', 'Llama', 'Llumpa',
      'Lucma', 'Musga', 'Piscobamba'
    ],
    'Ocros': [
      'Acas', 'Cajamarquilla', 'Carhuapampa', 'Cochas', 'Congas', 'Llipa',
      'Ocros', 'San Cristóbal de Raján', 'San Pedro', 'Santiago de Chilcas'
    ],
    'Pallasca': [
      'Bolognesi', 'Cabana', 'Conchucos', 'Huacaschuque', 'Huandoval', 'Lacabamba',
      'Llapo', 'Pallasca', 'Pampas', 'Santa Rosa', 'Tauca'
    ],
    'Pomabamba': [
      'Huayllán', 'Parobamba', 'Pomabamba', 'Quinuabamba'
    ],
    'Recuay': [
      'Cátac', 'Cotaparaco', 'Huayllapampa', 'Llacllin', 'Marca', 'Pampas Chico',
      'Pararin', 'Recuay', 'Tapacocha', 'Ticapampa'
    ],
    'Santa': [
      'Cáceres del Perú', 'Chimbote', 'Coishco', 'Macate', 'Moro', 'Nepeña',
      'Nuevo Chimbote', 'Samanco', 'Santa'
    ],
    'Sihuas': [
      'Acobamba', 'Alfonso Ugarte', 'Cashapampa', 'Chingalpo', 'Huayllabamba',
      'Quiches', 'Ragash', 'San Juan', 'Sicsibamba', 'Sihuas'
    ],
    'Yungay': [
      'Cascapara', 'Mancos', 'Matacoto', 'Quillo', 'Ranrahirca', 'Shupluy', 'Yanama', 'Yungay'
    ]
  },

  // ============================================
  // CAJAMARCA
  // ============================================
  'Cajamarca': {
    'Cajamarca': [
      'Asunción', 'Cajamarca', 'Chetilla', 'Cospan', 'Encañada', 'Jesús',
      'Llacanora', 'Los Baños del Inca', 'Magdalena', 'Matara', 'Namora', 'San Juan'
    ],
    'Cajabamba': [
      'Cachachi', 'Cajabamba', 'Condebamba', 'Sitacocha'
    ],
    'Celendín': [
      'Celendín', 'Chumuch', 'Cortegana', 'Huasmin', 'Jorge Chávez', 'José Gálvez',
      'La Libertad de Pallán', 'Miguel Iglesias', 'Oxamarca', 'Sorochuco', 'Sucre', 'Utco'
    ],
    'Chota': [
      'Anguía', 'Chadín', 'Chalamarca', 'Chiguirip', 'Chimban', 'Choropampa',
      'Chota', 'Cochabamba', 'Conchán', 'Huambos', 'Lajas', 'Llama', 'Miracosta',
      'Paccha', 'Pión', 'Querocoto', 'San Juan de Licupis', 'Tacabamba', 'Tocmoche'
    ],
    'Contumazá': [
      'Chilete', 'Contumazá', 'Cupisnique', 'Guzmango', 'San Benito',
      'Santa Cruz de Toledo', 'Tantarica', 'Yonán'
    ],
    'Cutervo': [
      'Callayuc', 'Choros', 'Cujillo', 'Cutervo', 'La Ramada', 'Pimpingos',
      'Querocotillo', 'San Andrés de Cutervo', 'San Juan de Cutervo', 'San Luis de Lucma',
      'Santa Cruz', 'Santo Domingo de la Capilla', 'Santo Tomás', 'Socota', 'Toribio Casanova'
    ],
    'Hualgayoc': [
      'Bambamarca', 'Chugur', 'Hualgayoc'
    ],
    'Jaén': [
      'Bellavista', 'Chontali', 'Colasay', 'Huabal', 'Jaén', 'Las Pirias',
      'Pomahuaca', 'Pucará', 'Sallique', 'San Felipe', 'San José del Alto', 'Santa Rosa'
    ],
    'San Ignacio': [
      'Chirinos', 'Huarango', 'La Coipa', 'Namballe', 'San Ignacio', 'San José de Lourdes', 'Tabaconas'
    ],
    'San Marcos': [
      'Chancay', 'Eduardo Villanueva', 'Gregorio Pita', 'Ichocán', 'José Manuel Quiroz',
      'José Sabogal', 'Pedro Gálvez'
    ],
    'San Miguel': [
      'Bolívar', 'Calquis', 'Catilluc', 'El Prado', 'La Florida', 'Llapa',
      'Nanchoc', 'Niepos', 'San Gregorio', 'San Miguel', 'San Silvestre de Cochán',
      'Tongod', 'Unión Agua Blanca'
    ],
    'San Pablo': [
      'San Bernardino', 'San Luis', 'San Pablo', 'Tumbadén'
    ],
    'Santa Cruz': [
      'Andabamba', 'Catache', 'Chancaybaños', 'La Esperanza', 'Ninabamba',
      'Pulan', 'Santa Cruz', 'Saucepampa', 'Sexi', 'Uticyacu', 'Yauyucán'
    ]
  },

  // ============================================
  // PUNO
  // ============================================
  'Puno': {
    'Puno': [
      'Acora', 'Amantani', 'Atuncolla', 'Capachica', 'Chucuito', 'Coata', 'Huata',
      'Mañazo', 'Paucarcolla', 'Pichacani', 'Plateria', 'Puno', 'San Antonio',
      'Tiquillaca', 'Vilque'
    ],
    'Azángaro': [
      'Achaya', 'Arapa', 'Asillo', 'Azángaro', 'Caminaca', 'Chupa', 'José Domingo Choquehuanca',
      'Muñani', 'Potoni', 'Saman', 'San Antón', 'San José', 'San Juan de Salinas',
      'Santiago de Pupuja', 'Tirapata'
    ],
    'Carabaya': [
      'Ajoyani', 'Ayapata', 'Coasa', 'Corani', 'Crucero', 'Ituata', 'Macusani',
      'Ollachea', 'San Gabán', 'Usicayos'
    ],
    'Chucuito': [
      'Desaguadero', 'Huacullani', 'Juli', 'Kelluyo', 'Pisacoma', 'Pomata', 'Zepita'
    ],
    'El Collao': [
      'Capazo', 'Conduriri', 'Ilave', 'Pilcuyo', 'Santa Rosa'
    ],
    'Huancané': [
      'Cojata', 'Huancané', 'Huatasani', 'Inchupalla', 'Pusi', 'Rosaspata',
      'Taraco', 'Vilque Chico'
    ],
    'Lampa': [
      'Cabanilla', 'Calapuja', 'Lampa', 'Nicasio', 'Ocuviri', 'Palca', 'Paratía',
      'Pucara', 'Santa Lucía', 'Vilavila'
    ],
    'Melgar': [
      'Antauta', 'Ayaviri', 'Cupi', 'Llalli', 'Macari', 'Nuñoa', 'Orurillo',
      'Santa Rosa', 'Umachiri'
    ],
    'Moho': [
      'Conima', 'Huayrapata', 'Moho', 'Tilali'
    ],
    'San Antonio de Putina': [
      'Ananea', 'Pedro Vilca Apaza', 'Putina', 'Quilcapuncu', 'Sina'
    ],
    'San Román': [
      'Cabana', 'Cabanillas', 'Caracoto', 'Juliaca', 'San Miguel'
    ],
    'Sandia': [
      'Alto Inambari', 'Cuyocuyo', 'Limbani', 'Patambuco', 'Phara', 'Quiaca',
      'San Juan del Oro', 'San Pedro de Putina Punco', 'Sandia', 'Yanahuaya'
    ],
    'Yunguyo': [
      'Anapia', 'Copani', 'Cuturapi', 'Ollaraya', 'Tinicachi', 'Unicachi', 'Yunguyo'
    ]
  },

  // ============================================
  // TACNA
  // ============================================
  'Tacna': {
    'Tacna': [
      'Alto de la Alianza', 'Calana', 'Ciudad Nueva', 'Coronel Gregorio Albarracín Lanchipa',
      'Inclán', 'Pachía', 'Palca', 'Pocollay', 'Sama', 'Tacna'
    ],
    'Candarave': [
      'Cairani', 'Camilaca', 'Candarave', 'Curibaya', 'Huanuara', 'Quilahuani'
    ],
    'Jorge Basadre': [
      'Ilabaya', 'Ite', 'Locumba'
    ],
    'Tarata': [
      'Chucatamani', 'Estique', 'Estique-Pampa', 'Sitajara', 'Susapaya',
      'Tarata', 'Tarucachi', 'Ticaco'
    ]
  },

  // ============================================
  // LORETO
  // ============================================
  'Loreto': {
    'Maynas': [
      'Alto Nanay', 'Belén', 'Fernando Lores', 'Indiana', 'Iquitos', 'Las Amazonas',
      'Mazán', 'Napo', 'Punchana', 'San Juan Bautista', 'Torres Causana'
    ],
    'Alto Amazonas': [
      'Balsapuerto', 'Jeberos', 'Lagunas', 'Santa Cruz', 'Teniente César López Rojas', 'Yurimaguas'
    ],
    'Datem del Marañón': [
      'Andoas', 'Barranca', 'Cahuapanas', 'Manseriche', 'Morona', 'Pastaza'
    ],
    'Loreto': [
      'Nauta', 'Parinari', 'Tigre', 'Trompeteros', 'Urarinas'
    ],
    'Mariscal Ramón Castilla': [
      'Pebas', 'Ramón Castilla', 'San Pablo', 'Yavari'
    ],
    'Putumayo': [
      'Putumayo', 'Rosa Panduro', 'Teniente Manuel Clavero', 'Yaguas'
    ],
    'Requena': [
      'Alto Tapiche', 'Capelo', 'Emilio San Martín', 'Jenaro Herrera', 'Maquía',
      'Puinahua', 'Requena', 'Saquena', 'Soplin', 'Tapiche', 'Yaquerana'
    ],
    'Ucayali': [
      'Contamana', 'Inahuaya', 'Padre Márquez', 'Pampa Hermosa', 'Sarayacu', 'Vargas Guerra'
    ]
  },

  // ============================================
  // SAN MARTÍN
  // ============================================
  'San Martín': {
    'Moyobamba': [
      'Calzada', 'Habana', 'Jepelacio', 'Moyobamba', 'Soritor', 'Yantalo'
    ],
    'Bellavista': [
      'Alto Biavo', 'Bajo Biavo', 'Bellavista', 'Huallaga', 'San Pablo', 'San Rafael'
    ],
    'El Dorado': [
      'Agua Blanca', 'San José de Sisa', 'San Martín', 'Santa Rosa', 'Shatoja'
    ],
    'Huallaga': [
      'Alto Saposoa', 'El Eslabón', 'Piscoyacu', 'Sacanche', 'Saposoa', 'Tingo de Saposoa'
    ],
    'Lamas': [
      'Alonso de Alvarado', 'Barranquita', 'Caynarachi', 'Cuñumbuqui', 'Lamas',
      'Pinto Recodo', 'Rumisapa', 'San Roque de Cumbaza', 'Shanao', 'Tabalosos', 'Zapatero'
    ],
    'Mariscal Cáceres': [
      'Campanilla', 'Huicungo', 'Juanjuí', 'Pachiza', 'Pajarillo'
    ],
    'Picota': [
      'Buenos Aires', 'Caspisapa', 'Picota', 'Pilluana', 'Pucacaca',
      'San Cristóbal', 'San Hilarión', 'Shamboyacu', 'Tingo de Ponasa', 'Tres Unidos'
    ],
    'Rioja': [
      'Awajún', 'Elías Soplín Vargas', 'Nueva Cajamarca', 'Pardo Miguel',
      'Posic', 'Rioja', 'San Fernando', 'Yorongos', 'Yuracyacu'
    ],
    'San Martín': [
      'Alberto Leveau', 'Cacatachi', 'Chazuta', 'Chipurana', 'El Porvenir',
      'Huimbayoc', 'Juan Guerra', 'La Banda de Shilcayo', 'Morales', 'Papaplaya',
      'San Antonio', 'Sauce', 'Shapaja', 'Tarapoto'
    ],
    'Tocache': [
      'Nuevo Progreso', 'Pólvora', 'Shunte', 'Tocache', 'Uchiza'
    ]
  },

  // ============================================
  // UCAYALI
  // ============================================
  'Ucayali': {
    'Coronel Portillo': [
      'Callería', 'Campoverde', 'Iparía', 'Masisea', 'Nueva Requena', 'Manantay', 'Yarinacocha'
    ],
    'Atalaya': [
      'Raimondi', 'Sepahua', 'Tahuanía', 'Yurúa'
    ],
    'Padre Abad': [
      'Curimaná', 'Irazola', 'Neshuya', 'Padre Abad'
    ],
    'Purús': [
      'Purús'
    ]
  },

  // ============================================
  // AMAZONAS
  // ============================================
  'Amazonas': {
    'Chachapoyas': [
      'Asunción', 'Balsas', 'Chachapoyas', 'Cheto', 'Chiliquín', 'Chuquibamba',
      'Granada', 'Huancas', 'La Jalca', 'Leimebamba', 'Levanto', 'Magdalena',
      'Mariscal Castilla', 'Molinopampa', 'Montevideo', 'Olleros', 'Quinjalca',
      'San Francisco de Daguas', 'San Isidro de Maino', 'Soloco', 'Sonche'
    ],
    'Bagua': [
      'Aramango', 'Bagua', 'Copallín', 'El Parco', 'Imaza', 'La Peca'
    ],
    'Bongará': [
      'Chisquilla', 'Churuja', 'Corosha', 'Cuispes', 'Florida', 'Jamalca', 'Jumbilla',
      'Recta', 'San Carlos', 'Shipasbamba', 'Valera', 'Yambrasbamba'
    ],
    'Condorcanqui': [
      'El Cenepa', 'Nieva', 'Río Santiago'
    ],
    'Luya': [
      'Camporredondo', 'Cocabamba', 'Colcamar', 'Conila', 'Inguilpata', 'Lamud',
      'Longuita', 'Lonya Chico', 'Luya', 'Luya Viejo', 'María', 'Ocalli',
      'Ocumal', 'Pisuquia', 'Providencia', 'San Cristóbal', 'San Francisco del Yeso',
      'San Jerónimo', 'San Juan de Lopecancha', 'Santa Catalina', 'Santo Tomás', 'Tingo', 'Trita'
    ],
    'Rodríguez de Mendoza': [
      'Chirimoto', 'Cochamal', 'Huambo', 'Limabamba', 'Longar', 'Mariscal Benavides',
      'Milpuc', 'Omia', 'San Nicolás', 'Santa Rosa', 'Totora', 'Vista Alegre'
    ],
    'Utcubamba': [
      'Bagua Grande', 'Cajaruro', 'Cumba', 'El Milagro', 'Jamalca', 'Lonya Grande', 'Yamón'
    ]
  },

  // ============================================
  // APURÍMAC
  // ============================================
  'Apurímac': {
    'Abancay': [
      'Abancay', 'Chacoche', 'Circa', 'Curahuasi', 'Huanipaca', 'Lambrama',
      'Pichirhua', 'San Pedro de Cachora', 'Tamburco'
    ],
    'Andahuaylas': [
      'Andahuaylas', 'Andarapa', 'Chiara', 'Huancarama', 'Huancaray', 'Huayana',
      'Kaquiabamba', 'Kishuara', 'Pacobamba', 'Pacucha', 'Pampachiri', 'Pomacocha',
      'San Antonio de Cachi', 'San Jerónimo', 'San Miguel de Chaccrampa', 'Santa María de Chicmo',
      'Talavera', 'Tumay Huaraca', 'Turpo', 'José María Arguedas'
    ],
    'Antabamba': [
      'Antabamba', 'El Oro', 'Huaquirca', 'Juan Espinoza Medrano', 'Oropesa',
      'Pachaconas', 'Sabaino'
    ],
    'Aymaraes': [
      'Capaya', 'Caraybamba', 'Chalhuanca', 'Chapimarca', 'Colcabamba', 'Cotaruse',
      'Ihuayllo', 'Justo Apu Sahuaraura', 'Lucre', 'Pocohuanca', 'San Juan de Chacña',
      'Sañayca', 'Soraya', 'Tapairihua', 'Tintay', 'Toraya', 'Yanaca'
    ],
    'Chincheros': [
      'Anco-Huallo', 'Chincheros', 'Cocharcas', 'Huaccana', 'Ocobamba', 'Ongoy',
      'Ranracancha', 'Uranmarca'
    ],
    'Cotabambas': [
      'Challhuahuacho', 'Cotabambas', 'Coyllurqui', 'Haquira', 'Mara', 'Tambobamba'
    ],
    'Grau': [
      'Chuquibambilla', 'Curasco', 'Curpahuasi', 'Gamarra', 'Huayllati', 'Mamara',
      'Mariscal Gamarra', 'Micaela Bastidas', 'Pataypampa', 'Progreso', 'San Antonio',
      'Santa Rosa', 'Turpay', 'Vilcabamba', 'Virundo'
    ]
  },

  // ============================================
  // AYACUCHO
  // ============================================
  'Ayacucho': {
    'Huamanga': [
      'Acocro', 'Acos Vinchos', 'Andrés Avelino Cáceres Dorregaray', 'Ayacucho',
      'Carmen Alto', 'Chiara', 'Jesús Nazareno', 'Ocros', 'Pacaycasa', 'Quinua',
      'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos',
      'Tambillo', 'Vinchos'
    ],
    'Cangallo': [
      'Cangallo', 'Chuschi', 'Los Morochucos', 'María Parado de Bellido',
      'Paras', 'Totos'
    ],
    'Huanca Sancos': [
      'Carapo', 'Sacsamarca', 'Sancos', 'Santiago de Lucanamarca'
    ],
    'Huanta': [
      'Ayahuanco', 'Huamanguilla', 'Huanta', 'Iguaín', 'Llochegua', 'Luricocha',
      'Santillana', 'Sivia', 'Canayre', 'Uchuraccay', 'Pucacolpa', 'Chaca'
    ],
    'La Mar': [
      'Anco', 'Ayna', 'Chilcas', 'Chungui', 'Luis Carranza', 'Oronccoy',
      'San Miguel', 'Santa Rosa', 'Samugari', 'Tambo', 'Anchihuay', 'Unión Progreso'
    ],
    'Lucanas': [
      'Aucara', 'Cabana', 'Carmen Salcedo', 'Chaviña', 'Chipao', 'Huac-Huas',
      'Laramate', 'Leoncio Prado', 'Llauta', 'Lucanas', 'Ocaña', 'Otoca', 'Puquio',
      'Saisa', 'San Cristóbal', 'San Juan', 'San Pedro', 'San Pedro de Palco',
      'Sancos', 'Santa Ana de Huaycahuacho', 'Santa Lucía'
    ],
    'Parinacochas': [
      'Coracora', 'Coronel Castañeda', 'Chumpi', 'Pacapausa', 'Pullo',
      'Puyusca', 'San Francisco de Ravacayco', 'Upahuacho'
    ],
    'Páucar del Sara Sara': [
      'Colta', 'Corculla', 'Lampa', 'Marcabamba', 'Oyolo', 'Pararca', 'Pausa',
      'San Javier de Alpabamba', 'San José de Ushua', 'Sara Sara'
    ],
    'Sucre': [
      'Belén', 'Chalcos', 'Chilcayoc', 'Huacaña', 'Morcolla', 'Paico',
      'Querobamba', 'San Pedro de Larcay', 'San Salvador de Quije', 'Santiago de Paucaray', 'Soras'
    ],
    'Víctor Fajardo': [
      'Alcamenca', 'Apongo', 'Asquipata', 'Canaria', 'Cayara', 'Colca', 'Huamanquiquia',
      'Huancapi', 'Huancaraylla', 'Huaya', 'Sarhua', 'Vilcanchos'
    ],
    'Vilcas Huamán': [
      'Accomarca', 'Carhuanca', 'Concepción', 'Huambalpa', 'Independencia',
      'Saurama', 'Vilcas Huamán', 'Vischongo'
    ]
  },

  // ============================================
  // HUANCAVELICA
  // ============================================
  'Huancavelica': {
    'Huancavelica': [
      'Acobambilla', 'Acoria', 'Ascensión', 'Conayca', 'Cuenca', 'Huachocolpa',
      'Huancavelica', 'Huayllahuara', 'Izcuchaca', 'Laria', 'Manta', 'Mariscal Cáceres',
      'Moya', 'Nuevo Occoro', 'Palca', 'Pilchaca', 'Vilca', 'Yauli'
    ],
    'Acobamba': [
      'Acobamba', 'Andabamba', 'Anta', 'Caja', 'Marcas', 'Paucara', 'Pomacocha', 'Rosario'
    ],
    'Angaraes': [
      'Anchonga', 'Callanmarca', 'Ccochaccasa', 'Chincho', 'Congalla', 'Huanca-Huanca',
      'Huayllay Grande', 'Julcamarca', 'Lircay', 'San Antonio de Antaparco',
      'Santo Tomás de Pata', 'Secclla'
    ],
    'Castrovirreyna': [
      'Arma', 'Aurahua', 'Capillas', 'Castrovirreyna', 'Chupamarca', 'Cocas',
      'Huachos', 'Huamatambo', 'Mollepampa', 'San Juan', 'Santa Ana', 'Tantara', 'Ticrapo'
    ],
    'Churcampa': [
      'Anco', 'Chinchihuasi', 'Churcampa', 'Cosme', 'El Carmen', 'La Merced',
      'Locroja', 'Pachamarca', 'Paucarbamba', 'San Miguel de Mayocc', 'San Pedro de Coris'
    ],
    'Huaytará': [
      'Ayavi', 'Córdova', 'Huayacundo Arma', 'Huaytará', 'Laramarca', 'Ocoyo',
      'Pilpichaca', 'Querco', 'Quito-Arma', 'San Antonio de Cusicancha',
      'San Francisco de Sangayaico', 'San Isidro', 'Santiago de Chocorvos',
      'Santiago de Quirahuara', 'Santo Domingo de Capillas', 'Tambo'
    ],
    'Tayacaja': [
      'Acostambo', 'Acraquia', 'Ahuaycha', 'Colcabamba', 'Daniel Hernández',
      'Huachocolpa', 'Huaribamba', 'Ñahuimpuquio', 'Pampas', 'Pazos', 'Quishuar',
      'Salcabamba', 'Salcahuasi', 'San Marcos de Rocchac', 'Surcubamba', 'Tintay Puncu'
    ]
  },

  // ============================================
  // HUÁNUCO
  // ============================================
  'Huánuco': {
    'Huánuco': [
      'Amarilis', 'Chinchao', 'Churubamba', 'Huánuco', 'Margos', 'Pillco Marca',
      'Quisqui', 'San Francisco de Cayrán', 'San Pedro de Chaulán', 'Santa María del Valle', 'Yarumayo', 'Yacus'
    ],
    'Ambo': [
      'Ambo', 'Cayna', 'Colpas', 'Conchamarca', 'Huácar', 'San Francisco', 'San Rafael', 'Tomay Kichwa'
    ],
    'Dos de Mayo': [
      'Chuquis', 'La Unión', 'Marías', 'Pachas', 'Quivilla', 'Ripán', 'Shunqui', 'Sillapata', 'Yanas'
    ],
    'Huacaybamba': [
      'Canchabamba', 'Cochabamba', 'Huacaybamba', 'Pinra'
    ],
    'Huamalíes': [
      'Arancay', 'Chavín de Pariarca', 'Jacas Grande', 'Jircán', 'Llata', 'Miraflores',
      'Monzón', 'Punchao', 'Puños', 'Singa', 'Tantamayo'
    ],
    'Lauricocha': [
      'Baños', 'Jesús', 'Jivia', 'Queropalca', 'Rondos', 'San Francisco de Asís', 'San Miguel de Cauri'
    ],
    'Leoncio Prado': [
      'Daniel Alomía Robles', 'Hermilio Valdizán', 'José Crespo y Castillo', 'Luyando',
      'Mariano Dámaso Beraún', 'Pucayacu', 'Castillo Grande', 'Pueblo Nuevo', 'Rupa-Rupa', 'Santo Domingo de Anda'
    ],
    'Marañón': [
      'Cholón', 'Huacrachuco', 'San Buenaventura'
    ],
    'Pachitea': [
      'Chaglla', 'Molino', 'Panao', 'Umari'
    ],
    'Puerto Inca': [
      'Codo del Pozuzo', 'Honoria', 'Puerto Inca', 'Tournavista', 'Yuyapichis'
    ],
    'Yarowilca': [
      'Aparicio Pomares', 'Cahuac', 'Chacabamba', 'Chavinillo', 'Choras',
      'Jacas Chico', 'Obas', 'Pampamarca'
    ]
  },

  // ============================================
  // MADRE DE DIOS
  // ============================================
  'Madre de Dios': {
    'Tambopata': [
      'Inambari', 'Laberinto', 'Las Piedras', 'Tambopata'
    ],
    'Manu': [
      'Fitzcarrald', 'Huepetuhe', 'Madre de Dios', 'Manu'
    ],
    'Tahuamanu': [
      'Iberia', 'Iñapari', 'Tahuamanu'
    ]
  },

  // ============================================
  // MOQUEGUA
  // ============================================
  'Moquegua': {
    'Mariscal Nieto': [
      'Carumas', 'Cuchumbaya', 'Moquegua', 'Samegua', 'San Cristóbal', 'Torata'
    ],
    'General Sánchez Cerro': [
      'Chojata', 'Coalaque', 'Ichuña', 'La Capilla', 'Lloque', 'Matalaque',
      'Omate', 'Puquina', 'Quinistaquillas', 'Ubinas', 'Yunga'
    ],
    'Ilo': [
      'El Algarrobal', 'Ilo', 'Pacocha'
    ]
  },

  // ============================================
  // PASCO
  // ============================================
  'Pasco': {
    'Pasco': [
      'Chaupimarca', 'Huachón', 'Huariaca', 'Huayllay', 'Ninacaca', 'Pallanchacra',
      'Paucartambo', 'San Francisco de Asís de Yarusyacán', 'Simón Bolívar',
      'Ticlacayán', 'Tinyahuarco', 'Vicco', 'Yanacancha'
    ],
    'Daniel Alcides Carrión': [
      'Chacayán', 'Goyllarisquizga', 'Paucar', 'San Pedro de Pillao', 'Santa Ana de Tusi',
      'Tapuc', 'Vilcabamba', 'Yanahuanca'
    ],
    'Oxapampa': [
      'Chontabamba', 'Huancabamba', 'Oxapampa', 'Palcazú', 'Pozuzo',
      'Puerto Bermúdez', 'Villa Rica', 'Constitución'
    ]
  },

  // ============================================
  // TUMBES
  // ============================================
  'Tumbes': {
    'Tumbes': [
      'Corrales', 'La Cruz', 'Pampas de Hospital', 'San Jacinto', 'San Juan de la Virgen', 'Tumbes'
    ],
    'Contralmirante Villar': [
      'Canoas de Punta Sal', 'Casitas', 'Zorritos'
    ],
    'Zarumilla': [
      'Aguas Verdes', 'Matapalo', 'Papayal', 'Zarumilla'
    ]
  }
}
