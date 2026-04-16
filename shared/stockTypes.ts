export interface StockQuote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  trailingEps?: number;
  dividendRate?: number;
  dividendYield?: number;
  beta?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume?: number;
  sharesOutstanding?: number;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  revenue?: number;
  netIncome?: number;
  earningsDate?: string;
  exDividendDate?: string;
  priceTarget?: number;
  analystRating?: string;
  website?: string;
  employees?: number;
  description?: string;
}

export interface StockChartPoint {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  chartData: { time: number; value: number }[];
  /** 'index' | 'fx' | 'commodity' | 'yield' */
  assetType?: string;
  /** Formatted display value, e.g. "1.1234" for FX, "$85.20" for commodities, "4.35%" for yields */
  displayValue?: string;
}

export interface NewsItem {
  title: string;
  source: string;
  timestamp: string;
  url?: string;
  relatedSymbols?: string[];
}

export interface IPOItem {
  date: string;
  symbol: string;
  name: string;
  exchange?: string;
  price?: string;
  status: "recent" | "upcoming";
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

export interface ScreenerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number | null;
  volume: number;
  sector: string;
}
