import { Layers } from "lucide-react";
import MarketTickerBar from "@/components/MarketTickerBar";
import { toast } from "sonner";
import { useEffect } from "react";

export default function ETFs() {
  useEffect(() => {
    toast.info("Feature coming soon");
  }, []);

  return (
    <div className="min-h-screen">
      <MarketTickerBar />
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">ETFs</h1>
        </div>
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">ETF Explorer Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Browse and analyze Exchange-Traded Funds with detailed holdings, performance metrics, and comparison tools. This feature is currently under development.
          </p>
        </div>
      </div>
    </div>
  );
}
