export const SUI_CONFIG = {
  // Network
  NETWORK: import.meta.env.VITE_SUI_NETWORK || 'testnet',
  
  // Smart Contract IDs (from deployment)
  PACKAGE_ID: import.meta.env.VITE_PACKAGE_ID || '0x0',
  
  // Shared Objects
  MUSIC_REGISTRY_ID: import.meta.env.VITE_MUSIC_REGISTRY_ID || '0x0',
  LISTEN_CONFIG_ID: import.meta.env.VITE_LISTEN_CONFIG_ID || '0x0',
  PARENT_POOL_ID: import.meta.env.VITE_PARENT_POOL_ID || '0x0',
  TREASURY_ID: import.meta.env.VITE_TREASURY_ID || '0x0',
  STAKE_REGISTRY_ID: import.meta.env.VITE_STAKE_REGISTRY_ID || '0x0',
  
  // System Objects
  CLOCK_ID: '0x6' as const,
} as const;

// Validation
export function validateConfig() {
  const required = [
    'PACKAGE_ID',
    'MUSIC_REGISTRY_ID',
    'LISTEN_CONFIG_ID',
    'PARENT_POOL_ID',
    'TREASURY_ID',
    'STAKE_REGISTRY_ID',
  ];
  
  const missing = required.filter(
    (key) => SUI_CONFIG[key as keyof typeof SUI_CONFIG] === '0x0'
  );
  
  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing Sui config: ${missing.join(', ')}. Please deploy contracts and update .env`
    );
  }
}
