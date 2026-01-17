import {
  Copy,
  LogOut,
  Wallet,
  Music,
  Headphones,
  TrendingUp,
} from "lucide-react";
import { mockCurrentUser } from "../services/mockMusicService";
import { useState } from "react";

export default function ProfilePage() {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(mockCurrentUser.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-righteous text-4xl font-bold text-white sm:text-5xl">
            Account
          </h1>
          <p className="mt-2 font-poppins text-slate-400">
            Manage your profile and view statistics
          </p>
        </div>

        {/* Profile Card */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 backdrop-blur">
          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-full bg-gradient-to-br from-orange-400/20 to-pink-400/20 p-4">
              <Wallet className="h-8 w-8 text-orange-400" />
            </div>
            <h2 className="mb-2 font-righteous text-2xl font-bold text-white">
              Wallet Address
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-slate-700/50 px-4 py-2 font-mono text-sm text-slate-300 break-all">
                {mockCurrentUser.address}
              </code>
              <button
                onClick={copyAddress}
                className="rounded-lg border border-slate-600 bg-slate-700/50 p-2 transition-all duration-200 hover:border-orange-400 hover:bg-slate-600 cursor-pointer"
                title="Copy address"
              >
                <Copy className="h-5 w-5 text-slate-400" />
              </button>
              {copied && (
                <span className="font-poppins text-xs text-green-400">
                  Copied!
                </span>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="rounded-lg bg-slate-700/30 p-6">
            <p className="font-poppins text-sm text-slate-400 mb-2">
              Available Balance
            </p>
            <div className="flex items-baseline gap-2">
              <div className="font-righteous text-4xl font-bold text-blue-400">
                {mockCurrentUser.balance.toFixed(3)}
              </div>
              <span className="font-poppins font-semibold text-slate-400">
                SUI
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Total Revenue */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-blue-400/20 to-cyan-400/20 p-3">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <p className="font-poppins text-sm text-slate-400">Total Revenue</p>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-righteous text-3xl font-bold text-blue-400">
                {mockCurrentUser.totalRevenue.toFixed(3)}
              </div>
              <span className="font-poppins text-sm text-slate-400">SUI</span>
            </div>
            <p className="mt-3 font-poppins text-xs text-slate-500">
              Earned from listen payments
            </p>
          </div>

          {/* Total Listens */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-orange-400/20 to-pink-400/20 p-3">
              <Headphones className="h-6 w-6 text-orange-400" />
            </div>
            <p className="font-poppins text-sm text-slate-400">Total Listens</p>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-righteous text-3xl font-bold text-orange-400">
                {(mockCurrentUser.totalListens / 1000).toFixed(1)}K
              </div>
            </div>
            <p className="mt-3 font-poppins text-xs text-slate-500">
              Listens across all tracks
            </p>
          </div>

          {/* Total Tracks */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-purple-400/20 to-pink-400/20 p-3">
              <Music className="h-6 w-6 text-purple-400" />
            </div>
            <p className="font-poppins text-sm text-slate-400">
              Published Tracks
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-righteous text-3xl font-bold text-purple-400">
                {mockCurrentUser.totalTracks}
              </div>
            </div>
            <p className="mt-3 font-poppins text-xs text-slate-500">
              Tracks you've published
            </p>
          </div>

          {/* Joined */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-green-400/20 to-blue-400/20 p-3">
              <Music className="h-6 w-6 text-green-400" />
            </div>
            <p className="font-poppins text-sm text-slate-400">Member Since</p>
            <div className="mt-2">
              <div className="font-righteous text-lg font-bold text-green-400">
                January 2024
              </div>
            </div>
            <p className="mt-3 font-poppins text-xs text-slate-500">
              Active creator
            </p>
          </div>
        </div>

        {/* Settings Section */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
          <h3 className="mb-6 font-poppins font-semibold text-white">
            Settings
          </h3>

          <div className="space-y-4">
            {/* Notification Settings */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-700/30 p-4">
              <div>
                <p className="font-poppins font-semibold text-white">
                  Email Notifications
                </p>
                <p className="font-poppins text-sm text-slate-400">
                  Get updates on new listens and revenue
                </p>
              </div>
              <div className="h-6 w-10 cursor-pointer rounded-full bg-orange-500 transition-colors" />
            </div>

            {/* Privacy Settings */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-700/30 p-4">
              <div>
                <p className="font-poppins font-semibold text-white">
                  Public Profile
                </p>
                <p className="font-poppins text-sm text-slate-400">
                  Allow others to see your profile
                </p>
              </div>
              <div className="h-6 w-10 cursor-pointer rounded-full bg-orange-500 transition-colors" />
            </div>

            {/* Two-Factor Auth */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-700/30 p-4">
              <div>
                <p className="font-poppins font-semibold text-white">
                  Two-Factor Authentication
                </p>
                <p className="font-poppins text-sm text-slate-400">
                  Secure your account with 2FA
                </p>
              </div>
              <div className="h-6 w-10 cursor-pointer rounded-full bg-slate-600 transition-colors" />
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <button className="group relative inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-6 py-3 font-poppins font-semibold text-red-400 transition-all duration-200 hover:border-red-500 hover:bg-red-500/20 cursor-pointer">
            <LogOut className="h-5 w-5" />
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
