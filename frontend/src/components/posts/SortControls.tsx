'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'

interface SortControlsProps {
  sortBy: 'created_at' | 'view_count' | 'net_votes'
  sortOrder: 'asc' | 'desc'
  onSortByChange: (sortBy: 'created_at' | 'view_count' | 'net_votes') => void
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void
}

export default function SortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortControlsProps) {
  const toggleSortOrder = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs sm:text-sm text-gray-500 hidden xs:inline">정렬:</span>
      <div className="flex rounded-md shadow-sm border border-gray-300 overflow-hidden">
        <button
          onClick={() => onSortByChange('created_at')}
          className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
            sortBy === 'created_at'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          최신순
        </button>
        <button
          onClick={() => onSortByChange('view_count')}
          className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium border-l border-gray-300 transition-colors ${
            sortBy === 'view_count'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          조회순
        </button>
        <button
          onClick={() => onSortByChange('net_votes')}
          className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium border-l border-gray-300 transition-colors ${
            sortBy === 'net_votes'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          추천순
        </button>
      </div>
      <button
        onClick={toggleSortOrder}
        className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
      >
        {sortOrder === 'asc' ? (
          <>
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">오름차순</span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">내림차순</span>
          </>
        )}
      </button>
    </div>
  )
}
