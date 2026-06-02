'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Mail, Send, Trash2, Loader2, PenSquare, ChevronLeft } from 'lucide-react'
import { messagesApi } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { Message } from '@/types'
import MessageModal from '@/components/ui/MessageModal'

export default function MessagesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const [items, setItems] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) { router.push('/login'); return }
    loadMessages(tab, 1)
  }, [])

  useEffect(() => {
    if (mounted) loadMessages(tab, 1)
  }, [tab])

  const loadMessages = async (t: 'inbox' | 'sent', p: number) => {
    setLoading(true)
    setSelected(null)
    try {
      const res = t === 'inbox' ? await messagesApi.getInbox(p) : await messagesApi.getSent(p)
      setItems(res.items)
      setTotal(res.total)
      setPage(res.page)
      setPages(res.pages)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (msg: Message) => {
    setSelected(msg)
    if (tab === 'inbox' && !msg.is_read) {
      await messagesApi.markRead(msg.id)
      setItems(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    await messagesApi.delete(id)
    setItems(prev => prev.filter(m => m.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-purple-500" />쪽지함
        </h1>
        <button onClick={() => setShowCompose(true)} className="btn-primary text-sm px-3 py-2">
          <PenSquare className="w-4 h-4" />쪽지 쓰기
        </button>
      </div>

      {showCompose && (
        <MessageModal
          onClose={() => setShowCompose(false)}
          onSent={() => tab === 'sent' && loadMessages('sent', 1)}
        />
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['inbox', 'sent'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t === 'inbox' ? `받은 쪽지 (${total})` : '보낸 쪽지'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 목록 */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">쪽지가 없습니다</div>
          ) : (
            <div>
              {items.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`flex items-start gap-3 p-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === msg.id ? 'bg-purple-50' : ''} ${tab === 'inbox' && !msg.is_read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium truncate ${tab === 'inbox' && !msg.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {tab === 'inbox' ? msg.sender_username : msg.receiver_username}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {format(new Date(msg.created_at), 'MM/dd HH:mm', { locale: ko })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{msg.content}</p>
                  </div>
                  {tab === 'inbox' && !msg.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="flex justify-center gap-2 p-3 border-t border-gray-100">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => loadMessages(tab, p)}
                  className={`w-7 h-7 rounded text-xs font-medium ${p === page ? 'bg-purple-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 상세 */}
        <div className="card p-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">
                    {tab === 'inbox' ? `보낸 사람: ${selected.sender_username}` : `받는 사람: ${selected.receiver_username}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(selected.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </p>
                </div>
                <div className="flex gap-1">
                  {tab === 'inbox' && (
                    <button
                      onClick={() => setShowCompose(true)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />답장
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />삭제
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
              </div>
              {tab === 'inbox' && (
                <button
                  onClick={() => { setShowCompose(true) }}
                  className="w-full btn-secondary text-sm"
                >
                  <Send className="w-4 h-4" />
                  {selected.sender_username}님에게 답장
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Mail className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">쪽지를 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
