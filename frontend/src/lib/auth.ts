const TOKEN_KEY = 'board_access_token'

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

interface JwtPayload {
  sub: string
  role?: 'USER' | 'ADMIN'
  username?: string
  email?: string
  exp?: number
  [key: string]: unknown
}

export const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    // Base64URL decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = atob(padded)
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export const getUser = (): JwtPayload | null => {
  const token = getToken()
  if (!token) return null
  return decodeJwt(token)
}

export const isAdmin = (): boolean => {
  const user = getUser()
  return user?.role === 'ADMIN'
}

export const isAuthenticated = (): boolean => {
  const token = getToken()
  if (!token) return false
  const payload = decodeJwt(token)
  if (!payload) return false
  // Check expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    removeToken()
    return false
  }
  return true
}
