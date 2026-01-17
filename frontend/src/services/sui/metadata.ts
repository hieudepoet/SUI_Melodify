// Metadata types for fetching UI data from metadata_uri
export interface MusicMetadata {
  title: string;
  description: string;
  artist: string;
  genre: string;
  duration: number; // in seconds
  price: number;    // in SUI (human-readable)
  coverImage?: string; // Optional override
}

/**
 * Upload metadata JSON to Walrus
 * @param metadata Music metadata object
 * @returns Metadata URI (Walrus blob URL)
 */
export async function uploadMetadata(metadata: MusicMetadata): Promise<string> {
  const { walrusService } = await import('../walrus');
  
  // Convert metadata to JSON
  const metadataJson = JSON.stringify(metadata, null, 2);
  const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
  const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
  
  // Upload to Walrus
  const blobId = await walrusService.uploadFile(metadataFile);
  
  // Return full URL
  return await walrusService.getBlobUrl(blobId);
}

// Helper to convert MIST to SUI (1 SUI = 1_000_000_000 MIST)
export function mistToSui(mist: string | number): number {
  const mistValue = typeof mist === 'string' ? parseInt(mist) : mist;
  return mistValue / 1_000_000_000;
}

// Helper to convert SUI to MIST
export function suiToMist(sui: number): number {
  return Math.floor(sui * 1_000_000_000);
}
