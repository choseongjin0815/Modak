'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Search, Trash2, Loader2, ChevronLeft, ChevronRight, Eye, MessageSquare } from 'lucide-react'
import { adminApi } from '@/lib/api'

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { load() }, [page, search])

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getPosts(page, 20, search || undefined)
      setPosts(res.items)
      setTotal(res.total)
      setPages(res.pages)
    } finally { setLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('관리자 권한으로 게시글을 삭제하시겠습니까?\n해당 URL 접근 시 "관리자에 의해 삭제된 게시글" 메시지가 표시됩니다.')) return
    setDeleting(postId)
    try {
      await adminApi.deletePost(postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_deleted: true, deleted_by_admin: true } : p))
    } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">게시글 관리</h1>
        <span className="text-sm text-gray-500">총 {total.toLocaleString()}개</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="input-field pl-9" placeholder="제목 또는 내용 검색" />
        </div>
        <button type="submit" className="btn-primary">검색</button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <div className="card p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
        ) : posts.map(post => (
          <div key={post.id} className={`card p-4 ${post.deleted_by_admin ? 'opacity-50 bg-red-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {post.deleted_by_admin && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">관리자 삭제</span>
                  )}
                  {post.category && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                      {post.category.name ?? post.category.slug}
                    </span>
                  )}
                </div>
                <Link href={`/posts/${post.id}`} target="_blank"
                  className="font-medium text-gray-900 hover:text-blue-600 truncate block">{post.title}</Link>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{post.author}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
                  <span>{format(new Date(post.created_at), 'yy.MM.dd', { locale: ko })}</span>
                </div>
              </div>
              {!post.deleted_by_admin && (
                <button onClick={() => handleDelete(post.id)} disabled={deleting === post.id}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0">
                  {deleting === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  삭제
                </button>
              )}
            </div>
          </div>
        ))}
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
