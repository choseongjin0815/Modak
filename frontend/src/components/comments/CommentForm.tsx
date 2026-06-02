'use client'

import { useState } from 'react'
import { Send, Loader2, X } from 'lucide-react'
import { useCreateComment } from '@/hooks/useComments'

interface CommentFormProps {
  postId: string
  parentId?: string
  replyTo?: string
  onCancel?: () => void
}

export default function CommentForm({ postId, parentId, replyTo, onCancel }: CommentFormProps) {
  const [content, setContent] = useState('')
  const { mutate: createComment, isPending } = useCreateComment(postId)
  const isReply = !!parentId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    createComment({ content: trimmed, parentId }, {
      onSuccess: () => {
        setContent('')
        onCancel?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyTo && (
        <p className="text-xs text-blue-600 font-medium">@{replyTo} 에게 답글</p>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
        rows={isReply ? 2 : 3}
        className="input-field resize-none text-sm"
        disabled={isPending}
        autoFocus={isReply}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary text-sm px-3 py-1.5">
            <X className="w-3.5 h-3.5" />
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="btn-primary text-sm px-3 py-1.5"
        >
          {isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />등록 중...</>
            : <><Send className="w-3.5 h-3.5" />{isReply ? '답글 등록' : '댓글 등록'}</>
          }
        </button>
      </div>
    </form>
  )
}
