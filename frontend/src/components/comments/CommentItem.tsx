'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Edit2, Trash2, Check, X, User, Loader2, ThumbsUp, ThumbsDown, Flag, ShieldX, ShieldAlert, ShieldOff, CornerDownRight, Mail } from 'lucide-react'
import { useUpdateComment, useDeleteComment } from '@/hooks/useComments'
import { useVoteComment } from '@/hooks/useVotes'
import { reportsApi, blacklistApi } from '@/lib/api'
import type { Comment } from '@/types'
import LevelBadge from '@/components/ui/LevelBadge'
import AuthorBadge from '@/components/ui/AuthorBadge'
import BanModal from '@/components/ui/BanModal'
import MessageModal from '@/components/ui/MessageModal'
import CommentForm from './CommentForm'

interface CommentItemProps {
  comment: Comment
  replies?: Comment[]
  postId: string
  currentUserId?: string
  viewerIsMod?: boolean
  categoryId?: number
  isReply?: boolean
}

export default function CommentItem({ comment, replies = [], postId, currentUserId, viewerIsMod, categoryId, isReply = false }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [showBanModal, setShowBanModal] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [localVote, setLocalVote] = useState<'up' | 'down' | null>(comment.my_vote)
  const [localUpVotes, setLocalUpVotes] = useState(comment.up_votes)
  const [localDownVotes, setLocalDownVotes] = useState(comment.down_votes)

  const { mutate: updateComment, isPending: isUpdating } = useUpdateComment(postId)
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment(postId)
  const { mutate: voteComment, isPending: isVoting } = useVoteComment(postId)

  const isAuthor = currentUserId && comment.author === currentUserId
  const formattedDate = format(new Date(comment.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })
  const isEdited = comment.updated_at !== comment.created_at

  const handleVote = (voteType: 'up' | 'down') => {
    if (!currentUserId) return
    voteComment(
      { commentId: comment.id, voteType },
      {
        onSuccess: (result) => {
          setLocalVote(result.vote_type)
          setLocalUpVotes(result.up_votes)
          setLocalDownVotes(result.down_votes)
        },
      }
    )
  }

  const handleUpdate = () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === comment.content) {
      setIsEditing(false)
      setEditContent(comment.content)
      return
    }
    updateComment({ id: comment.id, content: trimmed }, { onSuccess: () => setIsEditing(false) })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(comment.content)
  }

  const handleDelete = () => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    deleteComment(comment.id)
  }

  const handleReport = async () => {
    const reason = window.prompt('신고 사유를 입력해주세요:')
    if (!reason?.trim()) return
    try {
      await reportsApi.create({ target_type: 'COMMENT', target_id: comment.id, reason: reason.trim() })
      alert('신고가 접수되었습니다.')
    } catch (e: any) {
      alert(e.response?.data?.detail || '신고 처리 중 오류가 발생했습니다')
    }
  }

  const handleBlock = async () => {
    if (!window.confirm(`${comment.author} 님을 차단하시겠습니까?`)) return
    try {
      const result = await blacklistApi.add(comment.user_id)
      alert(`${result.blocked_username} 님을 차단했습니다.`)
    } catch (e: any) {
      alert(e.response?.data?.detail || '차단 처리 중 오류가 발생했습니다')
    }
  }

  const canModDelete = viewerIsMod && !isAuthor && !comment.deleted_by_admin
  const canModBan = viewerIsMod && !isAuthor && categoryId && !comment.deleted_by_admin

  // 관리자 삭제 댓글
  if (comment.deleted_by_admin) {
    return (
      <div className="py-4 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-2 text-gray-400">
          <ShieldAlert className="w-4 h-4 text-red-300" />
          <p className="text-sm italic text-gray-400">관리자에 의해 삭제된 댓글입니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      {showMessageModal && (
        <MessageModal
          defaultReceiver={comment.author}
          onClose={() => setShowMessageModal(false)}
        />
      )}
      {showBanModal && categoryId && (
        <BanModal
          targetUserId={comment.user_id}
          targetUsername={comment.author}
          categoryId={categoryId}
          onClose={() => setShowBanModal(false)}
          onDone={() => { setShowBanModal(false); alert(`${comment.author} 님을 차단했습니다.`) }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 flex-wrap">
              <LevelBadge points={comment.author_points} />
              <AuthorBadge role={comment.author_role} isMod={comment.author_is_mod} />
              {comment.author}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>{formattedDate}</span>
              {isEdited && <span>(수정됨)</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isAuthor && !isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="수정">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="삭제">
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          {currentUserId && !isAuthor && !isEditing && (
            <>
              <button onClick={() => setShowMessageModal(true)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="쪽지">
                <Mail className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleReport} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="신고">
                <Flag className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleBlock} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="차단">
                <ShieldX className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {canModDelete && (
            <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="운영자 삭제">
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {canModBan && (
            <button onClick={() => setShowBanModal(true)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="게시판 차단">
              <ShieldOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 pl-9">
        {isEditing ? (
          <div className="space-y-2">
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="input-field resize-none text-sm" autoFocus disabled={isUpdating} />
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={isUpdating || !editContent.trim()} className="btn-primary text-xs px-3 py-1.5">
                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                저장
              </button>
              <button onClick={handleCancelEdit} disabled={isUpdating} className="btn-secondary text-xs px-3 py-1.5">
                <X className="w-3 h-3" />
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => handleVote('up')} disabled={isVoting || !currentUserId || isAuthor === true}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  localVote === 'up' ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}>
                <ThumbsUp className="w-3 h-3" />
                <span>{localUpVotes}</span>
              </button>
              <button onClick={() => handleVote('down')} disabled={isVoting || !currentUserId || isAuthor === true}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  localVote === 'down' ? 'bg-red-100 text-red-500 font-semibold' : 'text-gray-400 hover:text-red-400 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}>
                <ThumbsDown className="w-3 h-3" />
                <span>{localDownVotes}</span>
              </button>
              {currentUserId && !isReply && !comment.deleted_by_admin && (
                <button
                  onClick={() => setShowReplyForm(prev => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" />
                  답글 {replies.length > 0 && <span className="text-gray-400">{replies.length}</span>}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* 답글 폼 */}
      {showReplyForm && (
        <div className="mt-3 pl-9">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            replyTo={comment.author}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* 대댓글 목록 */}
      {!isReply && replies.length > 0 && (
        <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-0">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              viewerIsMod={viewerIsMod}
              categoryId={categoryId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}
