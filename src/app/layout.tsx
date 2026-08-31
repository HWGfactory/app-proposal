import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  // 탭에는 'APP'만 남긴다. 브라우저 탭 폭이 좁아 뒷말은 어차피 잘린다.
  title: 'APP',
  description: '제안요청서(RFP)를 분석해 제안 발표자료를 생성합니다',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
