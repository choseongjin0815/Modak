'use client'

import { MessageSquare, Loader2, AlertCircle } from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import { isAuthenticated, getUser } from '@/lib/auth'
import CommentItem from './CommentItem'
import CommentForm from './CommentForm'
import { useEffect, useState } from 'react'

interface CommentListProps {
  postId: string
  viewerIsMod?: boolean
  categoryId?: number
}

export default function CommentList({ postId, viewerIsMod, categoryId }: CommentListProps) {
  const { data: comments, isLoading, isError } = useComments(postId)
  const [mounted, setMounted] = useState(false)
  const [auth, setAuth] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()

  useEffect(() => {
    setMounted(true)
    const authenticated = isAuthenticated()
    setAuth(authenticated)
    if (authenticated) {
      const user = getUser()
      setCurrentUserId(user?.sub)
    }
  }, [])

  return (
    <div className="card">
      <div className="p-4 sm:p-5 border-b border-gray-100">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          댓글
          {comments && (
            <span className="text-sm font-normal text-gray-500">({comments.length})</span>
          )}
        </h2>
      </div>

      {/* Comment List */}
      <div className="px-4 sm:px-5">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : isError ? (
          <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-red-500">댓글을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        ) : comments && comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            첫 번째 댓글을 작성해보세요.
          </div>
        ) : (
          <div>
            {comments
              ?.filter(c => !c.parent_id)
              .map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={comments.filter(c => c.parent_id === comment.id)}
                  postId={postId}
                  currentUserId={mounted ? currentUserId : undefined}
                  viewerIsMod={viewerIsMod}
                  categoryId={categoryId}
                />
              ))}
          </div>
        )}
      </div>

      {/* Comment Form */}
      {mounted && (
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          {auth ? (
            <CommentForm postId={postId} />
          ) : (
            <p className="text-sm text-center text-gray-500">
              댓글을 작성하려면{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                로그인
              </a>
              이 필요합니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
