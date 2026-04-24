import { readFileSync } from "fs";
import { join } from "path";

export interface SovereignBond {
  ticker: string;
  name: string;
  isin: string | null;
  slug: string;
  // Ratings
  rtgSP: string | null;
  rtgSPOutlook: string | null;
  rtgMoody: string | null;
  rtgMoodyOutlook: string | null;
  rtgFitch: string | null;
  rtgFitchOutlook: string | null;
  compositeRating: string | null;
  igHyIndicator: string | null;
  // Bond structure
  series: string | null;
  paymentRank: string | null;
  coupon: number | null;
  couponFreq: number | null;
  couponType: string | null;
  maturity: string | null;
  currency: string | null;
  amtIssued: number | null;
  minPiece: number | null;
  amtOutstanding: number | null;
  // Pricing
  price: number | null;
  yieldToMaturity: number | null;
  duration: number | null;
  maturityYears: number | null;
  zSpread: number | null;
  oasSpread: number | null;
  change1M: number | null;
  change3M: number | null;
  totalReturnYTD: number | null;
  // Credit
  creditAssessment: string | null;
  score: number | null;
  defaultProb: number | null;
  // Macro fundamentals
  publicDebtGDP2025: number | null;
  publicDebtGDP2024: number | null;
  debtTrajectory: number | null;
  externalDebtGDP: number | null;
  fiscalBalance: number | null;
  inflation: number | null;
  disinflation: number | null;
  moneyGrowth: number | null;
  currentAccount: number | null;
  fxStability: string | null;
  reservesTrend: string | null;
  realGDPGrowth: number | null;
  reservesExtDebt: number | null;
  interestExpGovRev: number | null;
  reservesMonths: number | null;
  reservesBln: number | null;
  externalDebtBln: number | null;
  // Location
  country: string | null;
  region: string | null;
  // Commentary
  creditComment: string | null;
  // Extended fields from sov_bonds_data
  liquidity: number | null;
  liquidityLevel: string | null;
  dayCount: string | null;
  callable: string | null;
  esg: string | null;
  greenBonds: string | null;
  amortized: string | null;
  guaranteed: string | null;
  subordinated: string | null;
  usdEquivalent: number | null;
  // Source tracking
  source: string | null;
}

let cachedBonds: SovereignBond[] | null = null;

function loadBonds(): SovereignBond[] {
  if (cachedBonds) return cachedBonds;
  try {
    const dataPath = join(process.cwd(), "public", "data", "sovereign_data.json");
    const raw = readFileSync(dataPath, "utf-8");
    cachedBonds = JSON.parse(raw) as SovereignBond[];
    console.log(`[SovereignService] Loaded ${cachedBonds.length} sovereign bonds`);
    return cachedBonds;
  } catch (err) {
    console.error("[SovereignService] Failed to load data:", err);
    return [];
  }
}

export function getSovereignBonds(params?: {
  region?: string;
  country?: string;
  currency?: string;
  rating?: string;
  igHy?: string;
  creditAssessment?: string;
  search?: string;
}): SovereignBond[] {
  let bonds = loadBonds();

  if (params?.region) {
    bonds = bonds.filter((b) => b.region === params.region);
  }
  if (params?.country) {
    bonds = bonds.filter((b) => b.country === params.country);
  }
  if (params?.currency) {
    bonds = bonds.filter((b) => b.currency === params.currency);
  }
  if (params?.rating) {
    bonds = bonds.filter((b) => b.compositeRating === params.rating);
  }
  if (params?.igHy) {
    bonds = bonds.filter((b) => b.igHyIndicator === params.igHy);
  }
  if (params?.creditAssessment) {
    bonds = bonds.filter((b) => b.creditAssessment === params.creditAssessment);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    bonds = bonds.filter(
      (b) =>
        b.ticker.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.isin && b.isin.toLowerCase().includes(q)) ||
        (b.country && b.country.toLowerCase().includes(q))
    );
  }

  return bonds;
}

export function getSovereignBondBySlug(slug: string): SovereignBond | undefined {
  const bonds = loadBonds();
  return bonds.find((b) => b.slug === slug);
}

export function getSovereignFilters() {
  const bonds = loadBonds();
  const regions = Array.from(new Set(bonds.map((b) => b.region).filter(Boolean))).sort() as string[];
  const countries = Array.from(new Set(bonds.map((b) => b.country).filter(Boolean))).sort() as string[];
  const currencies = Array.from(new Set(bonds.map((b) => b.currency).filter(Boolean))).sort() as string[];
  const ratings = Array.from(new Set(bonds.map((b) => b.compositeRating).filter(Boolean))).sort() as string[];
  const igHyOptions = Array.from(new Set(bonds.map((b) => b.igHyIndicator).filter(Boolean))).sort() as string[];
  const creditAssessments = Array.from(new Set(bonds.map((b) => b.creditAssessment).filter(Boolean))).sort() as string[];

  return { regions, countries, currencies, ratings, igHyOptions, creditAssessments };
}

export function getSovereignSummary() {
  const bonds = loadBonds();
  const totalBonds = bonds.length;
  const uniqueCountries = new Set(bonds.map((b) => b.country).filter(Boolean)).size;

  const yieldsValid = bonds.filter((b) => b.yieldToMaturity != null);
  const avgYield = yieldsValid.length
    ? (yieldsValid.reduce((s, b) => s + b.yieldToMaturity!, 0) / yieldsValid.length).toFixed(2)
    : "0";

  const durValid = bonds.filter((b) => b.duration != null);
  const avgDuration = durValid.length
    ? (durValid.reduce((s, b) => s + b.duration!, 0) / durValid.length).toFixed(2)
    : "0";

  const spreadValid = bonds.filter((b) => b.oasSpread != null);
  const avgSpread = spreadValid.length
    ? (spreadValid.reduce((s, b) => s + b.oasSpread!, 0) / spreadValid.length).toFixed(1)
    : "0";

  // Region distribution
  const regionDistribution: Record<string, number> = {};
  bonds.forEach((b) => {
    if (b.region) regionDistribution[b.region] = (regionDistribution[b.region] || 0) + 1;
  });

  // Rating distribution
  const ratingDistribution: Record<string, number> = {};
  bonds.forEach((b) => {
    if (b.compositeRating) ratingDistribution[b.compositeRating] = (ratingDistribution[b.compositeRating] || 0) + 1;
  });

  // Currency distribution
  const currencyDistribution: Record<string, number> = {};
  bonds.forEach((b) => {
    if (b.currency) currencyDistribution[b.currency] = (currencyDistribution[b.currency] || 0) + 1;
  });

  return {
    totalBonds,
    uniqueCountries,
    avgYield,
    avgDuration,
    avgSpread,
    regionDistribution,
    ratingDistribution,
    currencyDistribution,
  };
}

// Get all bonds for a specific country
export function getSovereignBondsByCountry(country: string): SovereignBond[] {
  const bonds = loadBonds();
  return bonds.filter((b) => b.country?.toLowerCase() === country.toLowerCase());
}

// Get unique countries with their macro data
export function getSovereignCountries(): Array<{
  country: string;
  region: string | null;
  bondCount: number;
  compositeRating: string | null;
  igHyIndicator: string | null;
  realGDPGrowth: number | null;
  inflation: number | null;
  fiscalBalance: number | null;
  publicDebtGDP2025: number | null;
  reservesBln: number | null;
  currentAccount: number | null;
  creditAssessment: string | null;
  score: number | null;
}> {
  const bonds = loadBonds();
  const countryMap = new Map<string, SovereignBond[]>();
  bonds.forEach((b) => {
    if (b.country) {
      if (!countryMap.has(b.country)) countryMap.set(b.country, []);
      countryMap.get(b.country)!.push(b);
    }
  });

  return Array.from(countryMap.entries()).map(([country, countryBonds]) => {
    // Use first bond with data for country-level fields
    const ref = countryBonds.find((b) => b.compositeRating) || countryBonds[0];
    return {
      country,
      region: ref.region,
      bondCount: countryBonds.length,
      compositeRating: ref.compositeRating,
      igHyIndicator: ref.igHyIndicator,
      realGDPGrowth: ref.realGDPGrowth,
      inflation: ref.inflation,
      fiscalBalance: ref.fiscalBalance,
      publicDebtGDP2025: ref.publicDebtGDP2025,
      reservesBln: ref.reservesBln,
      currentAccount: ref.currentAccount,
      creditAssessment: ref.creditAssessment,
      score: ref.score,
    };
  }).sort((a, b) => a.country.localeCompare(b.country));
}

// Get country macro detail (all macro fields + credit commentary + ratings)
export function getCountryMacroDetail(country: string) {
  const bonds = loadBonds();
  const countryBonds = bonds.filter((b) => b.country?.toLowerCase() === country.toLowerCase());
  if (countryBonds.length === 0) return null;

  const ref = countryBonds.find((b) => b.compositeRating) || countryBonds[0];
  return {
    country: ref.country || country,
    region: ref.region,
    // Ratings
    spRating: ref.rtgSP,
    spOutlook: ref.rtgSPOutlook,
    moodysRating: ref.rtgMoody,
    moodysOutlook: ref.rtgMoodyOutlook,
    fitchRating: ref.rtgFitch,
    fitchOutlook: ref.rtgFitchOutlook,
    compositeRating: ref.compositeRating,
    igHyIndicator: ref.igHyIndicator,
    creditAssessment: ref.creditAssessment,
    score: ref.score,
    defaultProb: ref.defaultProb,
    // Macro
    publicDebtGDP2025: ref.publicDebtGDP2025,
    publicDebtGDP2024: ref.publicDebtGDP2024,
    debtTrajectory: ref.debtTrajectory,
    externalDebtGDP: ref.externalDebtGDP,
    fiscalBalance: ref.fiscalBalance,
    inflation: ref.inflation,
    disinflation: ref.disinflation,
    moneyGrowth: ref.moneyGrowth,
    currentAccount: ref.currentAccount,
    fxStability: ref.fxStability,
    reservesTrend: ref.reservesTrend,
    realGDPGrowth: ref.realGDPGrowth,
    reservesExtDebt: ref.reservesExtDebt,
    interestExpGovRev: ref.interestExpGovRev,
    reservesMonths: ref.reservesMonths,
    reservesBln: ref.reservesBln,
    externalDebtBln: ref.externalDebtBln,
    // Credit
    creditComment: ref.creditComment || countryBonds.find((b) => b.creditComment)?.creditComment || null,
  };
}

// Allow cache invalidation for data refresh
export function clearSovereignCache() {
  cachedBonds = null;
}
