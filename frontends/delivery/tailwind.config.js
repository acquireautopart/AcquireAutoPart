/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: "#ff6b00", ink: "#101010" },
      fontFamily: { sans: ["Arial", "sans-serif"] },
    },
  },
  plugins: [],
};
