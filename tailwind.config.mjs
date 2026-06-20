/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Admin — keep existing brand colors
        brand: {
          50:  '#fef9ee',
          100: '#fdf0d5',
          200: '#f6d899',
          400: '#f59e0b',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
        // Frontend — new identity
        pandan: {
          50:  '#eef5ef',
          700: '#1d3a24',
          800: '#152b1a',
        },
        gorengan: {
          500: '#c4621c',
          600: '#a84e15',
        },
        kunyit: {
          400: '#e8b832',
        },
        krim:     '#faf5e9',
        tanah:    '#8a7260',
        espresso: '#18100a',
      },
      fontFamily: {
        brand: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
