'use client'

import { useParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { useNotice, useUpdateNotice } from '@/hooks/useNotices'
import NoticeForm, { type NoticeFormValues } from '@/components/notices/NoticeForm'

export default function AdminNoticeEditPage() {
  const params = useParams()
  const id = params?.id as string

  const { data: notice, isLoading, isError } = useNotice(id)
  const { mutate: updateNotice, isPending, error } = useUpdateNotice()

  const handleSubmit = (values: NoticeFormValues) => {
    updateNotice({ id, data: { title: values.title, content: values.content, is_pinned: values.is_pinned } })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (isError || !notice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-600">공지사항을 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">공지 수정</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">공지사항 내용을 수정하세요</p>
      </div>
      <NoticeForm
        initialValues={{ title: notice.title, content: notice.content, is_pinned: notice.is_pinned }}
        submitLabel="수정 완료"
        isPending={isPending}
        error={error}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
