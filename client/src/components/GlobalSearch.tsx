import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  large?: boolean;
}

export default function GlobalSearch({ className = "", placeholder = "Company or stock symbol...", large = false }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results } = trpc.stock.search.useQuery(
    { query },
    { enabled: query.length >= 1 }
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (symbol: string) => {
    setQuery("");
    setIsOpen(false);
    setLocation(`/stocks/${symbol}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSelect(query.trim().toUpperCase());
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center ${large ? "h-12" : "h-9"}`}>
          <Search className={`absolute left-3 text-muted-foreground ${large ? "h-5 w-5" : "h-4 w-4"}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all ${large ? "pl-11 pr-10 h-12 text-base" : "pl-9 pr-8 h-9 text-sm"}`}
          />
          {!large && (
            <kbd className="absolute right-2.5 pointer-events-none text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
              /
            </kbd>
          )}
        </div>
      </form>

      {isOpen && results && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(item.symbol)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
            >
              <span className="font-semibold text-sm text-primary min-w-[60px]">{item.symbol}</span>
              <span className="text-sm text-foreground truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">{item.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
