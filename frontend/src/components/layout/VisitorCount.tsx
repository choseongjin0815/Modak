'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { getUser } from '@/lib/auth'

const HEARTBEAT_INTERVAL = process.env.NODE_ENV === 'development'
  ? 30_000          // 개발: 30초
  : 10 * 60 * 1000  // 운영: 10분

const SESSION_KEY = 'modak_visit_counted'

interface Stats {
  today: number
  total: number
}

function getVisitorKey(): string {
  const user = getUser()
  if (user?.sub) return `user:${user.sub}`
  const stored = localStorage.getItem('modak_visitor_id')
  if (stored) return stored
  const newId = `anon:${crypto.randomUUID()}`
  localStorage.setItem('modak_visitor_id', newId)
  return newId
}

// 이번 탭 세션에서 이미 카운트한 visitor_key
function getSessionKey(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}

function setSessionKey(key: string): void {
  try { sessionStorage.setItem(SESSION_KEY, key) } catch {}
}

export default function VisitorCount() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchStats = () =>
      apiClient.get<Stats>('/visits/stats')
        .then(res => setStats(res.data))
        .catch(() => {})

    const record = (key: string) =>
      apiClient.post('/visits', { visitor_key: key })
        .then(() => { setSessionKey(key); fetchStats() })
        .catch(() => {})

    const startInterval = () => {
      if (interval) clearInterval(interval)
      const key = getVisitorKey()

      // 이번 세션에서 아직 카운트 안 한 visitor_key면 즉시 기록
      // (새 방문자, 다른 계정 로그인 포함)
      // 같은 계정 새로고침이면 sessionStorage에 동일 key가 있으므로 스킵
      if (getSessionKey() !== key) {
        record(key)
      }

      // 10분마다 반복 (세션 중복 체크 없이 항상 기록)
      interval = setInterval(async () => {
        await apiClient.post('/visits', { visitor_key: key }).catch(() => {})
        fetchStats()
      }, HEARTBEAT_INTERVAL)
    }

    fetchStats()
    startInterval()

    window.addEventListener('auth-change', startInterval)
    return () => {
      if (interval) clearInterval(interval)
      window.removeEventListener('auth-change', startInterval)
    }
  }, [])

  if (!stats) return null

  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
      <Users className="w-3 h-3" />
      <span>오늘 방문자 <strong className="text-gray-500">{stats.today.toLocaleString()}</strong></span>
      <span className="text-gray-300">·</span>
      <span>총 방문자 <strong className="text-gray-500">{stats.total.toLocaleString()}</strong></span>
    </div>
  )
}
