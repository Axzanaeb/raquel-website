module.exports = {
  content: [
    "./src/**/*.{njk,md,html}",
    "./admin/*.html"
  ],
  safelist: [
    // Lightbox overlay classes used only in JS (dynamic element)
    'fixed','inset-0','bg-black/80','flex','items-center','justify-center','p-4','opacity-0','opacity-100','pointer-events-none','transition-opacity','z-50','relative','max-w-3xl','w-full','-top-10','right-0','text-white','text-2xl','font-bold','max-h-[70vh]','w-auto','mx-auto','rounded','shadow','text-center','mt-4','text-sm'
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