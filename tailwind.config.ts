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

        // Borders
        line: "#e8e4de",
        hairline: "#f0ece6",
      },
      fontFamily: {
        wordmark: ["Cinzel", "Fraunces", "Georgia", "serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["DM Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
