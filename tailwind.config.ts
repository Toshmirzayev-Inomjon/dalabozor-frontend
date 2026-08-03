import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F5EE",
        bg2: "#E9EDE3",
        surface: "#FFFFFF",
        line: "rgba(22,52,39,0.12)",
        text: "#163427",
        muted: "#65766C",
        dim: "#91A097",
        gold: "#175C3A",
        gold2: "#0E3D28",
        accent: "#DFF36B",
        green: "#2D8A57",
        red: "#C64B40",
        orange: "#E99A42",
      },
      fontFamily: {
        sans: ["Avenir Next", "Avenir", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        head: ["Avenir Next", "Avenir", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        mono: ["SFMono-Regular", "Cascadia Code", "Roboto Mono", "monospace"],
      },
      boxShadow: {
        card: "0 14px 40px rgba(20,55,39,.07)",
        float: "0 24px 70px rgba(12,49,31,.16)",
      },
      borderRadius: { xl2: "20px" },
    },
  },
  plugins: [],
};

export default config;
