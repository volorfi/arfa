/**
 * Country name to ISO 3166-1 alpha-2 code mapping for flag display.
 * Used to convert country names from sovereign bond data to flag emoji or flag CDN URLs.
 */

const COUNTRY_TO_ISO: Record<string, string> = {
  "Abu Dhabi": "AE",
  "Albania": "AL",
  "Angola": "AO",
  "Argentina": "AR",
  "Armenia": "AM",
  "Australia": "AU",
  "Austria": "AT",
  "Azerbaijan": "AZ",
  "Bahrain": "BH",
  "Belgium": "BE",
  "Benin": "BJ",
  "Bosnia & Herz.": "BA",
  "Brazil": "BR",
  "Bulgaria": "BG",
  "Cameroon": "CM",
  "Canada": "CA",
  "Chile": "CL",
  "China": "CN",
  "Colombia": "CO",
  "Costa Rica": "CR",
  "Croatia": "HR",
  "Cyprus": "CY",
  "Czech Rep.": "CZ",
  "Denmark": "DK",
  "Dominicana": "DO",
  "Dubai": "AE",
  "Ecuador": "EC",
  "Egypt": "EG",
  "El Salvador": "SV",
  "Estonia": "EE",
  "Faroe Islands": "FO",
  "Finland": "FI",
  "France": "FR",
  "Gabon": "GA",
  "Germany": "DE",
  "Ghana": "GH",
  "Greece": "GR",
  "Guatemala": "GT",
  "Honduras": "HN",
  "Hong Kong": "HK",
  "Hungary": "HU",
  "Iceland": "IS",
  "India": "IN",
  "Indonesia": "ID",
  "Ireland": "IE",
  "Israel": "IL",
  "Italy": "IT",
  "Ivory Coast": "CI",
  "Jamaica": "JM",
  "Japan": "JP",
  "Jordan": "JO",
  "Kazakhstan": "KZ",
  "Kenya": "KE",
  "Korea": "KR",
  "Kuwait": "KW",
  "Kyrgyzstan": "KG",
  "Latvia": "LV",
  "Lithuania": "LT",
  "Luxembourg": "LU",
  "Malaysia": "MY",
  "Malta": "MT",
  "Mexico": "MX",
  "Mongolia": "MN",
  "Montenegro": "ME",
  "Morocco": "MA",
  "Mozambique": "MZ",
  "Netherlands": "NL",
  "New Zealand": "NZ",
  "Nigeria": "NG",
  "Norway": "NO",
  "Oman": "OM",
  "Pakistan": "PK",
  "Panama": "PA",
  "Paraguay": "PY",
  "Peru": "PE",
  "Philippines": "PH",
  "Poland": "PL",
  "Portugal": "PT",
  "Qatar": "QA",
  "Romania": "RO",
  "Rwanda": "RW",
  "Saudi Arabia": "SA",
  "Senegal": "SN",
  "Serbia": "RS",
  "Sharjah (UAE)": "AE",
  "Singapore": "SG",
  "Slovakia": "SK",
  "Slovenia": "SI",
  "South Africa": "ZA",
  "Spain": "ES",
  "Sri Lanka": "LK",
  "Sweden": "SE",
  "Thailand": "TH",
  "Tunisia": "TN",
  "Turkiye": "TR",
  "UAE": "AE",
  "USA": "US",
  "Ukraine": "UA",
  "United Kingdom": "GB",
  "Uruguay": "UY",
  "Uzbekistan": "UZ",
  "Zambia": "ZM",
  "Georgia": "GE",
  "Iraq": "IQ",
  "Mauritius": "MU",
  "Namibia": "NA",
  "North Macedonia": "MK",
  "Papua New Guinea": "PG",
  "Republic of Congo": "CG",
  "South Korea": "KR",
  "Suriname": "SR",
  "Switzerland": "CH",
  "Tanzania": "TZ",
  "Trinidad and Tobago": "TT",
  "UK": "GB",
  "Uganda": "UG",
  "Vietnam": "VN",
  "Ethiopia": "ET",
  "Bermuda": "BM",
  "Bahamas": "BS",
  "Barbados": "BB",
  "Belarus": "BY",
  "Bolivia": "BO",
  "Andorra": "AD",
};

/**
 * Get the ISO 3166-1 alpha-2 country code from a country name.
 */
export function getCountryCode(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_TO_ISO[country] || null;
}

/**
 * Get a flag image URL from flagcdn.com for a given country name.
 * Returns a 40x30 PNG flag image URL.
 */
export function getFlagUrl(country: string | null | undefined, size: "16x12" | "20x15" | "24x18" | "32x24" | "40x30" | "48x36" | "64x48" = "40x30"): string | null {
  const code = getCountryCode(country);
  if (!code) return null;
  const [w, h] = size.split("x");
  return `https://flagcdn.com/${w}x${h}/${code.toLowerCase()}.png`;
}

/**
 * CountryFlag component helper - returns the URL for use in img tags.
 * Uses flagcdn.com which provides free flag images.
 */
export function getFlagUrl2x(country: string | null | undefined): string | null {
  const code = getCountryCode(country);
  if (!code) return null;
  return `https://flagcdn.com/48x36/${code.toLowerCase()}.png`;
}
