import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f8f8",
        ink: "#2e3439",
        coral: "#ef5544",
        aqua: "#65b9bb",
        mist: "#e5f2f1",
      },
      boxShadow: {
        card: "0 8px 24px rgba(46, 52, 57, 0.09)",
      },
    },
  },
  plugins: [],
} satisfies Config;
