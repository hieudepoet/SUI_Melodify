

export interface MockArtist {
  name: string
  avatar: string
  earnings: number
}

export interface ChartItem {
  id: string
  title: string
  artist: string
  cover: string
  listens: number
  stakes: number
  viralScore: number
  stakeTarget: number // Percentage filled
  trend: 'up' | 'down' | 'stable'
  marketCap: number
  tokenPrice: number
  priceChange24h: number
  holders: number
}

const COVERS = [
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=300&auto=format&fit=crop'
]

const ARTISTS = [
  'Neon Daft', 'The Cent.js', 'Vitalik Beats', 'Sui Moon', 'Move Lang'
]

export const generateMockChart = (): ChartItem[] => {
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `mock-${i}`,
    title: `Cyber Symphony No. ${i + 1}`,
    artist: ARTISTS[i],
    cover: COVERS[i],
    listens: Math.floor(Math.random() * 5000) + 1000,
    stakes: Math.floor(Math.random() * 10000) + 500,
    viralScore: Math.floor(Math.random() * 100),
    stakeTarget: Math.floor(Math.random() * 100),
    trend: (Math.random() > 0.5 ? 'up' : 'down') as 'up' | 'down' | 'stable',
    marketCap: Math.floor(Math.random() * 500000) + 50000,
    tokenPrice: parseFloat((Math.random() * 2 + 0.1).toFixed(2)),
    priceChange24h: parseFloat(((Math.random() - 0.4) * 20).toFixed(2)), // -8% to +12%
    holders: Math.floor(Math.random() * 500) + 50
  })).sort((a, b) => b.viralScore - a.viralScore)
}

export const generateTopEarners = (): MockArtist[] => {
  return ARTISTS.map((name) => ({
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    earnings: Math.floor(Math.random() * 50000) + 1000
  })).sort((a, b) => b.earnings - a.earnings)
}
