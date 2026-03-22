import type { Config } from "tailwindcss";

/** Tailwind entry: scans `src` for class names; maps semantic colors to CSS variables from `globals.css`. */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "foreground-muted": "var(--foreground-muted)",
        elevated: "var(--bg-elevated)",
        accent: "var(--accent)",
        "accent-muted": "var(--accent-muted)",
        border: "var(--border)",
        danger: "var(--danger)",
        "danger-surface": "var(--danger-surface)",
        info: "var(--info)",
        "info-surface": "var(--info-surface)",
      },
    },
  },
  plugins: [],
} satisfies Config;
