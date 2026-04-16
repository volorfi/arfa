#!/usr/bin/env node
/**
 * Sovereign Bond Data Import Script
 * 
 * Usage: node scripts/import-sovereign.mjs <path-to-Sovereign.xlsx>
 * 
 * This script reads a Sovereign.xlsx file and generates server/sovereign_data.json.
 * Run this whenever you receive an updated Sovereign.xlsx to refresh the data.
 * 
 * Prerequisites: pip3 install openpyxl pandas (Python 3 required)
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
import sys, json, warnings
warnings.filterwarnings('ignore')

try:
    from openpyxl import load_workbook
except ImportError:
    print("Error: openpyxl not installed. Run: pip3 install openpyxl", file=sys.stderr)
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]

wb = load_workbook(input_file, read_only=True, data_only=True)
ws = wb.active

rows = list(ws.iter_rows(values_only=True))
if len(rows) < 3:
    print("Error: File has fewer than 3 rows", file=sys.stderr)
    sys.exit(1)

# Column mapping based on known Sovereign.xlsx structure
COL_MAP = {
    0: 'ticker', 1: 'name', 2: 'isin',
    3: 'rtgSP', 4: 'rtgSPOutlook', 5: 'rtgMoody', 6: 'rtgMoodyOutlook',
    7: 'rtgFitch', 8: 'rtgFitchOutlook', 9: 'compositeRating', 10: 'igHyIndicator',
    11: 'series', 12: 'paymentRank', 13: 'coupon', 14: 'couponFreq',
    15: 'couponType', 16: 'maturity', 17: 'currency', 18: 'amtIssued',
    19: 'minPiece', 20: 'amtOutstanding',
    21: 'price', 22: 'yieldToMaturity', 23: 'duration', 24: 'maturityYears',
    25: 'zSpread', 26: 'oasSpread', 27: 'change1M', 28: 'change3M',
    29: 'totalReturnYTD',
    30: 'creditAssessment', 31: 'score', 32: 'defaultProb',
    33: 'publicDebtGDP2025', 34: 'publicDebtGDP2024', 35: 'debtTrajectory',
    36: 'externalDebtGDP', 37: 'fiscalBalance', 38: 'inflation',
    39: 'disinflation', 40: 'moneyGrowth', 41: 'currentAccount',
    42: 'fxStability', 43: 'reservesTrend', 44: 'realGDPGrowth',
    45: 'reservesExtDebt', 46: 'interestExpGovRev', 47: 'reservesMonths',
    48: 'reservesBln', 49: 'externalDebtBln',
    50: 'country', 51: 'region',
    52: 'creditComment'
}

NUM_FIELDS = {
    'coupon', 'couponFreq', 'amtIssued', 'minPiece', 'amtOutstanding',
    'price', 'yieldToMaturity', 'duration', 'maturityYears', 'zSpread', 'oasSpread',
    'change1M', 'change3M', 'totalReturnYTD', 'score', 'defaultProb',
    'publicDebtGDP2025', 'publicDebtGDP2024', 'debtTrajectory', 'externalDebtGDP',
    'fiscalBalance', 'inflation', 'disinflation', 'moneyGrowth', 'currentAccount',
    'realGDPGrowth', 'reservesExtDebt', 'interestExpGovRev', 'reservesMonths',
    'reservesBln', 'externalDebtBln'
}

def make_slug(ticker):
    import re
    s = ticker.lower().strip()
    s = re.sub(r'[^a-z0-9\\s-]', '', s)
    s = re.sub(r'[\\s]+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')

def parse_val(val, field):
    if val is None or str(val).strip() in ('', 'N/A', '-', '#N/A', 'n/a', 'None'):
        return None
    if field in NUM_FIELDS:
        try:
            v = float(val)
            if field in ('yieldToMaturity', 'change1M', 'change3M', 'totalReturnYTD', 'defaultProb',
                         'coupon', 'publicDebtGDP2025', 'publicDebtGDP2024', 'debtTrajectory',
                         'externalDebtGDP', 'fiscalBalance', 'inflation', 'disinflation',
                         'moneyGrowth', 'currentAccount', 'realGDPGrowth', 'reservesExtDebt',
                         'interestExpGovRev'):
                return round(v * 100, 4) if abs(v) < 1 and abs(v) > 0 else round(v, 4)
            return round(v, 4) if isinstance(v, float) else v
        except (ValueError, TypeError):
            return None
    return str(val).strip()

bonds = []
data_rows = rows[2:]  # Skip header rows
for row in data_rows:
    if not row or not row[0] or str(row[0]).strip() == '':
        continue
    
    bond = {}
    for col_idx, field in COL_MAP.items():
        if col_idx < len(row):
            bond[field] = parse_val(row[col_idx], field)
        else:
            bond[field] = None
    
    bond['slug'] = make_slug(str(bond.get('ticker', '')))
    
    # Handle maturity date formatting
    if bond.get('maturity'):
        mat = bond['maturity']
        if hasattr(mat, 'strftime'):
            bond['maturity'] = mat.strftime('%Y-%m-%d')
        else:
            bond['maturity'] = str(mat)
    
    bonds.append(bond)

# Sort by score descending
bonds.sort(key=lambda b: (b.get('score') or 0), reverse=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(bonds, f, ensure_ascii=False, indent=None)

print(f"Successfully imported {len(bonds)} sovereign bonds")
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
