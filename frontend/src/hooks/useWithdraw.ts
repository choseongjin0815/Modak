'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { usersApi } from '@/lib/api'
import { removeToken } from '@/lib/auth'

/**
 * 회원 탈퇴 mutation 훅.
 * - mutationFn: usersApi.deleteMe(password) → DELETE /users/me
 * - onSuccess: removeToken()으로 로그아웃(auth-change 이벤트 자동 dispatch) 후 홈으로 이동.
 *   탈퇴로 인해 캐시된 인증 의존 데이터가 모두 무효이므로 queryClient.clear().
 * - onError는 호출부(WithdrawModal)에서 처리: 400(비밀번호 불일치) detail을 모달 내 표시.
 */
export const useWithdraw = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) => usersApi.deleteMe(password),
    onSuccess: () => {
      removeToken()
      queryClient.clear()
      router.push('/')
    },
  })
}
