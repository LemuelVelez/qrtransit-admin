import type { Config } from "tailwindcss"
import type { PluginAPI } from "tailwindcss/types/config"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          ring: "hsl(var(--sidebar-ring))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-emerald": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spin: "spin 1s linear infinite",
        "pulse-emerald": "pulse-emerald 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    ({ addUtilities }: PluginAPI) => {
      addUtilities({
        ".bg-background": {
          "background-color": "hsl(var(--background))",
        },
        ".bg-foreground": {
          "background-color": "hsl(var(--foreground))",
        },
        ".bg-card": {
          "background-color": "hsl(var(--card))",
        },
        ".bg-popover": {
          "background-color": "hsl(var(--popover))",
        },
        ".bg-primary": {
          "background-color": "hsl(var(--primary))",
        },
        ".bg-secondary": {
          "background-color": "hsl(var(--secondary))",
        },
        ".bg-muted": {
          "background-color": "hsl(var(--muted))",
        },
        ".bg-accent": {
          "background-color": "hsl(var(--accent))",
        },
        ".text-foreground": {
          color: "hsl(var(--foreground))",
        },
        ".text-card-foreground": {
          color: "hsl(var(--card-foreground))",
        },
        ".text-popover-foreground": {
          color: "hsl(var(--popover-foreground))",
        },
        ".text-primary-foreground": {
          color: "hsl(var(--primary-foreground))",
        },
        ".text-secondary-foreground": {
          color: "hsl(var(--secondary-foreground))",
        },
        ".text-muted-foreground": {
          color: "hsl(var(--muted-foreground))",
        },
        ".text-accent-foreground": {
          color: "hsl(var(--accent-foreground))",
        },
        ".border-border": {
          "border-color": "hsl(var(--border))",
        },
        ".outline-ring\\/50": {
          "outline-color": "hsl(var(--ring) / 0.1)",
        },
      })
    },
  ],
}

export default config

