'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { votesApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'

export const useVotePost = (postId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (voteType: 'up' | 'down') => votesApi.votePost(postId, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detailAuth(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}

export const useVoteComment = (postId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, voteType }: { commentId: string; voteType: 'up' | 'down' }) =>
      votesApi.voteComment(commentId, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) })
    },
  })
}
