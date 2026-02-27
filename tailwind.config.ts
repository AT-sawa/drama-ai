import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0f1419",
          card: "#1a1f26",
          border: "#2a3038",
          text: "#e1e5ea",
          muted: "#8899a6",
        },
        accent: {
          DEFAULT: "#ff6b35",
          hover: "#ff8c5a",
          dark: "#cc5529",
        },
        coin: {
          DEFAULT: "#ffd700",
          dark: "#b8970a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
