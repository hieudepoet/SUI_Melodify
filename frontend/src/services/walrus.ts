import { WalrusClient } from "@mysten/walrus";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getForceTestWallet } from "./testWallet";

// Initialize Sui Client for Testnet
const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });

// Initialize Walrus Client
const walrusClient = new WalrusClient({
    suiClient: suiClient,
    network: "testnet",
});

/**
 * Upload audio file to Walrus
 */
export const uploadToWalrus = async (file: File): Promise<string> => {
    // Convert File to Uint8Array
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const signer = getForceTestWallet();

    if (!signer) {
        throw new Error("Test wallet not available for signing Walrus upload transaction.");
    }

    console.log("Uploading to Walrus with signer:", signer.toSuiAddress());

    // The SDK's writeBlob handles the storage purchase and upload
    const { blobId } = await walrusClient.writeBlob({
        blob: bytes,
        deletable: false,
        epochs: 10, // Reduced to 10 to avoid MoveAbort
        signer: signer,
    });

    if (!blobId) {
        throw new Error("Failed to upload to Walrus: No blobId returned.");
    }

    return blobId;
};

/**
 * Get Walrus blob URL for streaming (Public Aggregator)
 */
export function getWalrusUrl(blobId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
}

/**
 * Stream audio from Walrus
 */
export async function streamFromWalrus(blobId: string): Promise<Blob> {
  const url = getWalrusUrl(blobId);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch from Walrus: ${response.statusText}`);
  }
  return await response.blob();
}
