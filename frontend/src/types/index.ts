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
  email: string
  is_active: boolean
  role: UserRole
  points: number
  created_at: string
}

export interface UserAdminItem {
  id: string
  username: string
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
  created_at: string
}

export interface FileInfo {
  id: string
  filename: string
  original_filename: string
  file_size: number
  content_type: string
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
  author_points: number
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
  author_points: number
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
  created_at: string
  updated_at: string
  author: string
  author_points: number
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
