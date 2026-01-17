import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Play,
  Pause,
  Volume2,
  Zap,
  Lock,
  Headphones,
  DollarSign,
} from "lucide-react";
import { useMusic, parseMusic } from "../hooks/useMusic";
import { useListen } from "../hooks/useListen";
import { useMetadata } from "../hooks/useMetadata";
import { useSuiClient } from "@mysten/dapp-kit";
import { createSEALService } from "../services/seal";
import { walrusService } from "../services/walrus";
import { SUI_CONFIG } from "@/config/sui";

export default function ListenPage() {
  const { musicId } = useParams<{ musicId: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);

  // Fetch music data from blockchain
  const { data: musicData, isLoading: queryLoading } = useMusic(musicId!);
  const music = musicData ? parseMusic(musicData) : null;
  
  // Fetch metadata from metadata_uri
  const { metadata, isLoading: metadataLoading } = useMetadata(music?.metadata_uri);
  
  // Listen payment hook
  const { payToListen, isLoading: paymentLoading, hasAccess, listenCapId } = useListen(musicId!);

  // Derived state
  const isPaid = hasAccess;
  const isProcessing = paymentLoading;
  const duration = metadata?.duration || 180; // From metadata or default 3 minutes
  const coverGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  const handlePayToListen = async () => {
    if (!music) return;
    
    try {
      // Pay 0.001 SUI (1_000_000 MIST)
      await payToListen('1000000');
      // Auto-play after payment
      setIsPlaying(true);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (queryLoading || metadataLoading || !music || !metadata) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="font-poppins text-slate-400">Loading music...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Back Link */}
        <a
          href="/discover"
          className="inline-flex items-center gap-2 font-poppins text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer"
        >
          ← Back to Discover
        </a>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Player Section */}
          <div className="lg:col-span-2">
            {/* Cover Art */}
            <div
              className="relative mb-8 aspect-square rounded-xl border border-slate-700 bg-gradient-to-br shadow-2xl overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.3)), ${coverGradient}`,
              }}
            >
              {/* Lock Overlay */}
              {!isPaid && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <Lock className="h-16 w-16 text-white/80 mx-auto mb-4" />
                    <p className="font-poppins font-semibold text-white">
                      Unlock with Payment
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="mb-8">
              <h1 className="font-righteous text-4xl font-bold text-white sm:text-5xl mb-2">
                {metadata.title}
              </h1>
              <p className="font-poppins text-lg text-slate-400 mb-4">
                by {metadata.artist}
              </p>
              <p className="font-poppins text-slate-400 max-w-2xl">
                {metadata.description}
              </p>
            </div>

            {/* Player Controls */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur mb-8">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-poppins text-sm text-slate-400">
                    {formatTime(currentTime)}
                  </span>
                  <span className="font-poppins text-sm text-slate-400">
                    {formatTime(duration)}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all"
                    style={{
                      width: isPaid
                        ? `${(currentTime / duration) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              {/* Play Controls */}
              <div className="mb-6 flex items-center justify-center gap-4">
                <button
                  disabled={!isPaid}
                  className="rounded-full bg-slate-700/50 p-2 transition-all duration-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Volume2 className="h-5 w-5 text-slate-400" />
                </button>

                <button
                  onClick={() => isPaid && setIsPlaying(!isPlaying)}
                  disabled={!isPaid}
                  className="group relative inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 shadow-lg shadow-orange-500/50 transition-all duration-200 hover:shadow-orange-500/75 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7 text-white fill-white" />
                  ) : (
                    <Play className="h-7 w-7 text-white fill-white ml-1" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={e => setVolume(parseInt(e.target.value))}
                  disabled={!isPaid}
                  className="w-24 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:opacity-50"
                />
              </div>

              {/* Locked Message */}
              {!isPaid && (
                <div className="rounded-lg bg-orange-500/10 border border-orange-500/50 p-4">
                  <p className="font-poppins text-center text-orange-400">
                    Pay to unlock this track
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <h3 className="mb-4 font-poppins font-semibold text-white">
                Track Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Headphones className="h-4 w-4" />
                    <span className="font-poppins text-sm">Listens</span>
                  </div>
                  <span className="font-poppins font-bold text-orange-400">
                    {music.total_listens >= 1000 ? (music.total_listens / 1000).toFixed(1) + 'K' : music.total_listens}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-poppins text-sm">Revenue</span>
                  </div>
                  <span className="font-poppins font-bold text-blue-400">
                    {music.revenue_pool.toFixed(4)} SUI
                  </span>
                </div>
                <div className="h-px bg-slate-700" />
                <div className="flex items-center justify-between pt-2">
                  <span className="font-poppins text-sm text-slate-400">
                    Genre
                  </span>
                  <span className="font-poppins font-semibold text-white">
                    {metadata.genre}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Card */}
            {!isPaid ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
                <h3 className="mb-4 font-poppins font-semibold text-white">
                  Pay to Listen
                </h3>
                <div className="mb-6">
                  <p className="font-poppins text-sm text-slate-400 mb-2">
                    Price
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-righteous font-bold text-orange-400">
                      {metadata.price}
                    </div>
                    <span className="font-poppins font-semibold text-slate-400">
                      SUI
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePayToListen}
                  disabled={isProcessing}
                  className="w-full group relative inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 font-poppins font-semibold text-white shadow-lg shadow-orange-500/50 transition-all duration-200 hover:shadow-orange-500/75 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Pay to Listen
                    </>
                  )}
                </button>

                <p className="mt-4 font-poppins text-xs text-slate-500 text-center">
                  Secure payment on-chain • One-time payment
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-green-500/50 bg-green-500/10 p-6 backdrop-blur">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                    <Zap className="h-4 w-4 text-green-400" />
                  </div>
                  <h3 className="font-poppins font-semibold text-green-400">
                    Access Unlocked!
                  </h3>
                </div>
                <p className="font-poppins text-sm text-green-300">
                  You now have access to listen to this track. Enjoy!
                </p>
              </div>
            )}

            {/* Creator Info */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
              <h3 className="mb-3 font-poppins font-semibold text-white">
                Creator
              </h3>
              <p className="font-mono font-semibold text-orange-400 break-all text-sm">
                {music.creator}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
