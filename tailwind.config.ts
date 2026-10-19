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
        bg: "#070d16",
        panel: "#0d1624",
        panel2: "#111d2e",
        line: "#1d2d42",
        ink: "#e8f1f8",
        muted: "#8fa6bd",
        brand: "#38bdf8",
        accent: "#34d399",
        danger: "#fb7185",
        warn: "#fbbf24",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.18), 0 18px 50px -20px rgba(56,189,248,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2.2s ease-in-out infinite",
        rise: "rise 0.45s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
