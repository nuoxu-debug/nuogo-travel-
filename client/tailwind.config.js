/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: "#07130f",
        ink: "#13221c",
        mist: "#eef2ed",
        paper: "#f7f8f4",
        cloud: "#f7f8f4",
        jade: "#1da77a",
        vermilion: "#ff6b4a",
        coral: "#ff6b4a",
        gold: "#f4bf4f",
        sun: "#f4bf4f",
        lake: "#2e88ff",
        sky: "#2e88ff"
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Manrope", "Noto Sans SC", "system-ui", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Manrope", "Noto Sans SC", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 22px 70px rgba(29, 29, 31, 0.10)",
        lift: "0 16px 44px rgba(29, 29, 31, 0.14)"
      }
    }
  },
  plugins: []
};
