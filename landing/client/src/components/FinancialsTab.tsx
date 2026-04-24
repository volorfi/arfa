import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatementType = "Income Statement" | "Balance Sheet" | "Cash Flow";
type PeriodType = "annual" | "quarterly";

function formatValue(val: number | null | undefined, isCurrency = true, isPercent = false): string {
  if (val === null || val === undefined) return "—";
  if (isPercent) return `${val.toFixed(1)}%`;
  if (!isCurrency) {
    if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toFixed(2);
  }
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function GrowthIndicator({ current, previous }: { current: number | null; previous: number | null }) {
  if (!current || !previous || previous === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.1) return <span className="text-muted-foreground text-xs flex items-center gap-0.5"><Minus className="h-3 w-3" />0.0%</span>;
  const isPos = pct > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPos ? "text-gain" : "text-loss"}`}>
      {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export default function FinancialsTab({ symbol }: { symbol: string }) {
  const [statementType, setStatementType] = useState<StatementType>("Income Statement");
  const [periodType, setPeriodType] = useState<PeriodType>("annual");

  const { data: financials, isLoading } = trpc.stock.financials.useQuery(
    { symbol },
    { enabled: !!symbol }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {["Income Statement", "Balance Sheet", "Cash Flow"].map((_, i) => (
            <div key={i} className="h-9 w-36 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex justify-between py-3 border-b border-border/30">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="flex gap-8">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-4 w-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!financials) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Financial data is not available for {symbol}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {(["Income Statement", "Balance Sheet", "Cash Flow"] as StatementType[]).map((type) => (
            <button
              key={type}
              onClick={() => setStatementType(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statementType === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {(["annual", "quarterly"] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodType(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                periodType === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {statementType === "Income Statement" && (
        <IncomeStatementView data={financials.incomeStatement[periodType]} periodType={periodType} />
      )}
      {statementType === "Balance Sheet" && (
        <BalanceSheetView data={financials.balanceSheet[periodType]} periodType={periodType} />
      )}
      {statementType === "Cash Flow" && (
        <CashFlowView data={financials.cashFlow[periodType]} periodType={periodType} />
      )}
    </div>
  );
}

// ─── Revenue / Net Income Chart ───

function RevenueChart({ data }: { data: any[] }) {
  const chartData = useMemo(() => {
    return [...data].reverse().map((row: any) => ({
      period: row.period,
      revenue: row.totalRevenue || row.operatingCashFlow || 0,
      profit: row.netIncome || row.freeCashFlow || row.totalEquity || 0,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-foreground mb-3">Revenue vs Net Income</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatValue(v)} width={70} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--foreground)" }}
              formatter={(value: number, name: string) => [formatValue(value), name === "revenue" ? "Revenue" : "Net Income"]}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]} name="Net Income">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Shared table component ───

interface TableRow {
  label: string;
  key: string;
  isCurrency?: boolean;
  isPercent?: boolean;
  isHeader?: boolean;
  indent?: boolean;
}

function FinancialTable({ rows, data, periodType }: { rows: TableRow[]; data: any[]; periodType: PeriodType }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-secondary/30 min-w-[200px]">
                Breakdown
              </th>
              {data.map((row: any) => (
                <th key={row.period} className="text-right px-4 py-3 font-medium text-muted-foreground min-w-[120px]">
                  {row.period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowDef) => (
              <tr
                key={rowDef.key}
                className={`border-b border-border/30 hover:bg-accent/20 transition-colors ${
                  rowDef.isHeader ? "bg-secondary/20" : ""
                }`}
              >
                <td className={`px-4 py-2.5 sticky left-0 bg-card ${
                  rowDef.isHeader ? "font-semibold text-foreground bg-secondary/20" : ""
                } ${rowDef.indent ? "pl-8 text-muted-foreground" : "text-foreground"}`}>
                  {rowDef.label}
                </td>
                {data.map((row: any, idx: number) => {
                  const val = row[rowDef.key];
                  const prevRow = data[idx + 1]; // next item is previous period
                  const prevVal = prevRow ? prevRow[rowDef.key] : null;
                  return (
                    <td key={row.period} className="text-right px-4 py-2.5">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-medium ${
                          rowDef.isHeader ? "text-foreground font-semibold" : 
                          val !== null && val !== undefined && val < 0 ? "text-loss" : "text-foreground"
                        }`}>
                          {formatValue(val, rowDef.isCurrency !== false, rowDef.isPercent)}
                        </span>
                        {!rowDef.isPercent && !rowDef.isHeader && val !== null && prevVal !== null && (
                          <GrowthIndicator current={val} previous={prevVal} />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Income Statement View ───

function IncomeStatementView({ data, periodType }: { data: any[]; periodType: PeriodType }) {
  const rows: TableRow[] = [
    { label: "Total Revenue", key: "totalRevenue", isHeader: true },
    { label: "Cost of Revenue", key: "costOfRevenue", indent: true },
    { label: "Gross Profit", key: "grossProfit", isHeader: true },
    { label: "Operating Expenses", key: "operatingExpenses", indent: true },
    { label: "Operating Income", key: "operatingIncome", isHeader: true },
    { label: "Interest Expense", key: "interestExpense", indent: true },
    { label: "Income Before Tax", key: "incomeBeforeTax" },
    { label: "Income Tax Expense", key: "incomeTaxExpense", indent: true },
    { label: "Net Income", key: "netIncome", isHeader: true },
    { label: "EBITDA", key: "ebitda" },
    { label: "EPS (Basic)", key: "eps", isCurrency: false },
    { label: "EPS (Diluted)", key: "epsD", isCurrency: false },
    { label: "Shares Outstanding", key: "sharesOutstanding", isCurrency: false },
    { label: "Gross Margin", key: "grossMargin", isPercent: true, isCurrency: false },
    { label: "Operating Margin", key: "operatingMargin", isPercent: true, isCurrency: false },
    { label: "Net Margin", key: "netMargin", isPercent: true, isCurrency: false },
  ];

  return (
    <div>
      <RevenueChart data={data} />
      <FinancialTable rows={rows} data={data} periodType={periodType} />
    </div>
  );
}

// ─── Balance Sheet View ───

function BalanceSheetView({ data, periodType }: { data: any[]; periodType: PeriodType }) {
  const rows: TableRow[] = [
    { label: "Total Assets", key: "totalAssets", isHeader: true },
    { label: "Total Current Assets", key: "totalCurrentAssets" },
    { label: "Cash & Equivalents", key: "cashAndEquivalents", indent: true },
    { label: "Short-Term Investments", key: "shortTermInvestments", indent: true },
    { label: "Accounts Receivable", key: "accountsReceivable", indent: true },
    { label: "Inventory", key: "inventory", indent: true },
    { label: "Total Non-Current Assets", key: "totalNonCurrentAssets" },
    { label: "Property, Plant & Equipment", key: "propertyPlantEquipment", indent: true },
    { label: "Goodwill", key: "goodwill", indent: true },
    { label: "Intangible Assets", key: "intangibleAssets", indent: true },
    { label: "Total Liabilities", key: "totalLiabilities", isHeader: true },
    { label: "Total Current Liabilities", key: "totalCurrentLiabilities" },
    { label: "Accounts Payable", key: "accountsPayable", indent: true },
    { label: "Short-Term Debt", key: "shortTermDebt", indent: true },
    { label: "Total Non-Current Liabilities", key: "totalNonCurrentLiabilities" },
    { label: "Long-Term Debt", key: "longTermDebt", indent: true },
    { label: "Total Equity", key: "totalEquity", isHeader: true },
    { label: "Retained Earnings", key: "retainedEarnings", indent: true },
    { label: "Total Debt", key: "totalDebt" },
    { label: "Book Value / Share", key: "bookValuePerShare", isCurrency: false },
  ];

  return <FinancialTable rows={rows} data={data} periodType={periodType} />;
}

// ─── Cash Flow View ───

function CashFlowView({ data, periodType }: { data: any[]; periodType: PeriodType }) {
  const rows: TableRow[] = [
    { label: "Operating Cash Flow", key: "operatingCashFlow", isHeader: true },
    { label: "Depreciation & Amortization", key: "depreciationAmortization", indent: true },
    { label: "Change in Working Capital", key: "changeInWorkingCapital", indent: true },
    { label: "Capital Expenditures", key: "capitalExpenditures" },
    { label: "Investing Cash Flow", key: "investingCashFlow", isHeader: true },
    { label: "Acquisitions", key: "acquisitions", indent: true },
    { label: "Financing Cash Flow", key: "financingCashFlow", isHeader: true },
    { label: "Debt Repayment", key: "debtRepayment", indent: true },
    { label: "Share Repurchases", key: "shareRepurchases", indent: true },
    { label: "Dividends Paid", key: "dividendsPaid", indent: true },
    { label: "Free Cash Flow", key: "freeCashFlow", isHeader: true },
    { label: "Net Change in Cash", key: "netChangeInCash" },
  ];

  // Cash flow chart
  const chartData = useMemo(() => {
    return [...data].reverse().map((row: any) => ({
      period: row.period,
      revenue: row.operatingCashFlow || 0,
      profit: row.freeCashFlow || 0,
    }));
  }, [data]);

  return (
    <div>
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Operating Cash Flow vs Free Cash Flow</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatValue(v)} width={70} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--foreground)" }}
                  formatter={(value: number, name: string) => [formatValue(value), name === "revenue" ? "Operating CF" : "Free CF"]}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Operating CF" />
                <Bar dataKey="profit" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Free CF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <FinancialTable rows={rows} data={data} periodType={periodType} />
    </div>
  );
}
