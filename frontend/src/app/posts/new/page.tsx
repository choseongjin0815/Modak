'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, FileText, Loader2, AlertCircle, Sparkles, ImageIcon } from 'lucide-react'
import { useCreatePost } from '@/hooks/usePosts'
import { useGenerateImage, useImageQuota } from '@/hooks/useImageGen'
import { imagesApi } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { useCategoryGroups } from '@/hooks/useCategories'

const postSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하이어야 합니다'),
  content: z.string().min(1, '내용을 입력해주세요'),
  category: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

interface GeneratedImage {
  token: string
  previewObjectUrl: string
}

export default function NewPostPage() {
  const router = useRouter()
  const { mutate: createPost, isPending, error } = useCreatePost()
  const categoryGroups = useCategoryGroups()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // SSR 가드: 마운트 이후에만 인증/quota 접근
  const [mounted, setMounted] = useState(false)

  // AI 이미지 생성 상태
  const [prompt, setPrompt] = useState('')
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [genError, setGenError] = useState<string | null>(null)
  const { mutate: generateImage, isPending: isGenerating } = useGenerateImage()
  const { data: quota } = useImageQuota(mounted)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  // 언마운트 시 생성된 미리보기 objectURL 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      generatedImages.forEach((img) => URL.revokeObjectURL(img.previewObjectUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  })

  const onSubmit = (data: PostFormData) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('content', data.content)
    if (data.category) formData.append('category', data.category)
    selectedFiles.forEach((file) => formData.append('files', file))
    // AI 생성 이미지 token을 반복 폼 필드로 전송
    generatedImages.forEach((img) => formData.append('ai_image_tokens', img.token))
    createPost(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))

  const removeGeneratedImage = (index: number) => {
    setGeneratedImages((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewObjectUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const remaining = quota?.remaining ?? null
  const limit = quota?.limit ?? null
  const canGenerate = remaining === null || remaining > 0

  const handleGenerate = () => {
    setGenError(null)
    const trimmed = prompt.trim()
    if (!trimmed) {
      setGenError('이미지 설명(프롬프트)을 입력해주세요.')
      return
    }
    generateImage(
      { prompt: trimmed },
      {
        onSuccess: async (res) => {
          try {
            // 미리보기 엔드포인트는 Authorization 헤더가 필요 → blob fetch 후 objectURL 사용
            const objectUrl = await imagesApi.getPreviewObjectUrl(res.token)
            setGeneratedImages((prev) => [...prev, { token: res.token, previewObjectUrl: objectUrl }])
            setPrompt('')
          } catch {
            setGenError('생성된 이미지 미리보기를 불러오지 못했습니다.')
          }
        },
        onError: (err) => {
          const axiosError = err as { response?: { status?: number; data?: { detail?: string } }; message?: string }
          const status = axiosError.response?.status
          const detail = axiosError.response?.data?.detail
          if (status === 429) {
            setGenError(detail || '이미지 생성 횟수를 초과했습니다.')
          } else if (status === 503) {
            setGenError(detail || '이미지 생성 기능이 현재 비활성화되어 있습니다.')
          } else {
            setGenError(detail || axiosError.message || '이미지 생성 중 오류가 발생했습니다.')
          }
        },
      }
    )
  }

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

          {/* AI Image Generation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="ai-prompt" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI 이미지 생성
              </label>
              {mounted && remaining !== null && limit !== null && (
                <span className="text-xs text-gray-500">
                  남은 횟수 <span className="font-semibold text-gray-700">{remaining}</span> / {limit}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="ai-prompt"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (!isGenerating && canGenerate) handleGenerate()
                  }
                }}
                maxLength={1000}
                placeholder="생성할 이미지를 설명해주세요"
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className="btn-primary whitespace-nowrap"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />생성 중...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />이미지 생성</>
                )}
              </button>
            </div>
            {!canGenerate && (
              <p className="text-xs text-gray-400 mt-1">이번 주 생성 가능 횟수를 모두 사용했습니다.</p>
            )}
            {genError && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{genError}</p>
              </div>
            )}
            {generatedImages.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {generatedImages.map((img, index) => (
                  <div key={img.token} className="relative group border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewObjectUrl} alt={`AI 생성 이미지 ${index + 1}`} className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGeneratedImage(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
                      aria-label="이미지 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-purple-600/80 text-white text-[10px] rounded">
                      <ImageIcon className="w-3 h-3" />AI
                    </div>
                  </div>
                ))}
              </div>
            )}
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
