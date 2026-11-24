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
          // Backgrounds & Surface Hierarchy (Warm Alabaster, Crisp Warm Ivory & Soft Linen Sand)
          bg: "#FAF7F2", // Warm Alabaster primary page canvas
          dark: "#FAF7F2", // Canvas alias
          alabaster: "#FAF7F2",
          deep: "#F3EDE2", // Soft Linen Sand (recessed wells, inputs, filter strips)
          sand: "#F3EDE2",
          sandBorder: "#DDD3C0", // Subtle border for recessed wells
          surface: "#FFFDF9", // Crisp Warm Ivory (elevated cards, sidebar, modals)
          surfaceHover: "#F5EFE4", // Soft warm hover
          card: "#FFFDF9", // Crisp Warm Ivory
          border: "#E5DEC9", // Refined champagne-linen hairline border
          borderMuted: "#EFE9DC",
          borderHighlight: "rgba(176, 137, 67, 0.2)", // Brass hairline highlight

          // Brand Primary & Burgundy Palette
          ember: "#5C1D24", // Deep Heritage Burgundy (Primary CTA & Active focus)
          flame: "#70242D", // Heritage Burgundy hover
          burgundy: "#5C1D24",
          burgundyHover: "#70242D",
          ivory: "#FAF7F2", // Crisp Ivory text on burgundy buttons/accents

          // Luxury Accents & Antique Brass
          copper: "#B08943", // Antique Brass
          malt: "#B08943", // Antique Brass
          brass: "#B08943", // Antique Brass
          brassDark: "#9A7432", // Brass badge text
          brassBg: "#F5EFE4", // Brass badge fill
          brassBorder: "#DFD1B5", // Brass badge border

          // Typography Hierarchy (Classic Editorial Fine-Dining)
          parchment: "#1E1916", // Deep Espresso Charcoal (primary headings, titles & text)
          charcoal: "#1E1916", // Deep Espresso Charcoal
          espresso: "#1E1916",
          silver: "#5E554C", // Warm Slate Taupe (body & metadata descriptions)
          taupe: "#5E554C",
          ash: "#8C8175", // Muted Stone (micro-labels, badges & timestamps)
          stone: "#8C8175",

          // High-Legibility Status Semantics (Soft Botanical Jewel Tones)
          // Available / Ready / Completed: Soft Botanical Sage
          emerald: "#E7F2EC",
          emeraldText: "#235C3B",
          emeraldBorder: "#C2DEC9",
          sage: "#E7F2EC",
          sageText: "#235C3B",
          sageBorder: "#C2DEC9",
          hops: "#E7F2EC",
          hopsLight: "#235C3B",

          // Occupied / Preparing / Pending: Warm Honey Amber
          ochre: "#FBF1E1",
          ochreText: "#8F510D",
          ochreBorder: "#EED4AC",
          amber: "#FBF1E1",
          amberText: "#8F510D",
          amberBorder: "#EED4AC",

          // Billing / Urgent / Cancelled: Muted Rose Burgundy
          crimson: "#F9E8E7",
          crimsonText: "#7D1E26",
          crimsonBorder: "#E5B7B4",
          rose: "#F9E8E7",
          roseText: "#7D1E26",
          roseBorder: "#E5B7B4",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Cinzel", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "ember-glow": "0 4px 14px -2px rgba(92, 29, 36, 0.25)",
        "ember-glow-lg": "0 8px 24px -4px rgba(92, 29, 36, 0.35)",
        "copper-glow": "0 4px 14px -2px rgba(176, 137, 67, 0.25)",
        "malt-glow": "0 4px 14px -2px rgba(176, 137, 67, 0.2)",
        "luxury-glow": "0 12px 28px -12px rgba(92, 29, 36, 0.12)",
        "card-elevation": "0 6px 20px -10px rgba(30, 25, 22, 0.08), inset 0 1px 0 0 rgba(255, 253, 249, 0.8)",
        "card-highlight": "inset 0 1px 0 0 rgba(255, 253, 249, 0.8)",
        "well-inner": "inset 0 1px 3px 0 rgba(30, 25, 22, 0.06)",
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
          "50%": { opacity: "0.5", transform: "scale(0.96)" },
        },
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
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
