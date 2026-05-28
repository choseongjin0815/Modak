'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { getToken, setToken, removeToken, getUser, isAuthenticated } from '@/lib/auth'
import { queryKeys } from '@/lib/queryClient'

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: () => {
      const user = getUser()
      if (!user || !isAuthenticated()) return null
      return user
    },
    staleTime: Infinity,
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      setToken(data.access_token)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser })
      router.push('/posts')
    },
  })
}

export const useRegister = () => {
  const router = useRouter()

  return useMutation({
    mutationFn: ({
      username,
      email,
      password,
    }: {
      username: string
      email: string
      password: string
    }) => authApi.register(username, email, password),
    onSuccess: () => {
      router.push('/login')
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  const logout = () => {
    removeToken()
    queryClient.clear()
    router.push('/login')
  }

  return { logout }
}

export const useIsAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  return isAuthenticated()
}
