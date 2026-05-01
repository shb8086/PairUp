// ============================================================
// Holidays.gs — Public holiday lookup via Nager.Date API
// https://date.nager.at — free, no API key required
// ============================================================

// Maps common IANA timezone strings → ISO 3166-1 alpha-2 country codes.
// Used to infer the country for holiday lookups from a participant's timezone.
const TIMEZONE_TO_COUNTRY = {
  // United States
  'America/New_York':                   'US',
  'America/Chicago':                    'US',
  'America/Denver':                     'US',
  'America/Los_Angeles':                'US',
  'America/Phoenix':                    'US',
  'America/Anchorage':                  'US',
  'Pacific/Honolulu':                   'US',
  'America/Indiana/Indianapolis':       'US',
  'America/Detroit':                    'US',
  'America/Kentucky/Louisville':        'US',
  // Canada
  'America/Toronto':                    'CA',
  'America/Vancouver':                  'CA',
  'America/Edmonton':                   'CA',
  'America/Winnipeg':                   'CA',
  'America/Halifax':                    'CA',
  'America/St_Johns':                   'CA',
  // United Kingdom
  'Europe/London':                      'GB',
  // Ireland
  'Europe/Dublin':                      'IE',
  // Germany
  'Europe/Berlin':                      'DE',
  // France
  'Europe/Paris':                       'FR',
  // Netherlands
  'Europe/Amsterdam':                   'NL',
  // Belgium
  'Europe/Brussels':                    'BE',
  // Switzerland
  'Europe/Zurich':                      'CH',
  // Austria
  'Europe/Vienna':                      'AT',
  // Italy
  'Europe/Rome':                        'IT',
  // Spain
  'Europe/Madrid':                      'ES',
  // Portugal
  'Europe/Lisbon':                      'PT',
  // Sweden
  'Europe/Stockholm':                   'SE',
  // Norway
  'Europe/Oslo':                        'NO',
  // Denmark
  'Europe/Copenhagen':                  'DK',
  // Finland
  'Europe/Helsinki':                    'FI',
  // Poland
  'Europe/Warsaw':                      'PL',
  // Czech Republic
  'Europe/Prague':                      'CZ',
  // Hungary
  'Europe/Budapest':                    'HU',
  // Romania
  'Europe/Bucharest':                   'RO',
  // Bulgaria
  'Europe/Sofia':                       'BG',
  // Greece
  'Europe/Athens':                      'GR',
  // Turkey
  'Europe/Istanbul':                    'TR',
  // Russia
  'Europe/Moscow':                      'RU',
  // Israel
  'Asia/Jerusalem':                     'IL',
  // UAE
  'Asia/Dubai':                         'AE',
  // India
  'Asia/Kolkata':                       'IN',
  // China
  'Asia/Shanghai':                      'CN',
  // Hong Kong
  'Asia/Hong_Kong':                     'HK',
  // Singapore
  'Asia/Singapore':                     'SG',
  // Japan
  'Asia/Tokyo':                         'JP',
  // South Korea
  'Asia/Seoul':                         'KR',
  // Australia
  'Australia/Sydney':                   'AU',
  'Australia/Melbourne':                'AU',
  'Australia/Brisbane':                 'AU',
  'Australia/Perth':                    'AU',
  'Australia/Adelaide':                 'AU',
  // New Zealand
  'Pacific/Auckland':                   'NZ',
  // Brazil
  'America/Sao_Paulo':                  'BR',
  'America/Fortaleza':                  'BR',
  // Mexico
  'America/Mexico_City':                'MX',
  // Argentina
  'America/Argentina/Buenos_Aires':     'AR',
  // Colombia
  'America/Bogota':                     'CO',
  // Chile
  'America/Santiago':                   'CL',
  // South Africa
  'Africa/Johannesburg':                'ZA',
  // Egypt
  'Africa/Cairo':                       'EG',
  // Nigeria
  'Africa/Lagos':                       'NG',
};

// In-memory cache keyed by "CC-YYYY" (e.g. "US-2026").
// Persists for the duration of a single script execution, avoiding redundant API calls.
const _holidayCache = {};

/**
 * Returns the ISO 3166-1 alpha-2 country code for a given IANA timezone string.
 * Returns null if the timezone is not in the map.
 *
 * @param {string} timezone
 * @returns {string|null}
 */
function getCountryForTimezone(timezone) {
  if (!timezone) return null;
  const code = TIMEZONE_TO_COUNTRY[timezone];
  return code !== undefined ? code : null;
}

/**
 * Returns an array of holiday date strings ("YYYY-MM-DD") for a country and year.
 * Fetches from Nager.Date and caches the result for the duration of the run.
 * Returns an empty array on any error so scheduling continues unaffected.
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 (e.g. "US", "DE")
 * @param {number} year
 * @returns {string[]}
 */
function getHolidaysForCountry(countryCode, year) {
  if (!countryCode) return [];
  const key = `${countryCode}-${year}`;
  if (_holidayCache[key] !== undefined) return _holidayCache[key];

  try {
    const url      = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() !== 200) {
      Logger.log(`Holidays: non-200 response for ${countryCode}/${year} (${response.getResponseCode()})`);
      _holidayCache[key] = [];
      return [];
    }

    const dates = JSON.parse(response.getContentText()).map(h => h.date);
    _holidayCache[key] = dates;
    Logger.log(`Holidays: loaded ${dates.length} holiday(s) for ${countryCode}/${year}`);
    return dates;

  } catch (e) {
    Logger.log(`Holidays: API error for ${countryCode}/${year}: ${e.message}`);
    _holidayCache[key] = [];
    return [];
  }
}

/**
 * Returns true if the given date falls on a public holiday in the given country.
 * Date comparison is done in the script's timezone for consistency with slot generation.
 *
 * @param {Date} date
 * @param {string|null} countryCode
 * @returns {boolean}
 */
function isHolidayDate(date, countryCode) {
  if (!countryCode) return false;
  const holidays = getHolidaysForCountry(countryCode, date.getFullYear());
  const dateStr  = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return holidays.includes(dateStr);
}

/**
 * Returns true if the given date is a public holiday for any of the provided timezones.
 * Silently skips timezones not found in TIMEZONE_TO_COUNTRY.
 *
 * @param {Date} date
 * @param {string[]} timezones - IANA timezone strings
 * @returns {boolean}
 */
function isHolidayForAny(date, timezones) {
  return (timezones || []).some(tz => isHolidayDate(date, getCountryForTimezone(tz)));
}
