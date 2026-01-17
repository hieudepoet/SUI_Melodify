# 🎯 SUI MELODIFY - FRONTEND INTEGRATION CHECKLIST
## Complete Sui Stack Integration Rules & Code Examples

> **Purpose**: Practical checklist for integrating Sui ecosystem tools into React frontend  
> **Focus**: @mysten/dapp-kit (Core) + Enhancement stack (Walrus/SEAL/Enoki/etc)  
> **Target**: Frontend developers & AI agents building on Sui

---

## 📋 TABLE OF CONTENTS

1. [Core: dApp Kit (REQUIRED)](#1-core-dapp-kit-required)
2. [Storage: Walrus (Audio/Media)](#2-storage-walrus-audiomedia)
3. [Privacy: SEAL (Encrypted Access)](#3-privacy-seal-encrypted-access)
4. [Auth: Enoki zkLogin (OAuth Onboarding)](#4-auth-enoki-zklogin-oauth-onboarding)
5. [Auth: Passkey (Biometric Alternative)](#5-auth-passkey-biometric-alternative)
6. [UX: Sponsored Transactions (Gas-Free)](#6-ux-sponsored-transactions-gas-free)
7. [Identity: SuiNS (Name Resolution)](#7-identity-suins-name-resolution)
8. [Marketplace: Kiosk (NFT Trading)](#8-marketplace-kiosk-nft-trading)
9. [Integration Priority Matrix](#9-integration-priority-matrix)
10. [Complete Code Examples](#10-complete-code-examples)

---

## 1. CORE: dApp Kit (REQUIRED)

### 1.1 Overview

```typescript
// @mysten/dapp-kit: Foundation for ALL wallet interactions
// Status: ⭐⭐⭐ CRITICAL - Must have for any Sui dApp
// Version: ^0.14.35+
```

### 1.2 Integration Rule

✅ **DO**: Wrap entire app with providers  
✅ **DO**: Use hooks for all wallet interactions  
❌ **DON'T**: Manually manage wallet state  
❌ **DON'T**: Use deprecated @mysten/wallet-kit

### 1.3 Setup (App.tsx)

```typescript
// src/App.tsx
import { 
  SuiClientProvider, 
  WalletProvider, 
  createNetworkConfig 
} from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider
          autoConnect={true}
          preferredWallets={['Sui Wallet', 'Suiet Wallet']}
          enableUnsafeBurner={false} // Only true in dev
        >
          <Router>
            <AppRoutes />
          </Router>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

### 1.4 Connect Wallet (Header.tsx)

```typescript
// src/components/Header.tsx
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function Header() {
  const account = useCurrentAccount();
  
  return (
    <header className="flex justify-between items-center p-4">
      <h1>SUI Melodify</h1>
      
      {/* Pre-built connect button */}
      <ConnectButton />
      
      {/* Or custom */}
      {account ? (
        <div>
          <p>Connected: {account.address.slice(0, 6)}...</p>
        </div>
      ) : (
        <p>Please connect wallet</p>
      )}
    </header>
  );
}
```

### 1.5 Execute Transaction

```typescript
// src/hooks/useMintMusic.ts
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, MUSIC_REGISTRY_ID } from '@/config/sui';

export function useMintMusic() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  
  const mintMusic = async (params: {
    audioCid: string;
    previewCid: string;
    metadataUri: string;
    coverUri: string;
    royaltyBps: number;
  }) => {
    if (!currentAccount) throw new Error('Wallet not connected');
    
    const tx = new Transaction();
    
    const [music] = tx.moveCall({
      target: `${PACKAGE_ID}::music::create_music`,
      arguments: [
        tx.pure.string(params.audioCid),
        tx.pure.string(params.previewCid),
        tx.pure.string(params.metadataUri),
        tx.pure.string(params.coverUri),
        tx.pure.u16(params.royaltyBps),
        tx.pure.option('id', null),
        tx.object(MUSIC_REGISTRY_ID),
      ],
    });
    
    tx.transferObjects([music], currentAccount.address);
    
    return new Promise((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        },
        {
          onSuccess: (result) => {
            const musicId = result.effects?.created?.[0]?.reference.objectId;
            resolve(musicId);
          },
          onError: reject,
        }
      );
    });
  };
  
  return { mintMusic };
}
```

### 1.6 Query Data

```typescript
// src/hooks/useMusic.ts
import { useSuiClientQuery } from '@mysten/dapp-kit';

export function useMusic(musicId: string) {
  return useSuiClientQuery('getObject', {
    id: musicId,
    options: {
      showContent: true,
      showDisplay: true,
      showType: true,
    },
  });
}

// Usage in component
function MusicDetails({ musicId }: { musicId: string }) {
  const { data, isLoading, error } = useMusic(musicId);
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  const music = data.data?.content?.fields;
  
  return (
    <div>
      <h2>{music.metadata_uri}</h2>
      <p>Listens: {music.total_listens}</p>
    </div>
  );
}
```

---

## 2. STORAGE: Walrus (Audio/Media)

### 2.1 Overview

```typescript
// Walrus: Decentralized storage for large files (audio, images)
// Status: ⭐⭐⭐ CRITICAL for audio platform
// Use Case: Store encrypted audio files, cover images, metadata
```

### 2.2 Integration Rule

✅ **DO**: Store CID on-chain, files off-chain  
✅ **DO**: Use lazy loading for audio (avoid loading all at once)  
✅ **DO**: Cache URLs in localStorage  
❌ **DON'T**: Store large files on-chain  
❌ **DON'T**: Load audio until user clicks play

### 2.3 Upload Audio (Backend/Frontend)

```typescript
// src/services/walrus.ts
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export class WalrusService {
  async uploadFile(file: File, epochs: number = 5): Promise<string> {
    const response = await fetch(`${WALRUS_AGGREGATOR}/v1/store?epochs=${epochs}`, {
      method: 'PUT',
      body: file,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.newlyCreated) {
      return result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified) {
      return result.alreadyCertified.blobId;
    }
    
    throw new Error('Upload failed');
  }
  
  async getBlobUrl(blobId: string): Promise<string> {
    // Check cache first
    const cached = localStorage.getItem(`walrus_url_${blobId}`);
    if (cached) return cached;
    
    const url = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
    
    // Cache for 1 hour
    localStorage.setItem(`walrus_url_${blobId}`, url);
    setTimeout(() => localStorage.removeItem(`walrus_url_${blobId}`), 3600000);
    
    return url;
  }
  
  async downloadBlob(blobId: string): Promise<Blob> {
    const url = await this.getBlobUrl(blobId);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    return await response.blob();
  }
}

export const walrusService = new WalrusService();
```

### 2.4 Upload Music Flow (UploadPage.tsx)

```typescript
// src/pages/UploadPage.tsx
import { walrusService } from '@/services/walrus';
import { useMintMusic } from '@/hooks/useMintMusic';

export function UploadPage() {
  const { mintMusic } = useMintMusic();
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (audioFile: File, coverFile: File) => {
    setUploading(true);
    
    try {
      // 1. Generate preview (first 30 seconds)
      const preview = await generatePreview(audioFile);
      
      // 2. Upload to Walrus
      const [audioCid, previewCid, coverCid] = await Promise.all([
        walrusService.uploadFile(audioFile),
        walrusService.uploadFile(preview),
        walrusService.uploadFile(coverFile),
      ]);
      
      // 3. Upload metadata to IPFS
      const metadata = {
        name: 'Song Name',
        description: 'Description',
        image: await walrusService.getBlobUrl(coverCid),
        audio: await walrusService.getBlobUrl(audioCid),
      };
      const metadataUri = await uploadToIPFS(metadata);
      
      // 4. Mint Music NFT
      const musicId = await mintMusic({
        audioCid,
        previewCid,
        metadataUri,
        coverUri: await walrusService.getBlobUrl(coverCid),
        royaltyBps: 1000, // 10%
      });
      
      console.log('Music minted:', musicId);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
      <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Music'}
      </button>
    </div>
  );
}
```

### 2.5 Audio Player with Lazy Load (Player.tsx)

```typescript
// src/components/Player.tsx
import { walrusService } from '@/services/walrus';
import { useEffect, useState, useRef } from 'react';

export function AudioPlayer({ musicId }: { musicId: string }) {
  const { data: music } = useMusic(musicId);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const loadAudio = async () => {
    if (!music?.data?.content?.fields) return;
    
    setLoading(true);
    try {
      // Lazy load: Only when user clicks play
      const url = await walrusService.getBlobUrl(music.data.content.fields.audio_cid);
      setAudioUrl(url);
    } catch (error) {
      console.error('Failed to load audio:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlay = () => {
    if (!audioUrl) {
      loadAudio().then(() => audioRef.current?.play());
    } else {
      audioRef.current?.play();
    }
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);
  
  return (
    <div>
      {audioUrl && <audio ref={audioRef} src={audioUrl} controls />}
      {!audioUrl && (
        <button onClick={handlePlay} disabled={loading}>
          {loading ? 'Loading...' : 'Play'}
        </button>
      )}
    </div>
  );
}
```

---

## 3. PRIVACY: SEAL (Encrypted Access)

### 3.1 Overview

```typescript
// SEAL: Sui Encrypted Access Layer
// Status: ⭐⭐ IMPORTANT for gated content
// Use Case: Decrypt full audio only if user has valid ListenCap
```

### 3.2 Integration Rule

✅ **DO**: Check ListenCap validity before decrypt  
✅ **DO**: Show preview for free, full audio requires payment  
✅ **DO**: Handle "No access" error gracefully  
❌ **DON'T**: Decrypt without checking on-chain approval  
❌ **DON'T**: Store decryption keys in frontend

### 3.3 SEAL Client Setup

```typescript
// src/services/seal.ts
import { SuiClient } from '@mysten/sui/client';

export class SEALService {
  constructor(private client: SuiClient) {}
  
  async checkAccess(listenCapId: string, clockId: string = '0x6'): Promise<boolean> {
    try {
      // Call seal_approve entry function to check
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::listen::seal_approve`,
        arguments: [
          tx.pure.vector('u8', []), // key_id (empty for check)
          tx.object(listenCapId),
          tx.object(clockId),
        ],
      });
      
      // DevInspect to check without executing
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0', // Dummy sender for read-only
      });
      
      return result.effects.status.status === 'success';
    } catch (error) {
      return false;
    }
  }
  
  async isCapValid(listenCapId: string): Promise<boolean> {
    try {
      const cap = await this.client.getObject({
        id: listenCapId,
        options: { showContent: true },
      });
      
      const fields = cap.data?.content?.fields;
      if (!fields) return false;
      
      // Check expiry
      const now = Date.now();
      const expiresAt = Number(fields.expires_at);
      
      return now < expiresAt;
    } catch {
      return false;
    }
  }
}
```

### 3.4 Gated Audio Player (Protected.tsx)

```typescript
// src/components/ProtectedPlayer.tsx
import { SEALService } from '@/services/seal';
import { useSuiClient } from '@mysten/dapp-kit';

export function ProtectedAudioPlayer({ 
  musicId, 
  listenCapId 
}: { 
  musicId: string; 
  listenCapId?: string;
}) {
  const client = useSuiClient();
  const sealService = new SEALService(client);
  const { data: music } = useMusic(musicId);
  const [hasAccess, setHasAccess] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  useEffect(() => {
    async function checkAccess() {
      if (!listenCapId) {
        setHasAccess(false);
        return;
      }
      
      const valid = await sealService.isCapValid(listenCapId);
      setHasAccess(valid);
    }
    
    checkAccess();
  }, [listenCapId]);
  
  const loadProtectedAudio = async () => {
    if (!hasAccess || !music) return;
    
    try {
      // In production: Call Walrus SEAL API for decryption
      // For now: If has valid cap, load audio
      const url = await walrusService.getBlobUrl(music.data.content.fields.audio_cid);
      setAudioUrl(url);
    } catch (error) {
      console.error('Decryption failed:', error);
    }
  };
  
  if (!listenCapId) {
    return (
      <div className="border border-yellow-500 p-4 rounded">
        <p className="text-yellow-600">🔒 Full audio requires payment</p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
          Pay to Listen (0.001 SUI)
        </button>
      </div>
    );
  }
  
  if (!hasAccess) {
    return (
      <div className="border border-red-500 p-4 rounded">
        <p className="text-red-600">❌ Your ListenCap has expired</p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
          Renew Access
        </button>
      </div>
    );
  }
  
  return (
    <div className="border border-green-500 p-4 rounded">
      <p className="text-green-600">✅ Access granted</p>
      {!audioUrl ? (
        <button 
          onClick={loadProtectedAudio}
          className="bg-green-500 text-white px-4 py-2 rounded mt-2"
        >
          Load Full Audio
        </button>
      ) : (
        <audio src={audioUrl} controls className="w-full mt-2" />
      )}
    </div>
  );
}
```

---

## 4. AUTH: Enoki zkLogin (OAuth Onboarding)

### 4.1 Overview

```typescript
// Enoki: zkLogin for Web2-style onboarding (Google, Apple, etc.)
// Status: ⭐⭐ RECOMMENDED for new users
// Use Case: No wallet install, users login with social accounts
```

### 4.2 Integration Rule

✅ **DO**: Default auth method for new users  
✅ **DO**: Store session keys in localStorage for persistence  
✅ **DO**: Show wallet option for advanced users  
❌ **DON'T**: Force users to install wallet  
❌ **DON'T**: Expose session keys in logs

### 4.3 Enoki Setup

```bash
# Install
npm install @mysten/enoki
```

```typescript
// src/config/enoki.ts
import { EnokiFlow } from '@mysten/enoki/react';

export const enokiFlow = new EnokiFlow({
  apiKey: import.meta.env.VITE_ENOKI_API_KEY, // Get from Mysten dashboard
});
```

### 4.4 zkLogin Component (Auth.tsx)

```typescript
// src/components/zkLogin.tsx
import { enokiFlow } from '@/config/enoki';
import { useState, useEffect } from 'react';

export function ZkLoginButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Check existing session
    const savedAddress = localStorage.getItem('enoki_address');
    if (savedAddress) setAddress(savedAddress);
  }, []);
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      // Create OAuth flow
      await enokiFlow.createAuthorizationURL({
        provider: 'google',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        redirectUrl: `${window.location.origin}/auth/callback`,
        network: 'testnet',
      });
      
      // User will be redirected to Google
    } catch (error) {
      console.error('zkLogin failed:', error);
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('enoki_address');
    localStorage.removeItem('enoki_session');
    setAddress(null);
  };
  
  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
        <button onClick={handleLogout} className="text-red-500 text-sm">
          Logout
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
      >
        <img src="/google-icon.svg" className="w-5 h-5" />
        {loading ? 'Loading...' : 'Continue with Google'}
      </button>
      
      {/* Other providers */}
      <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded">
        <img src="/apple-icon.svg" className="w-5 h-5" />
        Continue with Apple
      </button>
    </div>
  );
}
```

### 4.5 Auth Callback Handler

```typescript
// src/pages/AuthCallback.tsx
import { enokiFlow } from '@/config/enoki';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();
  
  useEffect(() => {
    async function handleCallback() {
      try {
        // Handle OAuth callback
        const { address } = await enokiFlow.handleAuthCallback();
        
        // Save address & session
        localStorage.setItem('enoki_address', address);
        localStorage.setItem('enoki_session', JSON.stringify({ address }));
        
        // Redirect to app
        navigate('/');
      } catch (error) {
        console.error('Auth callback failed:', error);
        navigate('/login?error=auth_failed');
      }
    }
    
    handleCallback();
  }, []);
  
  return <div>Processing authentication...</div>;
}
```

---

## 5. AUTH: Passkey (Biometric Alternative)

### 5.1 Overview

```typescript
// Passkey: WebAuthn-based biometric login
// Status: ⭐ OPTIONAL (alternative to zkLogin)
// Use Case: Users who prefer biometric over OAuth
```

### 5.2 Integration Rule

✅ **DO**: Offer as alternative to zkLogin  
✅ **DO**: Use for returning users (faster than OAuth)  
✅ **DO**: Integrate with Enoki for session management  
❌ **DON'T**: Make it primary auth (not all devices support)  
❌ **DON'T**: Use without fallback

### 5.3 Passkey Component

```typescript
// src/components/PasskeyAuth.tsx
import { enokiFlow } from '@/config/enoki';

export function PasskeyLogin() {
  const [loading, setLoading] = useState(false);
  
  const handlePasskeyLogin = async () => {
    setLoading(true);
    
    try {
      // Check if passkey is supported
      if (!window.PublicKeyCredential) {
        alert('Passkey not supported on this device');
        return;
      }
      
      // Create passkey credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // Random challenge
          rp: { name: 'SUI Melodify' },
          user: {
            id: new Uint8Array(16),
            name: 'user@example.com',
            displayName: 'User',
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        },
      });
      
      // Use credential with Enoki
      const { address } = await enokiFlow.getAddress({ credential });
      
      localStorage.setItem('passkey_address', address);
      
      console.log('Passkey login successful:', address);
    } catch (error) {
      console.error('Passkey failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handlePasskeyLogin}
      disabled={loading}
      className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded"
    >
      🔐 {loading ? 'Authenticating...' : 'Login with Passkey'}
    </button>
  );
}
```

---

## 6. UX: Sponsored Transactions (Gas-Free)

### 6.1 Overview

```typescript
// Sponsored Tx: dApp pays gas for user transactions
// Status: ⭐⭐ RECOMMENDED for onboarding
// Use Case: First-time mint, claim rewards (1 free tx per user)
```

### 6.2 Integration Rule

✅ **DO**: Sponsor first mint for new users  
✅ **DO**: Set limit (1 sponsored tx per address)  
✅ **DO**: Fallback to user-paid if quota exceeded  
❌ **DON'T**: Sponsor all transactions (expensive)  
❌ **DON'T**: Allow abuse (check IP/device fingerprint)

### 6.3 Backend Sponsor Service

```typescript
// backend/src/services/sponsor.ts
import { EnokiFlow } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';

const enoki = new EnokiFlow({
  apiKey: process.env.ENOKI_API_KEY!,
});

// Track sponsored addresses
const sponsoredAddresses = new Set<string>();

export async function sponsorMintMusic(
  userAddress: string,
  musicParams: {
    audioCid: string;
    previewCid: string;
    metadataUri: string;
    coverUri: string;
    royaltyBps: number;
  }
): Promise<string> {
  // Check if already sponsored
  if (sponsoredAddresses.has(userAddress)) {
    throw new Error('User already received sponsored transaction');
  }
  
  // Check treasury balance
  const treasuryBalance = await checkTreasuryBalance();
  if (treasuryBalance < MIN_BALANCE_FOR_SPONSOR) {
    throw new Error('Sponsor quota exceeded');
  }
  
  const tx = new Transaction();
  
  const [music] = tx.moveCall({
    target: `${PACKAGE_ID}::music::create_music`,
    arguments: [
      tx.pure.string(musicParams.audioCid),
      tx.pure.string(musicParams.previewCid),
      tx.pure.string(musicParams.metadataUri),
      tx.pure.string(musicParams.coverUri),
      tx.pure.u16(musicParams.royaltyBps),
      tx.pure.option('id', null),
      tx.object(MUSIC_REGISTRY_ID),
    ],
  });
  
  tx.transferObjects([music], userAddress);
  
  // Sponsor and execute
  const result = await enoki.sponsorAndExecuteTransaction({
    transaction: tx,
    client: userAddress, // User identifier
  });
  
  // Mark as sponsored
  sponsoredAddresses.add(userAddress);
  
  return result.digest;
}
```

### 6.4 Frontend Integration

```typescript
// src/hooks/useSponsoredMint.ts
export function useSponsoredMint() {
  const currentAccount = useCurrentAccount();
  const [canSponsor, setCanSponsor] = useState(false);
  
  useEffect(() => {
    async function checkEligibility() {
      if (!currentAccount) return;
      
      // Check if user is eligible for sponsored mint
      const response = await fetch('/api/sponsor/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAccount.address }),
      });
      
      const { eligible } = await response.json();
      setCanSponsor(eligible);
    }
    
    checkEligibility();
  }, [currentAccount]);
  
  const mintWithSponsor = async (params: MusicParams) => {
    const response = await fetch('/api/sponsor/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: currentAccount!.address,
        ...params,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Sponsor failed');
    }
    
    const { digest, musicId } = await response.json();
    return { digest, musicId };
  };
  
  return { canSponsor, mintWithSponsor };
}

// Usage in component
function MintButton() {
  const { canSponsor, mintWithSponsor } = useSponsoredMint();
  const { mintMusic } = useMintMusic(); // Regular mint
  
  const handleMint = async () => {
    if (canSponsor) {
      // Free mint!
      await mintWithSponsor(params);
    } else {
      // User pays gas
      await mintMusic(params);
    }
  };
  
  return (
    <button onClick={handleMint}>
      {canSponsor ? '🎁 Mint FREE' : 'Mint Music'}
    </button>
  );
}
```

---

## 7. IDENTITY: SuiNS (Name Resolution)

### 7.1 Overview

```typescript
// SuiNS: .sui domain names for addresses
// Status: ⭐ NICE-TO-HAVE for UX
// Use Case: Display "hieu.sui" instead of "0x1234..."
```

### 7.2 Integration Rule

✅ **DO**: Display names in UI (profiles, marketplace)  
✅ **DO**: Allow search by name  
✅ **DO**: Cache resolved names  
❌ **DON'T**: Force users to buy names  
❌ **DON'T**: Show name as primary (always show address tooltip)

### 7.3 SuiNS Service

```typescript
// src/services/suins.ts
import { SuiClient } from '@mysten/sui/client';

export class SuiNSService {
  private cache = new Map<string, string>();
  
  constructor(private client: SuiClient) {}
  
  async resolveName(address: string): Promise<string | null> {
    // Check cache
    if (this.cache.has(address)) {
      return this.cache.get(address)!;
    }
    
    try {
      // Query SuiNS registry
      const name = await this.client.resolveNameServiceAddress({
        name: address,
      });
      
      if (name) {
        this.cache.set(address, name);
        return name;
      }
    } catch (error) {
      console.error('SuiNS resolution failed:', error);
    }
    
    return null;
  }
  
  async resolveAddress(name: string): Promise<string | null> {
    try {
      // Remove .sui if present
      const cleanName = name.replace('.sui', '');
      
      const address = await this.client.resolveNameServiceNames({
        name: cleanName,
      });
      
      return address;
    } catch (error) {
      console.error('SuiNS lookup failed:', error);
      return null;
    }
  }
}
```

### 7.4 Address Display Component

```typescript
// src/components/AddressDisplay.tsx
import { suinsService } from '@/services/suins';
import { useSuiClient } from '@mysten/dapp-kit';

export function AddressDisplay({ address }: { address: string }) {
  const client = useSuiClient();
  const service = new SuiNSService(client);
  const [name, setName] = useState<string | null>(null);
  
  useEffect(() => {
    service.resolveName(address).then(setName);
  }, [address]);
  
  return (
    <div className="group relative">
      <span className="font-mono">
        {name ? (
          <span className="text-blue-600">{name}</span>
        ) : (
          <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
        )}
      </span>
      
      {/* Tooltip with full address */}
      <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded -top-8 left-0 whitespace-nowrap">
        {address}
      </div>
    </div>
  );
}
```

---

## 8. MARKETPLACE: Kiosk (NFT Trading)

### 8.1 Overview

```typescript
// Kiosk: Sui's standard for NFT trading
// Status: ⭐⭐⭐ CRITICAL if you have marketplace
// Use Case: Buy/sell Music NFTs, royalty enforcement
```

### 8.2 Integration Rule

✅ **DO**: Use for all NFT trading (Music objects)  
✅ **DO**: Enforce royalties automatically  
✅ **DO**: Create personal kiosk for each user  
❌ **DON'T**: Build custom marketplace (use standard)  
❌ **DON'T**: Allow direct transfers (bypass royalties)

### 8.3 Kiosk Service

```typescript
// src/services/kiosk.ts
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from '@/config/sui';

export class KioskService {
  async createKiosk(userAddress: string): Promise<string> {
    const tx = new Transaction();
    
    // Create new kiosk
    const [kiosk, kioskOwnerCap] = tx.moveCall({
      target: '0x2::kiosk::new',
      arguments: [],
    });
    
    // Share kiosk, transfer cap to user
    tx.moveCall({
      target: '0x2::kiosk::share',
      arguments: [kiosk],
    });
    
    tx.transferObjects([kioskOwnerCap], userAddress);
    
    // Execute...
    // Return kiosk ID
  }
  
  async listMusic(
    kioskId: string,
    kioskOwnerCapId: string,
    musicId: string,
    price: string
  ): Promise<string> {
    const tx = new Transaction();
    
    tx.moveCall({
      target: '0x2::kiosk::place_and_list',
      arguments: [
        tx.object(kioskId),
        tx.object(kioskOwnerCapId),
        tx.object(musicId),
        tx.pure.u64(price),
      ],
      typeArguments: [`${PACKAGE_ID}::music::Music`],
    });
    
    // Execute and return digest
  }
  
  async purchaseMusic(
    sellerKioskId: string,
    musicId: string,
    price: string,
    buyerAddress: string
  ): Promise<string> {
    const tx = new Transaction();
    
    // Split coin for payment
    const [coin] = tx.splitCoins(tx.gas, [price]);
    
    // Purchase from kiosk
    const [music, transferRequest] = tx.moveCall({
      target: '0x2::kiosk::purchase',
      arguments: [
        tx.object(sellerKioskId),
        tx.pure.id(musicId),
        coin,
      ],
      typeArguments: [`${PACKAGE_ID}::music::Music`],
    });
    
    // Confirm transfer (enforce royalties)
    tx.moveCall({
      target: '0x2::transfer_policy::confirm_request',
      arguments: [
        tx.object(TRANSFER_POLICY_ID), // Created during contract deployment
        transferRequest,
      ],
      typeArguments: [`${PACKAGE_ID}::music::Music`],
    });
    
    // Transfer music to buyer
    tx.transferObjects([music], buyerAddress);
    
    // Execute and return digest
  }
}
```

### 8.4 Marketplace UI

```typescript
// src/pages/Marketplace.tsx
import { kioskService } from '@/services/kiosk';

export function MarketplacePage() {
  const [listings, setListings] = useState([]);
  
  useEffect(() => {
    async function loadListings() {
      // Query all kiosks with listed Music NFTs
      const objects = await client.getDynamicFields({
        parentId: KIOSK_REGISTRY_ID,
      });
      
      // Filter and format listings
      setListings(objects.data);
    }
    
    loadListings();
  }, []);
  
  const handlePurchase = async (listing: any) => {
    await kioskService.purchaseMusic(
      listing.kioskId,
      listing.musicId,
      listing.price,
      currentAccount!.address
    );
  };
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {listings.map(listing => (
        <MusicCard
          key={listing.musicId}
          music={listing}
          onPurchase={() => handlePurchase(listing)}
        />
      ))}
    </div>
  );
}
```

---

## 9. INTEGRATION PRIORITY MATRIX

### 9.1 Must-Have (MVP)

| Component | Priority | Complexity | Impact |
|-----------|----------|------------|--------|
| **dApp Kit** | ⭐⭐⭐ | Low | CRITICAL - Core wallet/tx |
| **Walrus** | ⭐⭐⭐ | Medium | CRITICAL - Audio storage |
| **Kiosk** | ⭐⭐⭐ | Medium | CRITICAL - NFT trading |

### 9.2 Recommended (Enhanced UX)

| Component | Priority | Complexity | Impact |
|-----------|----------|------------|--------|
| **SEAL** | ⭐⭐ | High | High - Gated content |
| **Enoki zkLogin** | ⭐⭐ | Medium | High - Easy onboarding |
| **Sponsored Tx** | ⭐⭐ | Medium | Medium - UX improvement |

### 9.3 Optional (Nice-to-Have)

| Component | Priority | Complexity | Impact |
|-----------|----------|------------|--------|
| **Passkey** | ⭐ | Low | Low - Alternative auth |
| **SuiNS** | ⭐ | Low | Low - Better UX |

### 9.4 Implementation Order

```
Phase 1 (Week 1-2): Core
1. ✅ dApp Kit setup
2. ✅ Walrus upload/download
3. ✅ Basic player

Phase 2 (Week 3): Enhanced
4. ✅ SEAL integration (if needed)
5. ✅ Kiosk marketplace
6. ✅ Enoki zkLogin

Phase 3 (Week 4+): Polish
7. ⭐ Sponsored tx for onboarding
8. ⭐ SuiNS display
9. ⭐ Passkey (if demand)
```

---

## 10. COMPLETE CODE EXAMPLES

### 10.1 Full Player Component

```typescript
// src/components/CompletePlayer.tsx
import { useState, useEffect, useRef } from 'react';
import { useMusic } from '@/hooks/useMusic';
import { walrusService } from '@/services/walrus';
import { SEALService } from '@/services/seal';
import { useSuiClient } from '@mysten/dapp-kit';

interface CompletePlayerProps {
  musicId: string;
  listenCapId?: string;
}

export function CompletePlayer({ musicId, listenCapId }: CompletePlayerProps) {
  const client = useSuiClient();
  const sealService = new SEALService(client);
  
  const { data: music, isLoading } = useMusic(musicId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [playing, setPlaying] = useState<'preview' | 'full' | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Load preview (always available)
  useEffect(() => {
    if (!music) return;
    
    async function loadPreview() {
      const url = await walrusService.getBlobUrl(
        music.data.content.fields.preview_cid
      );
      setPreviewUrl(url);
    }
    
    loadPreview();
  }, [music]);
  
  // Check access for full audio
  useEffect(() => {
    if (!listenCapId) return;
    
    async function checkAccess() {
      const valid = await sealService.isCapValid(listenCapId!);
      setHasAccess(valid);
    }
    
    checkAccess();
  }, [listenCapId]);
  
  const playPreview = () => {
    if (!previewUrl || !audioRef.current) return;
    audioRef.current.src = previewUrl;
    audioRef.current.play();
    setPlaying('preview');
  };
  
  const playFull = async () => {
    if (!hasAccess || !music) {
      alert('Please purchase ListenCap to play full audio');
      return;
    }
    
    if (!fullAudioUrl) {
      const url = await walrusService.getBlobUrl(
        music.data.content.fields.audio_cid
      );
      setFullAudioUrl(url);
      audioRef.current!.src = url;
    }
    
    audioRef.current!.play();
    setPlaying('full');
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Cover */}
      <img
        src={music?.data.content.fields.cover_uri}
        alt="Cover"
        className="w-full h-48 object-cover rounded mb-4"
      />
      
      {/* Audio player */}
      <audio
        ref={audioRef}
        controls
        className="w-full mb-4"
        onEnded={() => setPlaying(null)}
      />
      
      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={playPreview}
          className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          {playing === 'preview' ? '⏸️ Pause' : '▶️ Preview'}
        </button>
        
        {hasAccess ? (
          <button
            onClick={playFull}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {playing === 'full' ? '⏸️ Pause' : '🎵 Full Audio'}
          </button>
        ) : (
          <button
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🔒 Pay to Listen
          </button>
        )}
      </div>
      
      {/* Stats */}
      <div className="mt-4 text-sm text-gray-600">
        <p>👂 {music?.data.content.fields.total_listens} listens</p>
        <p>💰 Revenue: {Number(music?.data.content.fields.revenue_pool) / 1e9} SUI</p>
      </div>
    </div>
  );
}
```

---

## 📝 QUICK CHECKLIST

```typescript
// Essential integrations for launch:
✅ dApp Kit (wallet connection)
✅ Walrus (audio storage)
✅ Basic player (preview + full)
✅ Kiosk (if marketplace)

// Nice-to-have for better UX:
⭐ SEAL (paid content gating)
⭐ Enoki (easy onboarding)
⭐ Sponsored tx (free first mint)

// Optional enhancements:
💡 SuiNS (name display)
💡 Passkey (biometric)
```

---

**Document Version**: 1.0.0  
**Last Updated**: January 17, 2026  
**Maintained by**: Antigravity AI  
**Status**: ✅ Production Ready
