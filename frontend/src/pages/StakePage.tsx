import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { suiClient } from '../services/sui/client'
import { buildStakeTx } from '../services/sui/transactions'
import { PREDICTION_STAKE_AMOUNT, PREDICTION_LOCK_EPOCHS, PACKAGE_ID } from '../config/constants'
import { type Music } from '../types'

export default function StakePage() {
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [topMusic, setTopMusic] = useState<Music[]>([])
  const [loading, setLoading] = useState(true)
  const [staking, setStaking] = useState(false)

  useEffect(() => {
    loadTopMusic()
  }, [])

  const loadTopMusic = async () => {
    try {
      // Load recent music sorted by listens
      const result = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::music::MusicPublished`,
        },
        limit: 10,
        order: 'descending',
      })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const musicIds = result.data.map((event: any) => event.parsedJson.music_id)
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

      // Sort by listens
      musicData.sort((a, b) => b.total_listens - a.total_listens)
      setTopMusic(musicData)
    } catch (error) {
      console.error('Failed to load music:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStake = async (musicId: string) => {
    if (!account) {
      alert('Please connect your wallet')
      return
    }

    const confirmed = confirm(
      `Stake 0.001 SUI on this track?\n\nIf this track is #1 after 1 day, you win 0.002 SUI (2x)!\nIf not, your stake goes to the treasury.`
    )

    if (!confirmed) return

    try {
      setStaking(true)

      const { tx, stakePosition } = buildStakeTx(
        musicId,
        PREDICTION_STAKE_AMOUNT,
        PREDICTION_LOCK_EPOCHS
      )

      tx.transferObjects([stakePosition], account.address)

      const result = await signAndExecute({ transaction: tx })
      console.log('Stake successful:', result)

      alert('Stake successful! Check back in 1 day to see if you won!')
      loadTopMusic()
    } catch (error) {
      console.error('Stake failed:', error)
      alert(`Stake failed: ${error}`)
    } finally {
      setStaking(false)
    }
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-6xl font-bold mb-4 comic-text">STAKE & WIN</h1>
        <p className="text-2xl text-brutalist-pink">Please connect your wallet first!</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-6xl font-bold mb-4 comic-text text-brutalist-yellow">
          PREDICTION GAME
        </h1>
        <p className="text-2xl">
          Stake 0.001 SUI on a track you think will be #1 in 24 hours!
        </p>
      </div>

      {/* Game Rules */}
      <div className="border-8 border-brutalist-yellow bg-black text-white p-6 mb-8">
        <h2 className="text-3xl font-bold mb-4">🎮 HOW TO PLAY:</h2>
        <ol className="list-decimal list-inside space-y-2 text-lg">
          <li>Choose a track you think will have the most listens</li>
          <li>Stake 0.001 SUI (stake is locked for 1 day)</li>
          <li>If your track is #1 after 24 hours, you win 0.002 SUI (2x)!</li>
          <li>If not, your stake goes to the treasury</li>
        </ol>
      </div>

      {/* Top Tracks Leaderboard */}
      <div>
        <h2 className="text-4xl font-bold mb-6 uppercase border-b-4 border-black pb-2">
          🏆 CURRENT LEADERBOARD
        </h2>

        {loading ? (
          <div className="text-center text-2xl">Loading...</div>
        ) : topMusic.length === 0 ? (
          <div className="text-center text-2xl text-brutalist-gray">
            No tracks yet
          </div>
        ) : (
          <div className="space-y-4">
            {topMusic.map((music, index) => (
              <div
                key={music.id}
                className={`border-8 border-black p-6 flex items-center gap-6 ${
                  index === 0
                    ? 'bg-brutalist-yellow text-black'
                    : index === 1
                    ? 'bg-brutalist-pink text-black'
                    : index === 2
                    ? 'bg-brutalist-green text-black'
                    : 'bg-white text-black'
                }`}
              >
                {/* Rank */}
                <div className="text-6xl font-bold w-20 text-center">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold uppercase mb-1">
                    Track #{music.id.slice(-6)}
                  </h3>
                  <p className="text-lg">
                    Creator: {music.creator.slice(0, 12)}...
                  </p>
                  <p className="text-xl font-bold mt-2">
                    👂 {music.total_listens} listens
                  </p>
                </div>

                {/* Stake Button */}
                <button
                  onClick={() => handleStake(music.id)}
                  disabled={staking}
                  className={`btn-brutalist text-xl px-6 py-3 shadow-brutalist hover:shadow-brutalist-hover ${
                    staking ? 'bg-brutalist-gray' : 'bg-brutalist-pink'
                  }`}
                >
                  {staking ? 'STAKING...' : 'STAKE 0.001 SUI'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
