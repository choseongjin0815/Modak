'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, PenSquare, Loader2, AlertCircle, FileX } from 'lucide-react'
import { usePosts } from '@/hooks/usePosts'
import PostCard from '@/components/posts/PostCard'
import Pagination from '@/components/posts/Pagination'
import SortControls from '@/components/posts/SortControls'

export default function HomePage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'created_at' | 'view_count' | 'net_votes'>('net_votes')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, isError } = usePosts({
    hot: true,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    size: 8,
  })

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            인기글
          </h1>
          {data && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              추천 {data.hot_threshold}+ 게시글 {data.total.toLocaleString()}개
            </p>
          )}
        </div>
        <Link href="/posts/new" className="btn-primary text-sm px-3 py-2 sm:px-4 sm:py-2">
          <PenSquare className="w-4 h-4" />
          <span>글쓰기</span>
        </Link>
      </div>

      <div className="flex justify-end">
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortByChange={(v) => { setSortBy(v as 'created_at' | 'view_count' | 'net_votes'); setPage(1) }}
          onSortOrderChange={(v) => { setSortOrder(v); setPage(1) }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-20">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <FileX className="w-12 h-12" />
            <p className="text-sm">아직 인기글이 없습니다.</p>
            <p className="text-xs text-gray-400">추천 {data?.hot_threshold}개 이상 받은 게시글이 표시됩니다.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data?.items.map((post) => <PostCard key={post.id} post={post} />)}
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
