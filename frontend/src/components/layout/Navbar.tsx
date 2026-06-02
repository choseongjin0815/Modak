'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LogOut, User, Menu, X, ChevronDown, Flame, Star, Calendar, Shield, Settings, Mail } from 'lucide-react'
import { getUser, isAuthenticated, isAdmin as checkIsAdmin, removeToken } from '@/lib/auth'
import { useMyPoints, useAttendance } from '@/hooks/usePoints'
import { useSortedCategoryGroups } from '@/hooks/useCategories'
import NotificationBell from '@/components/layout/NotificationBell'

// 우선순위 낮은 순(앞) → 높은 순(뒤): 화면이 좁아질수록 앞에서부터 숨겨짐
// Tailwind JIT가 감지할 수 있도록 반드시 정적 문자열로 선언
const NAV_BREAKPOINTS = [
  'hidden min-[1260px]:block',
  'hidden min-[1140px]:block',
  'hidden min-[1030px]:block',
  'hidden min-[930px]:block',
  'hidden min-[830px]:block',
  'hidden min-[740px]:block',
  'hidden sm:block',
] as const
import LevelBadge from '@/components/ui/LevelBadge'

export default function Navbar() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const categoryNavRef = useRef<HTMLDivElement>(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const { data: pointData } = useMyPoints(mounted && authenticated)
  const { mutate: checkAttendance, isPending: isCheckingIn } = useAttendance()
  const sortedGroups = useSortedCategoryGroups()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryNavRef.current && !categoryNavRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const syncAuth = () => {
    const auth = isAuthenticated()
    setAuthenticated(auth)
    if (auth) {
      const user = getUser()
      setUsername((user?.username as string) ?? (user?.sub as string) ?? null)
      setIsAdmin(checkIsAdmin())
    } else {
      setUsername(null)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    syncAuth()
    window.addEventListener('auth-change', syncAuth)
    return () => window.removeEventListener('auth-change', syncAuth)
  }, [])

  const handleLogout = () => {
    removeToken()
    setAuthenticated(false)
    setUsername(null)
    setMenuOpen(false)
    router.push('/login')
  }

  const handleAttendance = () => {
    checkAttendance(undefined, {
      onSuccess: (result) => {
        if (result.already_attended) {
          alert('오늘은 이미 출석체크를 완료했습니다.')
        } else {
          alert(`출석체크 완료! +${result.points_earned}P 획득 (총 ${result.total_points}P)`)
        }
      },
    })
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-orange-500 hover:text-orange-600 transition-colors flex-shrink-0" onClick={() => { setMenuOpen(false); setOpenDropdown(null) }}>
            <Flame className="w-5 h-5" />
            <span>모닥</span>
          </Link>

          {/* Desktop category nav */}
          <div ref={categoryNavRef} className="hidden sm:flex items-center gap-0.5">
            <Link href="/" className="flex items-center gap-1 px-2.5 py-2 text-sm font-medium text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors whitespace-nowrap">
              <Flame className="w-4 h-4" />
              인기글
            </Link>

            {sortedGroups.map((group, idx) => (
              <div
                key={group.key}
                className={`relative ${NAV_BREAKPOINTS[Math.min(idx, NAV_BREAKPOINTS.length - 1)]}`}
              >
                <button
                  onClick={() => setOpenDropdown(openDropdown === group.key ? null : group.key)}
                  className="flex items-center gap-1 px-2.5 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
                >
                  {group.label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === group.key ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === group.key && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                    {group.categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/posts?category=${cat.slug}`}
                        onClick={() => setOpenDropdown(null)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {mounted && authenticated ? (
              <>
                <button
                  onClick={handleAttendance}
                  disabled={isCheckingIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                  title="출석체크"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  출석
                </button>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-semibold text-yellow-700">{pointData?.points ?? 0}P</span>
                </div>
                <Link href="/me" className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-blue-600 pl-1 transition-colors">
                  <User className="w-4 h-4 text-gray-400" />
                  <LevelBadge points={pointData?.points ?? 0} />
                  <span className="font-medium max-w-[100px] truncate">{username}</span>
                </Link>
                <NotificationBell />
                <Link href="/messages" className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="쪽지함">
                  <Mail className="w-4 h-4" />
                </Link>
                {isAdmin && (
                  <Link href="/admin/users" className="flex items-center p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="관리자 페이지">
                    <Shield className="w-4 h-4" />
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </>
            ) : mounted ? (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-md transition-colors">로그인</Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">회원가입</Link>
              </div>
            ) : null}
          </div>

          {/* Mobile hamburger */}
          <button className="sm:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setMenuOpen((prev) => !prev)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-md transition-colors">
            <Flame className="w-4 h-4" />
            인기글
          </Link>

          {sortedGroups.map((group) => (
            <div key={group.key}>
              <button
                onClick={() => setOpenDropdown(openDropdown === group.key ? null : group.key)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                {group.label}
                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === group.key ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === group.key && (
                <div className="pl-4 space-y-0.5">
                  {group.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/posts?category=${cat.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-gray-100 pt-2 mt-1">
            {mounted && authenticated ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <LevelBadge points={pointData?.points ?? 0} />
                    <span className="font-medium">{username}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-700">{pointData?.points ?? 0}P</span>
                  </div>
                </div>
                <Link href="/me" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                  <Settings className="w-4 h-4" />
                  마이페이지
                </Link>
                {isAdmin && (
                  <Link href="/admin/users" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-purple-700 hover:bg-purple-50 rounded-md transition-colors">
                    <Shield className="w-4 h-4" />
                    관리자 페이지
                  </Link>
                )}
                <button onClick={handleAttendance} disabled={isCheckingIn} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-green-700 hover:bg-green-50 rounded-md transition-colors">
                  <Calendar className="w-4 h-4" />
                  출석체크
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </>
            ) : mounted ? (
              <div className="flex gap-2 pt-1">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-md">로그인</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">회원가입</Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  )
}
