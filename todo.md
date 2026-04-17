# Project TODO

- [x] Homepage with market index ticker bar (S&P 500, Nasdaq, Dow Jones, Russell 2000)
- [x] Homepage hero search bar
- [x] Homepage top gainers and losers tables
- [x] Homepage market news feed
- [x] Homepage recent and upcoming IPO tables
- [x] Left sidebar navigation with collapsible menu (Home, Watchlist, Stocks, IPOs, ETFs, News, Trending, Market Movers, Tools)
- [x] Expandable sub-menus in sidebar
- [x] Stock detail page with real-time price and after-hours price
- [x] Stock detail key metrics table (Market Cap, Revenue, EPS, PE Ratio, Dividend, etc.)
- [x] Stock detail tabbed sections (Overview, Financials, Forecast, Statistics, Dividends, History, Profile)
- [x] Interactive price chart with Recharts (1D, 5D, 1M, YTD, 3M, 6M, 1Y, 5Y, Max)
- [x] Global stock search with autocomplete (company name or ticker)
- [x] Stock screener page with filterable/sortable data table (sector, market cap, PE ratio, price, volume)
- [x] Market Movers page (top gainers and top losers with symbol, price, % change)
- [x] IPO calendar page (recent IPOs and upcoming IPOs tables with date, symbol, company name)
- [x] News page with market news feed (title, source, timestamp)
- [x] User authentication (login/signup)
- [x] Personal watchlist feature (save and track favorite stocks)
- [x] Professional financial platform visual design
- [x] Dark theme support
- [x] Vitest tests for backend routers
- [x] Fix profile API data extraction (quoteSummary.result[0].summaryProfile)
- [x] Add known financial data (shares, EPS) for popular stocks
- [x] Enrich screener with market cap and PE ratio data

- [x] Provide financial statements data via curated datasets and LLM fallback (income statement, balance sheet, cash flow)
- [x] Backend: create financials service with getFinancialStatements function
- [x] Backend: add tRPC route for stock.financials
- [x] Frontend: rebuild Financials tab with sub-tabs (Income Statement, Balance Sheet, Cash Flow)
- [x] Frontend: support quarterly and annual view toggle
- [x] Frontend: display financial data in professional table format with period columns
- [x] Verify FinancialsTab UI renders correctly (Income Statement, Balance Sheet, Cash Flow, Annual/Quarterly)
- [x] Write vitest tests for the new financials endpoint

- [x] Add Fixed Income -> Investment Grade menu items in sidebar navigation
- [x] Parse USDIG.xlsx data and create bond data service on backend
- [x] Create tRPC routes for bonds list, issuer detail, filters, and summary
- [x] Build Investment Grade main page with interactive sortable/filterable table
- [x] Table columns: Ticker, Issuer, Rating, YTM, Duration, OAS, Z-Spread, Price, 1M Chg, Total Rtn, Trend, Rec, Score, Sector, Region, Size
- [x] Table filters: rating, region, sector, credit trend, recommendation
- [x] Build Issuer detail page with credit commentary
- [x] Issuer page: fundamental metrics (leverage, coverage, margins)
- [x] Issuer page: credit rating and outlook display
- [x] Issuer page: bond list for the issuer
- [x] Navigation from main table to issuer detail page
- [x] Write vitest tests for bond/fixed income routes

- [x] Rename Fixed Income -> Investment Grade to Fixed Income -> Corporate
- [x] Parse Sovereign.xlsx and create sovereign bond data service
- [x] Create tRPC routes for sovereign bonds (list, detail, filters, summary)
- [x] Build Sovereign main page with interactive table (pricing-relevant columns only)
- [x] Add filters: region, country, currency, rating, IG/HY, credit trend
- [x] Build market map scatter chart (Duration vs Yield) below table, synced with filters
- [x] Build sovereign bond detail page with full data, macro fundamentals, and commentary
- [x] Add Fixed Income -> Sovereign menu item in sidebar
- [x] Support data refresh by uploading new Sovereign.xlsx (via scripts/import-sovereign.mjs)
- [x] Support data refresh for Corporate bonds (via scripts/import-corporate.mjs)
- [x] Write vitest tests for sovereign bond routes

- [x] Fix max Score display to 15/15 across all pages (Sovereign, SovereignBondDetail, InvestmentGrade, IssuerDetail)
- [x] Add country flags (flagcdn.com) instead of orange globe icon on Sovereign table and bond detail pages
- [x] Move Sovereign above Corporate in sidebar Fixed Income menu

- [x] Add light/dark theme toggle (light theme by default)
- [x] Rename site from "Stock Analysis" to "ARFA Global Markets"
- [x] Add EURUSD, Gold, WTI, Brent, UST10 YTM to the top ticker bar with mini-chart and last price

- [x] Reorder sidebar menu: Home, Watchlist, News, Stocks, ETFs, Fixed Income, then rest
- [x] Create news database table (title, summary, source, url, publishedAt, tickers, category)
- [x] Build news scraping service to parse from multiple RSS/API sources
- [x] Schedule news scraping 3x daily (morning, afternoon, evening)
- [x] News page: add filters (source, ticker, date, category/keyword search)
- [x] News page: clickable headlines linking to original article
- [x] News page: show 1-2 sentence summary from source
- [x] News sources: Google News RSS (Business, Markets, Economy, Earnings, Fixed Income, Commodities, IPO, Crypto)
- [x] Add News tab to stock detail page (/stocks/:symbol)
- [x] Stock News tab: filter by keyword, date range, source
- [x] Stock News tab: show all news mentioning the specific ticker
- [x] Write vitest tests for news routes (17 tests, all passing)

- [x] Add sentiment column to newsArticles DB schema (bullish/bearish/neutral)
- [x] Build sentiment analysis service using built-in LLM (batch processing)
- [x] Integrate sentiment analysis into news scraping pipeline
- [x] Add sentiment filter to news.list tRPC route
- [x] Display sentiment badges on News page (bullish=green, bearish=red, neutral=gray)
- [x] Display sentiment badges on Stock News tab in StockDetail
- [x] Add sentiment filter dropdown to News page and Stock News tab
- [x] Run sentiment analysis on existing articles (backfill complete: 315 bullish, 138 bearish, 490 neutral)
- [x] Write vitest tests for sentiment analysis routes (27 news tests, 64 total)

## API Migration - Yahoo Finance RapidAPI
- [x] Save RapidAPI key as environment secret
- [x] Rewrite stockService.ts to use Yahoo Finance RapidAPI endpoints
- [x] Migrate market quotes (real-time) endpoint
- [x] Migrate stock history/chart endpoint
- [x] Migrate stock profile endpoint (via stock/modules)
- [x] Migrate market screener endpoint
- [x] Migrate market movers (gainers/losers) endpoint
- [x] Migrate market indices endpoint (sequential with rate limiting)
- [x] Migrate search endpoint
- [x] Migrate stock modules (financials, statistics, calendar-events)
- [x] Add rate limiting (600ms queue + 429 retry)
- [x] Migrate IPO data endpoint (API endpoint returns HTML redirect; using static fallback with async wrapper ready for when API becomes available)
- [x] Verify all existing pages work with new API (homepage indices, gainers/losers, stock detail all working)

## Calendars Section
- [x] Build calendar service for Yahoo Finance calendar endpoints (earnings, dividends, stock-splits, economic_events, public_offerings)
- [x] Add Earnings calendar page
- [x] Add Dividends calendar page
- [x] Add Stock Splits calendar page
- [x] Add Economic Events calendar page
- [x] Add Public Offerings (IPO/SPO) calendar page (with static fallback)
- [x] Add Calendars section to sidebar navigation (after News, with 5 sub-items)
- [x] Add routes in App.tsx for all calendar pages
- [x] Write vitest tests for calendar routes (5 calendar tests added, 71 total all passing)

## Footer & Legal Pages
- [x] Create unified Footer component with ARFA branding, site navigation, legal links, copyright
- [x] Create About Us page with content from docx
- [x] Create Terms of Use page
- [x] Create Privacy Policy page
- [x] Create Data Disclaimer page
- [x] Create Disclaimer / Not Investment Advice page
- [x] Create Cookie Notice page
- [x] Create Contact page with contact form (like stockanalysis.com/contact)
- [x] Add all legal/info page routes to App.tsx
- [x] Integrate Footer into AppLayout on all pages
- [x] Style footer modern and clean
