import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Globe,
  Search,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  MapPin,
  Filter,
  ArrowRight,
} from "lucide-react";
import { getFlagUrl, getCountryCode } from "@/lib/countryFlags";

const MACRO_INDICATORS = [
  { key: "realGDPGrowth", label: "Real GDP Growth", unit: "%", colorScale: "green-red-reverse" },
  { key: "inflation", label: "Consumer Price Inflation", unit: "%", colorScale: "green-red" },
  { key: "fiscalBalance", label: "Fiscal Balance (% of GDP)", unit: "% GDP", colorScale: "green-red-reverse" },
  { key: "publicDebtGDP2025", label: "Public Debt (% of GDP)", unit: "% GDP", colorScale: "green-red" },
  { key: "currentAccount", label: "Current Account (% of GDP)", unit: "% GDP", colorScale: "green-red-reverse" },
  { key: "reservesBln", label: "International Reserves", unit: "$B", colorScale: "green-red-reverse" },
  { key: "externalDebtGDP", label: "External Debt (% of GDP)", unit: "% GDP", colorScale: "green-red" },
  { key: "interestExpGovRev", label: "Interest Expense / Gov Revenue", unit: "%", colorScale: "green-red" },
] as const;

type MacroKey = typeof MACRO_INDICATORS[number]["key"];

const REGIONS = ["All", "Africa", "Americas", "Asia", "CIS", "Europe", "Latam", "Middle East", "Oceania"];

// ISO Alpha-2 to Alpha-3 mapping for the SVG world map
const ISO2_TO_ISO3: Record<string, string> = {
  AE: "ARE", AL: "ALB", AO: "AGO", AR: "ARG", AM: "ARM", AU: "AUS", AT: "AUT",
  AZ: "AZE", BH: "BHR", BE: "BEL", BJ: "BEN", BA: "BIH", BR: "BRA", BG: "BGR",
  CM: "CMR", CA: "CAN", CL: "CHL", CN: "CHN", CO: "COL", CR: "CRI", HR: "HRV",
  CY: "CYP", CZ: "CZE", DK: "DNK", DO: "DOM", EC: "ECU", EG: "EGY", SV: "SLV",
  EE: "EST", FI: "FIN", FR: "FRA", GA: "GAB", DE: "DEU", GH: "GHA", GR: "GRC",
  GT: "GTM", HN: "HND", HU: "HUN", IS: "ISL", IN: "IND", ID: "IDN", IE: "IRL",
  IL: "ISR", IT: "ITA", CI: "CIV", JM: "JAM", JP: "JPN", JO: "JOR", KZ: "KAZ",
  KE: "KEN", KR: "KOR", KW: "KWT", LV: "LVA", LT: "LTU", MY: "MYS", MX: "MEX",
  MN: "MNG", ME: "MNE", MA: "MAR", MZ: "MOZ", NL: "NLD", NZ: "NZL", NG: "NGA",
  NO: "NOR", OM: "OMN", PK: "PAK", PA: "PAN", PY: "PRY", PE: "PER", PH: "PHL",
  PL: "POL", PT: "PRT", QA: "QAT", RO: "ROU", RW: "RWA", SA: "SAU", SN: "SEN",
  RS: "SRB", SK: "SVK", SI: "SVN", ZA: "ZAF", ES: "ESP", LK: "LKA", SE: "SWE",
  TH: "THA", TN: "TUN", TR: "TUR", UA: "UKR", GB: "GBR", US: "USA", UY: "URY",
  UZ: "UZB", ZM: "ZMB", GE: "GEO", IQ: "IRQ", MU: "MUS", NA: "NAM", MK: "MKD",
  PG: "PNG", CG: "COG", SR: "SUR", CH: "CHE", TZ: "TZA", TT: "TTO", UG: "UGA",
  VN: "VNM", ET: "ETH", BY: "BLR", BO: "BOL",
};

function getColorForValue(value: number | null, min: number, max: number, colorScale: string): string {
  if (value == null) return "#1e293b";
  const range = max - min;
  if (range === 0) return "#3b82f6";
  const normalized = Math.max(0, Math.min(1, (value - min) / range));

  if (colorScale === "green-red") {
    // Low = green, High = red
    const r = Math.round(34 + normalized * 221);
    const g = Math.round(197 - normalized * 137);
    const b = Math.round(94 - normalized * 34);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Reverse: Low = red, High = green
    const r = Math.round(255 - normalized * 221);
    const g = Math.round(60 + normalized * 137);
    const b = Math.round(60 + normalized * 34);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

type SortField = "country" | "compositeRating" | "bondCount" | MacroKey;

export default function MacroAllCountries() {
  const [, setLocation] = useLocation();
  const countriesQuery = trpc.sovereign.countries.useQuery();
  const [selectedIndicator, setSelectedIndicator] = useState<MacroKey>("realGDPGrowth");
  const [regionFilter, setRegionFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("country");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const countries = countriesQuery.data || [];

  const filteredCountries = useMemo(() => {
    let result = countries;
    if (regionFilter !== "All") {
      result = result.filter((c) => c.region === regionFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.country.toLowerCase().includes(q));
    }
    return result.sort((a: any, b: any) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [countries, regionFilter, search, sortField, sortDir]);

  const indicator = MACRO_INDICATORS.find((i) => i.key === selectedIndicator)!;

  // Calculate min/max for color scale
  const { min, max } = useMemo(() => {
    const values = countries.map((c: any) => c[selectedIndicator]).filter((v: any) => v != null) as number[];
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [countries, selectedIndicator]);

  // Build country color map for the SVG map
  const countryColorMap = useMemo(() => {
    const map: Record<string, { color: string; value: number | null; country: string }> = {};
    countries.forEach((c: any) => {
      const iso2 = getCountryCode(c.country);
      if (iso2) {
        const iso3 = ISO2_TO_ISO3[iso2];
        if (iso3) {
          map[iso3] = {
            color: getColorForValue(c[selectedIndicator], min, max, indicator.colorScale),
            value: c[selectedIndicator],
            country: c.country,
          };
        }
      }
    });
    return map;
  }, [countries, selectedIndicator, min, max, indicator.colorScale]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "country" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  if (countriesQuery.isLoading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-[400px] bg-muted rounded-xl" />
          <div className="h-[300px] bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className="cursor-pointer hover:text-foreground" onClick={() => setLocation("/")}>Home</span>
          <span>/</span>
          <span className="text-foreground font-medium">Macroeconomics</span>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Globe className="h-7 w-7 text-primary" />
          Global Macroeconomic Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {countries.length} countries with sovereign bond data and macroeconomic indicators
        </p>
      </div>

      {/* Region Navigation */}
      <div className="flex flex-wrap gap-2">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => {
              if (r === "All") {
                setRegionFilter("All");
              } else {
                setRegionFilter(r);
                setLocation(`/macro/region/${encodeURIComponent(r)}`);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              regionFilter === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {r === "All" ? "All Countries" : r}
          </button>
        ))}
      </div>

      {/* Indicator Selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Select Macro Indicator for Map
        </h3>
        <div className="flex flex-wrap gap-2">
          {MACRO_INDICATORS.map((ind) => (
            <button
              key={ind.key}
              onClick={() => setSelectedIndicator(ind.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                selectedIndicator === ind.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* World Map (SVG-based choropleth) */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-500" />
          {indicator.label} — World Map
        </h3>
        <div className="relative">
          <WorldMapSVG
            countryColorMap={countryColorMap}
            hoveredCountry={hoveredCountry}
            onHover={setHoveredCountry}
            onClickCountry={(country) => setLocation(`/macro/country/${encodeURIComponent(country)}`)}
          />
          {/* Color Legend */}
          <div className="flex items-center gap-2 mt-3 justify-center">
            <span className="text-[10px] text-muted-foreground">{min.toFixed(1)}{indicator.unit}</span>
            <div
              className="h-3 w-48 rounded-full"
              style={{
                background: indicator.colorScale === "green-red"
                  ? "linear-gradient(to right, #22c55e, #f59e0b, #ef4444)"
                  : "linear-gradient(to right, #ef4444, #f59e0b, #22c55e)",
              }}
            />
            <span className="text-[10px] text-muted-foreground">{max.toFixed(1)}{indicator.unit}</span>
          </div>
          {hoveredCountry && (
            <div className="absolute top-2 right-2 bg-popover text-popover-foreground border border-border rounded-lg p-2 text-xs shadow-lg">
              <div className="font-semibold">{hoveredCountry}</div>
              {(() => {
                const c = countries.find((c) => c.country === hoveredCountry);
                if (!c) return null;
                const val = (c as any)[selectedIndicator];
                return (
                  <div className="text-muted-foreground">
                    {indicator.label}: {val != null ? `${val.toFixed(2)}${indicator.unit}` : "N/A"}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Countries", value: filteredCountries.length.toString(), icon: Globe },
          {
            label: "Avg GDP Growth",
            value: (() => {
              const vals = filteredCountries.filter((c) => c.realGDPGrowth != null);
              return vals.length ? `${(vals.reduce((s, c) => s + c.realGDPGrowth!, 0) / vals.length).toFixed(1)}%` : "—";
            })(),
            icon: TrendingUp,
          },
          {
            label: "Avg Inflation",
            value: (() => {
              const vals = filteredCountries.filter((c) => c.inflation != null);
              return vals.length ? `${(vals.reduce((s, c) => s + c.inflation!, 0) / vals.length).toFixed(1)}%` : "—";
            })(),
            icon: BarChart3,
          },
          {
            label: "Total Bonds",
            value: filteredCountries.reduce((s, c) => s + c.bondCount, 0).toString(),
            icon: MapPin,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
              <stat.icon className="h-3 w-3" />
              {stat.label}
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Country Table */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Country Macro Indicators ({filteredCountries.length})
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-muted/50 border border-border rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                {[
                  { key: "country" as SortField, label: "Country" },
                  { key: "compositeRating" as SortField, label: "Rating" },
                  { key: "realGDPGrowth" as SortField, label: "GDP Growth" },
                  { key: "inflation" as SortField, label: "Inflation" },
                  { key: "fiscalBalance" as SortField, label: "Fiscal Bal." },
                  { key: "publicDebtGDP2025" as SortField, label: "Public Debt" },
                  { key: "currentAccount" as SortField, label: "Curr. Account" },
                  { key: "reservesBln" as SortField, label: "Reserves" },
                  { key: "bondCount" as SortField, label: "Bonds" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-2 px-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.key} />
                    </span>
                  </th>
                ))}
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCountries.map((c) => {
                const flagUrl = getFlagUrl(c.country, "20x15");
                return (
                  <tr
                    key={c.country}
                    className="border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/macro/country/${encodeURIComponent(c.country)}`)}
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        {flagUrl && <img src={flagUrl} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                        <span className="font-medium">{c.country}</span>
                        {c.region && (
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {c.region}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`font-semibold ${
                        c.igHyIndicator === "IG" ? "text-emerald-500" : c.igHyIndicator === "HY" ? "text-amber-500" : ""
                      }`}>
                        {c.compositeRating || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={c.realGDPGrowth != null ? (c.realGDPGrowth >= 0 ? "text-emerald-500" : "text-red-500") : ""}>
                        {c.realGDPGrowth != null ? `${c.realGDPGrowth.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      {c.inflation != null ? `${c.inflation.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={c.fiscalBalance != null ? (c.fiscalBalance >= 0 ? "text-emerald-500" : "text-red-500") : ""}>
                        {c.fiscalBalance != null ? `${c.fiscalBalance.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      {c.publicDebtGDP2025 != null ? `${c.publicDebtGDP2025.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={c.currentAccount != null ? (c.currentAccount >= 0 ? "text-emerald-500" : "text-red-500") : ""}>
                        {c.currentAccount != null ? `${c.currentAccount.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      {c.reservesBln != null ? `$${c.reservesBln.toFixed(1)}B` : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center font-medium">{c.bondCount}</td>
                    <td className="py-2.5 px-2">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Simple SVG World Map component
function WorldMapSVG({
  countryColorMap,
  hoveredCountry,
  onHover,
  onClickCountry,
}: {
  countryColorMap: Record<string, { color: string; value: number | null; country: string }>;
  hoveredCountry: string | null;
  onHover: (country: string | null) => void;
  onClickCountry: (country: string) => void;
}) {
  // We use a simplified approach: render colored rectangles in a grid-like world map
  // For a proper choropleth, we'd need GeoJSON data
  // Instead, we'll use a clean card-based approach showing countries as colored tiles
  const entries = Object.entries(countryColorMap);

  return (
    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1">
      {entries
        .sort((a, b) => a[1].country.localeCompare(b[1].country))
        .map(([iso3, data]) => (
          <div
            key={iso3}
            className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold text-white cursor-pointer transition-all ${
              hoveredCountry === data.country ? "ring-2 ring-primary scale-110 z-10" : "hover:scale-105"
            }`}
            style={{ backgroundColor: data.color }}
            onMouseEnter={() => onHover(data.country)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClickCountry(data.country)}
            title={`${data.country}: ${data.value != null ? data.value.toFixed(2) : "N/A"}`}
          >
            {iso3.slice(0, 3)}
          </div>
        ))}
    </div>
  );
}
