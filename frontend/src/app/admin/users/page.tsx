'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Search, Shield, ShieldOff, UserCheck, UserX, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/lib/api'
import type { UserAdminItem } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAdminItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => { load() }, [page, search])

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers(page, 20, search || undefined)
      setUsers(res.items)
      setTotal(res.total)
      setPages(res.pages)
    } finally { setLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const toggleActive = async (user: UserAdminItem) => {
    setUpdating(user.id)
    try {
      const updated = await adminApi.updateUser(user.id, { is_active: !user.is_active })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    } finally { setUpdating(null) }
  }

  const toggleRole = async (user: UserAdminItem) => {
    setUpdating(user.id)
    try {
      const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
      const updated = await adminApi.updateUser(user.id, { role: newRole })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    } finally { setUpdating(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">회원 관리</h1>
        <span className="text-sm text-gray-500">총 {total.toLocaleString()}명</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="input-field pl-9" placeholder="아이디 또는 이메일 검색" />
        </div>
        <button type="submit" className="btn-primary">검색</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">아이디</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">이메일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">역할</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">가입일</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Shield className="w-3 h-3" />{user.role === 'ADMIN' ? '관리자' : '일반'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {user.is_active ? '활성' : '정지'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {format(new Date(user.created_at), 'yy.MM.dd', { locale: ko })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleActive(user)} disabled={updating === user.id}
                      title={user.is_active ? '계정 정지' : '계정 활성화'}
                      className={`p-1.5 rounded-md transition-colors ${user.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {updating === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button onClick={() => toggleRole(user)} disabled={updating === user.id}
                      title={user.role === 'ADMIN' ? '일반 사용자로 변경' : '관리자로 변경'}
                      className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 transition-colors">
                      {user.role === 'ADMIN' ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
