module.exports = {
  content: [
    "./src/**/*.{njk,md,html}",
    "./admin/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};