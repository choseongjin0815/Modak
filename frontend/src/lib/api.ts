import axios from 'axios'
import { getToken, removeToken } from './auth'
import type { Token, Post, PostListResult, Comment, PostFilters, User, UserAdminItem, VoteResult, PointInfo, AttendanceResult, Report, ReportTargetType, ReportStatus, BlacklistItem, CategoryItem } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
const FILE_URL = process.env.NEXT_PUBLIC_FILE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      removeToken()
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const categoriesApi = {
  getAll: async (): Promise<CategoryItem[]> => {
    const { data } = await apiClient.get<CategoryItem[]>('/categories')
    return data
  },
  getGroupStats: async (): Promise<Record<string, number>> => {
    const { data } = await apiClient.get<Record<string, number>>('/categories/group-stats')
    return data
  },
}

export const authApi = {
  login: async (username: string, password: string): Promise<Token> => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    const { data } = await apiClient.post<Token>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },
  register: async (username: string, email: string, password: string): Promise<User> => {
    const { data } = await apiClient.post<User>('/auth/register', { username, email, password })
    return data
  },
}

export const postsApi = {
  getPosts: async (filters: PostFilters = {}): Promise<PostListResult> => {
    const params: Record<string, string | number | boolean> = {}
    if (filters.search) params.search = filters.search
    if (filters.sort_by) params.sort_by = filters.sort_by
    if (filters.sort_order) params.sort_order = filters.sort_order
    if (filters.page) params.page = filters.page
    if (filters.size) params.size = filters.size
    if (filters.category) params.category = filters.category
    if (filters.hot) params.hot = true
    const { data } = await apiClient.get<PostListResult>('/posts', { params })
    return data
  },
  getPost: async (id: string): Promise<Post> => {
    const { data } = await apiClient.get<Post>(`/posts/${id}`)
    return data
  },
  getPostWithAuth: async (id: string): Promise<Post> => {
    const { data } = await apiClient.get<Post>(`/posts/${id}/detail`)
    return data
  },
  createPost: async (formData: FormData): Promise<Post> => {
    const { data } = await apiClient.post<Post>('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  updatePost: async (id: string, payload: { title?: string; content?: string; category?: string | null }): Promise<Post> => {
    const { data } = await apiClient.put<Post>(`/posts/${id}`, payload)
    return data
  },
  deletePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/posts/${id}`)
  },
}

export const commentsApi = {
  getComments: async (postId: string): Promise<Comment[]> => {
    const { data } = await apiClient.get<Comment[]>(`/posts/${postId}/comments`)
    return data
  },
  createComment: async (postId: string, content: string, parentId?: string): Promise<Comment> => {
    const { data } = await apiClient.post<Comment>(`/posts/${postId}/comments`, { content, parent_id: parentId ?? null })
    return data
  },
  updateComment: async (id: string, content: string): Promise<Comment> => {
    const { data } = await apiClient.put<Comment>(`/comments/${id}`, { content })
    return data
  },
  deleteComment: async (id: string): Promise<void> => {
    await apiClient.delete(`/comments/${id}`)
  },
}

export const votesApi = {
  votePost: async (postId: string, voteType: 'up' | 'down'): Promise<VoteResult> => {
    const { data } = await apiClient.post<VoteResult>(`/posts/${postId}/vote`, { vote_type: voteType })
    return data
  },
  voteComment: async (commentId: string, voteType: 'up' | 'down'): Promise<VoteResult> => {
    const { data } = await apiClient.post<VoteResult>(`/comments/${commentId}/vote`, { vote_type: voteType })
    return data
  },
}

export const pointsApi = {
  getMyPoints: async (): Promise<PointInfo> => {
    const { data } = await apiClient.get<PointInfo>('/points/me')
    return data
  },
  checkAttendance: async (): Promise<AttendanceResult> => {
    const { data } = await apiClient.post<AttendanceResult>('/points/attendance')
    return data
  },
}

export const bookmarksApi = {
  toggle: async (postId: string): Promise<{ bookmarked: boolean }> => {
    const { data } = await apiClient.post<{ bookmarked: boolean }>(`/bookmarks/${postId}`)
    return data
  },
  getMyBookmarks: async (): Promise<{ bookmarked_post_ids: string[] }> => {
    const { data } = await apiClient.get<{ bookmarked_post_ids: string[] }>('/bookmarks')
    return data
  },
}

export const filesApi = {
  deleteFile: async (id: string): Promise<void> => {
    await apiClient.delete(`/files/${id}`)
  },
  getFileUrl: (filename: string): string => `${FILE_URL}/files/${filename}`,
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/users/me')
    return data
  },
  updateMe: async (payload: {
    username?: string
    email?: string
    current_password?: string
    new_password?: string
  }): Promise<User> => {
    const { data } = await apiClient.put<User>('/users/me', payload)
    return data
  },
  getMyPosts: async (page = 1, size = 8): Promise<{ items: any[]; total: number; page: number; size: number; pages: number }> => {
    const { data } = await apiClient.get('/users/me/posts', { params: { page, size } })
    return data
  },
}

export const blacklistApi = {
  add: async (userId: string): Promise<{ blocked: boolean; blocked_username: string }> => {
    const { data } = await apiClient.post(`/blacklist/${userId}`)
    return data
  },
  remove: async (userId: string): Promise<{ blocked: boolean }> => {
    const { data } = await apiClient.delete(`/blacklist/${userId}`)
    return data
  },
  getMyBlacklist: async (): Promise<{ items: BlacklistItem[] }> => {
    const { data } = await apiClient.get('/blacklist')
    return data
  },
}

export const messagesApi = {
  send: async (receiverUsername: string, content: string) => {
    const { data } = await apiClient.post('/messages', { receiver_username: receiverUsername, content })
    return data
  },
  getInbox: async (page = 1, size = 20) => {
    const { data } = await apiClient.get('/messages/inbox', { params: { page, size } })
    return data
  },
  getSent: async (page = 1, size = 20) => {
    const { data } = await apiClient.get('/messages/sent', { params: { page, size } })
    return data
  },
  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.get('/messages/unread-count')
    return data
  },
  markRead: async (id: string) => {
    await apiClient.patch(`/messages/${id}/read`)
  },
  delete: async (id: string) => {
    await apiClient.delete(`/messages/${id}`)
  },
}

export const notificationsApi = {
  getList: async (page = 1, size = 20) => {
    const { data } = await apiClient.get('/notifications', { params: { page, size } })
    return data
  },
  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.get('/notifications/unread-count')
    return data
  },
  markRead: async (id: string) => {
    await apiClient.patch(`/notifications/${id}/read`)
  },
  markAllRead: async () => {
    await apiClient.patch('/notifications/read-all')
  },
}

export const moderationApi = {
  ban: async (userId: string, categoryId: number, duration: string) => {
    await apiClient.post('/moderation/bans', { user_id: userId, category_id: categoryId, duration })
  },
  unban: async (userId: string, categoryId: number) => {
    await apiClient.delete('/moderation/bans', { data: { user_id: userId, category_id: categoryId } })
  },
  getBans: async (categoryId: number) => {
    const { data } = await apiClient.get(`/moderation/bans/${categoryId}`)
    return data
  },
  getMyModeratedCategories: async () => {
    const { data } = await apiClient.get('/users/me/moderated-categories')
    return data
  },
}

export const reportsApi = {
  create: async (payload: { target_type: ReportTargetType; target_id: string; reason: string }) => {
    const { data } = await apiClient.post('/reports', payload)
    return data
  },
}

export const adminApi = {
  getUsers: async (page = 1, size = 20, search?: string) => {
    const params: any = { page, size }
    if (search) params.search = search
    const { data } = await apiClient.get('/admin/users', { params })
    return data
  },
  updateUser: async (userId: string, payload: { is_active?: boolean; role?: string }): Promise<UserAdminItem> => {
    const { data } = await apiClient.put<UserAdminItem>(`/admin/users/${userId}`, payload)
    return data
  },
  getPosts: async (page = 1, size = 20, search?: string) => {
    const params: any = { page, size }
    if (search) params.search = search
    const { data } = await apiClient.get('/admin/posts', { params })
    return data
  },
  deletePost: async (postId: string): Promise<void> => {
    await apiClient.delete(`/admin/posts/${postId}`)
  },
  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/admin/comments/${commentId}`)
  },
  getReports: async (page = 1, size = 20, status?: ReportStatus) => {
    const params: any = { page, size }
    if (status) params.status = status
    const { data } = await apiClient.get('/admin/reports', { params })
    return data
  },
  resolveReport: async (reportId: string, status: 'RESOLVED' | 'REJECTED') => {
    const { data } = await apiClient.put(`/admin/reports/${reportId}`, { status })
    return data
  },
  getModerators: async () => {
    const { data } = await apiClient.get('/admin/moderators')
    return data as { user_id: string; username: string; category_id: number; category_name: string; category_slug: string; created_at: string }[]
  },
  assignModerator: async (userId: string, categoryId: number) => {
    await apiClient.post('/admin/moderators', { user_id: userId, category_id: categoryId })
  },
  revokeModerator: async (userId: string, categoryId: number) => {
    await apiClient.delete(`/admin/moderators/${userId}/${categoryId}`)
  },
}
