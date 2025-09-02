/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'neutralSilver': '#F5F7FA',
        'neutralDGrey': '#F2921F',
        'brandPrimary': '#010F59',
        'neutralGrey': '#717171',
        'grey900': '#18191F',
      },
      keyframes: {
        slide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pointing: {
          '0%, 100%': { transform: 'translateX(0)' },  // Start at 0, end at 0
          '50%': { transform: 'translateX(5px)' },      // Move 5px to the right halfway through
        },
      },
      animation: {
        slide: 'slide 10s linear infinite',
        pointing: 'pointing 1s ease-in-out infinite',
      },
    },
  },
  plugins: [require('flowbite/plugin')],
}