import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "3rem",
        xl: "4rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
    extend: {
      /* Font Families */
      fontFamily: {
        heading: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },

      /* Color System - OTT Professional */
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          soft: "hsl(var(--border-soft))",
          strong: "hsl(var(--border-strong))",
          hover: "hsl(var(--border-hover))",
          focus: "hsl(var(--border-focus))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          secondary: "hsl(var(--background-secondary))",
          tertiary: "hsl(var(--background-tertiary))",
          elevated: "hsl(var(--background-elevated))",
          input: "hsl(var(--background-input))",
          hover: "hsl(var(--background-hover))",
          player: "hsl(var(--background-player))",
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          secondary: "hsl(var(--foreground-secondary))",
          muted: "hsl(var(--foreground-muted))",
          subtle: "hsl(var(--foreground-subtle))",
          disabled: "hsl(var(--foreground-disabled))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
          glow: "hsl(var(--primary-glow))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          light: "hsl(var(--accent-light))",
          dark: "hsl(var(--accent-dark))",
          glow: "hsl(var(--accent-glow))",
          foreground: "hsl(var(--accent-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          light: "hsl(var(--destructive-light))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          light: "hsl(var(--success-light))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light: "hsl(var(--warning-light))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          hover: "hsl(var(--muted-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          hover: "hsl(var(--card-hover))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        glass: {
          bg: {
            light: "var(--glass-bg-light)",
            DEFAULT: "var(--glass-bg)",
            medium: "var(--glass-bg-medium)",
            strong: "var(--glass-bg-strong)",
          },
          border: {
            light: "var(--glass-border-light)",
            DEFAULT: "var(--glass-border)",
            strong: "var(--glass-border-strong)",
          },
        },
      },

      /* Spacing */
      spacing: {
        0.5: "0.125rem",
        1: "0.25rem",
        1.5: "0.375rem",
        2: "0.5rem",
        2.5: "0.625rem",
        3: "0.75rem",
        3.5: "0.875rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
        12: "3rem",
        14: "3.5rem",
        16: "4rem",
        20: "5rem",
        24: "6rem",
        32: "8rem",
        40: "10rem",
        48: "12rem",
        56: "14rem",
        64: "16rem",
      },

      /* Max Width */
      maxWidth: {
        screen: "1920px",
        wide: "1600px",
        default: "1440px",
        content: "1280px",
        narrow: "1024px",
        text: "768px",
        compact: "640px",
      },

      /* Border Radius */
      borderRadius: {
        none: "0",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },

      /* Box Shadow */
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        "3xl": "var(--shadow-3xl)",
        inner: "var(--shadow-inner)",
        "glow-violet": "var(--shadow-glow-violet)",
        "glow-cyan": "var(--shadow-glow-cyan)",
        // New Glow for Premium Buttons
        "premium-glow": "0 0 20px 2px hsl(var(--primary) / 0.3)",
      },

      /* Keyframes */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // NEW: Sliding Gradient Animation
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },

      /* Animation Presets */
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        // NEW: Flowing Gradient
        "gradient-x": "gradient-x 5s ease infinite",
        float: "float 4s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 2s infinite",
      },

      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-mesh": "var(--gradient-mesh-overlay)",
        "gradient-glow-violet": "var(--gradient-glow-violet)",
        "gradient-glow-cyan": "var(--gradient-glow-cyan)",
        // NEW: Animated Gradient Text Utility
        "gradient-text-animated": "linear-gradient(to right, hsl(var(--primary)), #a855f7, #3b82f6, hsl(var(--primary)))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }: any) {
      const newUtilities = {
        // Text Balance
        ".text-balance": {
          "text-wrap": "balance",
        },
        // NEW: Glass Card Small
        ".glass-card-sm": {
          "background": "rgba(255, 255, 255, 0.03)",
          "backdrop-filter": "blur(8px)",
          "border": "1px solid rgba(255, 255, 255, 0.08)",
        },
        // NEW: Animated Gradient Text
        ".text-gradient-animated": {
          "background-image": "linear-gradient(to right, #6366f1, #a855f7, #ec4899, #6366f1)",
          "background-size": "200% auto",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "animation": "gradient-x 5s linear infinite",
        },
        // Utility for Button Lifts
        ".hover-lift": {
          "transition": "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          "&:hover": {
            "transform": "translateY(-4px) scale(1.02)",
          },
        },
      };
      addUtilities(newUtilities, ["responsive", "hover"]);
    },
  ],
} satisfies Config;