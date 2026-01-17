import { Link, useLocation } from "react-router-dom";
import { Home, Upload, Radio, Music, User, LogOut } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const mainLinks = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/upload", icon: Upload, label: "Upload" },
    { path: "/discover", icon: Radio, label: "Discover" },
    { path: "/my-music", icon: Music, label: "My Music" },
  ];

  const bottomLinks = [{ path: "/profile", icon: User, label: "Profile" }];

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-slate-700/50 bg-slate-900/80 backdrop-blur-lg">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-slate-700 px-6 py-4">
          <div className="rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 p-2">
            <Music className="h-6 w-6 text-white" />
          </div>
          <span className="font-righteous text-xl font-bold text-white">
            Melodify
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-2 px-4 py-6">
          {mainLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 font-poppins font-semibold transition-all duration-200 cursor-pointer ${
                  isActive(link.path)
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="space-y-2 border-t border-slate-700 px-4 py-6">
          {bottomLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 font-poppins font-semibold transition-all duration-200 cursor-pointer ${
                  isActive(link.path)
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}

          <button className="w-full flex items-center gap-3 rounded-lg px-4 py-3 font-poppins font-semibold text-red-400 transition-all duration-200 hover:bg-red-500/10 cursor-pointer">
            <LogOut className="h-5 w-5" />
            Disconnect
          </button>
        </div>
      </div>
    </aside>
  );
}
