// Sui Network Configuration
export const NETWORK = (import.meta.env.VITE_SUI_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet';

// Package and Contract IDs
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
export const MUSIC_REGISTRY_ID = import.meta.env.VITE_MUSIC_REGISTRY_ID;
export const LISTEN_CONFIG_ID = import.meta.env.VITE_LISTEN_CONFIG_ID;
export const PARENT_POOL_ID = import.meta.env.VITE_PARENT_POOL_ID;
export const TREASURY_ID = import.meta.env.VITE_TREASURY_ID;
export const STAKE_REGISTRY_ID = import.meta.env.VITE_STAKE_REGISTRY_ID;

// Sui System Objects
export const CLOCK_ID = '0x6';

// Enoki Configuration
export const ENOKI_PUBLIC_API_KEY = import.meta.env.VITE_ENOKI_PUBLIC_API_KEY;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Walrus Configuration
export const WALRUS_PUBLISHER_URL = import.meta.env.VITE_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
export const WALRUS_AGGREGATOR_URL = import.meta.env.VITE_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

// Listen Price (0.001 SUI = 1,000,000 MIST)
export const DEFAULT_LISTEN_PRICE = 1_000_000;

// Stake Prediction Game
export const PREDICTION_STAKE_AMOUNT = 1_000_000; // 0.001 SUI
export const PREDICTION_LOCK_EPOCHS = 1; // 1 day
export const PREDICTION_MULTIPLIER = 2; // 2x reward
