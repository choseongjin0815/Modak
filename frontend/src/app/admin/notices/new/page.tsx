'use client'

import { useCreateNotice } from '@/hooks/useNotices'
import NoticeForm, { type NoticeFormValues } from '@/components/notices/NoticeForm'

export default function AdminNoticeNewPage() {
  const { mutate: createNotice, isPending, error } = useCreateNotice()

  const handleSubmit = (values: NoticeFormValues) => {
    createNotice({ title: values.title, content: values.content, is_pinned: values.is_pinned })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">공지 작성</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">새 공지사항을 작성하세요</p>
      </div>
      <NoticeForm submitLabel="공지 등록" isPending={isPending} error={error} onSubmit={handleSubmit} />
    </div>
  )
}
