'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flame, AlertCircle, Lock, X } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'

const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { mutate: login, isPending, error } = useLogin()
  const [alertOpen, setAlertOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (error) setAlertOpen(true)
  }, [error])

  const onSubmit = (data: LoginFormData) => {
    login({ username: data.username, password: data.password })
  }

  const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; message?: string } | null
  const errorStatus = axiosError?.response?.status
  const errorDetail = axiosError?.response?.data?.detail || axiosError?.message || '로그인에 실패했습니다.'
  const isLocked = errorStatus === 423

  return (
    <div
      onClick={() => setAlertOpen(false)} 
      className="min-h-[calc(100vh-8rem)] flex items-center justify-center"
    >

      {/* Alert Modal */}
      {alertOpen && error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className={`px-6 pt-6 pb-4 ${isLocked ? 'bg-amber-50' : 'bg-red-50'}`}>
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-full ${isLocked ? 'bg-amber-100' : 'bg-red-100'}`}>
                  {isLocked
                    ? <Lock className="w-6 h-6 text-amber-600" />
                    : <AlertCircle className="w-6 h-6 text-red-500" />
                  }
                </div>
                <button onClick={() => setAlertOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h2 className={`mt-3 text-base font-bold ${isLocked ? 'text-amber-900' : 'text-red-800'}`}>
                {isLocked ? '계정이 잠겼습니다' : '로그인 실패'}
              </h2>
              <p className={`mt-1 text-sm ${isLocked ? 'text-amber-700' : 'text-red-600'}`}>
                {errorDetail}
              </p>
            </div>
            <div className="px-6 py-4">
              <button
                onClick={() => setAlertOpen(false)}
                className={`w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                  isLocked
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-orange-100 rounded-full">
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
            <p className="text-sm text-gray-500 mt-1">계정에 로그인하세요</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                id="username"
                type="text"
                placeholder="아이디를 입력하세요"
                className="input-field"
                {...register('username')}
              />
              {errors.username && (
                <p className="error-message">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                className="input-field"
                {...register('password')}
              />
              {errors.password && (
                <p className="error-message">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5"
            >
              {isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              계정이 없으신가요?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
