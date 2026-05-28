'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useCreateComment } from '@/hooks/useComments'

interface CommentFormProps {
  postId: string
}

export default function CommentForm({ postId }: CommentFormProps) {
  const [content, setContent] = useState('')
  const { mutate: createComment, isPending } = useCreateComment(postId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    createComment(trimmed, {
      onSuccess: () => {
        setContent('')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 입력하세요..."
        rows={3}
        className="input-field resize-none"
        disabled={isPending}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="btn-primary"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              등록 중...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              댓글 등록
            </>
          )}
        </button>
      </div>
    </form>
  )
}
