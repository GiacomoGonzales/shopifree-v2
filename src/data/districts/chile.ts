// Chile: Región → Comuna → Sector/Población
// Estructura para delivery: sectores de comunas principales

export const chileDistricts: Record<string, Record<string, string[]>> = {
  // Región Metropolitana de Santiago
  'Metropolitana de Santiago': {
    'Santiago': [
      'Centro', 'Barrio Brasil', 'Barrio Concha y Toro', 'Barrio Dieciocho', 'Barrio Lastarria',
      'Barrio París-Londres', 'Barrio República', 'Barrio Yungay', 'Franklin', 'Matta Sur',
      'San Diego', 'Santa Isabel', 'Parque O\'Higgins'
    ],
    'Providencia': [
      'Barrio Italia', 'Barrio Bellavista', 'El Golf', 'Los Leones', 'Manuel Montt',
      'Pedro de Valdivia', 'Salvador', 'Seminario', 'Tobalaba', 'Inés de Suárez'
    ],
    'Las Condes': [
      'El Golf', 'Los Dominicos', 'Apoquindo', 'Estoril', 'La Dehesa', 'Lo Curro',
      'San Carlos de Apoquindo', 'San Damián', 'Jardín del Este', 'Nueva Las Condes'
    ],
    'Vitacura': [
      'Lo Curro', 'Pie Andino', 'Santa María de Manquehue', 'Tabancura', 'Alto Las Condes',
      'El Cerro', 'La Foresta', 'Kennedy'
    ],
    'Ñuñoa': [
      'Estadio Nacional', 'Irarrázaval', 'Juan Gómez Millas', 'Plaza Egaña', 'Plaza Ñuñoa',
      'Simón Bolívar', 'Villa Frei', 'Villa Los Jardines', 'Los Guindos'
    ],
    'La Florida': [
      'Centro', 'La Florida Alta', 'Los Quillayes', 'Santa Raquel', 'Trinidad',
      'Villa O\'Higgins', 'Rojas Magallanes', 'Walker Martínez', 'Mirador'
    ],
    'Maipú': [
      'Centro', 'Ciudad Satélite', 'El Abrazo', 'Los Héroes', 'Maipú Poniente',
      'Portal del Sol', 'Rinconada', 'Sol Poniente', 'Tres Poniente', 'Pajaritos'
    ],
    'Puente Alto': [
      'Centro', 'Bajos de Mena', 'El Peral', 'La Obra', 'Las Vizcachas',
      'Los Toros', 'San Gerónimo', 'Tobalaba', 'Villa El Volcán'
    ],
    'San Bernardo': [
      'Centro', 'El Manzano', 'El Sauce', 'La Aguada', 'Los Morros',
      'Nos', 'Portada de Nos', 'San Francisco', 'Villa Los Aromos'
    ],
    'Lo Barnechea': [
      'El Arrayán', 'Farellones', 'La Dehesa', 'Los Trapenses', 'Huinganal',
      'El Huinganal', 'Valle Escondido'
    ],
    'Peñalolén': [
      'Lo Hermida', 'La Faena', 'Peñalolén Alto', 'San Luis', 'Tobalaba',
      'Las Torres', 'Los Quillayes', 'Oriente'
    ],
    'La Reina': [
      'Campus Oriente', 'El Llano', 'Príncipe de Gales', 'Villa La Reina',
      'Aldea del Encuentro', 'Jardín Alto', 'Padre Hurtado'
    ],
    'Macul': [
      'Campus San Joaquín', 'La Florida', 'Los Orientales', 'Macul Alto',
      'Quilín', 'San Luis', 'Villa Macul'
    ],
    'Recoleta': [
      'Barrio Patronato', 'Barrio Bellavista', 'Centro', 'El Salto', 'Quinta Normal',
      'Recoleta Norte', 'San Cristóbal', 'Vega Central'
    ],
    'Independencia': [
      'Centro', 'Hipódromo Chile', 'La Pincoya', 'Vivaceta', 'Santos Dumont'
    ],
    'Quilicura': [
      'Centro', 'El Mañío', 'Lo Campino', 'Lo Cruzat', 'Pajaritos',
      'San Luis', 'Valle Grande', 'Valle Lo Campino'
    ],
    'Huechuraba': [
      'Centro', 'Ciudad Empresarial', 'El Barrero', 'La Pincoya', 'Pedro Fontova'
    ],
    'Estación Central': [
      'Alameda', 'Centro', 'Ecuador', 'Las Rejas', 'Lo Errázuriz',
      'Padre Hurtado', 'Quinta Normal', 'Valle Verde'
    ]
  },

  // Valparaíso
  'Valparaíso': {
    'Valparaíso': [
      'Almendral', 'Barón', 'Cerro Alegre', 'Cerro Concepción', 'Cerro Cordillera',
      'Cerro Florida', 'Cerro Playa Ancha', 'El Plan', 'Miraflores', 'Placeres',
      'Playa Ancha', 'Portales', 'Recreo'
    ],
    'Viña del Mar': [
      'Achupallas', 'Agua Santa', 'Centro', 'Chorrillos', 'Gómez Carreño',
      'Miraflores', 'Nueva Aurora', 'Recreo', 'Reñaca', 'Santa Inés',
      'Sporting', 'Villa Dulce'
    ],
    'Quilpué': [
      'Centro', 'Belloto Norte', 'Belloto Sur', 'El Retiro', 'El Sol',
      'Los Pinos', 'Mena', 'Valencia'
    ],
    'Villa Alemana': [
      'Centro', 'El Patagual', 'Las Américas', 'Las Canchas', 'Peñablanca',
      'Valle Florido', 'Villa Independencia'
    ],
    'Concón': [
      'Bosques de Montemar', 'Centro', 'Costa de Montemar', 'Higuerillas', 'La Boca',
      'Los Pinos', 'Lomas de Montemar'
    ],
    'San Antonio': [
      'Barrancas', 'Centro', 'Llolleo', 'Lo Gallardo', 'Malvilla', 'Tejas Verdes'
    ]
  },

  // Biobío
  'Biobío': {
    'Concepción': [
      'Barrio Norte', 'Barrio Universitario', 'Centro', 'Collao', 'Diagonal',
      'Las Tres Pascualas', 'Lomas de San Andrés', 'Lorenzo Arenas', 'Palomares',
      'Pedro de Valdivia', 'Valle Noble', 'Villa Cap'
    ],
    'Talcahuano': [
      'Arenal', 'Centro', 'Cerro David Fuentes', 'Gaete', 'Hualpén',
      'Las Higueras', 'San Vicente', 'Tumbes'
    ],
    'Hualpén': [
      'Centro', 'Cerro Centinela', 'La Gloria', 'Los Lobos', 'Rocuant',
      'San Pedro de la Costa', 'Villa Acero'
    ],
    'San Pedro de la Paz': [
      'Andalué', 'Boca Sur', 'Centro', 'El Venado', 'Idahue',
      'Lomas Coloradas', 'San Pedro del Valle', 'Villa San Pedro'
    ],
    'Chiguayante': [
      'Centro', 'Las Palmas', 'Lonco', 'Manquimávida', 'Villa Los Ríos'
    ],
    'Los Ángeles': [
      'Centro', 'El Avellano', 'El Retiro', 'La Aguada', 'Las Vertientes',
      'Monterrico', 'Villa Galilea', 'Villa Los Jardines'
    ]
  },

  // La Araucanía
  'La Araucanía': {
    'Temuco': [
      'Amanecer', 'Barrio Inglés', 'Centro', 'Labranza', 'Pablo Neruda',
      'Pedro de Valdivia', 'Pueblo Nuevo', 'Santa Rosa', 'Villa Olímpica'
    ],
    'Padre Las Casas': [
      'Centro', 'El Claro', 'Los Aromos', 'Las Quilas', 'San Ramón',
      'Villa Alegre', 'Villa Los Boldos'
    ],
    'Villarrica': [
      'Centro', 'La Poza', 'Lican Ray', 'Pedregoso', 'Pucón Alto',
      'Voipir'
    ],
    'Pucón': [
      'Centro', 'La Poza', 'Los Arrayanes', 'Mirador del Lago', 'Palguin',
      'Quelhue', 'Villa Santa Elena'
    ]
  },

  // Los Ríos
  'Los Ríos': {
    'Valdivia': [
      'Barrios Bajos', 'Centro', 'Collico', 'Corvi', 'Estancilla',
      'Isla Teja', 'Las Ánimas', 'Miraflores', 'Regional', 'Torobayo'
    ],
    'La Unión': [
      'Centro', 'El Arrayán', 'El Roble', 'La Palmera', 'Villa Primavera'
    ]
  },

  // Los Lagos
  'Los Lagos': {
    'Puerto Montt': [
      'Alerce', 'Angelmó', 'Cardonal', 'Centro', 'Chinquihue',
      'El Tepual', 'Mirasol', 'Padre Hurtado', 'Pelluco', 'Población Modelo',
      'Valle Volcanes'
    ],
    'Puerto Varas': [
      'Centro', 'Ensenada', 'La Paloma', 'Las Lomas', 'Molino Viejo',
      'Petrohué', 'Volcán Osorno'
    ],
    'Osorno': [
      'Centro', 'Francke', 'Ovejería', 'Rahue', 'República',
      'Villa Los Presidentes', 'Volcán Osorno'
    ],
    'Castro': [
      'Centro', 'Gamboa', 'Llau Llao', 'Nercón', 'Rilán',
      'Ten Ten'
    ]
  },

  // Coquimbo
  'Coquimbo': {
    'La Serena': [
      'Centro', 'Cerro Grande', 'Compañía Alta', 'El Milagro', 'Islón',
      'Juan XXIII', 'La Antena', 'La Florida', 'Las Compañías', 'San Joaquín'
    ],
    'Coquimbo': [
      'Centro', 'El Llano', 'Guayacán', 'La Cantera', 'La Herradura',
      'La Pampilla', 'Peñuelas', 'Tierras Blancas', 'Totoralillo'
    ],
    'Ovalle': [
      'Centro', 'El Ingenio', 'La Chimba', 'Las Lomas', 'Limarí',
      'Parque Industrial', 'Villa Fundición'
    ]
  },

  // Antofagasta
  'Antofagasta': {
    'Antofagasta': [
      'Centro', 'Coviefi', 'Gran Vía', 'Jardines del Norte', 'La Chimba',
      'La Florida', 'Playa Blanca', 'Sur', 'Universidad'
    ],
    'Calama': [
      'Centro', 'Chuquicamata', 'El Loa', 'Kamac Mayu', 'Ojo de Opache',
      'Topater', 'Villa Ayquina'
    ]
  },

  // Atacama
  'Atacama': {
    'Copiapó': [
      'Centro', 'El Palomar', 'La Candelaria', 'Los Carrera', 'Los Volcanes',
      'Paipote', 'San Fernando', 'Tierra Amarilla'
    ],
    'Vallenar': [
      'Centro', 'Baquedano', 'El Almendro', 'Lautaro', 'Los Carrera', 'Villa El Cerro'
    ]
  },

  // Tarapacá
  'Tarapacá': {
    'Iquique': [
      'Cavancha', 'Centro', 'El Colorado', 'El Morro', 'Gómez Carreño',
      'Huayquique', 'La Tirana', 'Playa Brava'
    ],
    'Alto Hospicio': [
      'Autoconstrucción', 'Centro', 'El Boro', 'La Pampa', 'La Tortuga',
      'Los Arenales', 'Santa Rosa'
    ]
  },

  // Arica y Parinacota
  'Arica y Parinacota': {
    'Arica': [
      'Azapa', 'Centro', 'Cerro La Cruz', 'Cerro Sombrero', 'Chinchorro',
      'El Laucho', 'Jardines del Paraíso', 'Las Macarenas', 'Playa Corazones', 'San José'
    ]
  },

  // O'Higgins
  "O'Higgins": {
    'Rancagua': [
      'Centro', 'Centenario', 'El Toco', 'Gamero', 'Manzanal',
      'Medialuna', 'Norte', 'Población Arturo Prat', 'San Francisco'
    ],
    'San Fernando': [
      'Centro', 'El Copihue', 'Manuel Rodríguez', 'Población el Mirador',
      'Villa España'
    ]
  },

  // Maule
  'Maule': {
    'Talca': [
      'Centro', 'Cerro de la Virgen', 'Las Américas', 'Norte', 'Oriente',
      'Poniente', 'Sur', 'Villa Galilea', 'Villa Los Jardines'
    ],
    'Curicó': [
      'Centro', 'El Boldo', 'La Isla', 'Los Niches', 'Sarmiento',
      'Villa Las Américas', 'Villa Los Conquistadores'
    ],
    'Linares': [
      'Centro', 'Diego Portales', 'El Maitén', 'Industrial',
      'Población Yerbas Buenas', 'San Ambrosio'
    ]
  },

  // Ñuble
  'Ñuble': {
    'Chillán': [
      'Centro', 'Los Héroes', 'María Auxiliadora', 'Schleyer',
      'Ultraestación', 'Villa Prat', 'Vicente Pérez Rosales'
    ],
    'Chillán Viejo': [
      'Centro', 'Las Canoas', 'Nebuco', 'Quilmo', 'Rucamanqui'
    ]
  },

  // Magallanes
  'Magallanes': {
    'Punta Arenas': [
      'Centro', 'Costanera', 'Fitz Roy', 'Leñadura', 'Norte',
      '18 de Septiembre', 'Prat', 'Sur'
    ],
    'Natales': [
      'Centro', 'Norte', 'Sur', 'Barrio Industrial'
    ]
  },

  // Aysén
  'Aysén': {
    'Coyhaique': [
      'Centro', 'El Claro', 'Gobernador Vidal', 'Las Quintas', 'Los Ñires',
      'Peter', 'Valle Simpson'
    ]
  }
}
