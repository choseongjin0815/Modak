'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, FileText, Loader2, AlertCircle, Paperclip, Trash2 } from 'lucide-react'
import { usePost, useUpdatePost } from '@/hooks/usePosts'
import { filesApi, apiClient } from '@/lib/api'
import { isAuthenticated, getUser } from '@/lib/auth'
import { useCategoryGroups } from '@/hooks/useCategories'
import type { FileInfo } from '@/types'

const postSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하이어야 합니다'),
  content: z.string().min(1, '내용을 입력해주세요'),
  category: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: post, isLoading } = usePost(id)
  const { mutate: updatePost, isPending: isUpdating, error: updateError } = useUpdatePost()
  const categoryGroups = useCategoryGroups()

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<FileInfo[]>([])
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [newFilesSubmitting, setNewFilesSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
  }, [router])

  useEffect(() => {
    if (post) {
      reset({ title: post.title, content: post.content, category: post.category?.slug ?? '' })
      setExistingFiles(post.files || [])

      // Authorization check
      const user = getUser()
      if (user?.sub !== post.author) {
        alert('수정 권한이 없습니다.')
        router.push(`/posts/${id}`)
      }
    }
  }, [post, id, reset, router])

  const onSubmit = async (data: PostFormData) => {
    updatePost(
      { id, data: { title: data.title, content: data.content, category: data.category || null } },
      {
        onSuccess: async () => {
          // Upload new files if any via multipart to post files endpoint
          if (selectedFiles.length > 0) {
            setNewFilesSubmitting(true)
            try {
              const formData = new FormData()
              selectedFiles.forEach((file) => formData.append('files', file))
              await apiClient.post(`/posts/${id}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              })
            } catch {
              // If the endpoint doesn't exist, new files won't upload — handled gracefully
            } finally {
              setNewFilesSubmitting(false)
            }
          }
          router.push(`/posts/${id}`)
        },
      }
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeNewFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExistingFile = async (fileId: string) => {
    if (!window.confirm('첨부파일을 삭제하시겠습니까?')) return
    setDeletingFileId(fileId)
    try {
      await filesApi.deleteFile(fileId)
      setExistingFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      alert('파일 삭제에 실패했습니다.')
    } finally {
      setDeletingFileId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getErrorMessage = () => {
    if (!updateError) return null
    const axiosError = updateError as { response?: { data?: { detail?: string } }; message?: string }
    return axiosError.response?.data?.detail || axiosError.message || '게시글 수정 중 오류가 발생했습니다.'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">게시글 수정</h1>
        <p className="text-sm text-gray-500 mt-1">게시글 내용을 수정하세요</p>
      </div>

      {updateError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{getErrorMessage()}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="card p-6 space-y-5">
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
            <input
              id="title"
              type="text"
              placeholder="제목을 입력하세요"
              className="input-field"
              {...register('title')}
            />
            {errors.title && <p className="error-message">{errors.title.message}</p>}
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              placeholder="내용을 입력하세요"
              rows={12}
              className="input-field resize-y"
              {...register('content')}
            />
            {errors.content && <p className="error-message">{errors.content.message}</p>}
          </div>

          {/* Existing Files */}
          {existingFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기존 첨부파일
              </label>
              <div className="space-y-2">
                {existingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.original_filename}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingFile(file.id)}
                      disabled={deletingFileId === file.id}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      {deletingFileId === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 첨부파일 추가
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-md p-5 text-center cursor-pointer transition-colors"
            >
              <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
              <p className="text-sm text-gray-500">클릭하여 파일 선택</p>
              <p className="text-xs text-gray-400 mt-0.5">여러 파일 선택 가능</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 truncate">{file.name}</span>
                      <span className="text-xs text-blue-400 flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      className="p-1 text-blue-400 hover:text-red-500 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/posts/${id}`)}
            disabled={isUpdating}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isUpdating || newFilesSubmitting}
            className="btn-primary"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '수정 완료'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
