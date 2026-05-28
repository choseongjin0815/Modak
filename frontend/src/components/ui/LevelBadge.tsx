import { getLevel, getLevelTier } from '@/lib/level'

interface LevelBadgeProps {
  points: number
  size?: 'xs' | 'sm'
}

export default function LevelBadge({ points, size = 'xs' }: LevelBadgeProps) {
  const level = getLevel(points)
  const tier = getLevelTier(level)

  const padding = size === 'xs' ? '1px 5px' : '2px 7px'
  const fontSize = size === 'xs' ? '10px' : '12px'

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '4px',
    fontWeight: 700,
    lineHeight: 1.4,
    flexShrink: 0,
    padding,
    fontSize,
  }

  if (tier.rainbow) {
    return (
      <span
        className="badge-rainbow"
        style={{ ...base }}
      >
        Lv.{level}
      </span>
    )
  }

  return (
    <span
      style={{
        ...base,
        backgroundColor: tier.bg,
        color: tier.text,
        border: `1px solid ${tier.border}`,
      }}
    >
      Lv.{level}
    </span>
  )
}
