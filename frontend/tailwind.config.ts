import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        offwhite: "#F9F9F7",
        muted: "#E5E5E0",
        accent: "#CC0000",
        neutral: {
          100: "#F5F5F5",
          200: "#E5E5E5",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Times New Roman", "serif"],
        body: ["'Lora'", "Georgia", "serif"],
        sans: ["'Inter'", "Helvetica Neue", "sans-serif"],
        mono: ["'JetBrains Mono'", "Courier New", "monospace"],
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
      },
      boxShadow: {
        hard: "4px 4px 0px 0px #111111",
      },
    },
  },
  plugins: [],
};

export default config;
