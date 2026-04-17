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
  ChevronDown,
  Search,
  Filter,
  ListOrdered,
  Clock,
  CalendarPlus,
  Activity,
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
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Footer from "@/components/Footer";

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  children?: { label: string; path: string; icon?: any }[];
}

const menuItems: MenuItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Star, label: "Watchlist", path: "/watchlist" },
  { icon: Newspaper, label: "News", path: "/news" },
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
    icon: BarChart3,
    label: "Stocks",
    path: "/stocks",
    children: [
      { label: "Stock Screener", path: "/screener", icon: Filter },
      { label: "All Stocks", path: "/stocks", icon: ListOrdered },
    ],
  },
  {
    icon: Layers,
    label: "ETFs",
    path: "/etfs",
  },
  {
    icon: Landmark,
    label: "Fixed Income",
    path: "/fixed-income",
    children: [
      { label: "Sovereign", path: "/fixed-income/sovereign", icon: Flag },
      { label: "Corporate", path: "/fixed-income/corporate", icon: Shield },
    ],
  },
  {
    icon: Calendar,
    label: "IPOs",
    path: "/ipos",
    children: [
      { label: "Recent IPOs", path: "/ipos?tab=recent", icon: Clock },
      { label: "Upcoming IPOs", path: "/ipos?tab=upcoming", icon: CalendarPlus },
    ],
  },
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

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-left text-[13px] text-sidebar-foreground group-data-[collapsible=icon]:justify-center focus:outline-none"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 shrink-0" />
      ) : (
        <Moon className="h-4 w-4 shrink-0" />
      )}
      <span className="group-data-[collapsible=icon]:hidden">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
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
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-2.5 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-md transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed && (
                <Link href="/" className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold text-[9px]">AG</span>
                  </div>
                  <span className="font-semibold text-sm tracking-tight truncate text-sidebar-foreground">
                    ARFA Global Markets
                  </span>
                </Link>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                    if (item.children) {
                      return (
                        <Collapsible key={item.path} defaultOpen={isActive} className="group/collapsible">
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.label}
                                className="h-9 text-[13px]"
                              >
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1">{item.label}</span>
                                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children.map((child) => (
                                  <SidebarMenuSubItem key={child.path}>
                                    <SidebarMenuSubButton
                                      onClick={() => setLocation(child.path)}
                                      isActive={location === child.path}
                                      className="text-[13px]"
                                    >
                                      {child.icon && <child.icon className="h-3.5 w-3.5 mr-1.5" />}
                                      <span>{child.label}</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
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
                          className="h-9 text-[13px]"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <ThemeToggleButton />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="text-xs font-medium truncate leading-none text-sidebar-foreground">
                        {user.name || "User"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive text-xs">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="h-9 text-[13px]"
              >
                <LogOut className="h-4 w-4" />
                <span>Log In</span>
              </SidebarMenuButton>
            )}
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-12 items-center bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger className="h-8 w-8 rounded-md" />
            <div className="ml-2 flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-[9px]">AG</span>
              </div>
              <span className="font-semibold text-sm">ARFA Global Markets</span>
            </div>
          </div>
        )}
        <main className="flex-1">{children}</main>
        <Footer />
      </SidebarInset>
    </>
  );
}
