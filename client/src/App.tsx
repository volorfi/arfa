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
import InvestmentGrade from "./pages/InvestmentGrade";
import IssuerDetail from "./pages/IssuerDetail";
import Sovereign from "./pages/Sovereign";
import SovereignBondDetail from "./pages/SovereignBondDetail";
import { LineChart, Calculator, BarChart3 } from "lucide-react";

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
        <Route path="/news" component={News} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/trending" component={Trending} />
        <Route path="/etfs" component={ETFs} />
        <Route path="/fixed-income/corporate" component={InvestmentGrade} />
        <Route path="/fixed-income/issuer/:slug" component={IssuerDetail} />
        <Route path="/fixed-income/sovereign/:slug" component={SovereignBondDetail} />
        <Route path="/fixed-income/sovereign" component={Sovereign} />
        <Route path="/chart">
          {() => <PlaceholderPage title="Technical Chart" icon={LineChart} />}
        </Route>
        <Route path="/compare">
          {() => <PlaceholderPage title="Stock Comparison" icon={Calculator} />}
        </Route>
        <Route path="/tools">
          {() => <PlaceholderPage title="Tools" icon={BarChart3} />}
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
