import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Now Platform(ServiceNow) 스타일 인터랙션 블루
        brand: {
          50: '#EAF3FB',
          100: '#D2E7F6',
          200: '#A6CEEE',
          400: '#3591D6',
          500: '#1B75BB',
          600: '#145A94',
          700: '#0F4573',
          900: '#0A2E4D',
        },
        // 좌측 내비게이션(다크) 팔레트
        nav: {
          900: '#14161F',
          800: '#1B1E2A',
          700: '#252938',
          600: '#333849',
          400: '#8A90A3',
        },
        // 상태 컬러
        accent: {
          green: '#2CA05A',
          amber: '#B7791F',
          red: '#C4314B',
        },
        // 본문 잉크/서피스
        ink: {
          900: '#1A1E28',
          700: '#333849',
          500: '#5C6270',
          400: '#8992A3',
          300: '#B0B6C1',
        },
        surface: {
          DEFAULT: '#F4F5F7',
          card: '#FFFFFF',
          sunken: '#EBECF0',
        },
        line: {
          DEFAULT: '#DCDFE5',
          strong: '#C4C9D1',
        },
      },
      fontFamily: {
        sans: ['NanumBarunGothic', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgba(20, 22, 31, 0.06)',
        popover: '0 4px 16px -2px rgba(20, 22, 31, 0.18)',
      },
    },
  },
  plugins: [],
}
export default config
