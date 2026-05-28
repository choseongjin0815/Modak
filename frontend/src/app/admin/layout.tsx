'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Shield, Users, FileText, Flag, ShieldOff } from 'lucide-react'
import { isAuthenticated, getUser } from '@/lib/auth'

const navItems = [
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/posts', label: '게시글 관리', icon: FileText },
  { href: '/admin/reports', label: '신고 관리', icon: Flag },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    const user = getUser()
    setStatus(user?.role === 'ADMIN' ? 'allowed' : 'denied')
  }, [])

  if (status === 'checking') return null

  // 권한 없음 화면
  if (status === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
        <p className="text-gray-500 mb-1">관리자 계정으로 로그인해야 이 페이지에 접근할 수 있습니다.</p>
        <p className="text-sm text-gray-400 mb-8">현재 계정의 역할: 일반 사용자</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="btn-secondary"
          >
            이전으로
          </button>
          <Link href="/" className="btn-primary">
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* 사이드바 */}
      <aside className="w-48 flex-shrink-0">
        <div className="card p-3 sticky top-4">
          <div className="flex items-center gap-2 px-2 py-2 mb-2 border-b border-gray-100">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-gray-900">관리자</span>
          </div>
          <nav className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  pathname === href
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
