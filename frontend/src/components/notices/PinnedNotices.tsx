'use client'

import Link from 'next/link'
import { Pin, Megaphone } from 'lucide-react'
import { usePinnedNotices } from '@/hooks/useNotices'

interface PinnedNoticesProps {
  limit?: number
}

export default function PinnedNotices({ limit = 3 }: PinnedNoticesProps) {
  const { data: notices } = usePinnedNotices(limit)

  if (!notices || notices.length === 0) return null

  return (
    <div className="card border-orange-200 bg-orange-50/40 p-3 sm:p-4">
      <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-orange-700">
        <Megaphone className="w-4 h-4" />
        공지사항
      </div>
      <ul className="space-y-1">
        {notices.map((notice) => (
          <li key={notice.id}>
            <Link
              href={`/notices/${notice.id}`}
              className="flex items-center gap-2 px-1 py-1 text-sm text-gray-700 hover:text-orange-600 transition-colors"
            >
              <Pin className="w-3 h-3 text-orange-400 flex-shrink-0" />
              <span className="truncate">{notice.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
