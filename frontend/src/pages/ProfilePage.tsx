import { useCurrentAccount } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import { suiClient } from '../services/sui/client'
import { type Music, type StakePosition } from '../types'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const account = useCurrentAccount()
  const navigate = useNavigate()

  const [myMusic, setMyMusic] = useState<Music[]>([])
  const [myStakes, setMyStakes] = useState<StakePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (account) {
      loadProfile()
    }
  }, [account])

  const loadProfile = async () => {
    if (!account) return

    try {
      // Load balance
      const balanceRes = await suiClient.getBalance({
        owner: account.address,
      })
      setBalance(parseInt(balanceRes.totalBalance))

      // Load owned music
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: {
          showContent: true,
          showType: true,
        },
      })

      const musicObjects = ownedObjects.data.filter((obj: any) =>
        obj.data?.content?.type?.includes('::music::Music')
      )

      const musicData = musicObjects.map((obj: any) => {
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
      })

      setMyMusic(musicData)

      // Load stake positions
      const stakeObjects = ownedObjects.data.filter((obj: any) =>
        obj.data?.content?.type?.includes('::stake::StakePosition')
      )

      const stakeData = stakeObjects.map((obj: any) => {
        const fields = obj.data.content.fields
        return {
          id: obj.data.objectId,
          music_id: fields.music_id,
          staker: fields.staker,
          amount: parseInt(fields.amount),
          staked_at_epoch: parseInt(fields.staked_at_epoch),
          unlock_epoch: parseInt(fields.unlock_epoch),
          staked_at_ms: parseInt(fields.staked_at_ms),
        } as StakePosition
      })

      setMyStakes(stakeData)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-6xl font-bold mb-4 comic-text">PROFILE</h1>
        <p className="text-2xl text-brutalist-pink">Please connect your wallet first!</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl font-bold mb-8 comic-text text-brutalist-pink">
        MY PROFILE
      </h1>

      {loading ? (
        <div className="text-center text-2xl">Loading...</div>
      ) : (
        <div className="space-y-8">
          {/* Wallet Stats */}
          <div className="border-8 border-black bg-white text-black p-6">
            <h2 className="text-3xl font-bold mb-4">💰 WALLET</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-brutalist-gray uppercase">Address</p>
                <p className="text-xl font-mono">{account.address.slice(0, 20)}...</p>
              </div>
              <div>
                <p className="text-brutalist-gray uppercase">Balance</p>
                <p className="text-3xl font-bold">{(balance / 1_000_000_000).toFixed(3)} SUI</p>
              </div>
            </div>
          </div>

          {/* My Music */}
          <div className="border-8 border-brutalist-green bg-black text-white p-6">
            <h2 className="text-3xl font-bold mb-4">🎵 MY MUSIC ({myMusic.length})</h2>
            {myMusic.length === 0 ? (
              <p className="text-brutalist-gray">No music uploaded yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myMusic.map(music => (
                  <div
                    key={music.id}
                    onClick={() => navigate(`/play/${music.id}`)}
                    className="border-4 border-white bg-brutalist-bg p-4 cursor-pointer hover:bg-brutalist-gray transition-colors"
                  >
                    <h3 className="font-bold text-lg mb-2">Track #{music.id.slice(-6)}</h3>
                    <div className="text-sm space-y-1">
                      <p>👂 {music.total_listens} listens</p>
                      <p>💰 {music.revenue_balance} MIST revenue</p>
                      <p>
                        Status:{' '}
                        {music.status === 0 ? '📝 Draft' : music.status === 1 ? '✅ Published' : '🔒 Frozen'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Stakes */}
          <div className="border-8 border-brutalist-yellow bg-black text-white p-6">
            <h2 className="text-3xl font-bold mb-4">🎲 MY PREDICTIONS ({myStakes.length})</h2>
            {myStakes.length === 0 ? (
              <p className="text-brutalist-gray">No predictions yet</p>
            ) : (
              <div className="space-y-3">
                {myStakes.map(stake => (
                  <div
                    key={stake.id}
                    className="border-4 border-white bg-brutalist-bg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">Track: {stake.music_id.slice(-8)}</p>
                        <p className="text-sm text-brutalist-gray">
                          Staked: {stake.amount / 1_000_000_000} SUI
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-brutalist-gray">Unlock Epoch</p>
                        <p className="font-bold">{stake.unlock_epoch}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
