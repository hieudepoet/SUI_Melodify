import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { NETWORK } from '../../config/constants';

// Create Sui client instance
export const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK),
});

// Network configuration
export const networkConfig = {
  network: NETWORK,
  url: getFullnodeUrl(NETWORK),
};
