export const themeConfig = {
  colors: {
    bg: {
      primary: "#1A1614", // Charred wood charcoal
      deep: "#0D0B0A", // Deep obsidian
      surface: "#241E1C", // Elevated surface
      surfaceHover: "#2E2623",
      card: "#1F1A17",
      overlay: "rgba(13, 11, 10, 0.85)",
    },
    borders: {
      default: "#3D332F",
      muted: "#2A2320",
      accent: "#E05A1B",
      copper: "#D48B46",
    },
    accents: {
      ember: "#E05A1B", // Primary flame accent
      flame: "#B83D07", // Deep ember
      copper: "#D48B46", // Brewery copper
      malt: "#EBC17E", // Golden brew malt
      hops: "#2E6B38", // Hops green
      hopsLight: "#3B8848",
    },
    text: {
      primary: "#F6F3EE", // Crisp parchment
      secondary: "#A39892", // Warm silver
      muted: "#80746E", // Hearth ash
      accent: "#EBC17E", // Golden malt highlight
    },
  },
  typography: {
    fontSerif: "var(--font-serif)",
    fontSans: "var(--font-sans)",
  },
  radius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
  shadows: {
    emberGlow: "0 0 25px -5px rgba(224, 90, 27, 0.25)",
    emberGlowLg: "0 0 40px -5px rgba(224, 90, 27, 0.4)",
    copperGlow: "0 0 25px -5px rgba(212, 139, 70, 0.25)",
    maltGlow: "0 0 25px -5px rgba(235, 193, 126, 0.2)",
    card: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
} as const;
