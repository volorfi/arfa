import { readFileSync } from "fs";
import { join } from "path";

// Types
export interface BondData {
  ticker: string;
  issuerName: string;
  issuerSlug: string;
  isin: string | null;
  rating: string | null;
  currency: string;
  amountOutstanding: number | null;
  price: number | null;
  yieldToMaturity: number | null;
  duration: number | null;
  zSpread: number | null;
  oasSpread: number | null;
  change1M: number | null;
  totalReturn: number | null;
  region: string | null;
  country: string | null;
  industryGroup: string | null;
  sector: string | null;
  creditTrend: string | null;
  recommendation: string | null;
  score: number | null;
  bval: number | null;
  defaultProb3Y: number | null;
  lossGivenDefault: number | null;
  cdsSpread: number | null;
  cdsRateOfChange: number | null;
  totalDebtToEbitda: number | null;
  netDebtToEbitda: number | null;
  totalDebtToEquity: number | null;
  ebitdaToInterest: number | null;
  cashToShortTermDebt: number | null;
  shortTermDebtToTotalDebt: number | null;
  ebitdaMargin: number | null;
  fcfYield: number | null;
  waccCostDebt: number | null;
  cashNearCash: number | null;
  shortTermBorrow: number | null;
  longTermBorrow: number | null;
  scores: (number | null)[];
  totalScore: number | null;
}

export interface IssuerBond {
  ticker: string;
  isin: string | null;
  rating: string | null;
  price: number | null;
  yieldToMaturity: number | null;
  duration: number | null;
  zSpread: number | null;
  oasSpread: number | null;
  amountOutstanding: number | null;
  change1M: number | null;
  totalReturn: number | null;
}

export interface IssuerData {
  name: string;
  slug: string;
  rating: string | null;
  region: string | null;
  country: string | null;
  industryGroup: string | null;
  sector: string | null;
  creditTrend: string | null;
  recommendation: string | null;
  creditComment: string | null;
  equityTicker: string | null;
  bonds: IssuerBond[];
  totalDebtToEbitda: number | null;
  netDebtToEbitda: number | null;
  totalDebtToEquity: number | null;
  ebitdaToInterest: number | null;
  cashToShortTermDebt: number | null;
  shortTermDebtToTotalDebt: number | null;
  ebitdaMargin: number | null;
  fcfYield: number | null;
  waccCostDebt: number | null;
  cashNearCash: number | null;
  shortTermBorrow: number | null;
  longTermBorrow: number | null;
  defaultProb3Y: number | null;
  lossGivenDefault: number | null;
  cdsSpread: number | null;
  score: number | null;
  totalScore: number | null;
  scores: (number | null)[];
}

interface BondsDatabase {
  bonds: BondData[];
  issuers: IssuerData[];
}

// Load data once at startup
let bondsDb: BondsDatabase | null = null;

function loadData(): BondsDatabase {
  if (bondsDb) return bondsDb;

  try {
    // Match sovereignService: load from <cwd>/server/bonds_data.json so it
    // works both in dev (cwd=repo root) and in the production container where
    // the Dockerfile copies the JSON to /app/server/bonds_data.json.
    const dataPath = join(process.cwd(), "server", "bonds_data.json");
    const raw = readFileSync(dataPath, "utf-8");
    bondsDb = JSON.parse(raw) as BondsDatabase;
    console.log(
      `[BondService] Loaded ${bondsDb.bonds.length} bonds, ${bondsDb.issuers.length} issuers`
    );
    return bondsDb;
  } catch (err) {
    console.error("[BondService] Failed to load bonds data:", err);
    bondsDb = { bonds: [], issuers: [] };
    return bondsDb;
  }
}

// Get all bonds with optional filters
export function getBonds(filters?: {
  rating?: string;
  region?: string;
  sector?: string;
  creditTrend?: string;
  recommendation?: string;
  search?: string;
}): BondData[] {
  const data = loadData();
  let bonds = data.bonds;

  if (filters) {
    if (filters.rating) {
      bonds = bonds.filter((b) => b.rating === filters.rating);
    }
    if (filters.region) {
      bonds = bonds.filter((b) => b.region === filters.region);
    }
    if (filters.sector) {
      bonds = bonds.filter((b) => b.sector === filters.sector);
    }
    if (filters.creditTrend) {
      bonds = bonds.filter((b) => b.creditTrend === filters.creditTrend);
    }
    if (filters.recommendation) {
      bonds = bonds.filter((b) => b.recommendation === filters.recommendation);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      bonds = bonds.filter(
        (b) =>
          b.ticker.toLowerCase().includes(q) ||
          b.issuerName.toLowerCase().includes(q) ||
          (b.isin && b.isin.toLowerCase().includes(q))
      );
    }
  }

  return bonds;
}

// Get issuer by slug
export function getIssuerBySlug(slug: string): IssuerData | null {
  const data = loadData();
  return data.issuers.find((i) => i.slug === slug) || null;
}

// Get all issuers (for listing)
export function getAllIssuers(): IssuerData[] {
  const data = loadData();
  return data.issuers;
}

// Get filter options
export function getFilterOptions(): {
  ratings: string[];
  regions: string[];
  sectors: string[];
  creditTrends: string[];
  recommendations: string[];
  countries: string[];
} {
  const data = loadData();
  const ratings = new Set<string>();
  const regions = new Set<string>();
  const sectors = new Set<string>();
  const creditTrends = new Set<string>();
  const recommendations = new Set<string>();
  const countries = new Set<string>();

  for (const b of data.bonds) {
    if (b.rating) ratings.add(b.rating);
    if (b.region) regions.add(b.region);
    if (b.sector) sectors.add(b.sector);
    if (b.creditTrend && ["POS", "STA", "NEG"].includes(b.creditTrend))
      creditTrends.add(b.creditTrend);
    if (b.recommendation) recommendations.add(b.recommendation);
    if (b.country) countries.add(b.country);
  }

  // Sort ratings in order
  const ratingOrder = [
    "AAA", "AA+", "AA", "AA-", "A+", "A", "A-",
    "BBB+", "BBB", "BBB-", "BB+", "NR",
  ];

  return {
    ratings: ratingOrder.filter((r) => ratings.has(r)),
    regions: Array.from(regions).sort(),
    sectors: Array.from(sectors).sort(),
    creditTrends: ["POS", "STA", "NEG"].filter((t) => creditTrends.has(t)),
    recommendations: ["OW", "MW", "UW", "N"].filter((r) =>
      recommendations.has(r)
    ),
    countries: Array.from(countries).sort(),
  };
}

// Get summary statistics
export function getBondsSummary(): {
  totalBonds: number;
  totalIssuers: number;
  avgYield: number;
  avgSpread: number;
  avgDuration: number;
  totalOutstanding: number;
  ratingDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  sectorDistribution: Record<string, number>;
} {
  const data = loadData();
  const bonds = data.bonds;

  const yields = bonds.filter((b) => b.yieldToMaturity != null).map((b) => b.yieldToMaturity!);
  const spreads = bonds.filter((b) => b.oasSpread != null).map((b) => b.oasSpread!);
  const durations = bonds.filter((b) => b.duration != null).map((b) => b.duration!);
  const outstanding = bonds.filter((b) => b.amountOutstanding != null).map((b) => b.amountOutstanding!);

  const ratingDist: Record<string, number> = {};
  const regionDist: Record<string, number> = {};
  const sectorDist: Record<string, number> = {};

  for (const b of bonds) {
    if (b.rating) ratingDist[b.rating] = (ratingDist[b.rating] || 0) + 1;
    if (b.region) regionDist[b.region] = (regionDist[b.region] || 0) + 1;
    if (b.sector) sectorDist[b.sector] = (sectorDist[b.sector] || 0) + 1;
  }

  return {
    totalBonds: bonds.length,
    totalIssuers: data.issuers.length,
    avgYield: yields.length ? +(yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(2) : 0,
    avgSpread: spreads.length ? +(spreads.reduce((a, b) => a + b, 0) / spreads.length).toFixed(1) : 0,
    avgDuration: durations.length ? +(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : 0,
    totalOutstanding: outstanding.length ? +outstanding.reduce((a, b) => a + b, 0).toFixed(0) : 0,
    ratingDistribution: ratingDist,
    regionDistribution: regionDist,
    sectorDistribution: sectorDist,
  };
}
