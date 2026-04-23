import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ── Color palette ─────────────────────────────────────────────────────
      // All values read from CSS custom properties defined in globals.css so
      // light/dark mode can swap by toggling the `.dark` class on <html>.
      colors: {
        // shadcn primitives
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // ARFA surface layers — 5 stacking levels from bg outward.
        // Use for nested cards, modals, popovers, tooltips.
        surface: {
          0: "hsl(var(--surface-0))",  // page bg
          1: "hsl(var(--surface-1))",  // card / first elevation
          2: "hsl(var(--surface-2))",  // nested card / dialog
          3: "hsl(var(--surface-3))",  // popover / tooltip
          offset: "hsl(var(--surface-offset))", // inverted "attention" bg
        },

        // ARFA text tokens — deliberately named instead of foreground-variants
        // so content components read naturally (`text-text-muted`).
        text: {
          primary: "hsl(var(--text-primary))",
          muted: "hsl(var(--text-muted))",
          faint: "hsl(var(--text-faint))",
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      // Fluid type scale via clamp() — CSS vars are defined in globals.css.
      fontSize: {
        xs:   ["var(--text-xs)",   { lineHeight: "1.45" }],
        sm:   ["var(--text-sm)",   { lineHeight: "1.5"  }],
        base: ["var(--text-base)", { lineHeight: "1.55" }],
        lg:   ["var(--text-lg)",   { lineHeight: "1.5"  }],
        xl:   ["var(--text-xl)",   { lineHeight: "1.4"  }],
        "2xl": ["var(--text-2xl)", { lineHeight: "1.3"  }],
        "3xl": ["var(--text-3xl)", { lineHeight: "1.2"  }],
        "4xl": ["var(--text-4xl)", { lineHeight: "1.15" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "1.05" }],
        "6xl": ["var(--text-6xl)", { lineHeight: "1"    }],
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // ── Spacing (4px base, Tailwind's default) with semantic aliases ──────
      spacing: {
        gutter: "1rem",        // 16px
        section: "4rem",       // 64px
        "section-lg": "6rem",  // 96px
      },

      // ── Radius / shadows / borders ────────────────────────────────────────
      borderRadius: {
        xs: "calc(var(--radius) - 6px)",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        inset: "var(--shadow-inset)",
      },

      // ── Animations ────────────────────────────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.18s ease-out",
        "fade-in-up": "fade-in-up 0.22s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
