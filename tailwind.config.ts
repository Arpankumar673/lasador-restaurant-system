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
          bg: "#1A1614",
          deep: "#0D0B0A",
          surface: "#241E1C",
          surfaceHover: "#2E2623",
          card: "#1F1A17",
          border: "#3D332F",
          borderMuted: "#2A2320",
          ember: "#E05A1B", // Primary accent
          flame: "#B83D07", // Deep accent
          copper: "#D48B46", // Warm copper
          malt: "#EBC17E", // Golden malt
          parchment: "#F6F3EE", // Crisp light text/accents
          hops: "#2E6B38", // Hops green accent
          hopsLight: "#3B8848",
          charcoal: "#141110",
          ash: "#80746E",
          silver: "#A39892",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Cinzel", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "ember-glow": "0 0 25px -5px rgba(224, 90, 27, 0.25)",
        "ember-glow-lg": "0 0 40px -5px rgba(224, 90, 27, 0.4)",
        "copper-glow": "0 0 25px -5px rgba(212, 139, 70, 0.25)",
        "malt-glow": "0 0 25px -5px rgba(235, 193, 126, 0.2)",
        "card-elevation": "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
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
