
export const citiesByCountry: Record<string, string[]> = {
  "Uganda": [
    "Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Lira", "Mbale", "Kasese", 
    "Masaka", "Kabale", "Soroti", "Arua", "Moroto", "Fort Portal", "Hoima",
    "Mukono", "Iganga", "Tororo", "Mityana", "Mubende"
  ],
  "Kenya": [
    "Nairobi", "Mombasa", "Nakuru", "Eldoret", "Kisumu", "Thika", "Malindi",
    "Kitale", "Garissa", "Kakamega", "Machakos", "Meru", "Nyeri", "Kericho"
  ],
  "Tanzania": [
    "Dar es Salaam", "Mwanza", "Arusha", "Dodoma", "Mbeya", "Morogoro", "Tanga",
    "Kahama", "Tabora", "Kigoma", "Sumbawanga", "Kasulu", "Songea", "Moshi"
  ],
  "Rwanda": [
    "Kigali", "Butare", "Gitarama", "Ruhengeri", "Gisenyi", "Byumba", "Cyangugu",
    "Kibungo", "Kibuye", "Gikongoro", "Umutara", "Kigali Rural"
  ],
  "Burundi": [
    "Bujumbura", "Gitega", "Muyinga", "Ngozi", "Kayanza", "Muramvya", "Bururi",
    "Makamba", "Rumonge", "Cibitoke", "Bubanza", "Mwaro"
  ],
  "South Sudan": [
    "Juba", "Wau", "Malakal", "Bentiu", "Bor", "Yei", "Torit", "Rumbek",
    "Aweil", "Kuajok", "Yambio", "Renk"
  ],
  "Ethiopia": [
    "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Dessie", "Jimma", "Jijiga",
    "Shashamane", "Nekemte", "Hawassa", "Bahir Dar", "Debre Markos"
  ],
  "Somalia": [
    "Mogadishu", "Hargeisa", "Bosaso", "Kismayo", "Galkayo", "Merca", "Baidoa",
    "Garowe", "Berbera", "Las Anod", "Burao", "Erigavo"
  ],
  "Djibouti": [
    "Djibouti", "Ali Sabieh", "Dikhil", "Tadjourah", "Obock", "Arta"
  ],
  "Eritrea": [
    "Asmara", "Assab", "Massawa", "Keren", "Mendefera", "Barentu", "Adi Keyh",
    "Adi Quala", "Dekemhare", "Ak'ordat"
  ],
  // Add more countries as needed
  "United States": [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville"
  ],
  "United Kingdom": [
    "London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Sheffield",
    "Bristol", "Glasgow", "Leicester", "Edinburgh", "Belfast", "Cardiff"
  ],
  "Canada": [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa",
    "Winnipeg", "Quebec City", "Hamilton", "Kitchener", "London", "Victoria"
  ],
  "Germany": [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart",
    "Düsseldorf", "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden"
  ],
  "France": [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg",
    "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims"
  ],
  "Italy": [
    "Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna",
    "Florence", "Bari", "Catania", "Venice", "Verona"
  ],
  "Spain": [
    "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga",
    "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba"
  ],
  "Netherlands": [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg",
    "Groningen", "Almere", "Breda", "Nijmegen", "Enschede", "Haarlem"
  ],
  "Belgium": [
    "Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur",
    "Leuven", "Mons", "Aalst", "Mechelen", "La Louvière"
  ],
  "Switzerland": [
    "Zurich", "Geneva", "Basel", "Lausanne", "Bern", "Winterthur", "Lucerne",
    "St. Gallen", "Lugano", "Biel", "Thun", "Köniz"
  ]
};

export const getCitiesForCountry = (country: string): string[] => {
  return citiesByCountry[country] || [];
};
