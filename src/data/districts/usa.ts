// USA: State → City → Neighborhood
// Structure for delivery: neighborhoods of major cities

export const usaDistricts: Record<string, Record<string, string[]>> = {
  // California
  'California': {
    'Los Angeles': [
      'Downtown', 'Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice',
      'Westwood', 'Brentwood', 'Culver City', 'West Hollywood', 'Silver Lake',
      'Echo Park', 'Los Feliz', 'Koreatown', 'Mid-Wilshire', 'Hancock Park',
      'Arts District', 'Boyle Heights', 'East LA', 'Highland Park', 'Eagle Rock'
    ],
    'San Francisco': [
      'Downtown', 'Financial District', 'SoMa', 'Mission District', 'Castro',
      'Noe Valley', 'Haight-Ashbury', 'Marina District', 'Pacific Heights', 'Russian Hill',
      'North Beach', 'Chinatown', 'Tenderloin', 'Hayes Valley', 'Richmond District',
      'Sunset District', 'Nob Hill', 'Potrero Hill', 'Dogpatch', 'Bernal Heights'
    ],
    'San Diego': [
      'Downtown', 'Gaslamp Quarter', 'Little Italy', 'Hillcrest', 'North Park',
      'South Park', 'Ocean Beach', 'Pacific Beach', 'La Jolla', 'Mission Beach',
      'Point Loma', 'Coronado', 'Bankers Hill', 'University Heights', 'Normal Heights'
    ],
    'San Jose': [
      'Downtown', 'Willow Glen', 'Rose Garden', 'Japantown', 'SoFA District',
      'Santana Row', 'Almaden Valley', 'Evergreen', 'Berryessa', 'Campbell'
    ],
    'Sacramento': [
      'Downtown', 'Midtown', 'East Sacramento', 'Land Park', 'Curtis Park',
      'Oak Park', 'Tahoe Park', 'Pocket', 'Natomas', 'Arden-Arcade'
    ],
    'Oakland': [
      'Downtown', 'Jack London Square', 'Lake Merritt', 'Temescal', 'Rockridge',
      'Piedmont', 'Grand Lake', 'Adams Point', 'Chinatown', 'West Oakland'
    ]
  },

  // New York
  'New York': {
    'New York City': [
      'Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'
    ],
    'Manhattan': [
      'Upper East Side', 'Upper West Side', 'Midtown', 'Chelsea', 'Greenwich Village',
      'East Village', 'SoHo', 'Tribeca', 'Financial District', 'Harlem',
      'Washington Heights', 'Morningside Heights', 'Hell\'s Kitchen', 'Murray Hill', 'Gramercy'
    ],
    'Brooklyn': [
      'Williamsburg', 'DUMBO', 'Brooklyn Heights', 'Park Slope', 'Bushwick',
      'Greenpoint', 'Bed-Stuy', 'Crown Heights', 'Cobble Hill', 'Carroll Gardens',
      'Fort Greene', 'Clinton Hill', 'Prospect Heights', 'Bay Ridge', 'Sunset Park'
    ],
    'Queens': [
      'Astoria', 'Long Island City', 'Flushing', 'Jackson Heights', 'Forest Hills',
      'Sunnyside', 'Woodside', 'Jamaica', 'Bayside', 'Elmhurst'
    ],
    'Buffalo': [
      'Downtown', 'Allentown', 'Elmwood Village', 'North Buffalo', 'South Buffalo',
      'Delaware District', 'Hertel Avenue', 'Canalside', 'Larkinville'
    ]
  },

  // Texas
  'Texas': {
    'Houston': [
      'Downtown', 'Midtown', 'Montrose', 'The Heights', 'Rice Village',
      'Galleria', 'River Oaks', 'Upper Kirby', 'Museum District', 'EaDo',
      'Washington Avenue', 'Memorial', 'West University', 'Sugar Land', 'Katy'
    ],
    'Dallas': [
      'Downtown', 'Uptown', 'Deep Ellum', 'Bishop Arts', 'Oak Lawn',
      'Knox-Henderson', 'Lakewood', 'Lower Greenville', 'Highland Park', 'Park Cities',
      'Victory Park', 'Design District', 'Trinity Groves', 'White Rock', 'Preston Hollow'
    ],
    'Austin': [
      'Downtown', 'South Congress', 'East Austin', 'Sixth Street', 'Rainey Street',
      'Zilker', 'Clarksville', 'Hyde Park', 'Mueller', 'Domain',
      'Tarrytown', 'Barton Hills', 'North Loop', 'Bouldin Creek', 'Travis Heights'
    ],
    'San Antonio': [
      'Downtown', 'Southtown', 'Pearl District', 'King William', 'Alamo Heights',
      'Stone Oak', 'Medical Center', 'Monte Vista', 'Olmos Park', 'Tobin Hill',
      'La Cantera', 'The Rim', 'Helotes', 'Terrell Hills'
    ],
    'Fort Worth': [
      'Downtown', 'Sundance Square', 'Cultural District', 'Near Southside', 'Fairmount',
      'West 7th', 'Stockyards', 'TCU Area', 'Camp Bowie', 'Clearfork'
    ]
  },

  // Florida
  'Florida': {
    'Miami': [
      'Downtown', 'Brickell', 'Wynwood', 'Design District', 'Midtown',
      'Little Havana', 'Coconut Grove', 'Coral Gables', 'South Beach', 'Miami Beach',
      'Key Biscayne', 'Little Haiti', 'Edgewater', 'Overtown', 'Allapattah'
    ],
    'Orlando': [
      'Downtown', 'Thornton Park', 'Mills 50', 'Ivanhoe Village', 'College Park',
      'Winter Park', 'Baldwin Park', 'Lake Eola', 'SoDo', 'International Drive'
    ],
    'Tampa': [
      'Downtown', 'Ybor City', 'Channelside', 'Hyde Park', 'South Tampa',
      'Seminole Heights', 'Tampa Heights', 'Westchase', 'Carrollwood', 'Davis Islands'
    ],
    'Jacksonville': [
      'Downtown', 'Riverside', 'Avondale', 'Five Points', 'San Marco',
      'Springfield', 'Murray Hill', 'Beaches', 'Mandarin', 'Southside'
    ]
  },

  // Illinois
  'Illinois': {
    'Chicago': [
      'The Loop', 'River North', 'Streeterville', 'Gold Coast', 'Lincoln Park',
      'Lakeview', 'Wicker Park', 'Bucktown', 'Logan Square', 'West Loop',
      'South Loop', 'Pilsen', 'Hyde Park', 'Andersonville', 'Rogers Park',
      'Ukrainian Village', 'Old Town', 'Wrigleyville', 'Ravenswood', 'Bridgeport'
    ]
  },

  // Pennsylvania
  'Pennsylvania': {
    'Philadelphia': [
      'Center City', 'Old City', 'Rittenhouse Square', 'Society Hill', 'Northern Liberties',
      'Fishtown', 'South Philadelphia', 'University City', 'Manayunk', 'Chinatown',
      'Fairmount', 'Art Museum Area', 'Graduate Hospital', 'Queen Village', 'Bella Vista'
    ],
    'Pittsburgh': [
      'Downtown', 'Strip District', 'Lawrenceville', 'Shadyside', 'Squirrel Hill',
      'Oakland', 'South Side', 'North Shore', 'East Liberty', 'Bloomfield',
      'Mount Washington', 'Polish Hill', 'Highland Park', 'Regent Square'
    ]
  },

  // Massachusetts
  'Massachusetts': {
    'Boston': [
      'Downtown', 'Back Bay', 'Beacon Hill', 'North End', 'South End',
      'Fenway-Kenmore', 'Seaport', 'South Boston', 'Charlestown', 'Jamaica Plain',
      'Cambridge', 'Somerville', 'Brookline', 'Allston', 'Brighton'
    ],
    'Cambridge': [
      'Harvard Square', 'Central Square', 'Kendall Square', 'Inman Square', 'Porter Square',
      'Davis Square', 'Union Square', 'East Cambridge', 'Mid-Cambridge', 'Cambridgeport'
    ]
  },

  // Washington
  'Washington': {
    'Seattle': [
      'Downtown', 'Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne',
      'South Lake Union', 'Belltown', 'Pioneer Square', 'International District', 'University District',
      'Wallingford', 'Green Lake', 'Ravenna', 'Madison Park', 'Georgetown'
    ],
    'Tacoma': [
      'Downtown', 'Stadium District', 'Proctor', 'Old Town', 'Sixth Avenue',
      'Hilltop', 'North End', 'Lincoln District', 'South Tacoma', 'Ruston'
    ]
  },

  // Colorado
  'Colorado': {
    'Denver': [
      'Downtown', 'LoDo', 'RiNo', 'Capitol Hill', 'Highlands',
      'Cherry Creek', 'Washington Park', 'Baker', 'South Broadway', 'Five Points',
      'Congress Park', 'City Park', 'Uptown', 'Sloan\'s Lake', 'Berkeley'
    ],
    'Boulder': [
      'Downtown', 'The Hill', 'Pearl Street', 'Mapleton Hill', 'Chautauqua',
      'North Boulder', 'Table Mesa', 'Martin Acres', 'University Hill'
    ],
    'Colorado Springs': [
      'Downtown', 'Old Colorado City', 'Manitou Springs', 'Broadmoor', 'Old North End',
      'Briargate', 'Powers', 'Stetson Hills', 'Rockrimmon', 'University District'
    ]
  },

  // Georgia
  'Georgia': {
    'Atlanta': [
      'Downtown', 'Midtown', 'Buckhead', 'Virginia-Highland', 'Inman Park',
      'Little Five Points', 'Old Fourth Ward', 'West Midtown', 'Decatur', 'Grant Park',
      'East Atlanta', 'Poncey-Highland', 'Reynoldstown', 'Cabbagetown', 'Kirkwood'
    ],
    'Savannah': [
      'Historic District', 'Victorian District', 'Downtown', 'Starland District', 'Thomas Square',
      'Ardsley Park', 'Midtown', 'Forsyth Park', 'City Market', 'River Street'
    ]
  },

  // Arizona
  'Arizona': {
    'Phoenix': [
      'Downtown', 'Midtown', 'Arcadia', 'Biltmore', 'Camelback East',
      'Encanto', 'North Central', 'Paradise Valley', 'Scottsdale', 'Tempe',
      'Roosevelt Row', 'Desert Ridge', 'Ahwatukee', 'South Mountain'
    ],
    'Tucson': [
      'Downtown', 'Fourth Avenue', 'University', 'Sam Hughes', 'El Presidio',
      'Armory Park', 'Barrio Viejo', 'Catalina Foothills', 'Oro Valley', 'Marana'
    ]
  },

  // District of Columbia
  'District of Columbia': {
    'Washington': [
      'Capitol Hill', 'Downtown', 'Georgetown', 'Dupont Circle', 'Adams Morgan',
      'U Street', 'Shaw', 'Logan Circle', 'Foggy Bottom', 'Chinatown',
      'Penn Quarter', 'Navy Yard', 'Anacostia', 'Columbia Heights', 'Petworth',
      'Brookland', 'Cleveland Park', 'Woodley Park', 'Tenleytown', 'NoMa'
    ]
  },

  // Nevada
  'Nevada': {
    'Las Vegas': [
      'Downtown', 'The Strip', 'Fremont Street', 'Arts District', 'Chinatown',
      'Summerlin', 'Henderson', 'Green Valley', 'Paradise', 'Spring Valley',
      'North Las Vegas', 'Enterprise', 'Southwest', 'Whitney Ranch'
    ],
    'Reno': [
      'Downtown', 'Midtown', 'University District', 'Wells Avenue', 'Riverwalk',
      'South Reno', 'Northwest Reno', 'Sparks', 'Spanish Springs'
    ]
  },

  // Oregon
  'Oregon': {
    'Portland': [
      'Downtown', 'Pearl District', 'Northwest', 'Alberta Arts District', 'Hawthorne',
      'Division', 'Mississippi', 'St. Johns', 'Sellwood', 'Belmont',
      'Northeast', 'Lloyd District', 'Inner Southeast', 'Buckman', 'Laurelhurst'
    ],
    'Eugene': [
      'Downtown', 'University Area', 'Whiteaker', 'South Eugene', 'River Road',
      'Santa Clara', 'West Eugene', 'Ferry Street Bridge'
    ]
  },

  // Michigan
  'Michigan': {
    'Detroit': [
      'Downtown', 'Midtown', 'Corktown', 'Greektown', 'Eastern Market',
      'Rivertown', 'New Center', 'Mexicantown', 'Indian Village', 'West Village',
      'Grandmont Rosedale', 'Palmer Park', 'University District', 'Brush Park'
    ],
    'Ann Arbor': [
      'Downtown', 'Kerrytown', 'Main Street', 'State Street', 'Old West Side',
      'Burns Park', 'Water Hill', 'Northside', 'South University'
    ]
  },

  // Ohio
  'Ohio': {
    'Columbus': [
      'Downtown', 'Short North', 'German Village', 'Italian Village', 'Victorian Village',
      'Clintonville', 'Grandview Heights', 'Upper Arlington', 'Bexley', 'Worthington',
      'Arena District', 'Brewery District', 'Franklinton', 'Olde Towne East'
    ],
    'Cleveland': [
      'Downtown', 'Ohio City', 'Tremont', 'University Circle', 'Little Italy',
      'Lakewood', 'Detroit Shoreway', 'Playhouse Square', 'Shaker Heights', 'Coventry'
    ],
    'Cincinnati': [
      'Downtown', 'Over-the-Rhine', 'Mount Adams', 'Hyde Park', 'Oakley',
      'Northside', 'Covington', 'Newport', 'Clifton', 'College Hill'
    ]
  },

  // North Carolina
  'North Carolina': {
    'Charlotte': [
      'Uptown', 'South End', 'NoDa', 'Plaza Midwood', 'Dilworth',
      'Myers Park', 'Elizabeth', 'Fourth Ward', 'Wesley Heights', 'Cherry',
      'Ballantyne', 'SouthPark', 'University City', 'Belmont'
    ],
    'Raleigh': [
      'Downtown', 'Glenwood South', 'Warehouse District', 'Moore Square', 'Oakwood',
      'Five Points', 'Cameron Village', 'North Hills', 'Mordecai', 'Hayes Barton'
    ],
    'Durham': [
      'Downtown', 'American Tobacco', 'Brightleaf District', 'Ninth Street', 'Duke Park',
      'Trinity Park', 'Walltown', 'Old West Durham', 'South Durham'
    ]
  },

  // Tennessee
  'Tennessee': {
    'Nashville': [
      'Downtown', 'The Gulch', 'East Nashville', '12 South', 'Germantown',
      'Midtown', 'Music Row', 'West End', 'Hillsboro Village', 'Marathon Village',
      'Sylvan Park', 'Berry Hill', 'Wedgewood-Houston', 'Edgehill', 'Belmont-Hillsboro'
    ],
    'Memphis': [
      'Downtown', 'Beale Street', 'South Main', 'Midtown', 'Cooper-Young',
      'Overton Square', 'Crosstown', 'Harbor Town', 'Mud Island', 'East Memphis'
    ]
  },

  // Louisiana
  'Louisiana': {
    'New Orleans': [
      'French Quarter', 'Garden District', 'Marigny', 'Bywater', 'Warehouse District',
      'CBD', 'Uptown', 'Irish Channel', 'Treme', 'Mid-City',
      'Algiers Point', 'Frenchmen Street', 'Magazine Street', 'Carrollton', 'Lakeview'
    ],
    'Baton Rouge': [
      'Downtown', 'Mid City', 'Garden District', 'Spanish Town', 'Southdowns',
      'College Town', 'Bocage', 'Highland Road', 'LSU Area'
    ]
  },

  // Minnesota
  'Minnesota': {
    'Minneapolis': [
      'Downtown', 'Uptown', 'North Loop', 'Northeast', 'Loring Park',
      'Lyn-Lake', 'Whittier', 'Lowry Hill', 'Linden Hills', 'Seward',
      'Dinkytown', 'Stadium Village', 'Marcy-Holmes', 'East Isles'
    ],
    'Saint Paul': [
      'Downtown', 'Lowertown', 'Cathedral Hill', 'Summit Hill', 'Grand Avenue',
      'Highland Park', 'Macalester-Groveland', 'West Seventh', 'Frogtown', 'Hamline-Midway'
    ]
  },

  // Maryland
  'Maryland': {
    'Baltimore': [
      'Downtown', 'Inner Harbor', 'Fells Point', 'Federal Hill', 'Canton',
      'Mount Vernon', 'Charles Village', 'Hampden', 'Station North', 'Locust Point',
      'Harbor East', 'Bolton Hill', 'Roland Park', 'Remington', 'Highlandtown'
    ]
  },

  // Missouri
  'Missouri': {
    'St. Louis': [
      'Downtown', 'Central West End', 'Soulard', 'The Grove', 'Cherokee Street',
      'Tower Grove', 'Lafayette Square', 'The Hill', 'Benton Park', 'Dogtown',
      'Shaw', 'Delmar Loop', 'Clayton', 'Maplewood', 'Webster Groves'
    ],
    'Kansas City': [
      'Downtown', 'Crossroads', 'Westport', 'Country Club Plaza', 'River Market',
      '39th Street', 'Brookside', 'Waldo', 'Union Hill', 'Hyde Park',
      'Midtown', 'Quality Hill', 'Power & Light', 'Crown Center'
    ]
  }
}
