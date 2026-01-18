/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUI_NETWORK: 'mainnet' | 'testnet' | 'devnet'
  readonly VITE_PACKAGE_ID: string
  readonly VITE_MUSIC_REGISTRY_ID: string
  readonly VITE_LISTEN_CONFIG_ID: string
  readonly VITE_PARENT_POOL_ID: string
  readonly VITE_TREASURY_ID: string
  readonly VITE_STAKE_REGISTRY_ID: string
  readonly VITE_ENOKI_PUBLIC_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_WALRUS_PUBLISHER_URL: string
  readonly VITE_WALRUS_AGGREGATOR_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
