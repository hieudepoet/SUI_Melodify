import { usePlayerStore } from '../../store/playerStore'
import { useEffect, useRef, useState } from 'react'
import { streamFromWalrus } from '../../services/walrus'

export default function GlobalPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, setIsPlaying, setCurrentTime, setDuration } = usePlayerStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Load audio when track changes
  useEffect(() => {
    if (currentTrack) {
      streamFromWalrus(currentTrack.audioCid)
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setAudioUrl(url)
        })
        .catch(err => console.error('Failed to load audio:', err))
    } else {
      setAudioUrl(null)
    }
  }, [currentTrack])

  // Update audio element
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl
      if (isPlaying) {
        audioRef.current.play()
      }
    }
  }, [audioUrl, isPlaying])

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  // Update time
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-brutalist-bg border-t-8 border-brutalist-pink p-4 z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="container mx-auto flex items-center gap-6">
        {/* Track Info */}
        <div className="flex-1">
          <h3 className="font-bold text-xl truncate">{currentTrack.title}</h3>
          <p className="text-brutalist-gray truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 bg-brutalist-green border-4 border-black flex items-center justify-center btn-brutalist"
          >
            <span className="text-3xl">{isPlaying ? '⏸' : '▶'}</span>
          </button>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1"
            />
            <span className="text-sm">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex-1" />
      </div>
    </div>
  )
}
