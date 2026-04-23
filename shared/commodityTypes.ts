export type CommodityFamily =
  | "energy"
  | "precious_metals"
  | "base_metals"
  | "agriculture"
  | "softs"
  | "livestock";

export interface Commodity {
  /** URL-safe slug, e.g. "GC" (stripped of =F suffix) */
  symbol: string;
  /** Raw Yahoo ticker, e.g. "GC=F" */
  ticker: string;
  name: string;
  family: CommodityFamily;
  unit: string; // e.g. "USD/oz", "USD/bbl", "USD/bushel"
}

export interface CommodityQuote extends Commodity {
  price: number;
  change: number;
  changePercent: number;
  changePercent1W: number | null;
  changePercent1M: number | null;
  changePercentYTD: number | null;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  chartData: { time: number; value: number }[];
}

export interface CorrelationMatrix {
  symbols: string[];
  /** square n×n Pearson correlation over the last ~6 months of daily returns */
  values: number[][];
}

export interface InflationBasket {
  family: "food" | "energy" | "metals";
  label: string;
  members: string[];
  avgChangePercent1D: number;
  avgChangePercentYTD: number;
}
