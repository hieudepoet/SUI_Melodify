
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateMockChart, generateTopEarners, type MockArtist, type ChartItem } from '../utils/mockMusicData'
// import { useCurrentAccount } from '@mysten/dapp-kit'

export default function DiscoverPage() {
  const [isMockMode, setIsMockMode] = useState(true)
  const [chartData, setChartData] = useState<ChartItem[]>([])
  const [earners, setEarners] = useState<MockArtist[]>([])
  const navigate = useNavigate()
//   const account = useCurrentAccount()

  // --- Real Data Setup (Placeholder for now) ---
  // In a real scenario, you'd fetch this from Sui objects
  
  // --- Mock Data Engine ---
  useEffect(() => {
    if (!isMockMode) return

    // Init data
    setChartData(generateMockChart())
    setEarners(generateTopEarners())

    // "Bump" effect loop
    const interval = setInterval(() => {
      setChartData(prev => {
        // Randomly update viral scores to simulate live activity
        const updated = prev.map(item => ({
          ...item,
          listens: item.listens + (Math.random() > 0.7 ? 1 : 0),
          viralScore: Math.min(100, Math.max(0, item.viralScore + (Math.random() - 0.5) * 5)),
          tokenPrice: Math.max(0.01, item.tokenPrice + (Math.random() - 0.5) * 0.05),
          priceChange24h: item.priceChange24h + (Math.random() - 0.5) * 0.2,
          marketCap: item.marketCap + (Math.random() - 0.5) * 1000
        }))
        return updated.sort((a, b) => b.viralScore - a.viralScore)
      })

      setEarners(prev => prev.map(e => ({
        ...e,
        earnings: e.earnings + (Math.random() > 0.8 ? Math.floor(Math.random() * 100) : 0)
      })).sort((a, b) => b.earnings - a.earnings))

    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isMockMode])

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6 pb-24 font-sans selection:bg-cyan-500/30">
      
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-8 sticky top-0 z-20 bg-[#0a0f1c]/80 backdrop-blur-md py-4 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
            
          </h1>
          <p className="text-gray-400 text-sm mt-1"></p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-full border border-white/10">
          <button
            onClick={() => setIsMockMode(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isMockMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            Mock Simulation
          </button>
          <button
            onClick={() => setIsMockMode(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              !isMockMode ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            Real on-chain
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Viral Charts (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <h2 className="text-xl font-bold tracking-wider">LIVE VIRAL CHARTS</h2>
          </div>

          <div className="grid gap-4">
            {chartData.map((track, index) => (
              <div 
                key={track.id}
                onClick={() => !isMockMode && navigate(`/play/${track.id}`)}
                className={`
                  group relative flex items-center gap-6 p-6 rounded-2xl border border-white/5 
                  bg-gradient-to-r from-white/[0.02] to-transparent hover:from-white/[0.05] 
                  transition-all duration-300 hover:scale-[1.01] cursor-pointer overflow-hidden
                  ${index === 0 ? 'border-cyan-500/30 bg-cyan-500/5' : ''}
                `}
              >
                {/* Rank Number */}
                <div className={`
                  text-4xl font-black w-14 text-center tracking-tighter
                  ${index === 0 ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : index === 1 ? 'text-purple-400' : index === 2 ? 'text-pink-400' : 'text-gray-700'}
                `}>
                  #{index + 1}
                </div>

                {/* Cover Art */}
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-cyan-500/20 transition-all shrink-0">
                  <img src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                  
                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm bg-black/30">
                    <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform shadow-lg">
                      ▶
                    </button>
                  </div>
                </div>

                {/* Info & Stats Grid */}
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-6 items-center">
                  
                  {/* Title & Artist (Col 4) */}
                  <div className="col-span-4 pr-4">
                    <h3 className="font-bold text-xl truncate group-hover:text-cyan-300 transition-colors mb-1">{track.title}</h3>
                    <div className="flex items-center gap-2">
                       <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] text-gray-300">♪</span>
                       <p className="text-gray-400 text-sm font-medium">{track.artist}</p>
                    </div>
                  </div>

                  {/* Financial Metrics (Col 6) */}
                  <div className="col-span-6 grid grid-cols-3 gap-y-2 gap-x-6 text-sm">
                    {/* Price */}
                    <div>
                      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-0.5">Price</p>
                      <p className="font-bold font-mono text-white flex items-center gap-1.5">
                        {track.tokenPrice.toFixed(2)} SUI
                        <span className={`text-xs ${track.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {track.priceChange24h > 0 ? '+' : ''}{track.priceChange24h}%
                        </span>
                      </p>
                    </div>

                    {/* Market Cap */}
                    <div>
                      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-0.5">Mkt Cap</p>
                      <p className="font-bold font-mono text-white">{(track.marketCap / 1000).toFixed(1)}k SUI</p>
                    </div>

                    {/* TVL/Staked */}
                    <div>
                      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-0.5">TVL</p>
                      <p className="font-bold font-mono text-cyan-400">{(track.stakes / 1000).toFixed(1)}k SUI</p>
                    </div>

                    {/* Holders */}
                    <div>
                      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-0.5">Holders</p>
                      <p className="font-bold font-mono text-white flex items-center gap-1">
                        👥 {track.holders}
                      </p>
                    </div>

                    {/* 24h Vol */}
                    <div>
                      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-0.5">24h Vol</p>
                      <p className="font-bold font-mono text-gray-300">$2.4k</p>
                    </div>

                    {/* Yield */}
                    <div>
                        <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-0.5">APY</p>
                        <p className="font-bold font-mono text-green-400">12.5%</p>
                    </div>
                  </div>

                  {/* Viral Score (Col 2) */}
                  <div className="col-span-2 flex flex-col items-end pl-4 border-l border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Viral Score</span>
                    <div className="relative flex items-center justify-center w-14 h-14">
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" className="text-gray-800" fill="none" />
                        <circle 
                          cx="28" cy="28" r="24" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                          className={`${track.viralScore > 80 ? 'text-pink-500' : track.viralScore > 50 ? 'text-purple-500' : 'text-cyan-500'} transition-all duration-1000 ease-out`}
                          fill="none" 
                          strokeDasharray="150" 
                          strokeDashoffset={150 - (150 * track.viralScore) / 100} 
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="font-black text-lg text-white">{track.viralScore.toFixed(0)}</span>
                    </div>
                  </div>
                  
                </div>

                {/* Live Indicator (only for top 3) */}
                {index < 3 && (
                  <div className="absolute top-4 right-4 flex gap-1 items-center bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-red-400 border border-red-500/20">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    LIVE
                  </div>
                )}
              </div>
            ))}
            
            {chartData.length === 0 && !isMockMode && (
              <div className="text-center py-20 text-gray-500 border border-white/5 rounded-xl border-dashed">
                <p>No real data to display yet.</p>
                <p className="text-xs mt-1">Upload music to populate the charts!</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Top Earners (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 sticky top-24 backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="text-yellow-400">👑</span> TOP COLLECTORS
            </h2>
            
            <div className="space-y-4">
              {earners.map((earner, i) => (
                <div key={i} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 p-0.5">
                      <img src={earner.avatar} alt="avatar" className="w-full h-full rounded-full bg-[#0a0f1c]" />
                    </div>
                    <div>
                      <p className="font-bold text-sm group-hover:text-yellow-300 transition-colors">{earner.name}</p>
                      <p className="text-xs text-gray-500">Artist</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-green-400 text-sm">
                      +{earner.earnings.toLocaleString()} SUI
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Your Earnings</p>
              <h3 className="text-2xl font-black text-white">$0.00 <span className="text-sm font-normal text-gray-500">SUI</span></h3>
              <button className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
                View Wallet
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
