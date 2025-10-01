
import { useState, useEffect } from 'react';

// Sample cities data - in production, this would come from an API
const citiesByCountry: Record<string, string[]> = {
  UG: ['Kampala', 'Entebbe', 'Jinja', 'Mbale', 'Gulu', 'Mbarara', 'Masaka', 'Kasese', 'Kabale', 'Soroti'],
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Kakamega'],
  TZ: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Mbeya', 'Morogoro', 'Tanga', 'Zanzibar City', 'Tabora', 'Kigoma'],
  RW: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi', 'Byumba', 'Cyangugu', 'Kibungo', 'Kibuye', 'Gikongoro'],
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  GB: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff'],
  CA: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong'],
  DE: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
  FR: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
  // Add more countries as needed
};

export const useCitiesByCountry = (countryCode: string | null) => {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      return;
    }

    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setCities(citiesByCountry[countryCode] || []);
      setLoading(false);
    }, 300);
  }, [countryCode]);

  return { cities, loading };
};
