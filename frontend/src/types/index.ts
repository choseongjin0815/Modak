export interface CategoryItem {
  id: number
  slug: string
  name: string
  group: string | null
  sort_order: number
}

export type UserRole = 'USER' | 'ADMIN'

export interface User {
  id: string
  username: string
  nickname: string
  nickname_changed_at: string | null
  email: string
  is_active: boolean
  role: UserRole
  points: number
  created_at: string
}

export interface UserAdminItem {
  id: string
  username: string
  nickname: string
  email: string
  is_active: boolean
  role: UserRole
  points: number
  created_at: string
}

export type ReportTargetType = 'POST' | 'COMMENT'
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED'

export interface Report {
  id: string
  reporter_id: string
  reporter_username: string
  reporter_nickname: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  status: ReportStatus
  created_at: string
  resolved_at: string | null
}

export interface BlacklistItem {
  id: string
  blocked_id: string
  blocked_username: string
  blocked_nickname: string
  created_at: string
}

export interface FileInfo {
  id: string
  filename: string
  original_filename: string
  file_size: number
  content_type: string
}

export interface Message {
  id: string
  sender_id: string
  sender_username: string
  sender_nickname: string
  receiver_id: string
  receiver_username: string
  receiver_nickname: string
  other_username: string
  other_nickname: string
  content: string
  is_read: boolean
  created_at: string
}

export interface Notification {
  id: string
  type: 'post_comment' | 'comment_reply' | 'new_message'
  actor: string
  actor_nickname: string
  content: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface ModeratedCategory {
  id: number
  slug: string
  name: string
  group: string | null
}

export interface ModeratorBanInfo {
  banned_user_id: string
  banned_username: string
  banned_nickname: string
  expires_at: string | null
  created_at: string
}

export interface Post {
  id: string
  title: string
  content: string
  user_id: string
  view_count: number
  up_votes: number
  down_votes: number
  net_votes: number
  is_hot: boolean
  category: CategoryItem | null
  created_at: string
  updated_at: string
  author: string
  author_nickname: string
  author_points: number
  author_role: string
  author_is_mod: boolean
  viewer_is_mod: boolean
  files: FileInfo[]
  comment_count?: number
  my_vote: 'up' | 'down' | null
  is_bookmarked: boolean
}

export interface PostListItem {
  id: string
  title: string
  user_id: string
  view_count: number
  up_votes: number
  down_votes: number
  net_votes: number
  is_hot: boolean
  category: CategoryItem | null
  created_at: string
  author: string
  author_nickname: string
  author_points: number
  author_role: string
  author_is_mod: boolean
  comment_count: number
}

export interface PostListResult {
  items: PostListItem[]
  total: number
  page: number
  size: number
  pages: number
  hot_threshold: number
}

export interface Comment {
  id: string
  content: string
  user_id: string
  post_id: string
  parent_id: string | null
  created_at: string
  updated_at: string
  author: string
  author_nickname: string
  author_points: number
  author_role: string
  author_is_mod: boolean
  up_votes: number
  down_votes: number
  my_vote: 'up' | 'down' | null
  is_deleted: boolean
  deleted_by_admin: boolean
}

export interface Token {
  access_token: string
  token_type: string
}

export interface PostFilters {
  search?: string
  sort_by?: 'created_at' | 'view_count' | 'net_votes'
  sort_order?: 'asc' | 'desc'
  page?: number
  size?: number
  category?: string
  hot?: boolean
}

export interface VoteResult {
  action: 'added' | 'changed' | 'removed'
  vote_type: 'up' | 'down' | null
  up_votes: number
  down_votes: number
  net_votes: number
}

export interface PointTransaction {
  id: string
  amount: number
  reason: string
  created_at: string
}

export interface PointInfo {
  points: number
  transactions: PointTransaction[]
}

export interface AttendanceResult {
  already_attended: boolean
  points_earned: number
  total_points: number
}

export interface NoticeListItem {
  id: string
  title: string
  is_pinned: boolean
  view_count: number
  author: string | null
  created_at: string
}

export interface NoticeResponse {
  id: string
  title: string
  content: string
  is_pinned: boolean
  view_count: number
  author_id: string | null
  author: string | null
  created_at: string
  updated_at: string
}

export interface NoticeListResult {
  items: NoticeListItem[]
  total: number
  page: number
  size: number
  pages: number
}

export interface NoticeCreate {
  title: string
  content: string
  is_pinned?: boolean
}

export interface NoticeUpdate {
  title?: string
  content?: string
  is_pinned?: boolean
}

export interface UserStats {
  post_count: number
  comment_count: number
  today_votes_received: number
}

export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024'

export interface ImageGenerateRequest {
  prompt: string
  size?: ImageSize
}

export interface ImageGenerateResponse {
  token: string
  preview_url: string
  original_filename: string
  content_type: string
  remaining: number
  limit: number
  reset_at: string | null
}

export interface ImageQuota {
  used: number
  remaining: number
  limit: number
  reset_at: string | null
}
