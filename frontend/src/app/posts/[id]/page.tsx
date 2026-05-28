'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft, Edit, Trash2, Eye, User, Calendar,
  Paperclip, Download, Loader2, AlertCircle,
  ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck, Flame,
  Flag, ShieldX,
} from 'lucide-react'
import { usePost, usePostWithAuth, useDeletePost } from '@/hooks/usePosts'
import { useVotePost } from '@/hooks/useVotes'
import { useToggleBookmark } from '@/hooks/useBookmarks'
import { isAuthenticated, getUser } from '@/lib/auth'
import { reportsApi, blacklistApi } from '@/lib/api'
import CommentList from '@/components/comments/CommentList'
import LevelBadge from '@/components/ui/LevelBadge'
import type { FileInfo } from '@/types'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [mounted, setMounted] = useState(false)
  const [auth, setAuth] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [adminDeleted, setAdminDeleted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setAuth(isAuthenticated())
  }, [])

  const { data: publicPost, isLoading: publicLoading, isError: publicError, error: publicErr } = usePost(id)
  const { data: authPost } = usePostWithAuth(id, mounted && auth)

  const post = (mounted && auth ? authPost : null) ?? publicPost
  const isLoading = publicLoading
  const isError = publicError

  // 410 = 관리자 삭제
  useEffect(() => {
    if (publicErr && (publicErr as any)?.response?.status === 410) {
      setAdminDeleted(true)
    }
  }, [publicErr])

  const { mutate: deletePost, isPending: isDeleting } = useDeletePost()
  const { mutate: votePost, isPending: isVoting } = useVotePost(id)
  const { mutate: toggleBookmark, isPending: isBookmarking } = useToggleBookmark(id)

  const [localVote, setLocalVote] = useState<'up' | 'down' | null>(null)
  const [localUpVotes, setLocalUpVotes] = useState(0)
  const [localDownVotes, setLocalDownVotes] = useState(0)
  const [localBookmarked, setLocalBookmarked] = useState(false)

  useEffect(() => {
    if (post) {
      setLocalVote(post.my_vote)
      setLocalUpVotes(post.up_votes)
      setLocalDownVotes(post.down_votes)
      setLocalBookmarked(post.is_bookmarked)
    }
  }, [post])

  useEffect(() => {
    if (mounted && post && auth) {
      const user = getUser()
      setIsAuthor(user?.sub === post.author)
    }
  }, [mounted, post, auth])

  const handleDelete = () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return
    deletePost(id)
  }

  const handleVote = (voteType: 'up' | 'down') => {
    if (!auth) return
    votePost(voteType, {
      onSuccess: (result) => {
        setLocalVote(result.vote_type)
        setLocalUpVotes(result.up_votes)
        setLocalDownVotes(result.down_votes)
      },
    })
  }

  const handleBookmark = () => {
    if (!auth) return
    toggleBookmark(undefined, {
      onSuccess: (result) => setLocalBookmarked(result.bookmarked),
    })
  }

  const handleReport = async () => {
    if (!auth) { alert('로그인 후 이용 가능합니다'); return }
    const reason = window.prompt('신고 사유를 입력해주세요:')
    if (!reason?.trim()) return
    try {
      await reportsApi.create({ target_type: 'POST', target_id: id, reason: reason.trim() })
      alert('신고가 접수되었습니다.')
    } catch (e: any) {
      alert(e.response?.data?.detail || '신고 처리 중 오류가 발생했습니다')
    }
  }

  const handleBlock = async () => {
    if (!auth || !post) return
    if (!window.confirm(`${post.author} 님을 차단하시겠습니까?\n차단 시 해당 유저는 내 게시글을 볼 수 없게 됩니다.`)) return
    try {
      const result = await blacklistApi.add(post.user_id)
      alert(`${result.blocked_username} 님을 차단했습니다.`)
    } catch (e: any) {
      alert(e.response?.data?.detail || '차단 처리 중 오류가 발생했습니다')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 관리자 삭제 처리
  if (adminDeleted) {
    // alert는 useEffect로 한 번만 처리
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">삭제된 게시글</h2>
            <p className="text-sm text-gray-500 mt-1">관리자에 의해 삭제된 게시글입니다.</p>
          </div>
          <button onClick={() => router.back()} className="btn-secondary">뒤로 가기</button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">게시글을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-red-600">게시글을 불러오는 중 오류가 발생했습니다.</p>
          <button onClick={() => router.back()} className="btn-secondary mt-2">뒤로 가기</button>
        </div>
      </div>
    )
  }

  const formattedDate = format(new Date(post.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
  const isEdited = post.updated_at !== post.created_at
  const netVotes = localUpVotes - localDownVotes

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        뒤로
      </button>

      <div className="card">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.is_hot && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
                <Flame className="w-3 h-3" />인기
              </span>
            )}
            {post.category && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                {post.category.name}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1 leading-snug">{post.title}</h1>
            {mounted && isAuthor && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link href={`/posts/${id}/edit`} className="btn-secondary text-xs sm:text-sm px-2.5 sm:px-3 py-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">수정</span>
                </Link>
                <button onClick={handleDelete} disabled={isDeleting} className="btn-danger text-xs sm:text-sm px-2.5 sm:px-3 py-1.5">
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="hidden xs:inline">삭제</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2.5 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <LevelBadge points={post.author_points} />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formattedDate}{isEdited && <span className="text-xs">(수정됨)</span>}</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />조회 {post.view_count.toLocaleString()}</span>
            {/* 신고 / 차단 */}
            {mounted && auth && !isAuthor && (
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={handleReport} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50">
                  <Flag className="w-3 h-3" />신고
                </button>
                <button onClick={handleBlock} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50">
                  <ShieldX className="w-3 h-3" />차단
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="prose max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[6rem] text-sm sm:text-base">
            {post.content}
          </div>
        </div>

        {/* Vote + Bookmark bar */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => handleVote('up')} disabled={isVoting || !auth || isAuthor}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                localVote === 'up' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}>
              <ThumbsUp className="w-4 h-4" /><span>{localUpVotes}</span>
            </button>
            <span className={`text-base font-bold ${netVotes > 0 ? 'text-blue-600' : netVotes < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {netVotes > 0 ? `+${netVotes}` : netVotes}
            </span>
            <button onClick={() => handleVote('down')} disabled={isVoting || !auth || isAuthor}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                localVote === 'down' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}>
              <ThumbsDown className="w-4 h-4" /><span>{localDownVotes}</span>
            </button>
          </div>
          {mounted && (
            <button onClick={handleBookmark} disabled={isBookmarking || !auth}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                localBookmarked ? 'bg-yellow-50 border-yellow-300 text-yellow-600' : 'border-gray-300 text-gray-500 hover:border-yellow-300 hover:text-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}>
              {localBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{localBookmarked ? '저장됨' : '저장'}</span>
            </button>
          )}
        </div>

        {/* Files */}
        {post.files && post.files.length > 0 && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100 pt-3 sm:pt-4">
            <h3 className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              첨부파일 ({post.files.length})
            </h3>
            <div className="space-y-1.5 sm:space-y-2">
              {post.files.map((file: FileInfo) => (
                <a key={file.id} href={`${process.env.NEXT_PUBLIC_API_URL}/files/${file.id}`} download={file.original_filename}
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-md transition-colors group">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-700 truncate group-hover:text-blue-700">{file.original_filename}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-400 hidden sm:block">{formatFileSize(file.file_size)}</span>
                    <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <CommentList postId={id} />
    </div>
  )
}
