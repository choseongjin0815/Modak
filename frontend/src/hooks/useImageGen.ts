'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { imagesApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import type { ImageGenerateRequest } from '@/types'

export const useImageQuota = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.images.quota,
    queryFn: () => imagesApi.getQuota(),
    enabled,
  })
}

export const useGenerateImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImageGenerateRequest) => imagesApi.generate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.quota })
    },
  })
}
