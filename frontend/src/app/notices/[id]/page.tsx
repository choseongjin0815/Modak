'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, AlertCircle, ArrowLeft, Eye, Pin, Pencil, Trash2 } from 'lucide-react'
import { useNotice, useDeleteNotice } from '@/hooks/useNotices'
import { isAdmin } from '@/lib/auth'

export default function NoticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [mounted, setMounted] = useState(false)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    setMounted(true)
    setAdmin(isAdmin())
  }, [])

  const { data: notice, isLoading, isError, error } = useNotice(id)
  const { mutate: deleteNotice, isPending: isDeleting } = useDeleteNotice()

  const handleDelete = () => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return
    deleteNotice(id, {
      onSuccess: () => router.push('/notices'),
    })
  }

  const getErrorMessage = () => {
    if (!error) return '공지사항을 불러오는 중 오류가 발생했습니다.'
    const axiosError = error as { response?: { data?: { detail?: string } }; message?: string }
    return axiosError.response?.data?.detail || axiosError.message || '공지사항을 불러오는 중 오류가 발생했습니다.'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (isError || !notice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-600">{getErrorMessage()}</p>
        <Link href="/notices" className="btn-secondary mt-2">목록으로</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href="/notices" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        공지사항 목록
      </Link>

      <article className="card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {notice.is_pinned && (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded">
                  <Pin className="w-3 h-3" />
                  고정
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{notice.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs sm:text-sm text-gray-500">
              <span>{notice.author ?? '관리자'}</span>
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{notice.view_count.toLocaleString()}</span>
              <span>{format(new Date(notice.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
            </div>
          </div>

          {mounted && admin && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link
                href={`/admin/notices/${notice.id}/edit`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                수정
              </Link>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                삭제
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
          {notice.content}
        </div>
      </article>
    </div>
  )
}
