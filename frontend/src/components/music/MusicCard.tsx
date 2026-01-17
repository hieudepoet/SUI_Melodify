import { Link } from "react-router-dom";
import { Play, Headphones, DollarSign } from "lucide-react";
import { Music } from "../../types/music";

interface MusicCardProps {
  music: Music;
}

export default function MusicCard({ music }: MusicCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <Link to={`/listen/${music.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur transition-all duration-200 hover:border-orange-400/50 hover:bg-slate-700 hover:scale-105 cursor-pointer h-full">
        {/* Cover Image / Gradient */}
        <div
          className="relative h-40 overflow-hidden bg-gradient-to-br sm:h-48"
          style={{ backgroundImage: music.coverUrl }}
        >
          {/* Overlay with Play Button */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 p-4 shadow-lg">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>

          {/* Genre Badge */}
          <div className="absolute top-3 right-3">
            <span className="inline-block rounded-full bg-orange-500/80 px-3 py-1 font-poppins text-xs font-semibold text-white">
              {music.genre}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="mb-1 font-poppins text-lg font-bold text-white line-clamp-2">
            {music.title}
          </h3>

          {/* Creator */}
          <p className="font-poppins text-sm text-slate-400 mb-3 truncate">
            {music.creator}
          </p>

          {/* Description */}
          <p className="font-poppins text-sm text-slate-500 mb-4 line-clamp-2">
            {music.description}
          </p>

          {/* Stats */}
          <div className="mb-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-slate-400">
              <Headphones className="h-4 w-4" />
              <span className="font-poppins">
                {formatNumber(music.listenCount)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-orange-400">
              <DollarSign className="h-4 w-4" />
              <span className="font-poppins font-semibold">{music.price}</span>
            </div>
          </div>

          {/* Play Button */}
          <button className="group/btn w-full rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 font-poppins font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer">
            Play Now
          </button>
        </div>
      </div>
    </Link>
  );
}
