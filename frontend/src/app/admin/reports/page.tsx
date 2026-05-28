'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { adminApi } from '@/lib/api'
import type { Report, ReportStatus } from '@/types'

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: '처리 대기',
  RESOLVED: '처리 완료',
  REJECTED: '반려',
}

const STATUS_COLOR: Record<ReportStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-500',
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => { load() }, [page, statusFilter])

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getReports(page, 20, statusFilter || undefined)
      setReports(res.items)
      setTotal(res.total)
      setPages(res.pages)
    } finally { setLoading(false) }
  }

  const handleResolve = async (id: string, status: 'RESOLVED' | 'REJECTED') => {
    setResolving(id)
    try {
      await adminApi.resolveReport(id, status)
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } finally { setResolving(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">신고 관리</h1>
        <span className="text-sm text-gray-500">총 {total.toLocaleString()}건</span>
      </div>

      <div className="flex gap-2">
        {(['', 'PENDING', 'RESOLVED', 'REJECTED'] as const).map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === '' ? '전체' : STATUS_LABEL[s as ReportStatus]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="card p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
        ) : reports.length === 0 ? (
          <div className="card p-10 text-center text-gray-400 text-sm">신고 내역이 없습니다.</div>
        ) : reports.map(report => (
          <div key={report.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[report.status]}`}>
                    {STATUS_LABEL[report.status]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${report.target_type === 'POST' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {report.target_type === 'POST' ? '게시글' : '댓글'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{report.reason}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>신고자: {report.reporter_username}</span>
                  <span>{format(new Date(report.created_at), 'yy.MM.dd HH:mm', { locale: ko })}</span>
                </div>
                {report.target_type === 'POST' && (
                  <Link href={`/posts/${report.target_id}`} target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                    <ExternalLink className="w-3 h-3" />게시글 보기
                  </Link>
                )}
              </div>
              {report.status === 'PENDING' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleResolve(report.id, 'RESOLVED')} disabled={resolving === report.id}
                    title="처리 완료"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors">
                    {resolving === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    완료
                  </button>
                  <button onClick={() => handleResolve(report.id, 'REJECTED')} disabled={resolving === report.id}
                    title="반려"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                    <XCircle className="w-4 h-4" />반려
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
