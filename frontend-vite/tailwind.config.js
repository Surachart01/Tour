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
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7', // Slate Blue/Cyan Primary
          600: '#0369a1',
          700: '#075985',
        }
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Prevents Tailwind base reset from conflicting with Ant Design components
  }
}
