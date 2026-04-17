import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Rocket,
  AlertCircle,
} from "lucide-react";
import MarketTickerBar from "@/components/MarketTickerBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function displayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function CalendarPublicOfferings() {
  const [date, setDate] = useState(() => new Date());
  const dateStr = useMemo(() => formatDate(date), [date]);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = trpc.calendar.publicOfferings.useQuery({ date: dateStr });

  // Also get static IPO data as fallback
  const { data: staticIpos } = trpc.market.ipos.useQuery();

  const hasApiData = data && Array.isArray(data) && data.length > 0;

  const filtered = useMemo(() => {
    if (hasApiData) {
      if (!search.trim()) return data;
      const q = search.toLowerCase();
      return data.filter(
        (item: any) =>
          item.symbol?.toLowerCase().includes(q) ||
          item.name?.toLowerCase().includes(q) ||
          item.companyName?.toLowerCase().includes(q)
      );
    }
    return [];
  }, [data, hasApiData, search]);

  // Static fallback data
  const staticFiltered = useMemo(() => {
    if (hasApiData || !staticIpos) return { recent: [], upcoming: [] };
    const q = search.toLowerCase();
    const filterFn = (item: any) =>
      !q || item.symbol?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q);
    return {
      recent: (staticIpos.recent || []).filter(filterFn),
      upcoming: (staticIpos.upcoming || []).filter(filterFn),
    };
  }, [staticIpos, hasApiData, search]);

  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");

  return (
    <div className="min-h-screen">
      <MarketTickerBar />
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Public Offerings (IPO/SPO)</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Initial and secondary public offerings calendar.
        </p>

        {hasApiData ? (
          <>
            {/* Date Navigation + Search (API mode) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDate(new Date(e.target.value))}
                    className="bg-transparent text-sm font-medium text-foreground outline-none"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDate(new Date())}>
                  Today
                </Button>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticker or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {displayDate(date)} &middot; {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* API Data Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                      <th className="text-left px-4 py-2.5 font-medium">Company</th>
                      <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                          No public offerings found for this date.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/stocks/${item.symbol || item.ticker}`} className="font-semibold text-primary hover:underline">
                              {item.symbol || item.ticker || "—"}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-foreground">{item.name || item.companyName || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.date || item.startdatetime || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{item.type || item.exchange || "IPO"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Fallback: Static IPO data with tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
              <div className="flex gap-1">
                <button
                  onClick={() => setTab("upcoming")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    tab === "upcoming" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Rocket className="h-4 w-4" />
                  Upcoming
                </button>
                <button
                  onClick={() => setTab("recent")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    tab === "recent" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Recent
                </button>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticker or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Live IPO/SPO data is temporarily unavailable. Showing cached data.
                </p>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                      <th className="text-left px-4 py-2.5 font-medium">Company Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      (tab === "upcoming" ? staticFiltered.upcoming : staticFiltered.recent).map((ipo: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{ipo.date}</td>
                          <td className="px-4 py-3">
                            <Link href={`/stocks/${ipo.symbol}`} className="font-semibold text-primary hover:underline">
                              {ipo.symbol}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-foreground">{ipo.name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
