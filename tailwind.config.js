/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#003B73",
          dark: "#001F3F",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#D4AF37",
          foreground: "#ffffff",
        },
        background: "#F7F9FC",
        surface: "#FFFFFF",
        foreground: "#111827",
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        border: "#E5E7EB",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 59, 115, 0.05)',
        'glow': '0 0 20px rgba(212, 175, 55, 0.3)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
