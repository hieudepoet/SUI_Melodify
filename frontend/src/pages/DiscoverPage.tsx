import { useState } from "react";
import { Search, Filter } from "lucide-react";
import MusicCard from "../components/music/MusicCard";
import { mockMusicTracks } from "../services/mockMusicService";

const genres = [
  "All Genres",
  "Electronic",
  "Hip-Hop",
  "Ambient",
  "Jazz",
  "Rock",
  "Pop",
  "Classical",
  "World",
];

const sortOptions = [
  { label: "Most Listened", value: "listened" },
  { label: "Newest", value: "newest" },
  { label: "Lowest Price", value: "price-low" },
  { label: "Highest Price", value: "price-high" },
];

export default function DiscoverPage() {
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [sortBy, setSortBy] = useState("listened");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTracks = mockMusicTracks
    .filter(track => {
      const matchesGenre =
        selectedGenre === "All Genres" || track.genre === selectedGenre;
      const matchesSearch =
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGenre && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "listened":
          return b.listenCount - a.listenCount;
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-righteous text-4xl font-bold text-white sm:text-5xl">
            Discover Music
          </h1>
          <p className="mt-2 font-poppins text-slate-400">
            Explore thousands of tracks from talented creators
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist, or description..."
            className="w-full rounded-lg border border-slate-600 bg-slate-800/50 pl-12 pr-4 py-3 font-poppins text-white placeholder-slate-500 transition-all duration-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
          />
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4 lg:flex lg:gap-6 lg:space-y-0">
          {/* Genre Filter */}
          <div className="flex-1">
            <label className="block font-poppins text-sm font-semibold text-white mb-2">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`rounded-full px-4 py-2 font-poppins text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    selectedGenre === genre
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                      : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:border-orange-400/50"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Filter */}
          <div className="lg:w-48">
            <label
              htmlFor="sort"
              className="block font-poppins text-sm font-semibold text-white mb-2"
            >
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 font-poppins text-white transition-all duration-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            >
              {sortOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-800"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="font-poppins text-slate-400">
            {filteredTracks.length} track
            {filteredTracks.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Music Grid */}
        {filteredTracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTracks.map(track => (
              <MusicCard key={track.id} music={track} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-slate-500 mb-4" />
            <p className="font-poppins text-lg font-semibold text-slate-400">
              No tracks found
            </p>
            <p className="font-poppins text-slate-500 mt-2">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
