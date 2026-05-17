import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        border: "rgba(168, 85, 247, 0.22)", // Neon border
        input: "rgba(18, 4, 36, 0.6)", // Dark glass inputs
        ring: "rgba(139, 92, 246, 0.45)", // Glow Shadow
        background: "#05010d", // Primary Background
        foreground: "#f5f3ff", // White heading color
        surface: "rgba(18, 4, 36, 0.72)", // Semi-transparent dark purple
        elevated: "#120424", // Secondary Background
        deep: "#090014",
        primary: {
          DEFAULT: "#8b5cff", // Primary Accent Purple
          glow: "#c084fc", // Soft Glow Purple
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#a855f7", // Secondary Accent Purple
          foreground: "#d8b4fe", // Highlight Lavender
        },
        muted: {
          DEFAULT: "#1b0635", // Secondary Layer 3
          foreground: "#8e7ab5", // Muted text
        },
        accent: {
          purple: "#8b5cff",
          purpleLight: "#c084fc",
          magenta: "#a855f7",
          cyan: "#d8b4fe",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#34d399",
          bg: "rgba(16, 185, 129, 0.1)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#fbbf24",
          bg: "rgba(245, 158, 11, 0.1)",
        },
        danger: {
          DEFAULT: "#ef4444",
          foreground: "#f87171",
          bg: "rgba(239, 68, 68, 0.1)",
        },
        chart: {
          1: "#8b5cff",
          2: "#c084fc",
          3: "#a855f7",
          4: "rgba(168,85,247,0.5)",
          5: "rgba(168,85,247,0.25)",
        }
      },
      backgroundImage: {
        'gradient-purple-glow': 'linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(5, 1, 13, 0) 100%)',
        'gradient-matte': 'linear-gradient(180deg, #120424 0%, #05010d 100%)',
        'gradient-magenta-purple': 'linear-gradient(135deg, #a855f7, #8b5cff)',
        'gradient-primary': 'linear-gradient(135deg, #8b5cff, #a855f7)',
        'gradient-dark-metallic': 'linear-gradient(135deg, #16052b, #090014)',
        'glow-primary': 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(5, 1, 13, 0) 70%)',
        'hero-glow': 'radial-gradient(circle at center, rgba(168, 85, 247, 0.35) 0%, rgba(91, 33, 182, 0.18) 30%, rgba(5, 1, 13, 1) 70%)',
      },
      boxShadow: {
        'luxury-glow': '0 0 20px 0 rgba(139, 92, 246, 0.25), inset 0 1px 0 0 rgba(168, 85, 247, 0.22)',
        'purple-bloom': '0 0 30px 0 rgba(139, 92, 246, 0.45), 0 0 10px 0 rgba(139, 92, 246, 0.25)',
        'cinematic': '0 20px 40px -20px rgba(0,0,0,1), inset 0 1px 0 0 rgba(168, 85, 247, 0.22)',
        'glass-panel': 'inset 0 1px 0 0 rgba(168,85,247,0.22), inset 0 0 0 1px rgba(168,85,247,0.1), 0 10px 30px -10px rgba(0,0,0,0.8)',
        'neon-border': '0 0 10px rgba(168, 85, 247, 0.25), inset 0 0 10px rgba(168, 85, 247, 0.25)',
      },
      borderRadius: {
        xl: "24px",
        lg: "20px",
        md: "16px",
        sm: "12px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionTimingFunction: {
        'cinematic': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
