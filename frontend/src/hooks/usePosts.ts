'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { postsApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import type { PostFilters } from '@/types'

export const usePosts = (filters: PostFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.posts.list(filters as Record<string, unknown>),
    queryFn: () => postsApi.getPosts(filters),
  })
}

export const usePost = (id: string) => {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: () => postsApi.getPost(id),
    enabled: !!id,
  })
}

export const usePostWithAuth = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.posts.detailAuth(id),
    queryFn: () => postsApi.getPostWithAuth(id),
    enabled: !!id && enabled,
  })
}

export const useCreatePost = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (formData: FormData) => postsApi.createPost(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
      router.push(`/posts/${data.id}`)
    },
  })
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; content?: string; category?: string | null } }) =>
      postsApi.updatePost(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detailAuth(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (id: string) => postsApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
      router.push('/')
    },
  })
}
