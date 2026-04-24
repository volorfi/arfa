import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Calendar, Clock, CalendarPlus } from "lucide-react";

export default function IPOCalendar() {
  const { data, isLoading } = trpc.market.ipos.useQuery();
  const [tab, setTab] = useState<"recent" | "upcoming">("recent");

  const items = tab === "recent" ? data?.recent : data?.upcoming;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">IPO Calendar</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab("recent")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "recent" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Clock className="h-4 w-4" />
            Recent IPOs
          </button>
          <button
            onClick={() => setTab("upcoming")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === "upcoming" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            Upcoming IPOs
          </button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Company Name</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-40 bg-muted rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : (
                  items?.map((ipo: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{ipo.date}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{ipo.symbol}</td>
                      <td className="px-4 py-3 text-foreground">{ipo.name}</td>
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
