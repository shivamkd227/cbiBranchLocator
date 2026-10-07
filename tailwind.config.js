/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0b1c33",
          900: "#10243f",
          800: "#163154",
          700: "#1d406c",
        },
        ink: "#10243f",
        mist: "#f5f7fa",
        line: "#e4e9f0",
      },
      fontFamily: {
        sans: ["Source Sans 3", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 36, 63, 0.04), 0 8px 24px rgba(16, 36, 63, 0.06)",
        float: "0 10px 30px rgba(16, 36, 63, 0.12)",
      },
    },
  },
  plugins: [],
};
