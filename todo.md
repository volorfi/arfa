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

## Cookie Consent Banner (GDPR)
- [x] Create CookieConsent component with accept/decline buttons
- [x] Store user preference in localStorage
- [x] Show banner only on first visit (or until user makes a choice)
- [x] Link to Cookie Notice page from the banner
- [x] Modern, non-intrusive design matching site theme
- [x] Integrate into App.tsx so it appears on all pages

## Market Indices Ticker Tape
- [x] Replace horizontal scroll bar with smooth auto-scrolling marquee/ticker tape
- [x] Remove scrollbar - use CSS animation instead
- [x] Pin/sticky ticker tape at top of page (always visible on scroll)
- [x] Keep sparkline charts and color-coded changes

## Bug Fixes
- [x] Fix CSS animation/animationPlayState conflict error in MarketTickerBar (don't mix shorthand `animation` with non-shorthand `animationPlayState`)

## Sovereign Bonds Data Improvements
- [x] New ticker format: replace Bloomberg format (e.g. "BHRAIN 7.75 04/18/35 REGS Govt") with custom format ("BAHRAIN 7.75 04/18/2035" = Country Coupon MM/DD/YYYY)
- [x] Parse new Sovereign.xlsx with two sheets: SOV (existing) + sov_bonds_data (extended universe)
- [x] Merge data from both sheets: match by ISIN, priority to sov_bonds_data for numeric values (YTM, duration etc.)
- [x] For bonds in sov_bonds_data but not in SOV: use country-level data (ratings, credit commentary, score) from another bond of the same country in SOV
- [x] Bond detail page: add table of other bonds from same country with links to their detail pages
- [x] Bond detail page: add market map (scatter chart) of all bonds from same country with currency toggle
- [x] Fix market map legend positioning to avoid overlap with axis labels (move legend lower)

## New Macroeconomics Section
- [x] Add Macroeconomics menu item in sidebar (below Fixed Income) with sub-items: All Countries, Africa, Americas, Asia, CIS, Europe, Latam, Middle East, Oceania
- [x] Use macro data from Sovereign.xlsx SOV sheet for countries (GDP, Inflation, Fiscal Balance, Public Debt, Reserves etc.)
- [x] Build country macro page: flag, rating badges, macro indicators grid, radar chart, debt/fiscal bar chart, credit commentary (from SOV), bonds table
- [x] Build region pages: GDP vs Inflation scatter chart, Fiscal Balance bar chart, macro comparison table with sorting for all countries in region
- [x] Build All Countries page: tile map colored by selected macro indicator (Real GDP Growth, Inflation, Fiscal Balance, Public Debt, Current Account, Reserves, External Debt, Interest Expense)
- [x] Fix Recharts container sizing on macro region/country pages (already using proper h-[Xpx] + ResponsiveContainer pattern)
- [x] Add proper responsive containers for all charts on macro pages (verified: all charts use fixed-height wrapper + ResponsiveContainer)
- [x] All Countries page: indicator selector above map + summary table below with sorting, search, and links to country pages
- [x] Cross-link macroeconomics and sovereign bonds sections (bond detail -> macro country, macro country -> sovereign bonds, footer link)

## News Section Overhaul
- [x] Add RSS feeds from financial blogs (sources from finviz.com/news.ashx - Seeking Alpha, Motley Fool, Benzinga, etc.)
- [x] Blog articles: extract tickers and match to company pages (same logic as news)
- [x] Blog articles: apply same sentiment analysis as news
- [x] Add news/blog type field to distinguish news vs blogs
- [x] Auto-delete news/blogs older than 90 days to control data volume
- [x] Update blog feeds 3x daily (same schedule as news)
- [x] News page tabs: All News&Blogs, World News, Blogs
- [x] Sentiment analytics dashboard on each tab with creative visualizations
- [x] Dashboard: aggregated sentiment by assets/sectors/tickers (today + weekly)
- [x] Dashboard: bubble chart or creative visualization for sentiment distribution
- [x] Dashboard: ticker mentions and keyword frequency visualization
- [x] Integrate blogs into stock detail page News tab (same ticker matching)
- [x] Toggle to switch between news, blogs, or all combined

## News Page Fixes
- [x] Most Mentioned: exclude market indices (^DJI, ^GSPC, ^IXIC etc.) - show only stock tickers
- [x] Category Sentiment Treemap: improve label visibility (text hard to read on colored backgrounds)
- [x] Keyword search filter: fix search not finding articles by keyword (e.g. "roger" not returning results)

## Homepage Search & Trending Improvements
- [x] Universal search: search across stocks, sovereign bonds (by country, ISIN, ticker), corporate bonds, macro countries/regions, and news headlines (keywords)
- [x] Search results: group by category (Stocks, Sovereign Bonds, Corporate Bonds, Countries, News) with links to respective pages
- [x] Trending tickers: replace static AAPL/NVDA/MSFT/TSLA/AMZN with dynamic top 5 Most Mentioned tickers from News Today
- [x] Trending tickers: update automatically when sentiment data changes
- [x] Most Bullish and Most Bearish cards: expand from 3 to 5 tickers

## SEO Fixes - Homepage
- [x] Set page title between 30-60 characters using document.title
- [x] Add meta description between 50-160 characters
- [x] Add meta keywords for the homepage

## Homepage Redesign - Super Rich & Unique
- [x] Unique visual identity: differentiate from StockAnalysis.com (Space Grotesk display font, gradient mesh hero, section-glow borders, entrance animations)
- [x] Hero: preamble text explaining what ARFA is and what the user can do here
- [x] Hero: smart universal search (stocks, bonds, ISIN, countries, news keywords)
- [x] Block: Market Overview - Market Pulse strip with key indices, top gainer/loser, volume
- [x] Block: Top Gainers & Losers - compact tables with toggle
- [x] Block: Market News & Sentiment - latest headlines with sentiment badges
- [x] Block: Sovereign Bonds Spotlight - top yield bonds with ratings and country flags
- [x] Block: Corporate Bonds Highlight - featured issuers with ratings and sector
- [x] Block: Macroeconomics Snapshot - country cards with GDP, inflation, debt, ratings
- [x] Block: Calendars Preview - upcoming earnings and economic events
- [x] Block: Trending Stocks - most mentioned tickers from news with sentiment bars
- [x] Block: IPO Corner - recent and upcoming IPOs
- [ ] Block: ETFs Overview - top ETFs or categories (placeholder - ETF data not yet available)
- [x] Block: Tools & Quick Links - screener, watchlist, movers, calendars shortcuts
- [x] Design: unique card styles with section-glow borders, hover shadow lift, gradient backgrounds
- [x] Design: micro-interactions (hover lift, icon scale, fade-in-up entrance animations)
- [x] SEO: proper title, description, keywords

## Sidebar Navigation Redesign
- [x] Redesign sidebar to match new premium visual identity
- [x] Add section grouping with subtle dividers and category labels (Overview, Markets, Research, Discover)
- [x] Improve active state with blue left-bar indicator + accent background
- [x] Add hover micro-interactions (smooth transitions, subtle background shifts)
- [x] Refine typography: use display font for branding, compact 13px items, 10px labels
- [x] Add collapsible icon-only mode with smooth transition
- [x] Improve submenu expansion with smooth animation
- [x] Polish bottom section: user avatar with gradient ring, theme toggle in footer, sign-out dropdown
- [x] Ensure mobile responsiveness is maintained
- [x] Add resize handle for adjustable sidebar width (200-360px, persisted in localStorage)
- [x] Logo: Zap icon + "ARFA / Global Markets" with display font

## Bug Fixes
- [x] Fix nested button error in sidebar: "<button> cannot contain a nested <button>" (React DOM nesting violation)
- [x] Fix search dropdown z-index: results dropdown hides behind stat cards and other content below the search bar

## Stock Options Section
- [x] Create optionsService.ts backend: Yahoo Finance crumb-based options chain API (expirations, calls/puts, Greeks, IV)
- [x] Add "OPTIONS" section to sidebar menu with sub-items: Chain, Strategy Builder, Options Flow, Options Tools
- [x] Options Chain page: symbol search, expiration date selector, calls/puts side-by-side grid
- [x] Options Chain: columns - Strike, Bid, Ask, Last, Change, Volume, OI, IV, Delta, Gamma, Theta, Vega
- [x] Options Chain: highlight ITM/OTM zones, show underlying price divider line, color-code by moneyness
- [x] Strategy Builder page: strategy template selector (Long Call, Covered Call, Bull/Bear Spread, Iron Condor, Straddle, Strangle, Butterfly, Calendar Spread, etc.)
- [x] Strategy Builder: Black-Scholes P&L calculator with interactive payoff diagram (at expiration + current)
- [x] Strategy Builder: per-leg and net Greeks display (Delta, Gamma, Theta, Vega, Rho)
- [x] Strategy Builder: adjustable parameters (IV, days to expiry, underlying price slider)
- [x] Options Flow page: most active options from RapidAPI, unusual volume detection
- [x] Options Flow: filters by symbol/name search, sentiment (bullish/bearish/all)
- [x] Options Flow: IV rank bars, sentiment badges, sortable columns, P/C ratio
- [x] Options Tools: Greeks Calculator with sensitivity charts (Delta, Gamma, Theta, Vega)
- [x] Options Flow: add volume threshold filter (All, >100K, >250K, >500K, >1M) and IV rank filter (All, High, Medium, Low)
- [x] Options Flow: add unusual activity signal badges (Sweep = vol >2x median, High IV = rank >70%, Skew = extreme call/put ratio)
- [ ] Options Screener: dedicated screener with IV rank, volume, OI, expiration, moneyness filters (future enhancement)
- [ ] Put/Call ratio: add historical time-series chart (requires historical data API)
- [ ] IV Percentile: requires historical IV data (52-week) not available in current API
- [x] Max Pain calculator: compute and display max pain strike for each expiration
- [x] Put/Call ratio display (volume and OI ratios)
- [x] IV Rank display in Options Flow table
- [ ] IV Percentile calculation and display for underlying stocks (requires historical IV data)
- [x] Black-Scholes model implementation (server + client TypeScript) for real-time Greeks and P&L
- [x] Options overview stats on homepage: OptionsHubBlock with active symbols, total volume, sentiment, IV rank + top 6 table
- [x] Options links added to Market Pulse bar, Quick Tools grid, and Footer navigation
- [x] Add routes in App.tsx for all options pages (/options/chain, /options/strategy, /options/flow, /options/tools)
- [x] Write vitest tests for options backend (18 tests: Black-Scholes, max pain, put/call ratio)
- [x] OI Analysis tab: Open Interest by strike chart with max pain reference line
- [x] IV Surface tab: Implied Volatility smile chart (call IV + put IV vs strike)
- [x] 20 popular ticker quick-select buttons on Options Chain page

## External Research & Podcasts (theideafarm.com)
- [x] DB schema: external_research table (title, firm, author, category, type, pages, description, sourceUrl, imageUrl, date, tickers JSON, sentiment, createdAt)
- [x] DB schema: external_podcasts table (title, category, duration, description, sourceUrl, imageUrl, date, tickers JSON, sentiment, createdAt)
- [x] Scraper service: parse theideafarm.com/research/ HTML for research items
- [x] Scraper service: parse theideafarm.com/curated-podcasts/ HTML for podcast items
- [x] Scraper: extract tickers from title+description using LLM (batch analysis)
- [x] Scraper: assign sentiment (bullish/bearish/neutral) using LLM analysis
- [x] Scraper: initial load — all items from last 1 month depth (up to 5 pages)
- [x] Scraper: auto-delete entries older than 3 months
- [x] Scraper: daily cron job (30s after server start, then every 24h, podcasts limited to 1 page)
- [x] tRPC routes: externalResearch.list (paginated, filterable by category, ticker, sentiment)
- [x] tRPC routes: externalPodcasts.list (paginated, filterable by category)
- [x] tRPC routes: externalResearch.byTicker (via ticker filter param)
- [x] News & Blogs page: add "External Research" tab
- [x] News & Blogs page: add "Podcasts" tab
- [x] Display: title, preamble, firm/source, link to original, tickers, sentiment badge
- [x] Display: randomized order (not strictly chronological)
- [x] Stock detail page: add External Research tab showing research mentioning that ticker
- [x] Homepage: add External Research block (6 items, randomized, with tickers/sentiment)
- [x] Homepage: add Podcasts block (6 items, randomized, with duration/category)
- [x] Write vitest tests for ideafarm service and tRPC routes (19 tests: HTML decoding, URL hashing, research list/filter/categories, podcasts list/filter/categories)

## Research & Podcasts Link Fixes
- [x] Remove "Sourced from..." text from External Research tab, Podcasts tab, and StockDetail Research tab
- [x] Parse direct source URLs for research (originalSourceUrl column + scraper update)
- [x] Update all link hrefs to use originalSourceUrl || sourceUrl fallback
- [x] Add DB columns: applePodcastsUrl, spotifyUrl, youtubeUrl to external_podcasts
- [x] Update scraper to extract Apple Podcasts, Spotify, YouTube links from podcast detail pages
- [x] Add branded platform buttons (Apple Podcasts purple, Spotify green, YouTube red) to podcast cards
- [x] Backfill existing podcast records with platform-specific URLs

## Stable Random Order & Platform Buttons
- [x] Add sortOrder column (int) to external_research and external_podcasts tables
- [x] Assign random sortOrder at insert time (not RAND() at query time)
- [x] Update query helpers to ORDER BY sortOrder instead of RAND()
- [x] Extract Apple Podcasts, Spotify, YouTube URLs from podcast detail pages into separate columns
- [x] Add branded platform buttons (Apple purple, Spotify green, YouTube red) to podcast cards
- [x] Backfill existing records with sortOrder and platform URLs
