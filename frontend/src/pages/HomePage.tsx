import { useNavigate } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import { suiClient } from '../services/sui/client'
import { type Music } from '../types'
import { PACKAGE_ID } from '../config/constants'

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
      const musicIds = result.data.map((event: any) => event.parsedJson.music_id)
      const musicObjects = await Promise.all(
        musicIds.map(id => suiClient.getObject({
          id,
          options: { showContent: true },
        }))
      )

      const musicData = musicObjects
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
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: `url('/background.png')`
      }}
    >
      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="mb-24 text-center">
          <h1 className="text-8xl md:text-9xl font-extrabold mb-6 comic-text text-brutalist-pink drop-shadow-lg">
            MELODIFY
          </h1>
          <p className="text-3xl md:text-4xl mb-12 text-white font-bold uppercase tracking-wider drop-shadow-md">
            Decentralized Music Revolution
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-6">
            {account ? (
              <>
                <button
                  onClick={() => navigate('/upload')}
                  className="btn-brutalist bg-brutalist-green text-black text-2xl shadow-brutalist hover:shadow-brutalist-hover transform hover:-translate-y-1"
                >
                  🚀 UPLOAD TRACK
                </button>
                <button
                  onClick={() => navigate('/stake')}
                  className="btn-brutalist bg-brutalist-yellow text-black text-2xl shadow-brutalist hover:shadow-brutalist-hover transform hover:-translate-y-1"
                >
                  💰 STAKE & EARN
                </button>
              </>
            ) : (
              <div className="inline-block bg-white border-4 border-black p-4 rotate-2 transform hover:rotate-0 transition-all">
                <p className="text-2xl font-bold text-black uppercase">
                  👈 Connect Wallet to Join the Vibe
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Music */}
        <section className="bg-white/10 backdrop-blur-md p-8 border-4 border-white/20 rounded-xl">
          <h2 className="text-5xl font-bold mb-12 text-white uppercase text-center comic-text">
            Fresh Drops
          </h2>

          {loading ? (
            <div className="text-center text-white text-2xl animate-pulse">Loading the beats...</div>
          ) : recentMusic.length === 0 ? (
            <div className="text-center bg-black/50 p-8 border-4 border-white max-w-2xl mx-auto">
              <p className="text-white text-2xl mb-4">No tracks found yet.</p>
              <button 
                onClick={() => navigate('/upload')}
                className="btn-brutalist bg-brutalist-pink text-white text-lg"
              >
                Be the first to upload!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

  return (
    <div
      onClick={() => navigate(`/play/${music.id}`)}
      className="group relative border-4 border-black bg-white text-black p-4 cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(255,0,255,1)] hover:-translate-y-2 transition-all duration-200"
    >
      <div className="aspect-square bg-brutalist-blue mb-4 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform">
        💿
      </div>
      <h3 className="font-extrabold text-2xl uppercase truncate mb-1">{music.id.slice(0, 8)}...</h3>
      <p className="text-gray-600 font-bold text-sm truncate mb-4">BY: {music.creator.slice(0, 6)}...{music.creator.slice(-4)}</p>
      
      <div className="flex justify-between items-center border-t-4 border-black pt-3">
        <span className="font-bold flex items-center gap-2">
          🎧 {music.total_listens}
        </span>
        <span className="bg-black text-white px-2 py-1 font-bold text-sm uppercase group-hover:bg-brutalist-pink transition-colors">
          Play Now
        </span>
      </div>
    </div>
  )
}
