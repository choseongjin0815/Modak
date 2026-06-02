'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'

export const useComments = (postId: string) => {
  return useQuery({
    queryKey: queryKeys.comments.byPost(postId),
    queryFn: () => commentsApi.getComments(postId),
    enabled: !!postId,
  })
}

export const useCreateComment = (postId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      commentsApi.createComment(postId, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) })
    },
  })
}

export const useUpdateComment = (postId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentsApi.updateComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) })
    },
  })
}

export const useDeleteComment = (postId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => commentsApi.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) })
    },
  })
}
