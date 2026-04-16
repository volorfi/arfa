#!/usr/bin/env node
/**
 * Corporate Bond Data Import Script
 * 
 * Usage: node scripts/import-corporate.mjs <path-to-USDIG.xlsx>
 * 
 * This script reads a USDIG.xlsx (or similar corporate bond file) and generates
 * server/bonds_data.json. Run this whenever you receive updated bond data.
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
  console.error("Usage: node scripts/import-corporate.mjs <path-to-USDIG.xlsx>");
  console.error("Example: node scripts/import-corporate.mjs ~/upload/USDIG.xlsx");
  process.exit(1);
}

if (!existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

const pythonScript = `
import sys, json, re, warnings
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

COL_MAP = {
    0: 'ticker', 1: 'issuerName', 2: 'isin',
    3: 'rtgSP', 4: 'rtgSPOutlook', 5: 'rtgMoody', 6: 'rtgMoodyOutlook',
    7: 'rtgFitch', 8: 'rtgFitchOutlook', 9: 'rating', 10: 'igHyIndicator',
    11: 'series', 12: 'paymentRank', 13: 'coupon', 14: 'couponFreq',
    15: 'couponType', 16: 'maturity', 17: 'currency', 18: 'amtIssued',
    19: 'minPiece', 20: 'amtOutstanding',
    21: 'price', 22: 'yieldToMaturity', 23: 'duration', 24: 'maturityYears',
    25: 'zSpread', 26: 'oasSpread', 27: 'change1M', 28: 'change3M',
    29: 'totalReturnYTD',
    30: 'creditTrend', 31: 'recommendation', 32: 'score',
    33: 'totalDebtToEbitda', 34: 'netDebtToEbitda', 35: 'interestCoverage',
    36: 'ebitdaMargin', 37: 'fcfToDebt', 38: 'debtToCapital',
    39: 'currentRatio', 40: 'altmanZ',
    41: 'region', 42: 'sector', 43: 'size',
    44: 'creditComment'
}

PCT_FIELDS = {'yieldToMaturity','change1M','change3M','totalReturnYTD','coupon',
              'ebitdaMargin','fcfToDebt','debtToCapital'}
NUM_FIELDS = {'couponFreq','amtIssued','minPiece','amtOutstanding','price',
              'duration','maturityYears','zSpread','oasSpread','score',
              'totalDebtToEbitda','netDebtToEbitda','interestCoverage',
              'currentRatio','altmanZ'} | PCT_FIELDS

def make_slug(name):
    s = name.lower().strip()
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
            if field in PCT_FIELDS and abs(v) < 1 and abs(v) > 0:
                return round(v * 100, 4)
            return round(v, 4) if isinstance(v, float) else v
        except (ValueError, TypeError):
            return None
    return str(val).strip()

bonds = []
data_rows = rows[2:]
for row in data_rows:
    if not row or not row[0] or str(row[0]).strip() == '':
        continue
    bond = {}
    for col_idx, field in COL_MAP.items():
        if col_idx < len(row):
            bond[field] = parse_val(row[col_idx], field)
        else:
            bond[field] = None
    
    issuer = str(bond.get('issuerName', '')).strip()
    bond['issuerSlug'] = make_slug(issuer)
    
    if bond.get('maturity'):
        mat = bond['maturity']
        if hasattr(mat, 'strftime'):
            bond['maturity'] = mat.strftime('%Y-%m-%d')
        else:
            bond['maturity'] = str(mat)
    
    bonds.append(bond)

bonds.sort(key=lambda b: (b.get('score') or 0), reverse=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(bonds, f, ensure_ascii=False, indent=None)

print(f"Successfully imported {len(bonds)} corporate bonds")
`;

const tmpScript = resolve(projectRoot, "scripts", "_tmp_import_corp.py");
const outputFile = resolve(projectRoot, "server", "bonds_data.json");

try {
  writeFileSync(tmpScript, pythonScript);
  console.log(`Importing corporate bond data from: ${inputFile}`);
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
