'use client'

import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/lib/api'
import type { CategoryItem } from '@/types'
import { useMemo } from 'react'

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    staleTime: 1000 * 60 * 60,  // 1시간 캐시
  })
}

export interface CategoryGroup {
  label: string
  categories: CategoryItem[]
}

export function useCategoryGroups(): Record<string, CategoryGroup> {
  const { data: categories = [] } = useCategories()
  return useMemo(() => {
    const groups: Record<string, CategoryGroup> = {}
    for (const cat of categories) {
      const key = cat.group ?? '기타'
      if (!groups[key]) groups[key] = { label: key, categories: [] }
      groups[key].categories.push(cat)
    }
    return groups
  }, [categories])
}
