import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./content/**/*.mdx"],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        bg: "#ffffff",
        ivory: "#ffffff",
        pearl: "#ffffff",
        sand: "#f7f7f5",
        cream: "#f7f7f5",

        // Text
        charcoal: "#1a1a1a",
        slate: "#3a3a3a",
        stone: "#6b6560",
        mist: "#a8a39d",

        // Accents
        emerald: {
          DEFAULT: "#0a4d3c",
          light: "#d4e8de",
          tint: "#ebf3ee",
        },
        bronze: {
          DEFAULT: "#a8865d",
          deep: "#8a6a44",
          light: "#e8dcc8",
          tint: "#f5ede0",
        },
        bengara: {
          DEFAULT: "#a0392a",
          light: "#e8c5c0",
          tint: "#f5e8e6",
        },
        azuki: {
          DEFAULT: "#7c3030",
        },
        matcha: {
          DEFAULT: "#5c7148",
          light: "#d4dece",
          tint: "#edf1ea",
        },
        washi: "#fafaf7",
        ash: "#606060",

        // Borders
        line: "#e8e4de",
        hairline: "#f0ece6",
      },
      fontFamily: {
        wordmark: ["Cinzel", "Fraunces", "Georgia", "serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["DM Mono", "Menlo", "monospace"],
        "hara-display": ["'Instrument Serif'", "Georgia", "serif"],
        "hara-body": ["'IBM Plex Sans'", "Inter", "system-ui", "sans-serif"],
        "hara-mono": ["'IBM Plex Mono'", "'DM Mono'", "'Courier New'", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
