'use client'

import { useState } from 'react'
import { X, ShieldOff } from 'lucide-react'
import { moderationApi } from '@/lib/api'

const DURATION_OPTIONS = [
  { value: '1h',        label: '1시간' },
  { value: '6h',        label: '6시간' },
  { value: '24h',       label: '24시간' },
  { value: '7d',        label: '7일' },
  { value: '30d',       label: '30일' },
  { value: 'permanent', label: '영구' },
]

interface BanModalProps {
  targetUserId: string
  targetUsername: string
  categoryId: number
  onClose: () => void
  onDone: () => void
}

export default function BanModal({ targetUserId, targetUsername, categoryId, onClose, onDone }: BanModalProps) {
  const [selected, setSelected] = useState('24h')
  const [loading, setLoading] = useState(false)

  const handleBan = async () => {
    setLoading(true)
    try {
      await moderationApi.ban(targetUserId, categoryId, selected)
      onDone()
    } catch (e: any) {
      alert(e.response?.data?.detail || '차단에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-red-50 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-full bg-red-100">
              <ShieldOff className="w-5 h-5 text-red-600" />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="mt-3 text-base font-bold text-red-900">게시판 차단</h2>
          <p className="mt-1 text-sm text-red-700">
            <span className="font-semibold">{targetUsername}</span> 님을 이 게시판에서 차단합니다.
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">차단 기간</p>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selected === opt.value
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button
              onClick={handleBan}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '차단'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
