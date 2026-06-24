'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

export interface NoticeFormValues {
  title: string
  content: string
  is_pinned: boolean
}

interface NoticeFormProps {
  initialValues?: NoticeFormValues
  submitLabel: string
  isPending: boolean
  error?: unknown
  onSubmit: (values: NoticeFormValues) => void
}

export default function NoticeForm({ initialValues, submitLabel, isPending, error, onSubmit }: NoticeFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [isPinned, setIsPinned] = useState(initialValues?.is_pinned ?? false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setValidationError('제목을 입력해주세요.')
      return
    }
    if (!content.trim()) {
      setValidationError('내용을 입력해주세요.')
      return
    }
    setValidationError(null)
    onSubmit({ title: title.trim(), content: content.trim(), is_pinned: isPinned })
  }

  const getErrorMessage = () => {
    if (!error) return null
    const axiosError = error as { response?: { data?: { detail?: string } }; message?: string }
    return axiosError.response?.data?.detail || axiosError.message || '저장 중 오류가 발생했습니다.'
  }

  const apiError = getErrorMessage()

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {(validationError || apiError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{validationError || apiError}</p>
        </div>
      )}

      <div className="card p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="공지 제목을 입력하세요"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            placeholder="공지 내용을 입력하세요"
            className="input-field resize-y"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700">상단 고정 (게시글 목록 상단 배너에 노출)</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 sm:gap-3">
        <button type="button" onClick={() => router.push('/admin/notices')} disabled={isPending} className="btn-secondary">
          취소
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
