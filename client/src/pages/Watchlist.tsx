import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Star, Trash2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Watchlist() {
  const { user, loading: authLoading } = useAuth();
  const { data: items, isLoading } = trpc.watchlist.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
      toast.success("Removed from watchlist");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1300px] mx-auto px-4 py-6">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-6" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1300px] mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Sign in to use Watchlist</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Create a free account to save and track your favorite stocks. Get quick access to the stocks you care about most.
            </p>
            <Button onClick={() => { window.location.href = getLoginUrl(); }} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Watchlist</h1>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Your watchlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Search for stocks and add them to your watchlist to track them here.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm">Browse Stocks</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Company Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Added</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/stocks/${item.symbol}`} className="font-semibold text-primary hover:underline">
                        {item.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{item.companyName || item.symbol}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate({ symbol: item.symbol })}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
