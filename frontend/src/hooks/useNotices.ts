'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { noticesApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import type { NoticeCreate, NoticeUpdate } from '@/types'

interface NoticeListFilters {
  page?: number
  size?: number
  search?: string
}

export const useNotices = (filters: NoticeListFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.notices.list(filters as Record<string, unknown>),
    queryFn: () => noticesApi.getNotices(filters),
  })
}

export const usePinnedNotices = (limit = 3) => {
  return useQuery({
    queryKey: queryKeys.notices.pinned(limit),
    queryFn: () => noticesApi.getPinned(limit),
  })
}

export const useNotice = (id: string) => {
  return useQuery({
    queryKey: queryKeys.notices.detail(id),
    queryFn: () => noticesApi.getNotice(id),
    enabled: !!id,
  })
}

export const useCreateNotice = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (payload: NoticeCreate) => noticesApi.createNotice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.all })
      router.push('/admin/notices')
    },
  })
}

export const useUpdateNotice = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NoticeUpdate }) => noticesApi.updateNotice(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.all })
      router.push('/admin/notices')
    },
  })
}

export const useDeleteNotice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => noticesApi.deleteNotice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.all })
    },
  })
}
