/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./c/**/*.{js,ts,jsx,tsx,mdx}",
    "./l/**/*.{js,ts,jsx,tsx,mdx}",
    // The imported UI primitives live here. Without these two globs their
    // classes are purged and the components render unstyled — the source PR's
    // config is missing them, which is easy to miss because most of those
    // classes happen to appear somewhere under `c/` as well.
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /**
         * Two palettes, kept side by side on purpose.
         *
         * `tangent-*` is what the redesigned dashboard, library and tab screens
         * are written against (~294 usages across 15 files). `mentor-*` is the
         * same design re-tokenised for the screens under /mentor. Dropping
         * either one does not fail the build — Tailwind emits nothing for an
         * unknown utility — it just silently unstyles whichever set of screens
         * lost its tokens. So both stay until one side is migrated to the other.
         *
         * Stock `slate-300..600` is deliberately NOT overridden. Redefining it
         * as theme-flipping CSS variables would restyle every existing surface:
         * the canvas, the library and all five MENTOR stage panels lean on
         * `text-slate-*` heavily (Canvas.tsx alone has 42 usages), and none of
         * those files were part of either redesign.
         */
        mentor: {
          primary: "var(--mentor-primary)",
          secondary: "var(--mentor-secondary)",
          accent: "var(--mentor-accent)",
          bg: "var(--mentor-bg)",
          card: "var(--mentor-card)",
          text: "var(--mentor-text)",
          border: "var(--mentor-border)",
          borderBright: "var(--mentor-border-bright)",
          error: "var(--mentor-error)",
          success: "var(--mentor-success)",
        },
        tangent: {
          primary: "var(--primary)",
          secondary: "var(--secondary)",
          accent: "var(--accent-blue)",
          bg: "var(--background)",
          card: "var(--sf-surface)",
          text: "var(--foreground)",
          border: "var(--border)",
          borderBright: "var(--border-bright)",
          error: "var(--accent-red)",
          success: "var(--accent-green)",
        },
        google: {
          blue: "#4285F4",
          red: "#EA4335",
          yellow: "#FBBC05",
          green: "#34A853",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-out": "fadeOut 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "drift-shake": "driftShake 0.4s cubic-bezier(.36,.07,.19,.97) both",
        "ripple-expand": "rippleExpand 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards",
        "glow-pulse": "glowPulse 2s infinite ease-in-out",
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "float-medium": "floatMedium 4s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "spin-slow": "spin 20s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        driftShake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        rippleExpand: {
          "0%": { transform: "scale(0)", opacity: "0.8" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4", filter: "drop-shadow(0 0 4px #6EE7FF)" },
          "50%": {
            opacity: "1",
            filter: "drop-shadow(0 0 16px #6EE7FF) drop-shadow(0 0 24px #8B5CF6)",
          },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.2" },
          "50%": { transform: "translateY(-20px) scale(1.05)", opacity: "0.4" },
        },
        floatMedium: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.3" },
          "50%": { transform: "translate(10px, -15px) scale(0.95)", opacity: "0.5" },
        },
        gradientShift: {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
      },
    },
  },
  plugins: [],
}
