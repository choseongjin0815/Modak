'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PenSquare, Loader2, AlertCircle, FileX } from 'lucide-react'
import { usePosts } from '@/hooks/usePosts'
import { isAuthenticated } from '@/lib/auth'
import PostCard from '@/components/posts/PostCard'
import SearchBar from '@/components/posts/SearchBar'
import SortControls from '@/components/posts/SortControls'
import Pagination from '@/components/posts/Pagination'
import { type PostFilters } from '@/types'
import { useCategories } from '@/hooks/useCategories'

export default function PostsPage() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')

  const [filters, setFilters] = useState<PostFilters>({
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    size: 8,
    category: categoryParam ?? undefined,
  })
  const [mounted, setMounted] = useState(false)
  const [auth, setAuth] = useState(false)
  const { data: categories = [] } = useCategories()

  useEffect(() => {
    setMounted(true)
    setAuth(isAuthenticated())
  }, [])

  // Sync category when URL changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, category: categoryParam ?? undefined, page: 1 }))
  }, [categoryParam])

  const { data, isLoading, isError, error } = usePosts(filters)

  const handleSearchChange = (search: string) => setFilters((prev) => ({ ...prev, search, page: 1 }))
  const handleSortByChange = (sort_by: 'created_at' | 'view_count' | 'net_votes') => setFilters((prev) => ({ ...prev, sort_by, page: 1 }))
  const handleSortOrderChange = (sort_order: 'asc' | 'desc') => setFilters((prev) => ({ ...prev, sort_order, page: 1 }))
  const handlePageChange = (page: number) => { setFilters((prev) => ({ ...prev, page })); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const pageTitle = categoryParam
    ? categories.find((c) => c.slug === categoryParam)?.name ?? categoryParam
    : '게시글 목록'

  const getErrorMessage = () => {
    if (!error) return '게시글을 불러오는 중 오류가 발생했습니다.'
    const axiosError = error as { response?: { data?: { detail?: string } }; message?: string }
    return axiosError.response?.data?.detail || axiosError.message || '게시글을 불러오는 중 오류가 발생했습니다.'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{pageTitle}</h1>
          {data && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
              전체 {data.total.toLocaleString()}개
            </p>
          )}
        </div>
        {mounted && auth && (
          <Link href="/posts/new" className="btn-primary text-sm px-3 py-2 sm:px-4 sm:py-2">
            <PenSquare className="w-4 h-4" />
            <span>글쓰기</span>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:items-center sm:justify-between">
        <div className="w-full sm:w-72">
          <SearchBar value={filters.search || ''} onChange={handleSearchChange} placeholder="제목으로 검색..." />
        </div>
        <div className="flex justify-end">
          <SortControls sortBy={filters.sort_by || 'created_at'} sortOrder={filters.sort_order || 'desc'} onSortByChange={handleSortByChange} onSortOrderChange={handleSortOrderChange} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">게시글을 불러오는 중...</p>
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
            <p className="text-sm">{filters.search ? `"${filters.search}" 검색 결과가 없습니다.` : '게시글이 없습니다.'}</p>
            {mounted && auth && !filters.search && (
              <Link href="/posts/new" className="btn-primary mt-2">첫 게시글 작성하기</Link>
            )}
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
