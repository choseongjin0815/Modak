'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pointsApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'

export const useMyPoints = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.points.me,
    queryFn: () => pointsApi.getMyPoints(),
    enabled,
  })
}

export const useAttendance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => pointsApi.checkAttendance(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.points.me })
    },
  })
}
