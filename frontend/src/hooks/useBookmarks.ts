'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookmarksApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'

export const useMyBookmarks = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.bookmarks.me,
    queryFn: () => bookmarksApi.getMyBookmarks(),
    enabled,
  })
}

export const useToggleBookmark = (postId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => bookmarksApi.toggle(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detailAuth(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.me })
    },
  })
}
