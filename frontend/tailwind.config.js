/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFDF7',
          100: '#FFFBF3',
          200: '#FBF3E1',
          300: '#F5E9CF',
        },
        brand: {
          50: '#F2F7FD',
          100: '#DEEAF8',
          200: '#BED6F1',
          300: '#9CC1EA',
          400: '#8FB8E8',
          500: '#6EA1DF',
          600: '#5286C4',
          700: '#3E6EA6',
        },
        ink: {
          900: '#2C3440',
          700: '#4F5968',
          500: '#7C8594',
          300: '#B4BBC6',
          100: '#E5E8EE',
        },
      },
      fontFamily: {
        hand: ['"LXGW WenKai"', '"Kose Font"', 'cursive'],
        sans: ['"HarmonyOS Sans"', '"Source Han Sans CN"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '16px',
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(78, 118, 170, 0.18)',
        pop: '0 10px 30px -10px rgba(78, 118, 170, 0.35)',
      },
      keyframes: {
        rise: { '0%': { transform: 'translateY(4px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pop: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'slide-in-right': { '0%': { transform: 'translateX(100%)', opacity: '0.4' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        rise: 'rise .3s ease-out',
        pop: 'pop .35s cubic-bezier(.2,.8,.2,1)',
        'slide-in-right': 'slide-in-right .28s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in .2s ease-out',
      },
    },
  },
  plugins: [],
};
