import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import MusicCard from "../components/music/MusicCard";
import { mockMusicTracks } from "../services/mockMusicService";

export default function MyMusicPage() {
  // Mock: Get first 2 tracks as user's tracks
  const userTracks = mockMusicTracks.slice(0, 2);
  const totalRevenue = userTracks.reduce(
    (sum, track) => sum + track.revenue,
    0,
  );
  const totalListens = userTracks.reduce(
    (sum, track) => sum + track.listenCount,
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header with Stats */}
        <div className="mb-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-righteous text-4xl font-bold text-white sm:text-5xl">
                My Music
              </h1>
              <p className="mt-2 font-poppins text-slate-400">
                Manage your published tracks
              </p>
            </div>

            <Link
              to="/upload"
              className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 font-poppins font-semibold text-white shadow-lg shadow-orange-500/50 transition-all duration-200 hover:shadow-orange-500/75 hover:scale-105 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Upload New
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
              <p className="font-poppins text-sm text-slate-400">
                Total Tracks
              </p>
              <p className="mt-2 font-righteous text-3xl font-bold text-white">
                {userTracks.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
              <p className="font-poppins text-sm text-slate-400">
                Total Listens
              </p>
              <p className="mt-2 font-righteous text-3xl font-bold text-orange-400">
                {(totalListens / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
              <p className="font-poppins text-sm text-slate-400">
                Total Revenue
              </p>
              <p className="mt-2 font-righteous text-3xl font-bold text-blue-400">
                {totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Music Grid */}
        {userTracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userTracks.map(track => (
              <MusicCard key={track.id} music={track} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-12 text-center">
            <Plus className="mx-auto h-12 w-12 text-slate-500 mb-4" />
            <p className="font-poppins text-lg font-semibold text-slate-400">
              No tracks yet
            </p>
            <p className="font-poppins text-slate-500 mt-2 mb-6">
              Upload your first track to get started
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 font-poppins font-semibold text-white shadow-lg shadow-orange-500/50 transition-all duration-200 hover:shadow-orange-500/75 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              Upload Your First Track
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
