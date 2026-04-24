import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Globe,
  AlertCircle,
} from "lucide-react";
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

export default function CalendarEconomicEvents() {
  const [date, setDate] = useState(() => new Date());
  const dateStr = useMemo(() => formatDate(date), [date]);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = trpc.calendar.economicEvents.useQuery({ date: dateStr });

  const filtered = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item: any) =>
        item.eventName?.toLowerCase().includes(q) ||
        item.country?.toLowerCase().includes(q) ||
        JSON.stringify(item).toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Economic Events Calendar</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Key economic data releases and central bank events.
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
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {displayDate(date)}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium">Event</th>
                    <th className="text-left px-4 py-2.5 font-medium">Country</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actual</th>
                    <th className="text-right px-4 py-2.5 font-medium">Forecast</th>
                    <th className="text-right px-4 py-2.5 font-medium">Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : error || (data && !Array.isArray(data)) || filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">
              {error ? "Data temporarily unavailable" : "No economic events found"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {error
                ? "The economic events data source is currently unavailable. Please try again later or select a different date."
                : "No economic events are scheduled for this date. Try selecting a weekday."}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium">Event</th>
                    <th className="text-left px-4 py-2.5 font-medium">Country</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actual</th>
                    <th className="text-right px-4 py-2.5 font-medium">Forecast</th>
                    <th className="text-right px-4 py-2.5 font-medium">Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{item.eventName || item.event || item.name || JSON.stringify(item).slice(0, 60)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.country || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{item.actual ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.forecast ?? item.consensus ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.previous ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
