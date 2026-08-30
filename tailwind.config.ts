import type { Config } from 'tailwindcss'

// Orange · Black · White
// ORANGE = 실행/진행, BLACK = 구조/텍스트, WHITE = 작업 면
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 실행 · 진행 (유일한 채색)
        brand: {
          50: '#FFF9F4',
          100: '#FFF1E7',
          200: '#FDBA74',
          400: '#F97316',
          500: '#EA580C',
          600: '#C2410C',
          700: '#9A3412',
          900: '#3D1E0C',
        },
        // 구조 · 텍스트
        ink: {
          900: '#111111',
          800: '#1C1C1C',
          700: '#3D3D3D',
          600: '#5A5A5A',
          500: '#767676',
          400: '#A8A8A8',
          300: '#D0D0D0',
        },
        // 작업 면
        surface: {
          DEFAULT: '#FAFAFA',
          card: '#FFFFFF',
          sunken: '#F1F1F1',
          dark: '#111111',
        },
        line: {
          DEFAULT: '#E4E4E4',
          strong: '#D0D0D0',
          dark: '#2A2A2A',
        },
        // 상태 — 별도 색을 쓰지 않고 오렌지/그레이로 처리한다
        accent: {
          green: '#EA580C',
          amber: '#EA580C',
          red: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'Inter', 'system-ui', 'sans-serif'],
        num: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
      },
      boxShadow: {
        panel: 'none',
        popover: '0 6px 20px -6px rgba(17, 17, 17, 0.18)',
      },
    },
  },
  plugins: [],
}
export default config
