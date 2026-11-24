import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        asador: {
          // Deep Surface Hierarchy (Charred Oak & Smoked Walnut)
          bg: "#0F0D0B", // Warm obsidian-espresso canvas
          dark: "#0F0D0B", // Canvas alias
          deep: "#0B0908", // Deep roasted cocoa well (inputs, wells, deep backgrounds)
          surface: "#171411", // Smoked walnut elevated cards & sidebars
          surfaceHover: "#211C18",
          card: "#171411", // Smoked walnut cards
          border: "#2E2721", // Warm top-edge / card border
          borderMuted: "#221C17",
          borderHighlight: "rgba(212, 163, 89, 0.14)", // Brass hairline highlight

          // Luxury Brand Accents (Burnished Copper & Champagne Gold)
          ember: "#C86D3B", // Burnished Copper primary accent
          flame: "#D98A4E", // Ember Gold hover / secondary accent
          copper: "#D4A359", // Brushed Champagne Gold / Brass
          malt: "#D4A359", // Warm golden malt / Champagne Gold
          brass: "#D4A359", // Fine brass accent

          // Typography Hierarchy (Classic Fine-Dining)
          parchment: "#F4EFE6", // Warm ivory parchment (headings & high-contrast text)
          silver: "#A89F91", // Warm sandstone secondary metadata
          ash: "#736A5E", // Muted bronze micro-labels & subtle hints
          charcoal: "#141110",

          // Psychological Status Semantics (Muted Jewel Tones for low eye fatigue)
          // Available / Ready: Deep Sage Emerald
          emerald: "#1E3A2F",
          emeraldText: "#6EE7B7",
          emeraldBorder: "#2D5A47",
          hops: "#1E3A2F",
          hopsLight: "#6EE7B7",

          // Occupied / Preparing: Warm Amber Ochre
          ochre: "#3D2B14",
          ochreText: "#FBBF24",
          ochreBorder: "#66471E",

          // Billing / Urgent / Cancelled: Terracotta Crimson
          crimson: "#3F1D1D",
          crimsonText: "#FCA5A5",
          crimsonBorder: "#6E2C2C",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Cinzel", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "ember-glow": "0 0 25px -5px rgba(200, 109, 59, 0.3)",
        "ember-glow-lg": "0 0 40px -5px rgba(200, 109, 59, 0.45)",
        "copper-glow": "0 0 25px -5px rgba(212, 163, 89, 0.3)",
        "malt-glow": "0 0 25px -5px rgba(212, 163, 89, 0.25)",
        "luxury-glow": "0 12px 30px -10px rgba(0, 0, 0, 0.6)",
        "card-elevation": "0 10px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(244, 239, 230, 0.06)",
        "card-highlight": "inset 0 1px 0 0 rgba(244, 239, 230, 0.06)",
        "well-inner": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)",
      },
      transitionTimingFunction: {
        "luxury-decel": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "pulse-calm": "pulse-calm 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-slide-up": "fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
      keyframes: {
        "pulse-calm": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.96)" },
        },
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      borderRadius: {
        asador: "0.5rem",
        "asador-lg": "0.75rem",
        "asador-xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
