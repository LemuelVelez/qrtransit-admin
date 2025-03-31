import type { Config } from "tailwindcss";
import plugin from 'tailwindcss/plugin';
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'spin': {
          to: { transform: 'rotate(360deg)' }
        },
        'pulse-emerald': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'spin': 'spin 1s linear infinite',
        'pulse-emerald': 'pulse-emerald 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: [
    tailwindcssAnimate,
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".border-border": {
          "border-color": "hsl(var(--border))"
        },
        ".bg-background": {
          "background-color": "hsl(var(--background))"
        },
        ".bg-foreground": {
          "background-color": "hsl(var(--foreground))"
        },
        ".bg-card": {
          "background-color": "hsl(var(--card))"
        },
        ".bg-popover": {
          "background-color": "hsl(var(--popover))"
        },
        ".bg-primary": {
          "background-color": "hsl(var(--primary))"
        },
        ".bg-secondary": {
          "background-color": "hsl(var(--secondary))"
        },
        ".bg-muted": {
          "background-color": "hsl(var(--muted))"
        },
        ".bg-accent": {
          "background-color": "hsl(var(--accent))"
        },
        ".text-foreground": {
          "color": "hsl(var(--foreground))"
        },
        ".text-card-foreground": {
          "color": "hsl(var(--card-foreground))"
        },
        ".text-popover-foreground": {
          "color": "hsl(var(--popover-foreground))"
        },
        ".text-primary-foreground": {
          "color": "hsl(var(--primary-foreground))"
        },
        ".text-secondary-foreground": {
          "color": "hsl(var(--secondary-foreground))"
        },
        ".text-muted-foreground": {
          "color": "hsl(var(--muted-foreground))"
        },
        ".text-accent-foreground": {
          "color": "hsl(var(--accent-foreground))"
        },
        ".text-primary": {
          "color": "hsl(var(--primary))"
        }
      });
    })
  ]
};

export default config;