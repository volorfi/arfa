import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Home,
  Star,
  BarChart3,
  Calendar,
  Layers,
  Newspaper,
  TrendingUp,
  ArrowUpDown,
  Wrench,
  LogOut,
  PanelLeft,
  ChevronRight,
  Filter,
  ListOrdered,
  Clock,
  CalendarPlus,
  ArrowUp,
  ArrowDown,
  Calculator,
  LineChart,
  Landmark,
  Shield,
  Flag,
  Sun,
  Moon,
  DollarSign,
  Scissors,
  Globe,
  Rocket,
  ChevronUp,
  Zap,
  Activity,
  Target,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Footer from "@/components/Footer";
import MarketTickerBar from "@/components/MarketTickerBar";

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  children?: { label: string; path: string; icon?: any }[];
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    label: "Overview",
    items: [
      { icon: Home, label: "Home", path: "/" },
      { icon: Star, label: "Watchlist", path: "/watchlist" },
      { icon: Newspaper, label: "News & Blogs", path: "/news" },
    ],
  },
  {
    label: "Markets",
    items: [
      {
        icon: BarChart3,
        label: "Stocks",
        path: "/stocks",
        children: [
          { label: "Stock Screener", path: "/screener", icon: Filter },
          { label: "All Stocks", path: "/stocks", icon: ListOrdered },
        ],
      },
      { icon: Layers, label: "ETFs", path: "/etfs" },
      {
        icon: Landmark,
        label: "Fixed Income",
        path: "/fixed-income",
        children: [
          { label: "Sovereign Bonds", path: "/fixed-income/sovereign", icon: Flag },
          { label: "Corporate Bonds", path: "/fixed-income/corporate", icon: Shield },
        ],
      },
    ],
  },
  {
    label: "Research",
    items: [
      {
        icon: Globe,
        label: "Macroeconomics",
        path: "/macro",
        children: [
          { label: "All Countries", path: "/macro", icon: Globe },
          { label: "Africa", path: "/macro/region/Africa", icon: Flag },
          { label: "Americas", path: "/macro/region/Americas", icon: Flag },
          { label: "Asia", path: "/macro/region/Asia", icon: Flag },
          { label: "CIS", path: "/macro/region/CIS", icon: Flag },
          { label: "Europe", path: "/macro/region/Europe", icon: Flag },
          { label: "Latam", path: "/macro/region/Latam", icon: Flag },
          { label: "Middle East", path: "/macro/region/Middle%20East", icon: Flag },
          { label: "Oceania", path: "/macro/region/Oceania", icon: Flag },
        ],
      },
      {
        icon: Calendar,
        label: "Calendars",
        path: "/calendars",
        children: [
          { label: "Earnings", path: "/calendars/earnings", icon: BarChart3 },
          { label: "Dividends", path: "/calendars/dividends", icon: DollarSign },
          { label: "Stock Splits", path: "/calendars/stock-splits", icon: Scissors },
          { label: "Economic Events", path: "/calendars/economic-events", icon: Globe },
          { label: "Public Offerings", path: "/calendars/public-offerings", icon: Rocket },
        ],
      },
      {
        icon: Rocket,
        label: "IPOs",
        path: "/ipos",
        children: [
          { label: "Recent IPOs", path: "/ipos?tab=recent", icon: Clock },
          { label: "Upcoming IPOs", path: "/ipos?tab=upcoming", icon: CalendarPlus },
        ],
      },
    ],
  },
  {
    label: "Options",
    items: [
      {
        icon: Activity,
        label: "Options Chain",
        path: "/options/chain",
      },
      {
        icon: Calculator,
        label: "Strategy Builder",
        path: "/options/strategy",
      },
      {
        icon: Zap,
        label: "Options Flow",
        path: "/options/flow",
      },
      {
        icon: Target,
        label: "Options Tools",
        path: "/options/tools",
      },
    ],
  },
  {
    label: "Discover",
    items: [
      { icon: TrendingUp, label: "Trending", path: "/trending" },
      {
        icon: ArrowUpDown,
        label: "Market Movers",
        path: "/movers",
        children: [
          { label: "Top Gainers", path: "/movers?tab=gainers", icon: ArrowUp },
          { label: "Top Losers", path: "/movers?tab=losers", icon: ArrowDown },
        ],
      },
      {
        icon: Wrench,
        label: "Tools",
        path: "/tools",
        children: [
          { label: "Stock Screener", path: "/screener", icon: Filter },
          { label: "Technical Chart", path: "/chart", icon: LineChart },
          { label: "Comparison", path: "/compare", icon: Calculator },
        ],
      },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sa-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <AppSidebarContent setSidebarWidth={setSidebarWidth}>
        {children}
      </AppSidebarContent>
    </SidebarProvider>
  );
}

function ThemeToggleButton({ asDiv }: { asDiv?: boolean } = {}) {
  const { theme, toggleTheme } = useTheme();
  const classes = "flex items-center justify-center h-8 w-8 rounded-lg hover:bg-sidebar-accent transition-all duration-200 focus:outline-none group/theme cursor-pointer";
  const icon = theme === "dark" ? (
    <Sun className="h-4 w-4 text-amber-400 group-hover/theme:rotate-45 transition-transform duration-300" />
  ) : (
    <Moon className="h-4 w-4 text-sidebar-foreground/60 group-hover/theme:-rotate-12 transition-transform duration-300" />
  );

  if (asDiv) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleTheme?.(); }}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleTheme?.(); } }}
        className={classes}
        aria-label="Toggle theme"
      >
        {icon}
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={classes}
      aria-label="Toggle theme"
    >
      {icon}
    </button>
  );
}

function AppSidebarContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* ── Header ── */}
          <SidebarHeader className="h-14 justify-center">
            <div className="flex items-center gap-2.5 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-all duration-200 focus:outline-none shrink-0 group/toggle"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60 group-hover/toggle:text-sidebar-foreground transition-colors" />
              </button>
              {!isCollapsed && (
                <Link href="/" className="flex items-center gap-2.5 min-w-0 group/logo">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm group-hover/logo:shadow-md group-hover/logo:scale-105 transition-all duration-200">
                    <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[13px] tracking-tight truncate text-sidebar-foreground leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                      ARFA
                    </span>
                    <span className="text-[9px] text-sidebar-foreground/50 tracking-widest uppercase leading-none mt-0.5">
                      Global Markets
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </SidebarHeader>

          <SidebarSeparator className="mx-3 opacity-50" />

          {/* ── Navigation ── */}
          <SidebarContent className="gap-0 px-2 py-1 sidebar-nav">
            {menuSections.map((section, sectionIdx) => (
              <SidebarGroup key={section.label} className="py-1">
                <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] uppercase text-sidebar-foreground/40 h-7 px-3" style={{ fontFamily: 'var(--font-display)' }}>
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {section.items.map((item) => {
                      const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                      if (item.children) {
                        return (
                          <Collapsible key={item.path} defaultOpen={isActive} className="group/collapsible">
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  tooltip={item.label}
                                  className={`h-8 text-[13px] rounded-lg transition-all duration-200 relative ${
                                    isActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                                  }`}
                                >
                                  {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary transition-all duration-300" />
                                  )}
                                  <item.icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? "text-primary" : ""}`} />
                                  <span className="flex-1">{item.label}</span>
                                  <ChevronRight className="h-3 w-3 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                                <SidebarMenuSub className="ml-4 border-l border-sidebar-border/50 pl-0">
                                  {item.children.map((child) => {
                                    const isChildActive = location === child.path;
                                    return (
                                      <SidebarMenuSubItem key={child.path}>
                                        <SidebarMenuSubButton
                                          onClick={() => setLocation(child.path)}
                                          isActive={isChildActive}
                                          className={`text-[12px] h-7 rounded-md transition-all duration-200 ${
                                            isChildActive
                                              ? "text-primary font-medium bg-primary/5"
                                              : "text-sidebar-foreground/55 hover:text-sidebar-foreground/80"
                                          }`}
                                        >
                                          <div className={`h-1 w-1 rounded-full mr-2 shrink-0 transition-colors duration-200 ${
                                            isChildActive ? "bg-primary" : "bg-sidebar-foreground/20"
                                          }`} />
                                          <span>{child.label}</span>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        );
                      }
                   
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className={`h-8 text-[13px] rounded-lg transition-all duration-200 relative ${
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                            }`}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary transition-all duration-300" />
                            )}
                            <item.icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? "text-primary" : ""}`} />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* ── Footer ── */}
          <SidebarFooter className="p-2">
            <SidebarSeparator className="mx-1 mb-2 opacity-50" />
            <div className="rounded-xl bg-sidebar-accent/50 p-2 transition-colors duration-200">
              {user ? (
                <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-sidebar-accent transition-all duration-200 flex-1 min-w-0 text-left group-data-[collapsible=icon]:justify-center focus:outline-none group/user">
                      <Avatar className="h-7 w-7 shrink-0 ring-2 ring-primary/20 group-hover/user:ring-primary/40 transition-all duration-200">
                        <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-[12px] font-medium truncate leading-none text-sidebar-foreground">
                          {user.name || "User"}
                        </p>
                        <p className="text-[10px] text-sidebar-foreground/40 truncate leading-none mt-0.5">
                          {user.email || "Account"}
                        </p>
                      </div>
                      <ChevronUp className="h-3 w-3 text-sidebar-foreground/30 group-data-[collapsible=icon]:hidden" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-48 mb-1">
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive text-xs">
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="group-data-[collapsible=icon]:hidden shrink-0">
                  <ThemeToggleButton />
                </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <SidebarMenuButton
                    onClick={() => { window.location.href = getLoginUrl(); }}
                    className="h-8 text-[13px] flex-1 rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log In</span>
                  </SidebarMenuButton>
                  <ThemeToggleButton />
                </div>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors duration-200 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="sticky top-0 z-40">
          {isMobile && (
            <div className="flex border-b h-12 items-center bg-background/95 px-3 backdrop-blur">
              <SidebarTrigger className="h-8 w-8 rounded-md" />
              <div className="ml-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>ARFA</span>
              </div>
            </div>
          )}
          <MarketTickerBar />
        </div>
        <main className="flex-1">{children}</main>
        <Footer />
      </SidebarInset>
    </>
  );
}
