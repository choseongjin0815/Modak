import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/layout/Providers'
import Navbar from '@/components/layout/Navbar'
import VisitorCount from '@/components/layout/VisitorCount'
import ChatBot from '@/components/ChatBot'

export const metadata: Metadata = {
  title: '모닥',
  description: '모닥 - 관심사로 모이는 커뮤니티',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
              {children}
            </main>
            <footer className="py-4 border-t border-gray-100 mt-8">
              <VisitorCount />
            </footer>
          </div>
          <ChatBot />
        </Providers>
      </body>
    </html>
  )
}
