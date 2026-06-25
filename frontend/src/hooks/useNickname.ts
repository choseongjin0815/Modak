'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import type { User } from '@/types'

const NICKNAME_CHANGE_INTERVAL_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 마지막 닉네임 변경 시각(nickname_changed_at) 기준 다음 변경 가능일을 반환.
 * 한 번도 변경한 적 없으면(null) 제한 없음 → null 반환.
 */
export const nextNicknameChangeDate = (changedAt: string | null): Date | null => {
  if (!changedAt) return null
  const base = new Date(changedAt)
  if (Number.isNaN(base.getTime())) return null
  return new Date(base.getTime() + NICKNAME_CHANGE_INTERVAL_DAYS * MS_PER_DAY)
}

/**
 * 닉네임을 다시 변경하기까지 남은 일수(올림). 변경 가능하면 0.
 */
export const daysUntilNicknameChange = (changedAt: string | null): number => {
  const next = nextNicknameChangeDate(changedAt)
  if (!next) return 0
  const diffMs = next.getTime() - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / MS_PER_DAY)
}

/**
 * 지금 닉네임을 변경할 수 있는지 여부.
 */
export const canChangeNickname = (changedAt: string | null): boolean =>
  daysUntilNicknameChange(changedAt) === 0

/**
 * 닉네임 수정 mutation. 서버 에러(400 30일 제한 / 409 중복 / 422 형식)를
 * 사용자 친화적 메시지로 변환해 throw 한다.
 */
export const useUpdateNickname = () => {
  const queryClient = useQueryClient()
  return useMutation<User, Error, string>({
    mutationFn: async (nickname: string) => {
      try {
        return await usersApi.updateMe({ nickname })
      } catch (e: unknown) {
        throw new Error(nicknameErrorMessage(e))
      }
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.users.me, user)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me })
    },
  })
}

/**
 * axios 에러를 닉네임 변경 맥락의 사용자 친화적 메시지로 변환.
 * 백엔드 detail 문자열이 있으면 그대로 노출(스펙상 친화 문구), 없으면 상태코드별 기본 문구.
 */
export const nicknameErrorMessage = (e: unknown): string => {
  const err = e as { response?: { status?: number; data?: { detail?: unknown } } }
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  const status = err?.response?.status
  if (status === 409) return '이미 사용 중인 닉네임입니다'
  if (status === 400) return '닉네임을 변경할 수 없습니다'
  if (status === 422) return '닉네임은 2~20자로 입력해주세요'
  return '닉네임 변경 중 오류가 발생했습니다'
}

/**
 * 현재 로그인 사용자 정보(nickname 포함). 표시명 갱신용.
 */
export const useMe = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.users.me,
    queryFn: () => usersApi.getMe(),
    enabled,
  })
}
