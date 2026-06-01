import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        danger: "var(--danger)",
        success: "var(--success)",
        accent: {
          DEFAULT: "var(--accent)",
          strong: "var(--accent-strong)",
          soft: "var(--accent-soft)",
          ink: "var(--accent-ink)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      height: {
        control: "var(--control-h)",
      },
      minHeight: {
        control: "var(--control-h)",
      },
      boxShadow: {
        pop: "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
};

export default config;
