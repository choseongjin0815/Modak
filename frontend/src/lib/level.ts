/** 포인트 → 레벨 (100포인트당 1레벨, 최소 1) */
export function getLevel(points: number): number {
  return Math.floor(points / 100) + 1
}

export interface LevelTier {
  name: string
  bg: string      // CSS 색상값
  text: string    // CSS 색상값
  border: string  // CSS 색상값
  rainbow: boolean
}

const TIERS: Array<{ minLevel: number } & LevelTier> = [
  { minLevel: 100, name: '무지개', bg: '',          text: '#fff',     border: 'transparent', rainbow: true  },
  { minLevel: 90,  name: '황금',   bg: '#ca8a04',   text: '#fff',     border: '#a16207',     rainbow: false },
  { minLevel: 80,  name: '빨강',   bg: '#ef4444',   text: '#fff',     border: '#b91c1c',     rainbow: false },
  { minLevel: 70,  name: '주황',   bg: '#f97316',   text: '#fff',     border: '#c2410c',     rainbow: false },
  { minLevel: 60,  name: '분홍',   bg: '#ec4899',   text: '#fff',     border: '#be185d',     rainbow: false },
  { minLevel: 50,  name: '보라',   bg: '#a855f7',   text: '#fff',     border: '#7e22ce',     rainbow: false },
  { minLevel: 40,  name: '청록',   bg: '#14b8a6',   text: '#fff',     border: '#0f766e',     rainbow: false },
  { minLevel: 30,  name: '하늘',   bg: '#06b6d4',   text: '#fff',     border: '#0e7490',     rainbow: false },
  { minLevel: 20,  name: '파랑',   bg: '#3b82f6',   text: '#fff',     border: '#1d4ed8',     rainbow: false },
  { minLevel: 10,  name: '초록',   bg: '#22c55e',   text: '#fff',     border: '#15803d',     rainbow: false },
  { minLevel: 1,   name: '회색',   bg: '#6b7280',   text: '#fff',     border: '#374151',     rainbow: false },
]

export function getLevelTier(level: number): LevelTier {
  for (const tier of TIERS) {
    if (level >= tier.minLevel) {
      const { minLevel: _, ...rest } = tier
      return rest
    }
  }
  return { name: '회색', bg: '#6b7280', text: '#fff', border: '#374151', rainbow: false }
}
