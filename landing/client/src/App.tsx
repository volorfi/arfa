import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import StockDetail from "./pages/StockDetail";
import Screener from "./pages/Screener";
import MarketMovers from "./pages/MarketMovers";
import IPOCalendar from "./pages/IPOCalendar";
import News from "./pages/News";
import Watchlist from "./pages/Watchlist";
import Trending from "./pages/Trending";
import ETFs from "./pages/ETFs";
import PlaceholderPage from "./pages/PlaceholderPage";
import CalendarEarnings from "./pages/CalendarEarnings";
import CalendarDividends from "./pages/CalendarDividends";
import CalendarStockSplits from "./pages/CalendarStockSplits";
import CalendarEconomicEvents from "./pages/CalendarEconomicEvents";
import CalendarPublicOfferings from "./pages/CalendarPublicOfferings";
import InvestmentGrade from "./pages/InvestmentGrade";
import IssuerDetail from "./pages/IssuerDetail";
import Sovereign from "./pages/Sovereign";
import SovereignBondDetail from "./pages/SovereignBondDetail";
import MacroAllCountries from "./pages/MacroAllCountries";
import MacroRegion from "./pages/MacroRegion";
import MacroCountry from "./pages/MacroCountry";
import AboutUs from "./pages/AboutUs";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataDisclaimer from "./pages/DataDisclaimer";
import Disclaimer from "./pages/Disclaimer";
import CookieNotice from "./pages/CookieNotice";
import Contact from "./pages/Contact";
import OptionsChain from "./pages/OptionsChain";
import StrategyBuilder from "./pages/StrategyBuilder";
import OptionsFlow from "./pages/OptionsFlow";
import OptionsScreener from "./pages/OptionsScreener";
import { LineChart, Calculator, BarChart3 } from "lucide-react";
import CookieConsent from "./components/CookieConsent";
import InsightsDashboard    from "@/pages/insights/InsightsDashboard";
import InsightsSignalDetail from "@/pages/insights/InsightsSignalDetail";
import { OSLayout, OSDashboard } from "@/pages/os/OSLayout";
import OSSignals from "@/pages/os/OSSignals";
import OSUsers   from "@/pages/os/OSUsers";
import OSNotes   from "@/pages/os/OSNotes";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/stocks/:symbol" component={StockDetail} />
        <Route path="/stocks" component={Screener} />
        <Route path="/screener" component={Screener} />
        <Route path="/movers" component={MarketMovers} />
        <Route path="/ipos" component={IPOCalendar} />
        <Route path="/calendars/earnings" component={CalendarEarnings} />
        <Route path="/calendars/dividends" component={CalendarDividends} />
        <Route path="/calendars/stock-splits" component={CalendarStockSplits} />
        <Route path="/calendars/economic-events" component={CalendarEconomicEvents} />
        <Route path="/calendars/public-offerings" component={CalendarPublicOfferings} />
        <Route path="/news" component={News} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/trending" component={Trending} />
        <Route path="/etfs" component={ETFs} />
        <Route path="/fixed-income/corporate" component={InvestmentGrade} />
        <Route path="/fixed-income/issuer/:slug" component={IssuerDetail} />
        <Route path="/fixed-income/sovereign/:slug" component={SovereignBondDetail} />
        <Route path="/fixed-income/sovereign" component={Sovereign} />
        <Route path="/macro" component={MacroAllCountries} />
        <Route path="/macro/region/:region" component={MacroRegion} />
        <Route path="/macro/country/:country" component={MacroCountry} />
        <Route path="/about" component={AboutUs} />
        <Route path="/terms" component={TermsOfUse} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/data-disclaimer" component={DataDisclaimer} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/cookies" component={CookieNotice} />
        <Route path="/contact" component={Contact} />
        <Route path="/options/chain" component={OptionsChain} />
        <Route path="/options/strategy" component={StrategyBuilder} />
        <Route path="/options/flow" component={OptionsFlow} />
        <Route path="/options/tools" component={OptionsScreener} />
        <Route path="/chart">
          {() => <PlaceholderPage title="Technical Chart" icon={LineChart} />}
        </Route>
        <Route path="/compare">
          {() => <PlaceholderPage title="Stock Comparison" icon={Calculator} />}
        </Route>
        <Route path="/tools">
          {() => <PlaceholderPage title="Tools" icon={BarChart3} />}
        </Route>
        <Route path="/insights" component={InsightsDashboard} />
        <Route path="/insights/signals/:signalId" component={InsightsSignalDetail} />
        <Route path="/os">
          {() => <OSLayout><OSDashboard /></OSLayout>}
        </Route>
        <Route path="/os/signals">
          {() => <OSSignals />}
        </Route>
        <Route path="/os/users">
          {() => <OSUsers />}
        </Route>
        <Route path="/os/notes">
          {() => <OSNotes />}
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
