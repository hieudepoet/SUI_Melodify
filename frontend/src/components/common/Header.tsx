import { Link, useLocation } from "react-router-dom";
import { Music, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/upload", label: "Upload" },
    { path: "/discover", label: "Discover" },
    { path: "/my-music", label: "My Music" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 p-2 group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-200">
              <Music className="h-6 w-6 text-white" />
            </div>
            <span className="font-righteous text-xl font-bold text-white hidden sm:inline">
              Melodify
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-poppins font-semibold text-sm transition-all duration-200 cursor-pointer ${
                  isActive(link.path)
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Wallet Button */}
          <div className="hidden md:flex items-center gap-4">
            <button className="px-6 py-2 rounded-lg bg-slate-800 border border-slate-700 font-poppins font-semibold text-white transition-all duration-200 hover:border-orange-400 hover:bg-slate-700 cursor-pointer">
              Connect Wallet
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-700 py-4 space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg font-poppins font-semibold transition-all duration-200 cursor-pointer ${
                  isActive(link.path)
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button className="w-full mt-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 font-poppins font-semibold text-white transition-all duration-200 hover:border-orange-400 hover:bg-slate-700 cursor-pointer">
              Connect Wallet
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
