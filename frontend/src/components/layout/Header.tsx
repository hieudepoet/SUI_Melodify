import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { Link } from 'react-router-dom'

export default function Header() {
  const account = useCurrentAccount()

  return (
    <header className="border-b-8 border-black bg-brutalist-pink">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-4xl font-brutalist font-extrabold tracking-tighter comic-text">
          MELODIFY
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-bold uppercase tracking-wider hover:text-brutalist-yellow transition-colors"
          >
            Home
          </Link>
          <Link
            to="/upload"
            className="text-lg font-bold uppercase tracking-wider hover:text-brutalist-yellow transition-colors"
          >
            Upload
          </Link>
          <Link
            to="/stake"
            className="text-lg font-bold uppercase tracking-wider hover:text-brutalist-yellow transition-colors"
          >
            Stake
          </Link>
          {account && (
            <Link
              to="/profile"
              className="text-lg font-bold uppercase tracking-wider hover:text-brutalist-yellow transition-colors"
            >
              Profile
            </Link>
          )}

          <ConnectButton className="btn-brutalist bg-brutalist-green text-black shadow-brutalist hover:shadow-brutalist-hover" />
        </nav>
      </div>
    </header>
  )
}
