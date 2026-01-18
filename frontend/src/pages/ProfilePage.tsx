import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import { suiClient } from '../services/sui/client'
import { type Music, type StakePosition } from '../types'
import { useNavigate } from 'react-router-dom'
import { Transaction } from '@mysten/sui/transactions'
import { PACKAGE_ID } from '../config/constants'

export default function ProfilePage() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const [myMusic, setMyMusic] = useState<Music[]>([])
  const [myStakes, setMyStakes] = useState<StakePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (account) {
      loadProfile()
    }
  }, [account])

  const handlePublish = async (musicId: string, musicCreator: string) => {
    // Safety check: ensure current user is the creator
    if (account && musicCreator !== account.address) {
      alert(`⚠️ OWNERSHIP ERROR\n\nYou cannot publish this music because it was created by a different wallet.\n\nCreated by: ${musicCreator.slice(0, 10)}...\nCurrent wallet: ${account.address.slice(0, 10)}...\n\nPlease switch to the original wallet in your browser extension.`)
      return
    }

    try {
      const tx = new Transaction()
      // Call publish entry function - it will consume and share the Music object
      tx.moveCall({
        target: `${PACKAGE_ID}::music::publish`,
        arguments: [tx.object(musicId)],
      })

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
             // Reload profile to see updated status
             loadProfile()
             alert('✅ Music published successfully!\n\nThe music is now shared and anyone can listen to it.')
          },
          onError: (err) => {
            console.error('Failed to publish music:', err)
            const errorMsg = String(err)
            if (errorMsg.includes('not signed by the correct sender')) {
              alert('⚠️ WALLET MISMATCH\n\nPlease ensure you are using the same wallet that created this music.')
            } else {
              alert(`❌ Failed to publish: ${errorMsg.slice(0, 100)}`)
            }
          }
        }
      )
    } catch (error) {
       console.error('Error preparing transaction:', error)
       alert(`Error: ${error}`)
    }
  }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const musicObjects = ownedObjects.data.filter((obj: any) =>
        obj.data?.content?.type?.includes('::music::Music')
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stakeObjects = ownedObjects.data.filter((obj: any) =>
        obj.data?.content?.type?.includes('::stake::StakePosition')
      )

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Deterministic color generation for mock cover (same as HomePage)
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

  if (!account) {
    return (
      <div className="min-h-screen bg-brutalist-pink font-mono flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '30px 30px' }}>
        </div>
        
        <div className="card-brutalist p-12 text-center max-w-2xl mx-4 z-10 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-6xl font-bold mb-6 comic-shadow">WHO ARe u?</h1>
          <p className="text-2xl mb-8 font-bold text-brutalist-blue border-b-4 border-black inline-block pb-2">
             CONNECT YOUR WALLET TO ENTER THE LAB
          </p>
          <button onClick={() => navigate('/')} className="btn-brutalist bg-brutalist-green hover:bg-green-400">
            👈 BACK TO HOME
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brutalist-pink font-mono selection:bg-brutalist-yellow selection:text-black">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
            <h1 className="text-7xl font-bold retro-shadow text-white comic-shadow rotate-1">
                MY_LAB.EXE
            </h1>
            <button onClick={() => navigate('/')} className="btn-brutalist bg-white text-sm hover:bg-gray-100">
                🏠 HOME
            </button>
        </div>

        {loading ? (
          <div className="text-center text-4xl animate-bounce font-bold bg-white border-4 border-black p-8 inline-block">
            LOADING DATA...
          </div>
        ) : (
          <div className="space-y-16">
            {/* Wallet Stats */}
            <div className="card-brutalist p-8 bg-brutalist-cyan">
              <div className="flex justify-between items-start mb-6 border-b-4 border-black pb-4">
                 <h2 className="text-4xl font-bold comic-shadow text-white">💰 WALLET INFO</h2>
                 <div className="bg-black text-white px-3 py-1 font-mono text-sm">SECURE_CONNECTION</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="font-bold mb-2 bg-yellow-300 inline-block px-2">ADDRESS</p>
                  <p className="text-xl font-mono break-all">{account.address}</p>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="font-bold mb-2 bg-green-300 inline-block px-2">BALANCE</p>
                  <p className="text-4xl font-bold">{(balance / 1_000_000_000).toFixed(3)} SUI</p>
                </div>
              </div>
            </div>

            {/* My Music */}
            <div>
               <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-5xl font-bold text-white comic-shadow bg-black px-4 py-2 -rotate-1">
                    MY TRACKS ({myMusic.length})
                  </h2>
               </div>
               
              {myMusic.length === 0 ? (
                 <div className="text-center bg-white/50 p-12 border-4 border-black border-dashed">
                  <p className="text-2xl font-bold mb-4">NO TRACKS FOUND</p>
                  <button onClick={() => navigate('/upload')} className="btn-brutalist bg-brutalist-green">
                    START CREATING
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {myMusic.map(music => (
                    <div
                      key={music.id}
                      onClick={() => navigate(`/play/${music.id}`)}
                      className="card-brutalist group p-3 cursor-pointer hover:bg-yellow-50 flex flex-col justify-between"
                    >
                      <div>
                         {/* Visual Header */}
                        <div className="bg-black text-white text-xs px-2 py-1 mb-2 flex justify-between font-mono">
                           <span>#{music.id.slice(-4)}</span>
                           <span>{music.status === 0 ? '📝 DRAFT' : music.status === 1 ? '✅ LIVE' : '🔒 BLOCKED'}</span>
                        </div>

                        {/* Mock Cover */}
                        <div className={`aspect-square mb-3 border-2 border-black overflow-hidden relative ${!music.cover_uri ? `bg-gradient-to-br ${getGradient(music.id)}` : 'bg-gray-200'}`}>
                            {music.cover_uri ? (
                                <img src={music.cover_uri} alt="Cover" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-6xl filter drop-shadow-lg opacity-50 mix-blend-overlay">🎹</span>
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                </div>
                            )}
                        </div>

                        <h3 className="font-bold text-xl uppercase truncate leading-none mb-2 font-comic">{music.id.slice(0, 8)}...</h3>
                        
                        <div className="text-sm space-y-1 font-mono border-t-2 border-black pt-2">
                           <div className="flex justify-between">
                              <span>👂 PLAYS</span>
                              <span className="font-bold">{music.total_listens}</span>
                           </div>
                           <div className="flex justify-between">
                              <span>💰 REVENUE</span>
                              <span className="font-bold text-green-600">{music.revenue_balance}</span>
                           </div>
                        </div>
                      </div>

                      {/* Publish Button for Drafts */}
                      {music.status === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish(music.id, music.creator);
                          }}
                          className="mt-4 w-full bg-brutalist-green border-2 border-black p-2 font-bold hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase text-sm"
                        >
                          🚀 PUBLISH
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Stakes */}
            <div className="card-brutalist p-8 bg-brutalist-yellow text-black border-4 border-black">
              <h2 className="text-4xl font-bold mb-8 comic-shadow uppercase bg-white inline-block px-4 border-2 border-black -rotate-1">
                 🎲 PREDICTIONS ({myStakes.length})
              </h2>
              {myStakes.length === 0 ? (
                <p className="text-xl font-bold text-center py-8">NO ACTIVE BETS.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myStakes.map(stake => (
                    <div
                      key={stake.id}
                      className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold bg-black text-white px-2 text-sm">TRACK #{stake.music_id.slice(-4)}</span>
                        <span className="font-mono text-xs">EPOCH: {stake.unlock_epoch}</span>
                      </div>
                      <div className="flex justify-between items-end border-t-2 border-black pt-2">
                         <div>
                            <p className="text-xs font-bold text-gray-500">STAKED AMOUNT</p>
                            <p className="text-2xl font-bold font-comic">{(stake.amount / 1_000_000_000).toFixed(1)} SUI</p>
                         </div>
                         <div className="text-2xl">🎲</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
