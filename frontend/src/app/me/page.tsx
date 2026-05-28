'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { User, Mail, Lock, Save, Loader2, FileText, Star, Shield, Trash2 } from 'lucide-react'
import { usersApi, blacklistApi } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { User as UserType, BlacklistItem } from '@/types'

export default function MyPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<UserType | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [postsPage, setPostsPage] = useState(1)
  const [postsTotal, setPostsTotal] = useState(0)
  const [postsPages, setPostsPages] = useState(1)
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([])
  const [activeTab, setActiveTab] = useState<'profile' | 'posts' | 'blacklist'>('profile')

  // 프로필 수정 폼
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) { router.push('/login'); return }
    loadProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'posts') loadMyPosts(postsPage)
    if (activeTab === 'blacklist') loadBlacklist()
  }, [activeTab, postsPage])

  const loadProfile = async () => {
    try {
      const u = await usersApi.getMe()
      setUser(u)
      setUsername(u.username)
      setEmail(u.email)
    } catch { router.push('/login') }
  }

  const loadMyPosts = async (page: number) => {
    const res = await usersApi.getMyPosts(page, 8)
    setPosts(res.items)
    setPostsTotal(res.total)
    setPostsPages(res.pages)
  }

  const loadBlacklist = async () => {
    const res = await blacklistApi.getMyBlacklist()
    setBlacklist(res.items)
  }

  const handleSaveProfile = async () => {
    setSaveError('')
    setSaveSuccess(false)
    if (newPw && newPw !== confirmPw) { setSaveError('새 비밀번호가 일치하지 않습니다'); return }
    if (newPw && newPw.length < 6) { setSaveError('비밀번호는 6자 이상이어야 합니다'); return }
    setSaving(true)
    try {
      const payload: any = {}
      if (username !== user?.username) payload.username = username
      if (email !== user?.email) payload.email = email
      if (newPw) { payload.current_password = currentPw; payload.new_password = newPw }
      const updated = await usersApi.updateMe(payload)
      setUser(updated)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e.response?.data?.detail || '저장 중 오류가 발생했습니다')
    } finally { setSaving(false) }
  }

  const handleUnblock = async (blockedId: string) => {
    await blacklistApi.remove(blockedId)
    setBlacklist(prev => prev.filter(b => b.blocked_id !== blockedId))
  }

  if (!mounted || !user) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                <Star className="w-3 h-3" />{user.points.toLocaleString()}P
              </span>
              {user.role === 'ADMIN' && (
                <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" />관리자
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {(['profile', 'posts', 'blacklist'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {tab === 'profile' ? '프로필 수정' : tab === 'posts' ? `내 게시글 (${postsTotal})` : '차단 목록'}
          </button>
        ))}
      </div>

      {/* 프로필 수정 탭 */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">회원정보 수정</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={username} onChange={e => setUsername(e.target.value)}
                  className="input-field pl-9" placeholder="아이디" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  className="input-field pl-9" placeholder="이메일" />
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">비밀번호 변경 (선택)</p>
              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={currentPw} onChange={e => setCurrentPw(e.target.value)} type="password"
                    className="input-field pl-9" placeholder="현재 비밀번호" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password"
                    className="input-field pl-9" placeholder="새 비밀번호 (6자 이상)" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password"
                    className="input-field pl-9" placeholder="새 비밀번호 확인" />
                </div>
              </div>
            </div>
          </div>
          {saveError && <p className="error-message">{saveError}</p>}
          {saveSuccess && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">저장되었습니다.</p>}
          <button onClick={handleSaveProfile} disabled={saving}
            className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      )}

      {/* 내 게시글 탭 */}
      {activeTab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">작성한 게시글이 없습니다.</p>
            </div>
          ) : (
            <>
              {posts.map(post => (
                <Link key={post.id} href={`/posts/${post.id}`}
                  className="card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {post.category && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                          {post.category?.name ?? post.category}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(post.created_at), 'yyyy.MM.dd', { locale: ko })} · 조회 {post.view_count.toLocaleString()} · 추천 {post.net_votes > 0 ? '+' : ''}{post.net_votes}
                    </p>
                  </div>
                </Link>
              ))}
              {postsPages > 1 && (
                <div className="flex justify-center gap-1 pt-2">
                  {Array.from({ length: postsPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPostsPage(p)}
                      className={`w-8 h-8 text-sm rounded ${p === postsPage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 차단 목록 탭 */}
      {activeTab === 'blacklist' && (
        <div className="space-y-2">
          {blacklist.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">차단한 유저가 없습니다.</p>
            </div>
          ) : blacklist.map(item => (
            <div key={item.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.blocked_username}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(item.created_at), 'yyyy.MM.dd', { locale: ko })} 차단
                  </p>
                </div>
              </div>
              <button onClick={() => handleUnblock(item.blocked_id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
                <Trash2 className="w-3.5 h-3.5" />차단 해제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
