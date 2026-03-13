import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        olive: {
          950: "#12140f",
          900: "#1b2117",
          800: "#2b3424",
          700: "#4b5d3e",
          600: "#667d56",
          500: "#7f996d"
        }
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 60px rgba(18, 20, 15, 0.14)",
        soft: "0 12px 30px rgba(18, 20, 15, 0.08)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top, rgba(127, 153, 109, 0.18), transparent 40%)",
      },
    },
  },
  plugins: [],
};

export default config;
