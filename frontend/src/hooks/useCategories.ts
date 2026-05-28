'use client'

import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/lib/api'
import type { CategoryItem } from '@/types'
import { useMemo } from 'react'

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    staleTime: 1000 * 60 * 60,
  })
}

const useGroupStats = () => {
  return useQuery({
    queryKey: ['categories', 'group-stats'],
    queryFn: categoriesApi.getGroupStats,
    staleTime: 1000 * 60 * 10,
  })
}

export interface CategoryGroup {
  key: string
  label: string
  categories: CategoryItem[]
  postCount: number
}

export function useCategoryGroups(): Record<string, CategoryGroup> {
  const { data: categories = [] } = useCategories()
  return useMemo(() => {
    const groups: Record<string, CategoryGroup> = {}
    for (const cat of categories) {
      const key = cat.group ?? '기타'
      if (!groups[key]) groups[key] = { key, label: key, categories: [], postCount: 0 }
      groups[key].categories.push(cat)
    }
    return groups
  }, [categories])
}

// 우선순위 기준 정렬: 기타 → 게시글 수 적은 순 (앞일수록 먼저 숨김)
export function useSortedCategoryGroups(): CategoryGroup[] {
  const { data: categories = [] } = useCategories()
  const { data: stats = {} } = useGroupStats()

  return useMemo(() => {
    const groups: Record<string, CategoryGroup> = {}
    for (const cat of categories) {
      const key = cat.group ?? '기타'
      if (!groups[key]) groups[key] = { key, label: key, categories: [], postCount: stats[key] ?? 0 }
      groups[key].categories.push(cat)
    }
    return Object.values(groups).sort((a, b) => {
      if (a.key === '기타') return -1
      if (b.key === '기타') return 1
      return a.postCount - b.postCount
    })
  }, [categories, stats])
}
