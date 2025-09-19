/**
 * Timezone detection utility for Woodpecker prospects
 * Maps location data (city, state, country) to Woodpecker-supported timezones
 */

// Woodpecker-supported timezones (from user's list)
export const SUPPORTED_TIMEZONES = [
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Asmara', 'Africa/Bamako',
  'Africa/Bangui', 'Africa/Banjul', 'Africa/Bissau', 'Africa/Blantyre', 'Africa/Brazzaville',
  'Africa/Bujumbura', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Conakry', 'Africa/Dakar',
  'Africa/Dar_es_Salaam', 'Africa/Djibouti', 'Africa/El_Aaiun', 'Africa/Freetown', 'Africa/Gaborone',
  'Africa/Harare', 'Africa/Johannesburg', 'Africa/Kampala', 'Africa/Khartoum', 'Africa/Kigali',
  'Africa/Kinshasa', 'Africa/Lagos', 'Africa/Libreville', 'Africa/Lome', 'Africa/Luanda',
  'Africa/Lusaka', 'Africa/Malabo', 'Africa/Maputo', 'Africa/Maseru', 'Africa/Mbabane',
  'Africa/Mogadishu', 'Africa/Monrovia', 'Africa/Nairobi', 'Africa/Ndjamena', 'Africa/Niamey',
  'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Porto-Novo', 'Africa/Sao_Tome', 'Africa/Tripoli',
  'Africa/Tunis', 'Africa/Windhoek', 'America/Anchorage', 'America/Anguilla', 'America/Antigua',
  'America/Argentina/Buenos_Aires', 'America/Aruba', 'America/Asuncion', 'America/Barbados',
  'America/Belize', 'America/Bogota', 'America/Buenos_Aires', 'America/Caracas', 'America/Cayenne',
  'America/Cayman', 'America/Chicago', 'America/Chihuahua', 'America/Costa_Rica', 'America/Denver',
  'America/Dominica', 'America/Edmonton', 'America/El_Salvador', 'America/Godthab', 'America/Grand_Turk',
  'America/Grenada', 'America/Guadeloupe', 'America/Guatemala', 'America/Guayaquil', 'America/Guyana',
  'America/Halifax', 'America/Havana', 'America/Indianapolis', 'America/Jamaica', 'America/La_Paz',
  'America/Lima', 'America/Los_Angeles', 'America/Managua', 'America/Manaus', 'America/Martinique',
  'America/Mazatlan', 'America/Mexico_City', 'America/Miquelon', 'America/Monterrey', 'America/Montevideo',
  'America/Montserrat', 'America/Nassau', 'America/New_York', 'America/Panama', 'America/Paramaribo',
  'America/Phoenix', 'America/Port-au-Prince', 'America/Port_of_Spain', 'America/Puerto_Rico',
  'America/Regina', 'America/Rio_Branco', 'America/Santiago', 'America/Santo_Domingo', 'America/Sao_Paulo',
  'America/St_Johns', 'America/St_Kitts', 'America/St_Lucia', 'America/St_Thomas', 'America/St_Vincent',
  'America/Tegucigalpa', 'America/Tijuana', 'America/Toronto', 'America/Tortola', 'America/Vancouver',
  'America/Whitehorse', 'America/Winnipeg', 'Arctic/Longyearbyen', 'Asia/Aden', 'Asia/Almaty',
  'Asia/Amman', 'Asia/Ashgabat', 'Asia/Baghdad', 'Asia/Bahrain', 'Asia/Baku', 'Asia/Bangkok',
  'Asia/Beirut', 'Asia/Bishkek', 'Asia/Brunei', 'Asia/Calcutta', 'Asia/Chongqing', 'Asia/Colombo',
  'Asia/Damascus', 'Asia/Dhaka', 'Asia/Dubai', 'Asia/Dushanbe', 'Asia/Gaza', 'Asia/Hong_Kong',
  'Asia/Irkutsk', 'Asia/Istanbul', 'Asia/Jakarta', 'Asia/Jerusalem', 'Asia/Kamchatka', 'Asia/Karachi',
  'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Krasnoyarsk', 'Asia/Kuala_Lumpur', 'Asia/Kuwait',
  'Asia/Macau', 'Asia/Magadan', 'Asia/Manila', 'Asia/Muscat', 'Asia/Nicosia', 'Asia/Novosibirsk',
  'Asia/Omsk', 'Asia/Phnom_Penh', 'Asia/Pyongyang', 'Asia/Qatar', 'Asia/Rangoon', 'Asia/Riyadh',
  'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Taipei', 'Asia/Tashkent', 'Asia/Tbilisi',
  'Asia/Tehran', 'Asia/Thimphu', 'Asia/Tokyo', 'Asia/Ulaanbaatar', 'Asia/Ulan_Bator', 'Asia/Urumqi',
  'Asia/Vientiane', 'Asia/Vladivostok', 'Asia/Yakutsk', 'Asia/Yerevan', 'Atlantic/Azores',
  'Atlantic/Bermuda', 'Atlantic/Cape_Verde', 'Atlantic/Faroe', 'Atlantic/Reykjavik',
  'Atlantic/South_Georgia', 'Atlantic/St_Helena', 'Atlantic/Stanley', 'Australia/Adelaide',
  'Australia/Brisbane', 'Australia/Canberra', 'Australia/Darwin', 'Australia/Hobart',
  'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney', 'Canada/Atlantic', 'Canada/Eastern',
  'Canada/Mountain', 'Canada/Newfoundland', 'Canada/Saskatchewan', 'Europe/Amsterdam', 'Europe/Athens',
  'Europe/Belgrade', 'Europe/Berlin', 'Europe/Bratislava', 'Europe/Brussels', 'Europe/Bucharest',
  'Europe/Budapest', 'Europe/Chisinau', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Gibraltar',
  'Europe/Guernsey', 'Europe/Helsinki', 'Europe/Isle_of_Man', 'Europe/Istanbul', 'Europe/Jersey',
  'Europe/Kiev', 'Europe/Lisbon', 'Europe/Ljubljana', 'Europe/London', 'Europe/Luxembourg',
  'Europe/Madrid', 'Europe/Malta', 'Europe/Minsk', 'Europe/Monaco', 'Europe/Moscow', 'Europe/Oslo',
  'Europe/Paris', 'Europe/Podgorica', 'Europe/Prague', 'Europe/Riga', 'Europe/Rome',
  'Europe/San_Marino', 'Europe/Sarajevo', 'Europe/Skopje', 'Europe/Sofia', 'Europe/Stockholm',
  'Europe/Tallinn', 'Europe/Vaduz', 'Europe/Vatican', 'Europe/Vienna', 'Europe/Vilnius',
  'Europe/Volgograd', 'Europe/Warsaw', 'Europe/Zagreb', 'Europe/Zurich', 'Hongkong',
  'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro',
  'Indian/Kerguelen', 'Indian/Mahe', 'Indian/Maldives', 'Indian/Mauritius', 'Indian/Mayotte',
  'Indian/Reunion', 'Pacific/Auckland', 'Pacific/Efate', 'Pacific/Fakaofo', 'Pacific/Fiji',
  'Pacific/Funafuti', 'Pacific/Guadalcanal', 'Pacific/Guam', 'Pacific/Honolulu', 'Pacific/Kiritimati',
  'Pacific/Midway', 'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk', 'Pacific/Noumea',
  'Pacific/Palau', 'Pacific/Pitcairn', 'Pacific/Pohnpei', 'Pacific/Port_Moresby', 'Pacific/Rarotonga',
  'Pacific/Saipan', 'Pacific/Tahiti', 'Pacific/Tarawa', 'Pacific/Tongatapu', 'Pacific/Wallis',
  'Singapore', 'US/Alaska', 'US/Arizona', 'US/Central', 'US/East-Indiana', 'US/Eastern',
  'US/Hawaii', 'US/Mountain', 'US/Samoa', 'UTC'
] as const;

// Country to default timezone mapping
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  'US': 'America/New_York',
  'USA': 'America/New_York',
  'United States': 'America/New_York',
  'Canada': 'America/Toronto',
  'UK': 'Europe/London',
  'United Kingdom': 'Europe/London',
  'Germany': 'Europe/Berlin',
  'France': 'Europe/Paris',
  'Spain': 'Europe/Madrid',
  'Italy': 'Europe/Rome',
  'Netherlands': 'Europe/Amsterdam',
  'Australia': 'Australia/Sydney',
  'Japan': 'Asia/Tokyo',
  'China': 'Asia/Shanghai',
  'India': 'Asia/Kolkata',
  'Singapore': 'Singapore',
  'Hong Kong': 'Asia/Hong_Kong',
  'Brazil': 'America/Sao_Paulo',
  'Mexico': 'America/Mexico_City',
  'Argentina': 'America/Buenos_Aires',
  'Russia': 'Europe/Moscow',
  'South Africa': 'Africa/Johannesburg',
  'Egypt': 'Africa/Cairo',
  'Israel': 'Asia/Jerusalem',
  'UAE': 'Asia/Dubai',
  'Saudi Arabia': 'Asia/Riyadh',
  'Thailand': 'Asia/Bangkok',
  'Indonesia': 'Asia/Jakarta',
  'Philippines': 'Asia/Manila',
  'South Korea': 'Asia/Seoul',
  'Taiwan': 'Asia/Taipei',
  'New Zealand': 'Pacific/Auckland',
};

// US state to timezone mapping
const US_STATE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern Time
  'New York': 'America/New_York',
  'NY': 'America/New_York',
  'Florida': 'America/New_York',
  'FL': 'America/New_York',
  'Massachusetts': 'America/New_York',
  'MA': 'America/New_York',
  'Pennsylvania': 'America/New_York',
  'PA': 'America/New_York',
  'Virginia': 'America/New_York',
  'VA': 'America/New_York',
  'North Carolina': 'America/New_York',
  'NC': 'America/New_York',
  'South Carolina': 'America/New_York',
  'SC': 'America/New_York',
  'Georgia': 'America/New_York',
  'GA': 'America/New_York',
  'Connecticut': 'America/New_York',
  'CT': 'America/New_York',
  'New Jersey': 'America/New_York',
  'NJ': 'America/New_York',
  'Maryland': 'America/New_York',
  'MD': 'America/New_York',
  'Delaware': 'America/New_York',
  'DE': 'America/New_York',
  'Maine': 'America/New_York',
  'ME': 'America/New_York',
  'New Hampshire': 'America/New_York',
  'NH': 'America/New_York',
  'Vermont': 'America/New_York',
  'VT': 'America/New_York',
  'Rhode Island': 'America/New_York',
  'RI': 'America/New_York',

  // Central Time
  'Texas': 'America/Chicago',
  'TX': 'America/Chicago',
  'Illinois': 'America/Chicago',
  'IL': 'America/Chicago',
  'Wisconsin': 'America/Chicago',
  'WI': 'America/Chicago',
  'Minnesota': 'America/Chicago',
  'MN': 'America/Chicago',
  'Iowa': 'America/Chicago',
  'IA': 'America/Chicago',
  'Missouri': 'America/Chicago',
  'MO': 'America/Chicago',
  'Arkansas': 'America/Chicago',
  'AR': 'America/Chicago',
  'Louisiana': 'America/Chicago',
  'LA': 'America/Chicago',
  'Mississippi': 'America/Chicago',
  'MS': 'America/Chicago',
  'Alabama': 'America/Chicago',
  'AL': 'America/Chicago',
  'Tennessee': 'America/Chicago',
  'TN': 'America/Chicago',
  'Kentucky': 'America/Chicago',
  'KY': 'America/Chicago',
  'Oklahoma': 'America/Chicago',
  'OK': 'America/Chicago',
  'Kansas': 'America/Chicago',
  'KS': 'America/Chicago',
  'Nebraska': 'America/Chicago',
  'NE': 'America/Chicago',
  'South Dakota': 'America/Chicago',
  'SD': 'America/Chicago',
  'North Dakota': 'America/Chicago',
  'ND': 'America/Chicago',

  // Mountain Time
  'Colorado': 'America/Denver',
  'CO': 'America/Denver',
  'Utah': 'America/Denver',
  'UT': 'America/Denver',
  'Wyoming': 'America/Denver',
  'WY': 'America/Denver',
  'Montana': 'America/Denver',
  'MT': 'America/Denver',
  'New Mexico': 'America/Denver',
  'NM': 'America/Denver',
  'Idaho': 'America/Denver',
  'ID': 'America/Denver',

  // Pacific Time
  'California': 'America/Los_Angeles',
  'CA': 'America/Los_Angeles',
  'Washington': 'America/Los_Angeles',
  'WA': 'America/Los_Angeles',
  'Oregon': 'America/Los_Angeles',
  'OR': 'America/Los_Angeles',
  'Nevada': 'America/Los_Angeles',
  'NV': 'America/Los_Angeles',

  // Special cases
  'Arizona': 'America/Phoenix',
  'AZ': 'America/Phoenix',
  'Hawaii': 'Pacific/Honolulu',
  'HI': 'Pacific/Honolulu',
  'Alaska': 'America/Anchorage',
  'AK': 'America/Anchorage',
};

// Major city to timezone mapping
const CITY_TIMEZONE_MAP: Record<string, string> = {
  // US Cities
  'New York': 'America/New_York',
  'NYC': 'America/New_York',
  'Boston': 'America/New_York',
  'Miami': 'America/New_York',
  'Atlanta': 'America/New_York',
  'Chicago': 'America/Chicago',
  'Dallas': 'America/Chicago',
  'Houston': 'America/Chicago',
  'Austin': 'America/Chicago',
  'San Antonio': 'America/Chicago',
  'Denver': 'America/Denver',
  'Phoenix': 'America/Phoenix',
  'Los Angeles': 'America/Los_Angeles',
  'San Francisco': 'America/Los_Angeles',
  'Seattle': 'America/Los_Angeles',
  'Portland': 'America/Los_Angeles',
  'San Diego': 'America/Los_Angeles',
  'Las Vegas': 'America/Los_Angeles',

  // International Cities
  'London': 'Europe/London',
  'Paris': 'Europe/Paris',
  'Berlin': 'Europe/Berlin',
  'Madrid': 'Europe/Madrid',
  'Rome': 'Europe/Rome',
  'Amsterdam': 'Europe/Amsterdam',
  'Brussels': 'Europe/Brussels',
  'Zurich': 'Europe/Zurich',
  'Vienna': 'Europe/Vienna',
  'Stockholm': 'Europe/Stockholm',
  'Copenhagen': 'Europe/Copenhagen',
  'Oslo': 'Europe/Oslo',
  'Helsinki': 'Europe/Helsinki',
  'Moscow': 'Europe/Moscow',
  'Istanbul': 'Europe/Istanbul',
  'Dubai': 'Asia/Dubai',
  'Mumbai': 'Asia/Kolkata',
  'Delhi': 'Asia/Kolkata',
  'Bangalore': 'Asia/Kolkata',
  'Singapore': 'Singapore',
  'Hong Kong': 'Asia/Hong_Kong',
  'Tokyo': 'Asia/Tokyo',
  'Seoul': 'Asia/Seoul',
  'Beijing': 'Asia/Shanghai',
  'Shanghai': 'Asia/Shanghai',
  'Bangkok': 'Asia/Bangkok',
  'Manila': 'Asia/Manila',
  'Jakarta': 'Asia/Jakarta',
  'Sydney': 'Australia/Sydney',
  'Melbourne': 'Australia/Melbourne',
  'Brisbane': 'Australia/Brisbane',
  'Perth': 'Australia/Perth',
  'Auckland': 'Pacific/Auckland',
  'Toronto': 'America/Toronto',
  'Vancouver': 'America/Vancouver',
  'Montreal': 'America/Toronto',
  'Sao Paulo': 'America/Sao_Paulo',
  'Mexico City': 'America/Mexico_City',
  'Buenos Aires': 'America/Buenos_Aires',
  'Santiago': 'America/Santiago',
  'Bogota': 'America/Bogota',
  'Lima': 'America/Lima',
  'Caracas': 'America/Caracas',
  'Cairo': 'Africa/Cairo',
  'Johannesburg': 'Africa/Johannesburg',
  'Lagos': 'Africa/Lagos',
  'Nairobi': 'Africa/Nairobi',
  'Tel Aviv': 'Asia/Jerusalem',
  'Riyadh': 'Asia/Riyadh',
  'Kuwait': 'Asia/Kuwait',
  'Doha': 'Asia/Qatar',
  'Beirut': 'Asia/Beirut',
  'Taipei': 'Asia/Taipei',
};

/**
 * Detect timezone based on city, state, and country information
 */
export function detectTimezone(
  city?: string,
  state?: string,
  country?: string
): string | undefined {
  console.log('🌍 TimezoneDetector: Detecting timezone for:', { city, state, country });

  // Normalize inputs
  const normalizedCity = city?.trim();
  const normalizedState = state?.trim();
  const normalizedCountry = country?.trim();

  // Strategy 1: Try exact city match first (most specific)
  if (normalizedCity) {
    // Special handling for San Francisco variations
    const cityLower = normalizedCity.toLowerCase();
    if (cityLower === 'san francisco' || cityLower === 'sf' || cityLower.includes('san fran')) {
      console.log(`🏙️ TimezoneDetector: Found San Francisco -> America/Los_Angeles`);
      return 'America/Los_Angeles';
    }

    // Try exact city match
    const cityTimezone = CITY_TIMEZONE_MAP[normalizedCity];
    if (cityTimezone) {
      console.log(`🏙️ TimezoneDetector: Found timezone by city: ${normalizedCity} -> ${cityTimezone}`);
      return cityTimezone;
    }

    // Strategy 2: Try fuzzy city matching (partial matches)
    const cityMatches = Object.keys(CITY_TIMEZONE_MAP).filter(key =>
      key.toLowerCase().includes(cityLower) || cityLower.includes(key.toLowerCase())
    );
    if (cityMatches.length > 0) {
      const matchedTimezone = CITY_TIMEZONE_MAP[cityMatches[0]];
      console.log(`🔍 TimezoneDetector: Found fuzzy city match: ${normalizedCity} -> ${cityMatches[0]} -> ${matchedTimezone}`);
      return matchedTimezone;
    }
  }

  // Strategy 3: Try US state mapping if country is US or missing
  const isUSCountry = !normalizedCountry ||
    normalizedCountry === 'US' ||
    normalizedCountry === 'USA' ||
    normalizedCountry === 'United States' ||
    normalizedCountry?.toLowerCase() === 'united states';

  if (normalizedState && isUSCountry) {
    const stateTimezone = US_STATE_TIMEZONE_MAP[normalizedState];
    if (stateTimezone) {
      console.log(`🇺🇸 TimezoneDetector: Found timezone by US state: ${normalizedState} -> ${stateTimezone}`);
      return stateTimezone;
    }
  }

  // Strategy 4: Try state as city (sometimes state field contains city name)
  if (normalizedState) {
    const stateAsCity = CITY_TIMEZONE_MAP[normalizedState];
    if (stateAsCity) {
      console.log(`🏙️ TimezoneDetector: Found timezone using state as city: ${normalizedState} -> ${stateAsCity}`);
      return stateAsCity;
    }

    // Strategy 4b: Try fuzzy city matching for state field
    const stateLower = normalizedState.toLowerCase();
    const cityMatches = Object.keys(CITY_TIMEZONE_MAP).filter(key =>
      key.toLowerCase().includes(stateLower) || stateLower.includes(key.toLowerCase())
    );
    if (cityMatches.length > 0) {
      const matchedTimezone = CITY_TIMEZONE_MAP[cityMatches[0]];
      console.log(`🔍 TimezoneDetector: Found fuzzy city match in state field: ${normalizedState} -> ${cityMatches[0]} -> ${matchedTimezone}`);
      return matchedTimezone;
    }

    // Strategy 4c: Try fuzzy state matching (only if we're assuming US)
    if (isUSCountry) {
      const stateMatches = Object.keys(US_STATE_TIMEZONE_MAP).filter(key =>
        key.toLowerCase().includes(stateLower) || stateLower.includes(key.toLowerCase())
      );
      if (stateMatches.length > 0) {
        const matchedTimezone = US_STATE_TIMEZONE_MAP[stateMatches[0]];
        console.log(`🔍 TimezoneDetector: Found fuzzy state match: ${normalizedState} -> ${stateMatches[0]} -> ${matchedTimezone}`);
        return matchedTimezone;
      }
    }
  }

  // Strategy 5: Try country mapping
  if (normalizedCountry) {
    const countryTimezone = COUNTRY_TIMEZONE_MAP[normalizedCountry];
    if (countryTimezone) {
      console.log(`🌏 TimezoneDetector: Found timezone by country: ${normalizedCountry} -> ${countryTimezone}`);
      return countryTimezone;
    }

    // Strategy 6: Try fuzzy country matching
    const countryLower = normalizedCountry.toLowerCase();
    const countryMatches = Object.keys(COUNTRY_TIMEZONE_MAP).filter(key =>
      key.toLowerCase().includes(countryLower) || countryLower.includes(key.toLowerCase())
    );
    if (countryMatches.length > 0) {
      const matchedTimezone = COUNTRY_TIMEZONE_MAP[countryMatches[0]];
      console.log(`🔍 TimezoneDetector: Found fuzzy country match: ${normalizedCountry} -> ${countryMatches[0]} -> ${matchedTimezone}`);
      return matchedTimezone;
    }
  }

  // Strategy 7: Intelligent defaults based on any available data
  if (!normalizedCity && !normalizedState && !normalizedCountry) {
    console.log('🌍 TimezoneDetector: No location data provided, using UTC');
    return 'UTC';
  }

  // Strategy 8: Regional fallbacks based on partial information
  if (normalizedCity || normalizedState) {
    // If we have city/state but no country, assume US (most common case)
    console.log('🇺🇸 TimezoneDetector: Assuming US for city/state without country, using Eastern Time');
    return 'America/New_York'; // Default to Eastern Time for US
  }

  console.log('❓ TimezoneDetector: Could not detect timezone with any strategy, using UTC');
  return 'UTC'; // Final fallback
}

/**
 * Validate if a timezone is supported by Woodpecker
 */
export function isValidTimezone(timezone: string): boolean {
  return SUPPORTED_TIMEZONES.includes(timezone as any);
}