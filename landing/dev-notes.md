# Dev Notes

## Stock Detail Page (AAPL) - Working
- Price shows: $266.43 +7.53 (+2.91%) - correct
- Chart renders correctly with Recharts (1M default)
- Period selectors: 1D, 5D, 1M, YTD, 3M, 6M, 1Y, 5Y, Max - all present
- Tabs: Overview, Financials, Forecast, Statistics, Dividends, History, Profile - all present
- Metrics table shows but many values are N/A (Market Cap, Revenue, EPS, etc.)
  - This is because the chart API doesn't return these fields
  - Need to check if insights API can provide more data
- Watchlist button present
- About section present

## Homepage - Working
- Market ticker bar with indices
- Hero search bar
- Quick links
- Top Gainers/Losers tables with real data
- News feed
- Recent/Upcoming IPO tables

## Issues to fix
- Many metrics show N/A on stock detail page
- Need to write tests
