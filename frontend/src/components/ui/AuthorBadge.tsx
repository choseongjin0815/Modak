import { Shield, ShieldCheck } from 'lucide-react'

interface AuthorBadgeProps {
  role: string
  isMod?: boolean
}

export default function AuthorBadge({ role, isMod }: AuthorBadgeProps) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 flex-shrink-0">
        <Shield className="w-3 h-3" />
        관리자
      </span>
    )
  }
  if (isMod) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-700 flex-shrink-0">
        <ShieldCheck className="w-3 h-3" />
        운영자
      </span>
    )
  }
  return null
}
