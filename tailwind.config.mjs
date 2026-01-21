/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        // The "Taste You Never Forget" serif font
        serif: ['"Playfair Display"', 'serif'],
        // Clean sans-serif for body text
        sans: ['"Inter"', 'sans-serif'],
      },
      colors: {
        premium: {
          black: '#0a0a0a', // Deepest black
          dark: '#141414', // Slightly lighter for cards
          gold: '#C08D5D', // The specific gold from your image
          text: '#E5E5E5', // Off-white for readability
        },
      },
    },
  },
  plugins: [],
};
