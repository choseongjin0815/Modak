'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, MessageSquare, Reply, Mail } from 'lucide-react'
import { notificationsApi } from '@/lib/api'
import { getToken, isAuthenticated } from '@/lib/auth'
import type { Notification } from '@/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const TYPE_ICON: Record<string, JSX.Element> = {
  post_comment: <MessageSquare className="w-4 h-4 text-blue-500" />,
  comment_reply: <Reply className="w-4 h-4 text-green-500" />,
  new_message: <Mail className="w-4 h-4 text-purple-500" />,
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  // 초기 미읽음 수 로드
  const fetchCount = async () => {
    try {
      const { count } = await notificationsApi.getUnreadCount()
      setUnread(count)
    } catch {}
  }

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await notificationsApi.getList(1, 15)
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  // SSE 연결
  const connectSSE = () => {
    if (!isAuthenticated()) return
    const token = getToken()
    if (!token) return

    const es = new EventSource(`${API_URL}/notifications/stream?token=${token}`)
    esRef.current = es

    es.addEventListener('notification', (e) => {
      const data: Notification = JSON.parse(e.data)
      setUnread(prev => prev + 1)
      // 드롭다운이 열려있으면 목록에도 추가
      setItems(prev => [data, ...prev].slice(0, 15))
    })

    es.addEventListener('ping', () => {}) // keep-alive 무시

    es.onerror = () => {
      es.close()
      esRef.current = null
      // 5초 후 재연결 시도
      setTimeout(() => {
        if (isAuthenticated()) connectSSE()
      }, 5_000)
    }
  }

  useEffect(() => {
    fetchCount()
    connectSSE()

    // auth-change 이벤트 감지 (로그인/로그아웃 시 SSE 재연결)
    const handleAuthChange = () => {
      esRef.current?.close()
      esRef.current = null
      if (isAuthenticated()) {
        fetchCount()
        connectSSE()
      } else {
        setUnread(0)
        setItems([])
      }
    }
    window.addEventListener('auth-change', handleAuthChange)

    return () => {
      esRef.current?.close()
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    setOpen(prev => !prev)
    if (!open) fetchList()
  }

  const handleClickItem = async (item: Notification) => {
    if (!item.is_read) {
      await notificationsApi.markRead(item.id)
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    }
    if (item.link) {
      router.push(item.link)
      setOpen(false)
    }
  }

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        title="알림"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">알림</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <CheckCheck className="w-3.5 h-3.5" />모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">알림이 없습니다</div>
            ) : (
              items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${!item.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {TYPE_ICON[item.type] ?? <Bell className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!item.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {item.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(item.created_at), 'MM/dd HH:mm', { locale: ko })}
                    </p>
                  </div>
                  {!item.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2">
            <button onClick={() => { router.push('/notifications'); setOpen(false) }} className="text-xs text-gray-500 hover:text-gray-800">
              모든 알림 보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
