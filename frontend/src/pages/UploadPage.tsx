import { useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useNavigate } from 'react-router-dom'
import { uploadToWalrus } from '../services/walrus'
import { buildCreateMusicTx, buildPublishMusicTx } from '../services/sui/transactions'

export default function UploadPage() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [uploadMode, setUploadMode] = useState<'walrus' | 'direct'>('walrus')
  const [file, setFile] = useState<File | null>(null)
  const [directUrl, setDirectUrl] = useState('')
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<'select' | 'uploading' | 'minting'>('select')

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-6xl font-bold mb-4 comic-text">UPLOAD MUSIC</h1>
        <p className="text-2xl text-brutalist-pink">Please connect your wallet first!</p>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (uploadMode === 'walrus' && !file) return
    if (uploadMode === 'direct' && !directUrl) return

    try {
      setUploading(true)
      
      let audioCid = ''

      if (uploadMode === 'walrus') {
        // Step 1: Upload to Walrus
        if (!file) throw new Error("No file selected")
        setStep('uploading')
        console.log('Uploading to Walrus...')
        audioCid = await uploadToWalrus(file)
        console.log('Audio CID:', audioCid)
      } else {
        // Step 1: Use Direct URL
        console.log('Using Direct URL...')
        audioCid = directUrl
      }

      // For MVP, use same CID for preview
      const previewCid = audioCid

      // Create metadata
      const metadata = {
        title,
        description,
        genre,
      }
      const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`
      const coverUri = '' // Empty for MVP

      // Step 2: Create Music NFT
      setStep('minting')
      console.log('Creating Music NFT...')
      const { tx, music } = buildCreateMusicTx(
        audioCid,
        previewCid,
        metadataUri,
        coverUri,
        1000 // 10% royalty
      )

      // Transfer music to user
      tx.transferObjects([music], account.address)

      const result = await signAndExecute({ transaction: tx })
      console.log('Music created:', result)

      // Get music ID from created objects
      // Cast effects to any to avoid TS issues with the SDK response type for now
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const effectAny = result.effects as any;
      const musicId = effectAny?.created?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj: any) => obj.owner?.AddressOwner === account.address
      )?.reference.objectId

      if (musicId) {
        // Step 3: Publish immediately
        console.log('Publishing music...')
        const publishTx = buildPublishMusicTx(musicId)
        await signAndExecute({ transaction: publishTx })

        alert('Music uploaded and published successfully!')
        navigate(`/play/${musicId}`)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Upload failed: ${error}`)
    } finally {
      setUploading(false)
      setStep('select')
    }
  }

  return (
    <div className="min-h-screen bg-brutalist-pink font-mono selection:bg-brutalist-green selection:text-black">
       {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
            <h1 className="text-6xl font-bold comic-shadow text-white rotate-[-1deg]">
                UPLOAD ZONE
            </h1>
            <button onClick={() => navigate('/')} className="btn-brutalist bg-white text-sm hover:bg-gray-100">
                ❌ CANCEL
            </button>
        </div>

        <div className="max-w-2xl mx-auto relative">
          {/* Decorative Elements */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-brutalist-yellow border-4 border-black z-0 rotate-12 hidden md:block"></div>
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-brutalist-cyan border-4 border-black z-0 -rotate-6 rounded-full hidden md:block"></div>

          <form onSubmit={handleSubmit} className="card-brutalist p-8 bg-white relative z-10">
            
            {/* Upload Mode Toggle */}
            <div className="mb-8 flex gap-4">
               <button
                  type="button"
                  onClick={() => setUploadMode('walrus')}
                  className={`flex-1 py-3 px-4 text-xl font-bold uppercase border-4 border-black transition-all ${
                    uploadMode === 'walrus' 
                    ? 'bg-brutalist-pink text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'
                  }`}
               >
                 🌊 Walrus
               </button>
               <button
                  type="button"
                  onClick={() => setUploadMode('direct')}
                  className={`flex-1 py-3 px-4 text-xl font-bold uppercase border-4 border-black transition-all ${
                    uploadMode === 'direct' 
                    ? 'bg-brutalist-yellow text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'
                  }`}
               >
                 🔗 Direct Link
               </button>
            </div>

            {/* Conditional Input */}
            {uploadMode === 'walrus' ? (
              <div className="mb-6">
                <label className="block font-bold text-xl mb-2 uppercase bg-black text-white inline-block px-2">Audio File</label>
                <div className="border-4 border-black p-4 bg-gray-50 border-dashed hover:bg-gray-100 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={uploadMode === 'walrus'}
                    />
                    <div className="text-center">
                        <p className="text-4xl mb-2">📂</p>
                        <p className="font-bold">CLICK TO SELECT FILE</p>
                    </div>
                </div>
                {file && (
                  <p className="mt-2 text-brutalist-green font-bold text-lg bg-black inline-block px-2">
                    ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2 font-bold">INFO: Requires WAL tokens on Testnet</p>
              </div>
            ) : (
               <div className="mb-6">
                <label className="block font-bold text-xl mb-2 uppercase bg-black text-white inline-block px-2">Audio URL</label>
                <input
                  type="url"
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://example.com/song.mp3"
                  className="w-full border-4 border-black p-3 font-bold bg-yellow-50 focus:bg-white transition-colors outline-none"
                  required={uploadMode === 'direct'}
                />
                <p className="text-xs font-bold text-gray-500 mt-2 uppercase">Link must be publicly accessible (e.g. Google Drive, Cloudinary)</p>
              </div>
            )}

            {/* Title */}
            <div className="mb-6">
              <label className="block font-bold text-xl mb-2 uppercase bg-brutalist-cyan border-2 border-black inline-block px-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-4 border-black p-3 font-bold uppercase text-lg outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                placeholder="Ex: CYBER FUNK 2077"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block font-bold text-xl mb-2 uppercase">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border-4 border-black p-3 font-medium outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                rows={3}
                placeholder="What's the story behind this track?"
                required
              />
            </div>

            {/* Genre */}
            <div className="mb-8">
              <label className="block font-bold text-xl mb-2 uppercase">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full border-4 border-black p-3 font-bold uppercase bg-white outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow cursor-pointer appearance-none"
                required
              >
                <option value="">-- SELECT GENRE --</option>
                <option value="electronic">⚡ Electronic</option>
                <option value="hip-hop">🎤 Hip Hop</option>
                <option value="rock">🎸 Rock</option>
                <option value="pop">✨ Pop</option>
                <option value="other">🎲 Other</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || (uploadMode === 'walrus' && !file) || (uploadMode === 'direct' && !directUrl)}
              className={`w-full py-4 text-2xl font-black border-4 border-black uppercase transition-all ${
                uploading
                  ? 'bg-gray-300 cursor-not-allowed opacity-50'
                  : 'bg-brutalist-green hover:bg-green-400 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]'
              }`}
            >
              {uploading
                ? step === 'uploading'
                  ? '⏳ UPLOADING...'
                  : '🔨 MINTING...'
                : '🚀 PUBLISH TRACK'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 border-4 border-black bg-brutalist-yellow p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-1">
            <h3 className="font-extrabold text-2xl mb-2 uppercase">💡 How It Works</h3>
            <ul className="list-disc list-inside space-y-1 font-bold font-mono text-sm">
              <li>Walrus: Decentralized storage (Requires Testnet Tokens)</li>
              <li>Direct Link: Use your own hosting (Drive, Dropbox, etc.)</li>
              <li>10% royalty on all listens</li>
              <li>Immediately published and available</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
