/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sage: { dark: "#4B5E48", mid: "#6E826B", light: "#D7E5D0" },
        bgmain: "#FAFBF8",
        bgcard: "#EFF5EC",
        line: "#C87A51",
        accent: "#9BE564",
        ink: "#232B22",
        muted: "#6C786A",
      },
    },
  },
  plugins: [],
};
