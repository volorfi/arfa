#!/usr/bin/env node
/**
 * Sovereign Bond Data Import Script (v2)
 * 
 * Usage: node scripts/import-sovereign.mjs <path-to-Sovereign.xlsx>
 * 
 * This script reads a Sovereign.xlsx file with TWO sheets:
 *   1. SOV - main sheet with ratings, macro data, credit commentary
 *   2. sov_bonds_data - extended universe with bond-level details
 * 
 * It merges both sheets by ISIN, generates new-format tickers,
 * and outputs server/sovereign_data.json.
 * 
 * New ticker format: "COUNTRY COUPON MM/DD/YYYY" (e.g. "BAHRAIN 7.75 04/18/2035")
 * 
 * Prerequisites: pip3 install openpyxl (Python 3 required)
 */

import { execSync } from "child_process";
import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: node scripts/import-sovereign.mjs <path-to-Sovereign.xlsx>");
  console.error("Example: node scripts/import-sovereign.mjs ~/upload/Sovereign.xlsx");
  process.exit(1);
}

if (!existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

const pythonScript = `
import sys, json, warnings, re
from datetime import datetime
warnings.filterwarnings('ignore')

try:
    from openpyxl import load_workbook
except ImportError:
    print("Error: openpyxl not installed. Run: pip3 install openpyxl", file=sys.stderr)
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]

wb = load_workbook(input_file, read_only=True, data_only=True)

# ============================================================
# COUNTRY NAME NORMALIZATION
# Bloomberg uses abbreviated names; we need full country names
# ============================================================
COUNTRY_NAME_MAP = {
    'ABU DHABI': 'Abu Dhabi',
    'ALBANIA': 'Albania',
    'ANGOLA': 'Angola',
    'ARGENTINA': 'Argentina',
    'ARMENIA': 'Armenia',
    'AUSTRALIA': 'Australia',
    'AUSTRIA': 'Austria',
    'AZERBAIJAN': 'Azerbaijan',
    'BAHRAIN': 'Bahrain',
    'BELGIUM': 'Belgium',
    'BENIN': 'Benin',
    'BOSNIA & HERZ.': 'Bosnia & Herz.',
    'BRAZIL': 'Brazil',
    'BULGARIA': 'Bulgaria',
    'CAMEROON': 'Cameroon',
    'CANADA': 'Canada',
    'CHILE': 'Chile',
    'CHINA': 'China',
    'COLOMBIA': 'Colombia',
    'COSTA RICA': 'Costa Rica',
    'CROATIA': 'Croatia',
    'CYPRUS': 'Cyprus',
    'CZECH REP.': 'Czech Rep.',
    'DENMARK': 'Denmark',
    'DOMINICANA': 'Dominicana',
    'DUBAI': 'Dubai',
    'ECUADOR': 'Ecuador',
    'EGYPT': 'Egypt',
    'EL SALVADOR': 'El Salvador',
    'ESTONIA': 'Estonia',
    'ETHIOPIA': 'Ethiopia',
    'FINLAND': 'Finland',
    'FRANCE': 'France',
    'GABON': 'Gabon',
    'GEORGIA': 'Georgia',
    'GERMANY': 'Germany',
    'GHANA': 'Ghana',
    'GREECE': 'Greece',
    'GUATEMALA': 'Guatemala',
    'HONDURAS': 'Honduras',
    'HUNGARY': 'Hungary',
    'ICELAND': 'Iceland',
    'INDIA': 'India',
    'INDONESIA': 'Indonesia',
    'IRAQ': 'Iraq',
    'IRELAND': 'Ireland',
    'ISRAEL': 'Israel',
    'ITALY': 'Italy',
    'IVORY COAST': 'Ivory Coast',
    'JAMAICA': 'Jamaica',
    'JAPAN': 'Japan',
    'JORDAN': 'Jordan',
    'KAZAKHSTAN': 'Kazakhstan',
    'KENYA': 'Kenya',
    'KUWAIT': 'Kuwait',
    'LATVIA': 'Latvia',
    'LITHUANIA': 'Lithuania',
    'MALAYSIA': 'Malaysia',
    'MAURITIUS': 'Mauritius',
    'MEXICO': 'Mexico',
    'MONGOLIA': 'Mongolia',
    'MONTENEGRO': 'Montenegro',
    'MOROCCO': 'Morocco',
    'MOZAMBIQUE': 'Mozambique',
    'NAMIBIA': 'Namibia',
    'NETHERLANDS': 'Netherlands',
    'NEW ZEALAND': 'New Zealand',
    'NIGERIA': 'Nigeria',
    'NORTH MACEDONIA': 'North Macedonia',
    'NORWAY': 'Norway',
    'OMAN': 'Oman',
    'PAKISTAN': 'Pakistan',
    'PANAMA': 'Panama',
    'PAPUA NEW GUINEA': 'Papua New Guinea',
    'PARAGUAY': 'Paraguay',
    'PERU': 'Peru',
    'PHILIPPINES': 'Philippines',
    'POLAND': 'Poland',
    'PORTUGAL': 'Portugal',
    'QATAR': 'Qatar',
    'REPUBLIC OF CONGO': 'Republic of Congo',
    'REPUBLIC OF TURKEY': 'Turkiye',
    'ROMANIA': 'Romania',
    'RWANDA': 'Rwanda',
    'SAUDI ARABIA': 'Saudi Arabia',
    'SENEGAL': 'Senegal',
    'SERBIA': 'Serbia',
    'SHARJAH (UAE)': 'Sharjah (UAE)',
    'SLOVAKIA': 'Slovakia',
    'SLOVENIA': 'Slovenia',
    'SOUTH AFRICA': 'South Africa',
    'SOUTH KOREA': 'South Korea',
    'SPAIN': 'Spain',
    'SRI LANKA': 'Sri Lanka',
    'SURINAME': 'Suriname',
    'SWEDEN': 'Sweden',
    'SWITZERLAND': 'Switzerland',
    'TANZANIA': 'Tanzania',
    'THAILAND': 'Thailand',
    'TRINIDAD AND TOBAGO': 'Trinidad and Tobago',
    'TUNISIA': 'Tunisia',
    'TURKIYE': 'Turkiye',
    'UAE': 'UAE',
    'UGANDA': 'Uganda',
    'UK': 'UK',
    'UKRAINE': 'Ukraine',
    'UNITED KINGDOM': 'UK',
    'UNITED STATES': 'USA',
    'USA': 'USA',
    'URUGUAY': 'Uruguay',
    'UZBEKISTAN': 'Uzbekistan',
    'VIETNAM': 'Vietnam',
    'ZAMBIA': 'Zambia',
}

# Region assignment for sov_bonds_data issuers
COUNTRY_REGION_MAP = {
    'Abu Dhabi': 'Middle East', 'Albania': 'Europe', 'Andorra': 'Europe',
    'Angola': 'Africa', 'Argentina': 'Latam', 'Armenia': 'CIS',
    'Australia': 'Oceania', 'Austria': 'Europe', 'Azerbaijan': 'CIS',
    'Bahamas': 'Americas', 'Bahrain': 'Middle East', 'Barbados': 'Americas',
    'Belarus': 'CIS', 'Belgium': 'Europe', 'Benin': 'Africa',
    'Bermuda': 'Americas', 'Bolivia': 'Latam', 'Bosnia and Herzegovina': 'Europe',
    'Bosnia & Herz.': 'Europe', 'Brazil': 'Latam', 'Bulgaria': 'Europe',
    'Cameroon': 'Africa', 'Canada': 'Americas', 'Chile': 'Latam',
    'China': 'Asia', 'Colombia': 'Latam', 'Costa Rica': 'Latam',
    'Croatia': 'Europe', 'Cyprus': 'Europe', 'Czech Rep.': 'Europe',
    'Czech Republic': 'Europe', 'Denmark': 'Europe', 'Dominicana': 'Latam',
    'Dominican Republic': 'Latam', 'Dubai': 'Middle East', 'Ecuador': 'Latam',
    'Egypt': 'Middle East', 'El Salvador': 'Latam', 'Estonia': 'Europe',
    'Ethiopia': 'Africa', 'Finland': 'Europe', 'France': 'Europe',
    'Gabon': 'Africa', 'Georgia': 'CIS', 'Germany': 'Europe',
    'Ghana': 'Africa', 'Greece': 'Europe', 'Guatemala': 'Latam',
    'Honduras': 'Latam', 'Hungary': 'Europe', 'Iceland': 'Europe',
    'India': 'Asia', 'Indonesia': 'Asia', 'Iraq': 'Middle East',
    'Ireland': 'Europe', 'Israel': 'Middle East', 'Italy': 'Europe',
    'Ivory Coast': 'Africa', "Cote d'Ivoire": 'Africa',
    'Jamaica': 'Americas', 'Japan': 'Asia', 'Jordan': 'Middle East',
    'Kazakhstan': 'CIS', 'Kenya': 'Africa', 'Kuwait': 'Middle East',
    'Latvia': 'Europe', 'Lithuania': 'Europe', 'Malaysia': 'Asia',
    'Mauritius': 'Africa', 'Mexico': 'Latam', 'Mongolia': 'Asia',
    'Montenegro': 'Europe', 'Morocco': 'Africa', 'Mozambique': 'Africa',
    'Namibia': 'Africa', 'Netherlands': 'Europe', 'New Zealand': 'Oceania',
    'Nigeria': 'Africa', 'North Macedonia': 'Europe', 'Norway': 'Europe',
    'Oman': 'Middle East', 'Pakistan': 'Asia', 'Panama': 'Latam',
    'Papua New Guinea': 'Oceania', 'Paraguay': 'Latam', 'Peru': 'Latam',
    'Philippines': 'Asia', 'Poland': 'Europe', 'Portugal': 'Europe',
    'Qatar': 'Middle East', 'Republic of Congo': 'Africa',
    'Romania': 'Europe', 'Rwanda': 'Africa', 'Saudi Arabia': 'Middle East',
    'Senegal': 'Africa', 'Serbia': 'Europe', 'Sharjah (UAE)': 'Middle East',
    'Slovakia': 'Europe', 'Slovenia': 'Europe', 'South Africa': 'Africa',
    'South Korea': 'Asia', 'Spain': 'Europe', 'Sri Lanka': 'Asia',
    'Suriname': 'Latam', 'Sweden': 'Europe', 'Switzerland': 'Europe',
    'Tanzania': 'Africa', 'Thailand': 'Asia', 'Trinidad and Tobago': 'Americas',
    'Tunisia': 'Africa', 'Turkiye': 'Europe', 'Turkey': 'Europe',
    'UAE': 'Middle East', 'Uganda': 'Africa', 'UK': 'Europe',
    'United Kingdom': 'Europe', 'Ukraine': 'CIS', 'USA': 'Americas',
    'United States': 'Americas', 'Uruguay': 'Latam', 'Uzbekistan': 'CIS',
    'Vietnam': 'Asia', 'Zambia': 'Africa',
}

def normalize_country(name):
    """Normalize country name from SOV sheet NAME column or sov_bonds_data Issuer"""
    if not name:
        return None
    n = str(name).strip()
    # Check direct map (uppercase for SOV sheet)
    upper = n.upper()
    if upper in COUNTRY_NAME_MAP:
        return COUNTRY_NAME_MAP[upper]
    # Title case check
    if n in COUNTRY_NAME_MAP:
        return COUNTRY_NAME_MAP[n]
    # Return as-is (for sov_bonds_data which already has proper names)
    return n

def format_maturity_date(val):
    """Convert maturity to MM/DD/YYYY string"""
    if val is None:
        return None
    if hasattr(val, 'strftime'):
        return val.strftime('%m/%d/%Y')
    s = str(val).strip()
    # Try DD/MM/YYYY format (SOV sheet)
    m = re.match(r'(\\d{1,2})/(\\d{1,2})/(\\d{4})', s)
    if m:
        day, month, year = m.groups()
        return f"{month.zfill(2)}/{day.zfill(2)}/{year}"
    # Try YYYY-MM-DD
    m = re.match(r'(\\d{4})-(\\d{2})-(\\d{2})', s)
    if m:
        year, month, day = m.groups()
        return f"{month}/{day}/{year}"
    return s

def format_maturity_iso(val):
    """Convert maturity to YYYY-MM-DD for storage"""
    if val is None:
        return None
    if hasattr(val, 'strftime'):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    m = re.match(r'(\\d{1,2})/(\\d{1,2})/(\\d{4})', s)
    if m:
        day, month, year = m.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    m = re.match(r'(\\d{4})-(\\d{2})-(\\d{2})', s)
    if m:
        return s
    return s

def make_ticker(country, coupon, maturity_val):
    """Generate new format ticker: COUNTRY COUPON MM/DD/YYYY"""
    c = country or 'UNKNOWN'
    c = c.upper()
    cpn = ''
    if coupon is not None:
        try:
            cpn = f"{float(coupon):.2f}".rstrip('0').rstrip('.')
        except:
            cpn = str(coupon)
    mat_str = format_maturity_date(maturity_val) or ''
    return f"{c} {cpn} {mat_str}".strip()

def make_slug(ticker):
    s = ticker.lower().strip()
    s = re.sub(r'[^a-z0-9\\s-]', '', s)
    s = re.sub(r'[\\s]+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')

def safe_float(val):
    if val is None:
        return None
    try:
        v = float(val)
        if v != v:  # NaN check
            return None
        return v
    except (ValueError, TypeError):
        return None

def safe_str(val):
    if val is None:
        return None
    s = str(val).strip()
    if s in ('', 'N/A', '-', '#N/A', 'n/a', 'None', 'not available in Excel'):
        return None
    return s

# ============================================================
# PARSE SOV SHEET
# ============================================================
print("Parsing SOV sheet...", file=sys.stderr)
ws_sov = wb['SOV']
sov_rows = list(ws_sov.iter_rows(values_only=True))

# Build SOV bonds indexed by ISIN
sov_by_isin = {}
# Also build country-level data (ratings, macro, commentary) indexed by country
country_data = {}

for row in sov_rows[2:]:  # Skip header rows (row 1 = field names, row 2 = display names)
    if not row or len(row) < 3:
        continue
    name_raw = row[1]
    isin = safe_str(row[2])
    if not name_raw or str(name_raw).strip() == '':
        continue
    
    country = normalize_country(name_raw)
    
    bond = {
        'name': str(name_raw).strip(),
        'isin': isin,
        'country': country,
        'region': safe_str(row[51]) if len(row) > 51 else None,
        # Ratings
        'rtgSP': safe_str(row[3]) if len(row) > 3 else None,
        'rtgSPOutlook': safe_str(row[4]) if len(row) > 4 else None,
        'rtgMoody': safe_str(row[5]) if len(row) > 5 else None,
        'rtgMoodyOutlook': safe_str(row[6]) if len(row) > 6 else None,
        'rtgFitch': safe_str(row[7]) if len(row) > 7 else None,
        'rtgFitchOutlook': safe_str(row[8]) if len(row) > 8 else None,
        'compositeRating': safe_str(row[9]) if len(row) > 9 else None,
        'igHyIndicator': safe_str(row[10]) if len(row) > 10 else None,
        # Bond structure
        'series': safe_str(row[11]) if len(row) > 11 else None,
        'paymentRank': safe_str(row[12]) if len(row) > 12 else None,
        'coupon': safe_float(row[13]) if len(row) > 13 else None,
        'couponFreq': safe_float(row[14]) if len(row) > 14 else None,
        'couponType': safe_str(row[15]) if len(row) > 15 else None,
        'maturity': format_maturity_iso(row[16]) if len(row) > 16 else None,
        'maturityRaw': row[16] if len(row) > 16 else None,
        'currency': safe_str(row[17]) if len(row) > 17 else None,
        'amtIssued': safe_float(row[18]) if len(row) > 18 else None,
        'minPiece': safe_float(row[19]) if len(row) > 19 else None,
        'amtOutstanding': safe_float(row[20]) if len(row) > 20 else None,
        # Pricing
        'price': safe_float(row[21]) if len(row) > 21 else None,
        'yieldToMaturity': safe_float(row[22]) if len(row) > 22 else None,
        'duration': safe_float(row[23]) if len(row) > 23 else None,
        'maturityYears': safe_float(row[24]) if len(row) > 24 else None,
        'zSpread': safe_float(row[25]) if len(row) > 25 else None,
        'oasSpread': safe_float(row[26]) if len(row) > 26 else None,
        'change1M': safe_float(row[27]) if len(row) > 27 else None,
        'change3M': safe_float(row[28]) if len(row) > 28 else None,
        'totalReturnYTD': safe_float(row[29]) if len(row) > 29 else None,
        # Credit
        'creditAssessment': safe_str(row[30]) if len(row) > 30 else None,
        'score': safe_float(row[31]) if len(row) > 31 else None,
        'defaultProb': safe_float(row[32]) if len(row) > 32 else None,
        # Macro
        'publicDebtGDP2025': safe_float(row[33]) if len(row) > 33 else None,
        'publicDebtGDP2024': safe_float(row[34]) if len(row) > 34 else None,
        'debtTrajectory': safe_float(row[35]) if len(row) > 35 else None,
        'externalDebtGDP': safe_float(row[36]) if len(row) > 36 else None,
        'fiscalBalance': safe_float(row[37]) if len(row) > 37 else None,
        'inflation': safe_float(row[38]) if len(row) > 38 else None,
        'disinflation': safe_float(row[39]) if len(row) > 39 else None,
        'moneyGrowth': safe_float(row[40]) if len(row) > 40 else None,
        'currentAccount': safe_float(row[41]) if len(row) > 41 else None,
        'fxStability': safe_str(row[42]) if len(row) > 42 else None,
        'reservesTrend': safe_str(row[43]) if len(row) > 43 else None,
        'realGDPGrowth': safe_float(row[44]) if len(row) > 44 else None,
        'reservesExtDebt': safe_float(row[45]) if len(row) > 45 else None,
        'interestExpGovRev': safe_float(row[46]) if len(row) > 46 else None,
        'reservesMonths': safe_float(row[47]) if len(row) > 47 else None,
        'reservesBln': safe_float(row[48]) if len(row) > 48 else None,
        'externalDebtBln': safe_float(row[49]) if len(row) > 49 else None,
        # Commentary
        'creditComment': safe_str(row[52]) if len(row) > 52 else None,
    }
    
    if isin:
        sov_by_isin[isin] = bond
    
    # Build country-level data (take first occurrence per country for shared fields)
    if country and country not in country_data:
        country_data[country] = {
            'rtgSP': bond['rtgSP'], 'rtgSPOutlook': bond['rtgSPOutlook'],
            'rtgMoody': bond['rtgMoody'], 'rtgMoodyOutlook': bond['rtgMoodyOutlook'],
            'rtgFitch': bond['rtgFitch'], 'rtgFitchOutlook': bond['rtgFitchOutlook'],
            'compositeRating': bond['compositeRating'], 'igHyIndicator': bond['igHyIndicator'],
            'creditAssessment': bond['creditAssessment'], 'score': bond['score'],
            'defaultProb': bond['defaultProb'],
            'publicDebtGDP2025': bond['publicDebtGDP2025'], 'publicDebtGDP2024': bond['publicDebtGDP2024'],
            'debtTrajectory': bond['debtTrajectory'], 'externalDebtGDP': bond['externalDebtGDP'],
            'fiscalBalance': bond['fiscalBalance'], 'inflation': bond['inflation'],
            'disinflation': bond['disinflation'], 'moneyGrowth': bond['moneyGrowth'],
            'currentAccount': bond['currentAccount'], 'fxStability': bond['fxStability'],
            'reservesTrend': bond['reservesTrend'], 'realGDPGrowth': bond['realGDPGrowth'],
            'reservesExtDebt': bond['reservesExtDebt'], 'interestExpGovRev': bond['interestExpGovRev'],
            'reservesMonths': bond['reservesMonths'], 'reservesBln': bond['reservesBln'],
            'externalDebtBln': bond['externalDebtBln'],
            'region': bond['region'],
            'creditComment': bond['creditComment'],
        }
    elif country and country in country_data:
        # Update missing fields from subsequent bonds of same country
        cd = country_data[country]
        for k in cd:
            if cd[k] is None and bond.get(k) is not None:
                cd[k] = bond[k]

print(f"  SOV sheet: {len(sov_by_isin)} bonds with ISIN, {len(country_data)} countries", file=sys.stderr)

# ============================================================
# PARSE sov_bonds_data SHEET
# ============================================================
print("Parsing sov_bonds_data sheet...", file=sys.stderr)
ws_ext = wb['sov_bonds_data']
ext_rows = list(ws_ext.iter_rows(values_only=True))

ext_by_isin = {}
for row in ext_rows[1:]:  # Skip header row
    if not row or len(row) < 2:
        continue
    issuer = safe_str(row[0])
    isin = safe_str(row[1])
    if not issuer or not isin:
        continue
    
    country = normalize_country(issuer)
    
    bond = {
        'issuer': issuer,
        'isin': isin,
        'country': country,
        'currency': safe_str(row[2]),
        'coupon': safe_float(row[3]),
        'price': safe_float(row[4]),
        'yieldToMaturity': safe_float(row[5]),
        'zSpread': safe_float(row[6]),
        'liquidity': safe_float(row[7]),
        'liquidityLevel': safe_str(row[8]),
        'durationDays': safe_float(row[9]),
        'duration': safe_float(row[10]),
        'callOption': safe_str(row[11]),
        'maturityYears': safe_float(row[12]),
        'maturity': format_maturity_iso(row[13]) if len(row) > 13 else None,
        'maturityRaw': row[13] if len(row) > 13 else None,
        'bondRank': safe_str(row[14]) if len(row) > 14 else None,
        'couponStr': safe_str(row[15]) if len(row) > 15 else None,
        'couponFreq': safe_float(row[16]) if len(row) > 16 else None,
        'dayCount': safe_str(row[17]) if len(row) > 17 else None,
        'rateType': safe_str(row[18]) if len(row) > 18 else None,
        'variableRateType': safe_str(row[19]) if len(row) > 19 else None,
        'referenceRate': safe_str(row[20]) if len(row) > 20 else None,
        'margin': safe_str(row[21]) if len(row) > 21 else None,
        'interestPaymentType': safe_str(row[22]) if len(row) > 22 else None,
        'outstandingAmount': safe_float(row[23]) if len(row) > 23 else None,
        'outstandingFaceValue': safe_float(row[24]) if len(row) > 24 else None,
        'usdEquivalent': safe_float(row[25]) if len(row) > 25 else None,
        'minSettlement': safe_float(row[26]) if len(row) > 26 else None,
        'outstandingFV': safe_float(row[27]) if len(row) > 27 else None,
        'fcIssuerRating': safe_str(row[28]) if len(row) > 28 else None,
        'fcIssueRating': safe_str(row[29]) if len(row) > 29 else None,
        'lcIssuerRating': safe_str(row[30]) if len(row) > 30 else None,
        'lcIssueRating': safe_str(row[31]) if len(row) > 31 else None,
        'putOption': safe_str(row[32]) if len(row) > 32 else None,
        'endOfPlacement': format_maturity_iso(row[33]) if len(row) > 33 else None,
        'callable': safe_str(row[34]) if len(row) > 34 else None,
        'securitization': safe_str(row[35]) if len(row) > 35 else None,
        'esg': safe_str(row[36]) if len(row) > 36 else None,
        'subordinated': safe_str(row[37]) if len(row) > 37 else None,
        'greenBonds': safe_str(row[38]) if len(row) > 38 else None,
        'amortized': safe_str(row[39]) if len(row) > 39 else None,
        'guaranteed': safe_str(row[40]) if len(row) > 40 else None,
    }
    
    ext_by_isin[isin] = bond

print(f"  sov_bonds_data sheet: {len(ext_by_isin)} bonds", file=sys.stderr)

# ============================================================
# MERGE BOTH SHEETS
# ============================================================
print("Merging data...", file=sys.stderr)

all_isins = set(list(sov_by_isin.keys()) + list(ext_by_isin.keys()))
merged_bonds = []

for isin in all_isins:
    sov = sov_by_isin.get(isin, {})
    ext = ext_by_isin.get(isin, {})
    
    # Determine country
    country = sov.get('country') or ext.get('country')
    if not country:
        continue
    
    # Get country-level data for missing fields
    cd = country_data.get(country, {})
    
    # For numeric pricing fields, priority goes to sov_bonds_data
    coupon = ext.get('coupon') if ext.get('coupon') is not None else sov.get('coupon')
    maturity_raw = ext.get('maturityRaw') or sov.get('maturityRaw')
    maturity = ext.get('maturity') or sov.get('maturity')
    currency = ext.get('currency') or sov.get('currency')
    
    # Generate new-format ticker
    ticker = make_ticker(country, coupon, maturity_raw)
    slug = make_slug(ticker) + '-' + (isin[-4:].lower() if isin else 'xxxx')
    
    # Merge - sov_bonds_data has priority for numeric pricing data
    merged = {
        'ticker': ticker,
        'name': sov.get('name') or (ext.get('issuer', '').upper() if ext.get('issuer') else ''),
        'isin': isin,
        'slug': slug,
        # Ratings: from SOV or country-level
        'rtgSP': sov.get('rtgSP') or cd.get('rtgSP'),
        'rtgSPOutlook': sov.get('rtgSPOutlook') or cd.get('rtgSPOutlook'),
        'rtgMoody': sov.get('rtgMoody') or cd.get('rtgMoody'),
        'rtgMoodyOutlook': sov.get('rtgMoodyOutlook') or cd.get('rtgMoodyOutlook'),
        'rtgFitch': sov.get('rtgFitch') or cd.get('rtgFitch'),
        'rtgFitchOutlook': sov.get('rtgFitchOutlook') or cd.get('rtgFitchOutlook'),
        'compositeRating': sov.get('compositeRating') or cd.get('compositeRating'),
        'igHyIndicator': sov.get('igHyIndicator') or cd.get('igHyIndicator'),
        # Bond structure
        'series': sov.get('series'),
        'paymentRank': sov.get('paymentRank') or ext.get('bondRank'),
        'coupon': coupon,
        'couponFreq': ext.get('couponFreq') if ext.get('couponFreq') is not None else sov.get('couponFreq'),
        'couponType': ext.get('rateType') or sov.get('couponType'),
        'maturity': maturity,
        'currency': currency,
        'amtIssued': sov.get('amtIssued'),
        'minPiece': ext.get('minSettlement') if ext.get('minSettlement') is not None else sov.get('minPiece'),
        'amtOutstanding': ext.get('outstandingAmount') if ext.get('outstandingAmount') is not None else sov.get('amtOutstanding'),
        # Pricing - sov_bonds_data priority
        'price': ext.get('price') if ext.get('price') is not None else sov.get('price'),
        'yieldToMaturity': ext.get('yieldToMaturity') if ext.get('yieldToMaturity') is not None else sov.get('yieldToMaturity'),
        'duration': ext.get('duration') if ext.get('duration') is not None else sov.get('duration'),
        'maturityYears': ext.get('maturityYears') if ext.get('maturityYears') is not None else sov.get('maturityYears'),
        'zSpread': ext.get('zSpread') if ext.get('zSpread') is not None else sov.get('zSpread'),
        'oasSpread': sov.get('oasSpread'),  # Only in SOV
        'change1M': sov.get('change1M'),
        'change3M': sov.get('change3M'),
        'totalReturnYTD': sov.get('totalReturnYTD'),
        # Credit - from SOV or country-level
        'creditAssessment': sov.get('creditAssessment') or cd.get('creditAssessment'),
        'score': sov.get('score') if sov.get('score') is not None else cd.get('score'),
        'defaultProb': sov.get('defaultProb') if sov.get('defaultProb') is not None else cd.get('defaultProb'),
        # Macro - from SOV or country-level
        'publicDebtGDP2025': sov.get('publicDebtGDP2025') if sov.get('publicDebtGDP2025') is not None else cd.get('publicDebtGDP2025'),
        'publicDebtGDP2024': sov.get('publicDebtGDP2024') if sov.get('publicDebtGDP2024') is not None else cd.get('publicDebtGDP2024'),
        'debtTrajectory': sov.get('debtTrajectory') if sov.get('debtTrajectory') is not None else cd.get('debtTrajectory'),
        'externalDebtGDP': sov.get('externalDebtGDP') if sov.get('externalDebtGDP') is not None else cd.get('externalDebtGDP'),
        'fiscalBalance': sov.get('fiscalBalance') if sov.get('fiscalBalance') is not None else cd.get('fiscalBalance'),
        'inflation': sov.get('inflation') if sov.get('inflation') is not None else cd.get('inflation'),
        'disinflation': sov.get('disinflation') if sov.get('disinflation') is not None else cd.get('disinflation'),
        'moneyGrowth': sov.get('moneyGrowth') if sov.get('moneyGrowth') is not None else cd.get('moneyGrowth'),
        'currentAccount': sov.get('currentAccount') if sov.get('currentAccount') is not None else cd.get('currentAccount'),
        'fxStability': sov.get('fxStability') or cd.get('fxStability'),
        'reservesTrend': sov.get('reservesTrend') or cd.get('reservesTrend'),
        'realGDPGrowth': sov.get('realGDPGrowth') if sov.get('realGDPGrowth') is not None else cd.get('realGDPGrowth'),
        'reservesExtDebt': sov.get('reservesExtDebt') if sov.get('reservesExtDebt') is not None else cd.get('reservesExtDebt'),
        'interestExpGovRev': sov.get('interestExpGovRev') if sov.get('interestExpGovRev') is not None else cd.get('interestExpGovRev'),
        'reservesMonths': sov.get('reservesMonths') if sov.get('reservesMonths') is not None else cd.get('reservesMonths'),
        'reservesBln': sov.get('reservesBln') if sov.get('reservesBln') is not None else cd.get('reservesBln'),
        'externalDebtBln': sov.get('externalDebtBln') if sov.get('externalDebtBln') is not None else cd.get('externalDebtBln'),
        # Location
        'country': country,
        'region': sov.get('region') or cd.get('region') or COUNTRY_REGION_MAP.get(country),
        # Commentary - from SOV or country-level
        'creditComment': sov.get('creditComment') or cd.get('creditComment'),
        # Extended fields from sov_bonds_data
        'liquidity': ext.get('liquidity'),
        'liquidityLevel': ext.get('liquidityLevel'),
        'dayCount': ext.get('dayCount'),
        'callable': ext.get('callable'),
        'esg': ext.get('esg'),
        'greenBonds': ext.get('greenBonds'),
        'amortized': ext.get('amortized'),
        'guaranteed': ext.get('guaranteed'),
        'subordinated': ext.get('subordinated'),
        'usdEquivalent': ext.get('usdEquivalent'),
        # Source tracking
        'source': 'both' if (isin in sov_by_isin and isin in ext_by_isin) else ('sov' if isin in sov_by_isin else 'ext'),
    }
    
    merged_bonds.append(merged)

# Sort by score descending, then by country
merged_bonds.sort(key=lambda b: (-(b.get('score') or 0), b.get('country') or ''))

# Round numeric values
for b in merged_bonds:
    for k in ('price', 'yieldToMaturity', 'duration', 'maturityYears', 'zSpread', 'oasSpread',
              'change1M', 'change3M', 'totalReturnYTD', 'defaultProb', 'coupon',
              'publicDebtGDP2025', 'publicDebtGDP2024', 'debtTrajectory', 'externalDebtGDP',
              'fiscalBalance', 'inflation', 'disinflation', 'moneyGrowth', 'currentAccount',
              'realGDPGrowth', 'reservesExtDebt', 'interestExpGovRev', 'reservesMonths',
              'reservesBln', 'externalDebtBln', 'liquidity', 'usdEquivalent'):
        if b.get(k) is not None:
            b[k] = round(b[k], 4)
    # Remove internal fields
    b.pop('maturityRaw', None)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(merged_bonds, f, ensure_ascii=False, indent=None)

# Stats
sov_only = sum(1 for b in merged_bonds if b['source'] == 'sov')
ext_only = sum(1 for b in merged_bonds if b['source'] == 'ext')
both = sum(1 for b in merged_bonds if b['source'] == 'both')
countries = len(set(b['country'] for b in merged_bonds if b['country']))
print(f"Successfully imported {len(merged_bonds)} sovereign bonds ({both} matched, {sov_only} SOV-only, {ext_only} ext-only) from {countries} countries")
`;

const tmpScript = resolve(projectRoot, "scripts", "_tmp_import.py");
const outputFile = resolve(projectRoot, "server", "sovereign_data.json");

try {
  writeFileSync(tmpScript, pythonScript);
  console.log(`Importing sovereign data from: ${inputFile}`);
  console.log(`Output: ${outputFile}`);
  
  const result = execSync(
    `python3 "${tmpScript}" "${resolve(inputFile)}" "${outputFile}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  );
  console.log(result.trim());
  console.log("Done! Restart the dev server to pick up the new data.");
} catch (err) {
  console.error("Import failed:", err.stderr || err.message);
  process.exit(1);
} finally {
  try { execSync(`rm -f "${tmpScript}"`); } catch {}
}
