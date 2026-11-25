/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        muted: "#9ca3af",
        brand: "#ff6b00",
        "brand-dark": "#e85d04",
        line: "#262626",
        "line-light": "#e5e7eb",
        paper: "#161616",
        soft: "#141414",
      },
      fontFamily: {
        sans: ["DM Sans", "Arial", "sans-serif"],
        display: ["Manrope", "DM Sans", "sans-serif"],
      },
      boxShadow: { card: "0 10px 30px rgba(0,0,0,.5)" },
      maxWidth: { site: "1224px" },
    },
  },
  plugins: [],
};
