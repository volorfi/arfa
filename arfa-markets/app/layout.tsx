import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://arfa.global"),
  title: {
    default: "ARFA — Architecture of Research for Financial Allocation",
    template: "%s — ARFA",
  },
  description:
    "Independent analytical platform for global markets — stocks, sovereign and corporate bonds, macro, and portfolio intelligence.",
  applicationName: "ARFA",
  authors: [{ name: "ARFA" }],
  creator: "ARFA",
  publisher: "ARFA",
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    title: "ARFA — Architecture of Research for Financial Allocation",
    description:
      "Independent analytical platform for global markets — stocks, bonds, macro, portfolio intelligence.",
    siteName: "ARFA",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARFA",
    description: "Global markets intelligence.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#171614" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Sonner toaster — mounted once at the root so any client
              component can call toast() / toast.error() / etc. without
              extra wiring. Uses next-themes' resolved theme. */}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            theme="system"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
