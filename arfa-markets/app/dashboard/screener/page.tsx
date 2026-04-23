import type { Metadata } from "next";

import { ScreenerShell } from "@/components/screener/screener-shell";

export const metadata: Metadata = {
  title: "Screener",
  description:
    "Filter ARFA's universe by score, factor, and asset-class specifics.",
};

export default function ScreenerPage() {
  return <ScreenerShell />;
}
