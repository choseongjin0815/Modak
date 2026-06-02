'use client'

import { useState } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { messagesApi } from '@/lib/api'

interface MessageModalProps {
  defaultReceiver?: string
  onClose: () => void
  onSent?: () => void
}

export default function MessageModal({ defaultReceiver = '', onClose, onSent }: MessageModalProps) {
  const [receiver, setReceiver] = useState(defaultReceiver)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!receiver.trim() || !content.trim()) return
    setLoading(true)
    setError('')
    try {
      await messagesApi.send(receiver.trim(), content.trim())
      onSent?.()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || '전송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">쪽지 보내기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">받는 사람 (아이디)</label>
            <input
              value={receiver}
              onChange={e => setReceiver(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="input-field"
              disabled={!!defaultReceiver}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="쪽지 내용을 입력하세요..."
              rows={5}
              className="input-field resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 pb-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">취소</button>
          <button
            onClick={handleSend}
            disabled={loading || !receiver.trim() || !content.trim()}
            className="btn-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            보내기
          </button>
        </div>
      </div>
    </div>
  )
}
