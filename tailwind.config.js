/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{ts,tsx}",
    "./contents/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "upb-green": "#15803d",
        "upb-maroon": "#18181b",
        "upb-gold": "#d97706",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" }
        },
        "modal-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" }
        }
      },
      animation: {
        "slide-in": "slide-in 0.4s cubic-bezier(0.4,0,0.2,1)",
        "modal-up": "modal-up 0.3s cubic-bezier(0.4,0,0.2,1)"
      }
    }
  },
  plugins: []
}
