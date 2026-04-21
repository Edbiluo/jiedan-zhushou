/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FBFDFD',
          100: '#F7FAFB',
          200: '#EEF4F6',
          300: '#DFE9EC',
        },
        brand: {
          50:  '#EEF7F8',
          100: '#D7ECEE',
          200: '#B5DCE0',
          300: '#8DC6CC',
          400: '#69B2BA',
          500: '#4C9BA4',
          600: '#3A848C',
          700: '#2A6A72',
        },
        ink: {
          900: '#26323F',
          700: '#4A5463',
          500: '#7A8493',
          300: '#B8BFCB',
          100: '#E5E9EE',
        },
      },
      fontFamily: {
        hand: ['"LXGW WenKai"', '"Microsoft YaHei"', 'cursive'],
        sans: ['"Microsoft YaHei"', '"PingFang SC"', '"Source Han Sans CN"', '"HarmonyOS Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '14px',
      },
      boxShadow: {
        soft: '0 4px 18px -6px rgba(60, 130, 140, 0.14)',
        pop:  '0 10px 30px -12px rgba(60, 130, 140, 0.28)',
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
