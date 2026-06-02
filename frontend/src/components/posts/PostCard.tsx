'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Eye, MessageSquare, User, ThumbsUp, Flame } from 'lucide-react'
import type { PostListItem } from '@/types'
import LevelBadge from '@/components/ui/LevelBadge'
import AuthorBadge from '@/components/ui/AuthorBadge'

interface PostCardProps {
  post: PostListItem
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = format(new Date(post.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })

  return (
    <Link href={`/posts/${post.id}`}>
      <div className="card p-3.5 sm:p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title row with badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {post.is_hot && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-600 flex-shrink-0">
                  <Flame className="w-3 h-3" />
                  인기
                </span>
              )}
              {post.category && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 flex-shrink-0">
                  {post.category.name}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-1 transition-colors">
                {post.title}
              </h3>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs sm:text-sm text-gray-500">
              <span className="flex items-center gap-1 flex-wrap">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <LevelBadge points={post.author_points} />
                <AuthorBadge role={post.author_role} isMod={post.author_is_mod} />
                {post.author}
              </span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-gray-400 flex-shrink-0">
            <span className={`flex items-center gap-1 font-medium ${post.net_votes > 0 ? 'text-blue-500' : post.net_votes < 0 ? 'text-red-400' : 'text-gray-400'}`} title="추천">
              <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {post.net_votes > 0 ? `+${post.net_votes}` : post.net_votes}
            </span>
            <span className="flex items-center gap-1" title="조회수">
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {post.view_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1" title="댓글수">
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {post.comment_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
