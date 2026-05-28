'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react'
import { useCreatePost } from '@/hooks/usePosts'
import { isAuthenticated } from '@/lib/auth'
import { useCategoryGroups } from '@/hooks/useCategories'

const postSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하이어야 합니다'),
  content: z.string().min(1, '내용을 입력해주세요'),
  category: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

export default function NewPostPage() {
  const router = useRouter()
  const { mutate: createPost, isPending, error } = useCreatePost()
  const categoryGroups = useCategoryGroups()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { register, handleSubmit, formState: { errors } } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  })

  const onSubmit = (data: PostFormData) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('content', data.content)
    if (data.category) formData.append('category', data.category)
    selectedFiles.forEach((file) => formData.append('files', file))
    createPost(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getErrorMessage = () => {
    if (!error) return null
    const axiosError = error as { response?: { data?: { detail?: string } }; message?: string }
    return axiosError.response?.data?.detail || axiosError.message || '게시글 작성 중 오류가 발생했습니다.'
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">글쓰기</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">새 게시글을 작성하세요</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{getErrorMessage()}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        <div className="card p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              카테고리
            </label>
            <select id="category" className="input-field" {...register('category')}>
              <option value="">카테고리 선택 (선택사항)</option>
              {Object.entries(categoryGroups).map(([, group]) => (
                <optgroup key={group.label} label={group.label}>
                  {group.categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input id="title" type="text" placeholder="제목을 입력하세요" className="input-field" {...register('title')} />
            {errors.title && <p className="error-message">{errors.title.message}</p>}
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea id="content" placeholder="내용을 입력하세요" rows={12} className="input-field resize-y" {...register('content')} />
            {errors.content && <p className="error-message">{errors.content.message}</p>}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">첨부파일</label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-md p-6 text-center cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">클릭하여 파일 선택</p>
              <p className="text-xs text-gray-400 mt-1">여러 파일 선택 가능</p>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3">
          <button type="button" onClick={() => router.push('/')} disabled={isPending} className="btn-secondary">취소</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />등록 중...</> : '게시글 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
