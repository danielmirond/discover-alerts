import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./content/**/*.mdx"],
  theme: {
    extend: {
      colors: {
        bg: "#07090d",
        s1: "#0e1420",
        s2: "#141e2e",
        border: "rgba(100,180,255,0.1)",
        accent: {
          green: "#00d296",
          blue: "#4da8ff",
          orange: "#ff7a3d",
          purple: "#b06aff",
          yellow: "#ffd166",
          red: "#ff4d6d",
        },
        text: "#b8ccd8",
        muted: "#4a6070",
        white: "#eaf2f8",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        mono: ["DM Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
