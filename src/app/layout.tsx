import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'APP — Automatic Project Proposal',
  description: 'AI·클라우드·ERP 솔루션 제안서를 자동으로 생성합니다',
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
