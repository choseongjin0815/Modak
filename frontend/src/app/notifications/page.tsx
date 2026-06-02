'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Bell, MessageSquare, Reply, Mail, CheckCheck, Loader2 } from 'lucide-react'
import { notificationsApi } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { Notification } from '@/types'

const TYPE_ICON = {
  post_comment: <MessageSquare className="w-4 h-4 text-blue-500" />,
  comment_reply: <Reply className="w-4 h-4 text-green-500" />,
  new_message: <Mail className="w-4 h-4 text-purple-500" />,
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) { router.push('/login'); return }
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await notificationsApi.getList(1, 50)
      setItems(res.items)
    } finally { setLoading(false) }
  }

  const handleClick = async (item: Notification) => {
    if (!item.is_read) {
      await notificationsApi.markRead(item.id)
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
    }
    if (item.link) router.push(item.link)
  }

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  if (!mounted) return null

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />알림
        </h1>
        {items.some(n => !n.is_read) && (
          <button onClick={handleMarkAll} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
            <CheckCheck className="w-4 h-4" />모두 읽음
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">알림이 없습니다</div>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={`w-full flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left ${!item.is_read ? 'bg-blue-50/40' : ''}`}
            >
              <div className="mt-0.5 flex-shrink-0">{TYPE_ICON[item.type]}</div>
              <div className="flex-1">
                <p className={`text-sm ${!item.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {item.content}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(item.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                </p>
              </div>
              {!item.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
