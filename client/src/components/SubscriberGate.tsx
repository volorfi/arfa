/**
 * SubscriberGate.tsx
 * Wraps any subscriber-only content. Shows a paywall if user is not subscriber/admin.
 * Usage: <SubscriberGate><YourComponent /></SubscriberGate>
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, TrendingUp, BarChart3, Globe2 } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";

const FEATURES = [
  { icon: TrendingUp, text: "AI signal feed across equities, bonds, FX & macro" },
  { icon: BarChart3,  text: "Signal screener — filter by stance, confidence, asset class" },
  { icon: Globe2,     text: "Macro regime dashboard — sector & country heatmaps" },
  { icon: Sparkles,   text: "Multi-agent debate view — bull/bear theses & risk flags" },
];

export default function SubscriberGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role === "subscriber" || user?.role === "admin") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Logo + lock */}
        <div className="mx-auto flex flex-col items-center gap-2">
          <BrandMark variant="icon" size={64} />
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ARFA Insights</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Multi-asset AI intelligence — signals, regime views, and analyst research
            across equities, fixed income, FX, and macro.
          </p>
        </div>

        {/* Feature list */}
        <ul className="text-left space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="flex flex-col gap-3 pt-2">
          {!user ? (
            <>
              <Button asChild size="lg" className="w-full">
                <a href={getLoginUrl()}>Sign in to access Insights</a>
              </Button>
              <p className="text-xs text-muted-foreground">
                Already a subscriber? Sign in to activate your access.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                Your account (<span className="font-medium">{user.email ?? user.name}</span>) does not have
                an active Insights subscription.
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:hello@arfa.global">Contact us to subscribe</a>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
