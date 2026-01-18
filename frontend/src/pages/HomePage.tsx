import { useNavigate } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import { suiClient } from '../services/sui/client'
import { type Music } from '../types'
import { PACKAGE_ID, DEFAULT_COVER_IMAGE } from '../config/constants'

export default function HomePage() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const [recentMusic, setRecentMusic] = useState<Music[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentMusic()
  }, [])

  const loadRecentMusic = async () => {
    try {
      // Query recent published music
      const result = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::music::MusicPublished`,
        },
        limit: 6,
        order: 'descending',
      })

      // Fetch music objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const musicIds = result.data.map((event: any) => (event.parsedJson as any).music_id)
      const musicObjects = await Promise.all(
        musicIds.map(id => suiClient.getObject({
          id,
          options: { showContent: true },
        }))
      )

      const musicData = musicObjects
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((obj: any) => {
          if (obj.data?.content?.fields) {
            const fields = obj.data.content.fields
            return {
              id: obj.data.objectId,
              creator: fields.creator,
              audio_cid: fields.audio_cid,
              preview_cid: fields.preview_cid,
              metadata_uri: fields.metadata_uri,
              cover_uri: fields.cover_uri,
              parent: fields.parent || null,
              total_listens: parseInt(fields.total_listens),
              revenue_balance: parseInt(fields.revenue_pool),
              royalty_bps: fields.royalty_bps,
              status: fields.status,
            } as Music
          }
          return null
        })
        .filter(Boolean) as Music[]

      setRecentMusic(musicData)
    } catch (error) {
      console.error('Failed to load music:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brutalist-pink font-mono selection:bg-brutalist-green selection:text-black">
      {/* Background Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Navigation / Header */}
        <nav className="flex justify-between items-center mb-16 border-4 border-black bg-white p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-2xl font-bold font-comic tracking-wider text-brutalist-pink retro-shadow">
              MELODIFY.WAV
            </div>
            {account ? (
              <div className="flex items-center gap-4">
                <span className="font-bold hidden md:inline bg-brutalist-cyan px-2 border-2 border-black">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
                <button onClick={() => navigate('/profile')} className="btn-brutalist bg-brutalist-yellow text-sm">
                  MY STUFF
                </button>
              </div>
            ) : (
              <button onClick={() => navigate('/profile')} className="btn-brutalist bg-brutalist-green text-sm">
                CONNECT WALLET
              </button>
            )}
        </nav>

        {/* Hero Section */}
        <section className="mb-20 text-center relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-brutalist-cyan blur-[100px] opacity-50 z-[-1]"></div>
          
          <h1 className="text-7xl md:text-9xl mb-6 comic-shadow text-white rotate-[-2deg] hover:rotate-0 transition-transform cursor-default">
            MELODIFY
          </h1>
          <p className="text-2xl md:text-4xl mb-12 text-black font-bold bg-white inline-block px-4 py-2 border-4 border-black -rotate-1 shadow-[8px_8px_0px_0px_rgba(255,255,0,1)]">
            DECENTRALIZED AUDIO REVOLUTION
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-6 mt-8">
            <button
              onClick={() => navigate('/upload')}
              className="btn-brutalist bg-brutalist-green text-xl hover:bg-green-400"
            >
              🚀 DROP TRACK
            </button>
            <button
              onClick={() => navigate('/stake')}
              className="btn-brutalist bg-brutalist-yellow text-xl hover:bg-yellow-400"
            >
              💎 STAKE $SUI
            </button>
          </div>
        </section>

        {/* Recent Music Grid */}
        <section>
          <div className="flex justify-between items-end mb-8 border-b-8 border-black pb-4">
             <h2 className="text-5xl text-black comic-shadow">FRESH DROPS</h2>
             <div className="text-xl font-bold bg-black text-white px-3 py-1 -rotate-2">
                LIVE ON TESTNET
             </div>
          </div>

          {loading ? (
            <div className="text-center text-4xl animate-bounce font-bold">LOADING BEATS...</div>
          ) : recentMusic.length === 0 ? (
            <div className="text-center card-brutalist p-12 bg-brutalist-blue text-white">
              <p className="text-3xl mb-4">GHOST TOWN HERE...</p>
              <button 
                onClick={() => navigate('/upload')}
                className="btn-brutalist bg-white text-black"
              >
                BE THE FIRST
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentMusic.map(music => (
                <MusicCard key={music.id} music={music} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MusicCard({ music }: { music: Music }) {
  const navigate = useNavigate()

  // Deterministic color generation for mock cover
  const getGradient = (id: string) => {
    const colors = [
      'from-pink-500 to-yellow-500',
      'from-blue-400 to-green-500', 
      'from-purple-500 to-pink-500',
      'from-yellow-400 to-red-500',
      'from-cyan-400 to-blue-600'
    ];
    const index = parseInt(id.slice(0, 2), 16) % colors.length;
    return colors[index];
  }

  return (
    <div
      onClick={() => navigate(`/play/${music.id}`)}
      className="card-brutalist group p-3 cursor-pointer hover:bg-yellow-50"
    >
      {/* Visual Header / Cassette Tape Look */}
      <div className="bg-black text-white text-xs px-2 py-1 mb-2 flex justify-between font-mono">
         <span>SIDE A</span>
         <span>{music.status === 1 ? 'PUBLISHED' : 'DRAFT'}</span>
      </div>

      {/* Mock or Real Cover */}
      <div className={`aspect-square mb-3 border-2 border-black overflow-hidden relative ${!music.cover_uri ? `bg-gradient-to-br ${getGradient(music.id)}` : 'bg-gray-200'}`}>
        <img 
            src={DEFAULT_COVER_IMAGE} 
            alt="Cover" 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-4xl">▶️</span>
        </div>
      </div>

      {/* Metadata */}
      <h3 className="font-bold text-xl uppercase truncate leading-none mb-1 font-comic">{music.id.slice(0, 8)}</h3>
      <p className="text-xs font-mono font-bold bg-brutalist-cyan inline-block px-1 border border-black mb-3">
        @{music.creator.slice(0, 4)}...{music.creator.slice(-4)}
      </p>
      
      <div className="flex justify-between items-center border-t-2 border-black pt-2 mt-auto">
        <span className="font-bold text-sm">
           👂 {music.total_listens}
        </span>
        <a 
            href={`https://suiscan.xyz/testnet/object/${music.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs underline decoration-2 decoration-brutalist-pink font-bold hover:bg-black hover:text-white px-1 transition-colors"
        >
            SCAN ↗
        </a>
      </div>
    </div>
  )
}
