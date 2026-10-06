/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        royal: {
          DEFAULT: "#0b6edc",
          dark: "#0856ae",
        },
        navy: "#0a1f44",
        sky: "#eaf3ff",
        mist: "#f5f9ff",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -18px, 0)" },
        },
        marquee: {
          to: { transform: "translateX(-50%)" },
        },
        shimmer: {
          to: { "background-position": "200% center" },
        },
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "float-slow": "float 14s ease-in-out infinite reverse",
        "spin-slow": "spin 40s linear infinite",
        marquee: "marquee 45s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
