/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold:    "#e1a209",
          amber:   "#d97904",
          yellow:  "#f2b705",
          red:     "#a00021",
          dark:    "#000000",
          gray80:  "#484848",
          gray50:  "#939393",
          gray20:  "#d6d6d6",
          light:   "#f5f4f0",
        },
      },
      fontFamily: {
        display: ['"Red Hat Display"', "sans-serif"],
        body:    ["Poppins", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
