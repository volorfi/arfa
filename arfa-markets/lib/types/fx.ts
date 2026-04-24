export type FXPairCategory = "majors" | "usd_crosses" | "eur_crosses" | "commodity_fx";

export interface FXPair {
  /** URL-safe slug, e.g. "EURUSD" */
  pair: string;
  /** Human base currency code, e.g. "EUR" */
  base: string;
  /** Human quote currency code, e.g. "USD" */
  quote: string;
  /** Human name, e.g. "EUR / USD" */
  name: string;
  category: FXPairCategory;
}

export interface FXQuote {
  pair: string;
  base: string;
  quote: string;
  name: string;
  category: FXPairCategory;
  price: number;
  change: number;
  changePercent: number;
  changePercent1W: number | null;
  changePercentYTD: number | null;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  chartData: { time: number; value: number }[];
}

export interface CurrencyStrength {
  /** 3-letter currency code */
  code: string;
  /** Signed score in roughly [-3, +3] z-space across all pairs involving this currency */
  score: number;
  /** Average 1D change across all pairs as that currency's base (percent) */
  avgChangePercent: number;
}

export interface CrossRate {
  base: string;
  quote: string;
  rate: number;
}

export interface CrossRateMatrix {
  currencies: string[];
  rates: number[][]; // [base][quote]
}

export interface CentralBankRate {
  bank: string;
  countryOrArea: string;
  currency: string;
  rate: number; // annualized %, e.g. 4.5
  lastChange: string; // ISO date
  nextMeeting?: string | null;
  stance?: "hike" | "cut" | "hold" | null;
}
