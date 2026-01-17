import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';
import "./index.css";
import App from "./App.tsx";
import { SUI_CONFIG, validateConfig } from './config/sui';

// Validate config
try {
  validateConfig();
} catch (error) {
  console.error('Sui config validation failed:', error);
}

// Setup network config
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Setup React Query
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider 
        networks={networkConfig} 
        defaultNetwork={SUI_CONFIG.NETWORK as 'testnet' | 'mainnet'}
      >
        <WalletProvider
          autoConnect={true}
          preferredWallets={['Sui Wallet', 'Suiet Wallet']}
        >
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);

