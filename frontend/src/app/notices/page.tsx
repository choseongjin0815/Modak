'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, AlertCircle, FileX, Eye, Pin, Megaphone } from 'lucide-react'
import { useNotices } from '@/hooks/useNotices'
import SearchBar from '@/components/posts/SearchBar'
import Pagination from '@/components/posts/Pagination'

export default function NoticesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const size = 20

  const { data, isLoading, isError, error } = useNotices({ page, size, search: search || undefined })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }
  const handlePageChange = (next: number) => {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getErrorMessage = () => {
    if (!error) return '공지사항을 불러오는 중 오류가 발생했습니다.'
    const axiosError = error as { response?: { data?: { detail?: string } }; message?: string }
    return axiosError.response?.data?.detail || axiosError.message || '공지사항을 불러오는 중 오류가 발생했습니다.'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900">
            <Megaphone className="w-6 h-6 text-orange-500" />
            공지사항
          </h1>
          {data && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">전체 {data.total.toLocaleString()}개</p>
          )}
        </div>
      </div>

      <div className="w-full sm:w-72">
        <SearchBar value={search} onChange={handleSearchChange} placeholder="제목으로 검색..." />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">공지사항을 불러오는 중...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-600">{getErrorMessage()}</p>
          </div>
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <FileX className="w-12 h-12" />
            <p className="text-sm">{search ? `"${search}" 검색 결과가 없습니다.` : '등록된 공지사항이 없습니다.'}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data?.items.map((notice) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.id}`}
                className={`card p-4 block hover:shadow-md transition-shadow ${notice.is_pinned ? 'border-orange-200 bg-orange-50/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {notice.is_pinned && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded flex-shrink-0">
                          <Pin className="w-3 h-3" />
                          고정
                        </span>
                      )}
                      <span className="font-medium text-gray-900 truncate">{notice.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{notice.author ?? '관리자'}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{notice.view_count.toLocaleString()}</span>
                      <span>{format(new Date(notice.created_at), 'yyyy.MM.dd', { locale: ko })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {data && data.pages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={data.page} totalPages={data.pages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
