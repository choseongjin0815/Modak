'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Trash2, Plus, Search, Loader2 } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useCategories } from '@/hooks/useCategories'

export default function ModeratorsPage() {
  const queryClient = useQueryClient()
  const [usernameInput, setUsernameInput] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('')
  const [searchResult, setSearchResult] = useState<{ id: string; username: string } | null>(null)
  const [searchError, setSearchError] = useState('')

  const { data: moderators = [], isLoading } = useQuery({
    queryKey: ['admin', 'moderators'],
    queryFn: adminApi.getModerators,
  })

  const { data: categories = [] } = useCategories()

  const assignMutation = useMutation({
    mutationFn: () => adminApi.assignModerator(selectedUserId, selectedCategoryId as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] })
      setUsernameInput('')
      setSelectedUserId('')
      setSelectedCategoryId('')
      setSearchResult(null)
    },
    onError: (e: any) => {
      alert(e.response?.data?.detail || '운영자 지정에 실패했습니다.')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: ({ userId, categoryId }: { userId: string; categoryId: number }) =>
      adminApi.revokeModerator(userId, categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] }),
    onError: (e: any) => alert(e.response?.data?.detail || '해제에 실패했습니다.'),
  })

  const handleSearch = async () => {
    setSearchError('')
    setSearchResult(null)
    if (!usernameInput.trim()) return
    try {
      // 유저 목록에서 검색 (admin users API 재활용)
      const result = await adminApi.getUsers(1, 5, usernameInput.trim())
      const found = result.items.find((u: any) => u.username === usernameInput.trim())
      if (found) {
        setSearchResult({ id: found.id, username: found.username })
        setSelectedUserId(found.id)
      } else {
        setSearchError('해당 아이디의 사용자를 찾을 수 없습니다.')
      }
    } catch {
      setSearchError('검색 중 오류가 발생했습니다.')
    }
  }

  const canAssign = selectedUserId && selectedCategoryId !== ''

  // 카테고리별로 운영자 그룹핑
  const grouped = moderators.reduce<Record<string, typeof moderators>>((acc, m) => {
    const key = m.category_name
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-teal-600" />
        <h1 className="text-xl font-bold text-gray-900">운영자 관리</h1>
      </div>

      {/* 운영자 지정 폼 */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">운영자 지정</h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="아이디로 사용자 검색"
            value={usernameInput}
            onChange={(e) => { setUsernameInput(e.target.value); setSearchResult(null); setSelectedUserId('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="input-field flex-1"
          />
          <button onClick={handleSearch} className="btn-secondary px-3">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {searchError && <p className="text-sm text-red-500">{searchError}</p>}
        {searchResult && (
          <p className="text-sm text-teal-700 font-medium">✓ {searchResult.username} 선택됨</p>
        )}

        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          className="input-field"
        >
          <option value="">게시판 선택</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.group ? `${cat.group} › ` : ''}{cat.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => assignMutation.mutate()}
          disabled={!canAssign || assignMutation.isPending}
          className="btn-primary w-full"
        >
          {assignMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Plus className="w-4 h-4" />
          }
          운영자 지정
        </button>
      </div>

      {/* 운영자 목록 */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">현재 운영자 목록</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : moderators.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">지정된 운영자가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([catName, mods]) => (
              <div key={catName}>
                <p className="text-xs font-semibold text-gray-500 mb-2">{catName}</p>
                <div className="space-y-1">
                  {mods.map((m) => (
                    <div key={`${m.user_id}-${m.category_id}`} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-500" />
                        <span className="text-sm font-medium text-gray-800">{m.username}</span>
                      </div>
                      <button
                        onClick={() => revokeMutation.mutate({ userId: m.user_id, categoryId: m.category_id })}
                        disabled={revokeMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="운영자 해제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
