import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { SUI_CONFIG } from '@/config/sui';

export const suiClient = new SuiClient({
  url: getFullnodeUrl(SUI_CONFIG.NETWORK as 'testnet' | 'mainnet'),
});

export type { SuiClient };
