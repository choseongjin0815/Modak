import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
    detailAuth: (id: string) => [...queryKeys.posts.details(), id, 'auth'] as const,
  },
  comments: {
    all: ['comments'] as const,
    byPost: (postId: string) => [...queryKeys.comments.all, 'post', postId] as const,
  },
  points: {
    me: ['points', 'me'] as const,
  },
  bookmarks: {
    me: ['bookmarks', 'me'] as const,
  },
  users: {
    me: ['users', 'me'] as const,
    myPosts: (page: number) => ['users', 'me', 'posts', page] as const,
  },
  blacklist: {
    me: ['blacklist', 'me'] as const,
  },
  admin: {
    users: (page: number, search?: string) => ['admin', 'users', page, search] as const,
    posts: (page: number, search?: string) => ['admin', 'posts', page, search] as const,
    reports: (page: number, status?: string) => ['admin', 'reports', page, status] as const,
  },
  auth: {
    currentUser: ['auth', 'currentUser'] as const,
  },
}
