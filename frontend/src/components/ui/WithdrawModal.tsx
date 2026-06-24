'use client'

import { useState } from 'react'
import { X, AlertTriangle, Loader2, Lock } from 'lucide-react'
import { useWithdraw } from '@/hooks/useWithdraw'

interface WithdrawModalProps {
  onClose: () => void
}

export default function WithdrawModal({ onClose }: WithdrawModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const withdraw = useWithdraw()

  const handleWithdraw = async () => {
    setError('')
    if (!password) {
      setError('비밀번호를 입력해주세요')
      return
    }
    try {
      // 성공 시 훅이 removeToken() + router.push('/') 처리 → 모달은 닫히며 자연 언마운트.
      await withdraw.mutateAsync(password)
    } catch (e: any) {
      // 비밀번호 불일치는 400으로 내려오므로 401 인터셉터에 걸리지 않고 여기서 처리된다.
      setError(e?.response?.data?.detail || '회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* 배경 클릭 시 닫기 (click-outside). 처리 중에는 닫기 비활성화. */}
      <div className="absolute inset-0" onClick={() => { if (!withdraw.isPending) onClose() }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-red-50 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <button
              onClick={onClose}
              disabled={withdraw.isPending}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="mt-3 text-base font-bold text-red-900">회원 탈퇴</h2>
          <p className="mt-1 text-sm text-red-700 leading-relaxed">
            탈퇴 시 작성한 모든 게시글·댓글·쪽지가 영구 삭제되며 복구할 수 없습니다.
            계속하시려면 비밀번호를 입력해주세요.
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !withdraw.isPending) handleWithdraw() }}
              disabled={withdraw.isPending}
              className="input-field pl-9"
              placeholder="현재 비밀번호"
              autoFocus
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={withdraw.isPending}
              className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleWithdraw}
              disabled={withdraw.isPending}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {withdraw.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '탈퇴하기'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
