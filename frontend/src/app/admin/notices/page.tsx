'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, Trash2, Pencil, Plus, Eye, Pin } from 'lucide-react'
import { useNotices, useDeleteNotice } from '@/hooks/useNotices'

export default function AdminNoticesPage() {
  const [page, setPage] = useState(1)
  const size = 20
  const { data, isLoading } = useNotices({ page, size })
  const { mutate: deleteNotice, isPending: isDeleting, variables: deletingId } = useDeleteNotice()

  const handleDelete = (id: string) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return
    deleteNotice(id)
  }

  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">공지 관리</h1>
          <span className="text-sm text-gray-500">총 {total.toLocaleString()}개</span>
        </div>
        <Link href="/admin/notices/new" className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          공지 작성
        </Link>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="card p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
        ) : data?.items.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">등록된 공지사항이 없습니다.</div>
        ) : data?.items.map((notice) => (
          <div key={notice.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {notice.is_pinned && (
                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded flex-shrink-0">
                      <Pin className="w-3 h-3" />
                      고정
                    </span>
                  )}
                  <Link href={`/notices/${notice.id}`} target="_blank" className="font-medium text-gray-900 hover:text-blue-600 truncate">
                    {notice.title}
                  </Link>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{notice.author ?? '관리자'}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{notice.view_count.toLocaleString()}</span>
                  <span>{format(new Date(notice.created_at), 'yy.MM.dd', { locale: ko })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/admin/notices/${notice.id}/edit`}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  수정
                </Link>
                <button
                  onClick={() => handleDelete(notice.id)}
                  disabled={isDeleting && deletingId === notice.id}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  {isDeleting && deletingId === notice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40">이전</button>
          <span className="text-sm text-gray-600">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  )
}
