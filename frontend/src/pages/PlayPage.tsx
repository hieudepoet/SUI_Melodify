import { useParams } from 'react-router-dom'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import { suiClient } from '../services/sui/client'
import type { Music, MusicMetadata } from '../types'
import { buildListenTx } from '../services/sui/transactions'
import { DEFAULT_LISTEN_PRICE } from '../config/constants'
import { usePlayerStore } from '../store/playerStore'

export default function PlayPage() {
  const { musicId } = useParams<{ musicId: string }>()
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const { setCurrentTrack, setIsPlaying } = usePlayerStore()

  const [music, setMusic] = useState<Music | null>(null)
  const [metadata, setMetadata] = useState<MusicMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [hasListenCap, setHasListenCap] = useState(false)

  useEffect(() => {
    if (musicId) {
      loadMusic()
      checkListenCap()
    }
  }, [musicId, account])

  const loadMusic = async () => {
    try {
      const result = await suiClient.getObject({
        id: musicId!,
        options: { showContent: true },
      })

      if (result.data?.content?.type.includes('::music::Music')) {
        const fields = (result.data.content as any).fields
        const musicData: Music = {
          id: result.data.objectId,
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
        }

        setMusic(musicData)

        // Parse metadata
        try {
          if (fields.metadata_uri.startsWith('data:')) {
            const jsonStr = decodeURIComponent(fields.metadata_uri.split(',')[1])
            setMetadata(JSON.parse(jsonStr))
          }
        } catch (e) {
          console.error('Failed to parse metadata:', e)
        }
      }
    } catch (error) {
      console.error('Failed to load music:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkListenCap = async () => {
    if (!account || !musicId) return

    try {
      // Check if user owns a listen cap for this music
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: { showContent: true, showType: true },
      })

      const listenCap = ownedObjects.data.find((obj: any) => {
        if (obj.data?.content?.type?.includes('::listen::ListenCap')) {
          const fields = obj.data.content.fields
          return fields.music_id === musicId
        }
        return false
      })

      setHasListenCap(!!listenCap)
    } catch (error) {
      console.error('Failed to check listen cap:', error)
    }
  }

  const handlePayToListen = async () => {
    if (!account || !music) return

    try {
      setPurchasing(true)

      const { tx, listenCap } = buildListenTx(music.id, DEFAULT_LISTEN_PRICE)
      tx.transferObjects([listenCap], account.address)

      const result = await signAndExecute({ transaction: tx })
      console.log('Listen cap minted:', result)

      alert('Payment successful! You can now listen to this track.')
      setHasListenCap(true)
      loadMusic() // Reload to update listen count
    } catch (error) {
      console.error('Payment failed:', error)
      alert(`Payment failed: ${error}`)
    } finally {
      setPurchasing(false)
    }
  }

  const handlePlay = () => {
    if (!music || !metadata) return

    setCurrentTrack({
      id: music.id,
      title: metadata.title,
      artist: music.creator.slice(0, 8) + '...',
      audioCid: music.audio_cid,
    })
    setIsPlaying(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-2xl">Loading...</p>
      </div>
    )
  }

  if (!music) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-2xl text-brutalist-pink">Music not found</p>
      </div>
    )
  }

  const isOwner = account?.address === music.creator
  const canPlay = isOwner || hasListenCap

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Music Info */}
        <div className="border-8 border-black bg-white text-black p-8 mb-8">
          <div className="flex gap-8">
            {/* Cover Art */}
            <div className="w-64 h-64 bg-brutalist-pink flex items-center justify-center text-8xl border-4 border-black">
              🎵
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-5xl font-bold mb-4 uppercase">
                {metadata?.title || 'Untitled'}
              </h1>
              <p className="text-xl mb-2">
                <span className="font-bold">Artist:</span>{' '}
                {music.creator.slice(0, 12)}...
              </p>
              <p className="text-xl mb-2">
                <span className="font-bold">Genre:</span> {metadata?.genre || 'Unknown'}
              </p>
              <p className="text-xl mb-4">
                <span className="font-bold">Listens:</span> {music.total_listens}
              </p>

              {metadata?.description && (
                <p className="text-lg border-l-4 border-black pl-4 mb-6">
                  {metadata.description}
                </p>
              )}

              {/* Actions */}
              {canPlay ? (
                <button
                  onClick={handlePlay}
                  className="btn-brutalist bg-brutalist-green text-2xl px-8 py-4 shadow-brutalist hover:shadow-brutalist-hover"
                >
                  ▶ PLAY NOW
                </button>
              ) : (
                <button
                  onClick={handlePayToListen}
                  disabled={purchasing || !account}
                  className={`btn-brutalist text-2xl px-8 py-4 shadow-brutalist hover:shadow-brutalist-hover ${
                    purchasing ? 'bg-brutalist-gray' : 'bg-brutalist-pink'
                  }`}
                >
                  {purchasing
                    ? 'PROCESSING...'
                    : `PAY 0.001 SUI TO LISTEN`}
                </button>
              )}

              {!account && (
                <p className="mt-4 text-brutalist-pink">
                  Connect wallet to listen
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {isOwner && (
          <div className="border-8 border-brutalist-yellow bg-black text-white p-6">
            <h3 className="text-2xl font-bold mb-4">YOUR STATS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-brutalist-gray">Total Listens</p>
                <p className="text-3xl font-bold">{music.total_listens}</p>
              </div>
              <div>
                <p className="text-brutalist-gray">Revenue (MIST)</p>
                <p className="text-3xl font-bold">{music.revenue_balance}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
