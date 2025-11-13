/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/web/react/index.html",
    "./src/web/react/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navetec: {
          primary: "#00567D",
          "primary-dark": "#002B53",
          "primary-medium": "#002D74",
          "primary-light": "#87A9E2",
          "secondary-1": "#1F49B6",
          "secondary-2": "#425CC7",
          "secondary-3": "#6FB1C8",
          "secondary-4": "#87A9E2",
          "accent-red": "#B42F3B",
          "accent-red-light": "#D94450",
          "accent-red-dark": "#8B1E27",
        },
      },
      fontFamily: {
        merriweather: ["Merriweather Sans", "sans-serif"],
        futura: ["Futura PT", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
