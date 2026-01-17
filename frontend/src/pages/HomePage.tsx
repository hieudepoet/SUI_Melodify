import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  Zap,
  Lock,
  Radio,
  Headphones,
  Music2,
  TrendingUp,
} from "lucide-react";
import { mockMusicTracks } from "../services/mockMusicService";
import MusicCard from "../components/music/MusicCard";

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const featuredTrack = mockMusicTracks[0]; // Neon Dreams
  const featuredTracks = mockMusicTracks.slice(0, 4);
  const playlistTracks = mockMusicTracks.slice(0, 6);

  // Simulate audio playback progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= featuredTrack.duration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, featuredTrack.duration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 relative overflow-hidden">
      {/* Liquid Glass Morphing Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-cyan-400/40 via-blue-500/30 to-purple-500/40 blur-3xl animate-[morph_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-pink-500/40 via-rose-500/30 to-orange-500/40 blur-3xl animate-[morph_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30 blur-3xl animate-[morph_12s_ease-in-out_infinite_4s]" />
      </div>

      {/* Hero Section with Audio Spotlight */}
      <section className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <div className="relative grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Hero Content */}
            <div className="z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 shadow-lg shadow-cyan-500/20 transition-all duration-500 hover:bg-white/15 hover:shadow-cyan-500/30 cursor-pointer">
                <Music2 className="h-4 w-4 text-cyan-300" />
                <span className="font-poppins text-xs font-semibold text-cyan-100">
                  Web3 Music Streaming
                </span>
              </div>

              <h1 className="mb-6 font-righteous text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl drop-shadow-2xl">
                Own Your{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-pink-300 to-purple-300 bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]">
                  Music
                </span>
              </h1>

              <p className="mb-8 max-w-2xl font-poppins text-lg text-slate-200 sm:text-xl leading-relaxed drop-shadow-lg">
                Upload your tracks, publish to blockchain, and earn revenue from
                every listen. No intermediaries, just pure ownership.
              </p>

              <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/upload"
                  className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500/90 via-pink-500/90 to-purple-500/90 backdrop-blur-xl border border-white/20 px-8 py-4 font-poppins font-semibold text-white shadow-2xl shadow-cyan-500/30 transition-all duration-500 hover:shadow-cyan-500/50 hover:scale-105 hover:from-cyan-400 hover:via-pink-400 hover:to-purple-400 cursor-pointer"
                >
                  <Zap className="h-5 w-5" />
                  Start Creating
                </Link>

                <Link
                  to="/discover"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-8 py-4 font-poppins font-semibold text-white shadow-lg shadow-white/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-white/20 cursor-pointer"
                >
                  <Radio className="h-5 w-5" />
                  Explore Music
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-lg shadow-cyan-500/10 transition-all duration-500 hover:bg-white/10 hover:shadow-cyan-500/20 cursor-pointer">
                  <div className="font-righteous text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                    1.2K+
                  </div>
                  <p className="font-poppins text-xs text-slate-300">Tracks</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-lg shadow-pink-500/10 transition-all duration-500 hover:bg-white/10 hover:shadow-pink-500/20 cursor-pointer">
                  <div className="font-righteous text-2xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
                    50K+
                  </div>
                  <p className="font-poppins text-xs text-slate-300">Listens</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 shadow-lg shadow-purple-500/10 transition-all duration-500 hover:bg-white/10 hover:shadow-purple-500/20 cursor-pointer">
                  <div className="font-righteous text-2xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                    $25K+
                  </div>
                  <p className="font-poppins text-xs text-slate-300">Revenue</p>
                </div>
              </div>
            </div>

            {/* Right: Audio Spotlight */}
            <div className="relative z-10">
              <div
                className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br shadow-2xl backdrop-blur-2xl"
                style={{
                  backgroundImage: featuredTrack.coverUrl,
                  minHeight: "400px",
                }}
              >
                {/* Liquid Glass Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-slate-950/50 backdrop-blur-sm" />

                {/* Content */}
                <div className="relative flex h-full min-h-[400px] flex-col justify-between p-8">
                  {/* Badge */}
                  <div className="self-start">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 shadow-lg shadow-cyan-500/20 transition-all duration-500 hover:bg-white/15 hover:shadow-cyan-500/30 cursor-pointer">
                      <TrendingUp className="h-4 w-4 text-cyan-300" />
                      <span className="font-poppins text-xs font-semibold text-white">
                        Featured Track
                      </span>
                    </span>
                  </div>

                  {/* Track Info */}
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 font-poppins text-sm font-semibold bg-gradient-to-r from-cyan-300 to-pink-300 bg-clip-text text-transparent uppercase tracking-wider">
                        {featuredTrack.genre}
                      </p>
                      <h2 className="mb-2 font-righteous text-3xl font-bold text-white sm:text-4xl drop-shadow-lg">
                        {featuredTrack.title}
                      </h2>
                      <p className="font-poppins text-slate-200">
                        by {featuredTrack.creator}
                      </p>
                    </div>

                    {/* Audio Player Preview */}
                    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 shadow-lg shadow-cyan-500/10">
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-poppins text-xs text-slate-400">
                            {formatTime(currentTime)}
                          </span>
                          <span className="font-poppins text-xs text-slate-400">
                            {formatTime(featuredTrack.duration)}
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-white/10 overflow-hidden backdrop-blur-sm">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 transition-all duration-500 shadow-lg shadow-cyan-500/50"
                            style={{
                              width: `${(currentTime / featuredTrack.duration) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="group relative inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-r from-cyan-500/90 via-pink-500/90 to-purple-500/90 backdrop-blur-xl border border-white/20 shadow-2xl shadow-cyan-500/30 transition-all duration-500 hover:shadow-cyan-500/50 hover:scale-110 hover:from-cyan-400 hover:via-pink-400 hover:to-purple-400 cursor-pointer"
                          >
                            {isPlaying ? (
                              <Pause className="h-5 w-5 text-white fill-white" />
                            ) : (
                              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                            )}
                          </button>
                          <div className="flex items-center gap-2 text-slate-200">
                            <Headphones className="h-4 w-4" />
                            <span className="font-poppins text-sm">
                              {(featuredTrack.listenCount / 1000).toFixed(1)}K
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/listen/${featuredTrack.id}`}
                          className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 font-poppins text-sm font-semibold text-white shadow-lg shadow-white/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-white/20 cursor-pointer"
                        >
                          Listen Full
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Playlist Showcase */}
      <section className="relative border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 font-righteous text-4xl font-bold text-white sm:text-5xl drop-shadow-lg">
                Trending Now
              </h2>
              <p className="font-poppins text-slate-200">
                Discover the hottest tracks on the platform
              </p>
            </div>
            <Link
              to="/discover"
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-3 font-poppins font-semibold text-white shadow-lg shadow-white/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-white/20 cursor-pointer"
            >
              View All
              <Radio className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredTracks.map(track => (
              <MusicCard key={track.id} music={track} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 font-righteous text-4xl font-bold text-white sm:text-5xl drop-shadow-lg">
            Why Choose Melodify?
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-lg shadow-cyan-500/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-cyan-500/20 hover:scale-105 cursor-pointer">
              <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-cyan-500/30 to-pink-500/30 backdrop-blur-sm p-3 border border-white/20">
                <Play className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="mb-2 font-poppins text-xl font-bold text-white">
                Upload & Stream
              </h3>
              <p className="font-poppins text-slate-200">
                Share your music with the world instantly. Your tracks, your
                way.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-lg shadow-pink-500/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-pink-500/20 hover:scale-105 cursor-pointer">
              <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 backdrop-blur-sm p-3 border border-white/20">
                <Lock className="h-6 w-6 text-pink-300" />
              </div>
              <h3 className="mb-2 font-poppins text-xl font-bold text-white">
                Secure Payments
              </h3>
              <p className="font-poppins text-slate-200">
                Every transaction is on-chain and encrypted. Full control, full
                transparency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-lg shadow-purple-500/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-purple-500/20 hover:scale-105 cursor-pointer">
              <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-sm p-3 border border-white/20">
                <Zap className="h-6 w-6 text-purple-300" />
              </div>
              <h3 className="mb-2 font-poppins text-xl font-bold text-white">
                Instant Earnings
              </h3>
              <p className="font-poppins text-slate-200">
                Get paid directly for every listen. No waiting, no gatekeepers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Playlist Showcase */}
      <section className="relative border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 font-righteous text-4xl font-bold text-white sm:text-5xl drop-shadow-lg">
                Popular Playlist
              </h2>
              <p className="font-poppins text-slate-200">
                Curated tracks from top creators
              </p>
            </div>
            <Link
              to="/discover"
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-3 font-poppins font-semibold text-white shadow-lg shadow-white/10 transition-all duration-500 hover:bg-white/15 hover:border-white/30 hover:shadow-white/20 cursor-pointer"
            >
              Explore More
              <Radio className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {playlistTracks.map(track => (
              <MusicCard key={track.id} music={track} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-slate-700/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 text-center backdrop-blur">
              <div className="font-righteous text-3xl font-bold text-orange-400 sm:text-4xl">
                1.2K+
              </div>
              <p className="mt-2 font-poppins text-sm text-slate-400">
                Tracks Published
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 text-center backdrop-blur">
              <div className="font-righteous text-3xl font-bold text-blue-400 sm:text-4xl">
                50K+
              </div>
              <p className="mt-2 font-poppins text-sm text-slate-400">Total Listens</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 text-center backdrop-blur">
              <div className="font-righteous text-3xl font-bold text-pink-400 sm:text-4xl">
                $25K+
              </div>
              <p className="mt-2 font-poppins text-sm text-slate-400">Revenue Earned</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 text-center backdrop-blur">
              <div className="font-righteous text-3xl font-bold text-purple-400 sm:text-4xl">
                500+
              </div>
              <p className="mt-2 font-poppins text-sm text-slate-400">
                Active Creators
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative overflow-hidden border-t border-slate-700/50 px-4 py-20 sm:px-6 lg:px-8">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-pink-500/5 to-blue-500/5" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 backdrop-blur-sm">
            <Music2 className="h-4 w-4 text-orange-400" />
            <span className="font-poppins text-xs font-semibold text-orange-400">
              Start Your Journey
            </span>
          </div>

          <h2 className="mb-6 font-righteous text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Ready to Own Your{" "}
            <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Music?
            </span>
          </h2>
          <p className="mb-8 font-poppins text-lg text-slate-300 sm:text-xl">
            Join thousands of artists earning from their passion. Upload your first track and start earning today.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/upload"
              className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-4 font-poppins font-semibold text-white shadow-lg shadow-orange-500/50 transition-all duration-200 hover:shadow-orange-500/75 hover:scale-105 cursor-pointer"
            >
              <Zap className="h-5 w-5" />
              Start Creating Music
            </Link>

            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-8 py-4 font-poppins font-semibold text-white transition-all duration-200 hover:border-blue-400 hover:bg-slate-700 cursor-pointer"
            >
              <Radio className="h-5 w-5" />
              Explore First
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
