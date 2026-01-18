import { useState } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useNavigate } from 'react-router-dom'
import { uploadToWalrus } from '../services/walrus'
import { buildCreateMusicTx, buildPublishMusicTx } from '../services/sui/transactions'

export default function UploadPage() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [file, setFile] = useState<File | null>(null)
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
    if (!file) return

    try {
      setUploading(true)
      
      // Step 1: Upload to Walrus
      setStep('uploading')
      console.log('Uploading to Walrus...')
      const audioCid = await uploadToWalrus(file)
      console.log('Audio CID:', audioCid)

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
      const musicId = result.effects?.created?.find(
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
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl font-bold mb-8 comic-text text-brutalist-pink">
        UPLOAD MUSIC
      </h1>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="border-8 border-black bg-white text-black p-8">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block font-bold text-xl mb-2 uppercase">Audio File</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full border-4 border-black p-2"
              required
            />
            {file && (
              <p className="mt-2 text-brutalist-green">
                ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block font-bold text-xl mb-2 uppercase">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-4 border-black p-2 uppercase"
              placeholder="MY AWESOME TRACK"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block font-bold text-xl mb-2 uppercase">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-4 border-black p-2"
              rows={4}
              placeholder="Tell us about your music..."
              required
            />
          </div>

          {/* Genre */}
          <div className="mb-6">
            <label className="block font-bold text-xl mb-2 uppercase">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full border-4 border-black p-2 uppercase"
              required
            >
              <option value="">Select Genre</option>
              <option value="electronic">Electronic</option>
              <option value="hip-hop">Hip Hop</option>
              <option value="rock">Rock</option>
              <option value="pop">Pop</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !file}
            className={`w-full btn-brutalist text-2xl shadow-brutalist hover:shadow-brutalist-hover ${
              uploading
                ? 'bg-brutalist-gray cursor-not-allowed'
                : 'bg-brutalist-green'
            }`}
          >
            {uploading
              ? step === 'uploading'
                ? 'UPLOADING TO WALRUS...'
                : 'MINTING NFT...'
              : 'UPLOAD & PUBLISH'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 border-4 border-brutalist-yellow bg-black text-white p-4">
          <h3 className="font-bold text-xl mb-2">📝 HOW IT WORKS:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Upload your audio file to Walrus storage</li>
            <li>Create Music NFT on SUI blockchain</li>
            <li>10% royalty on all listens</li>
            <li>Immediately published and available</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
