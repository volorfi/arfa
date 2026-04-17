import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
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

export default function CalendarEarnings() {
  const [date, setDate] = useState(() => new Date());
  const dateStr = useMemo(() => formatDate(date), [date]);
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.calendar.earnings.useQuery({ date: dateStr });

  const filtered = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item: any) =>
        item.symbol?.toLowerCase().includes(q) ||
        item.name?.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="min-h-screen">
      <MarketTickerBar />
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Earnings Calendar</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Companies reporting earnings on the selected date.
        </p>

        {/* Date Navigation + Search */}
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

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Company</th>
                  <th className="text-left px-4 py-2.5 font-medium">Fiscal Quarter</th>
                  <th className="text-right px-4 py-2.5 font-medium">EPS Forecast</th>
                  <th className="text-right px-4 py-2.5 font-medium">Last Year EPS</th>
                  <th className="text-right px-4 py-2.5 font-medium">Market Cap</th>
                  <th className="text-right px-4 py-2.5 font-medium"># Estimates</th>
                  <th className="text-left px-4 py-2.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No earnings reports found for this date.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/stocks/${item.symbol}`} className="font-semibold text-primary hover:underline">
                          {item.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{item.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.fiscalQuarterEnding || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{item.epsForecast || "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.lastYearEPS || "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.marketCap || "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.noOfEsts || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {item.time === "time-not-supplied" || !item.time ? "—" 
                          : item.time === "time-pre-market" ? "Pre-Market"
                          : item.time === "time-after-hours" ? "After Hours"
                          : item.time}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
