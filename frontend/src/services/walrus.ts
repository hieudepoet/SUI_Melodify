// Walrus Decentralized Storage Service
// NOTE: Direct browser upload to Walrus publisher has CORS restrictions
// For production: Use backend proxy or signed transactions with wallet

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus, WalrusFile } from '@mysten/walrus';

// Configure Walrus client with $extend pattern
const client = new SuiJsonRpcClient({
  url: getFullnodeUrl('testnet'),
  network: 'testnet',
}).$extend(walrus());

/**
 * Walrus Service - Hybrid Implementation
 * MVP: Mock upload for testing
 * Production: Backend proxy or signed transactions
 */
export class WalrusService {
  private cachePrefix = 'walrus_url_';
  private cacheDuration = 3600000; // 1 hour
  private useMockUpload = true; // Set to false when backend proxy is ready

  /**
   * Upload file to Walrus
   * Currently uses mock for MVP due to CORS restrictions
   * 
   * @param file File to upload
   * @param epochs Storage duration
   * @returns Blob ID
   */
  async uploadFile(file: File, epochs: number = 5): Promise<string> {
    if (this.useMockUpload) {
      return this.mockUpload(file);
    }

    return this.uploadViaProxy(file, epochs);
  }

  /**
   * Mock upload for testing (MVP)
   * Generates deterministic blobId from file content
   */
  private async mockUpload(file: File): Promise<string> {
    console.log('[Walrus MOCK] Generating mock blobId for:', file.name);
    
    // Generate deterministic ID from filename and size
    const hash = await this.simpleHash(file.name + file.size);
    const blobId = `mock_${hash}`;
    
    // Store file in IndexedDB for later retrieval
    await this.storeFileMock(blobId, file);
    
    console.log('[Walrus MOCK] Generated blobId:', blobId);
    return blobId;
  }

  /**
   * Upload via backend proxy (for production)
   */
  private async uploadViaProxy(file: File, epochs: number): Promise<string> {
    console.log('[Walrus Proxy] Uploading file:', file.name);

    try {
      // TODO: Replace with your backend proxy endpoint
      const proxyUrl = '/api/walrus/upload';
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('epochs', epochs.toString());

      const response = await fetch(proxyUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.blobId;
    } catch (error) {
      console.error('[Walrus Proxy] Upload failed:', error);
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get blob URL
   */
  async getBlobUrl(blobId: string): Promise<string> {
    // Check cache
    const cached = this.getCachedUrl(blobId);
    if (cached) {
      console.log('[Walrus] Using cached URL:', blobId);
      return cached;
    }

    // Check if mock blob
    if (blobId.startsWith('mock_')) {
      const url = await this.getMockBlobUrl(blobId);
      this.cacheUrl(blobId, url);
      return url;
    }

    // Real Walrus blob
    const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
    const url = `${aggregatorUrl}/v1/${blobId}`;
    this.cacheUrl(blobId, url);
    
    return url;
  }

  /**
   * Download blob
   */
  async downloadBlob(blobId: string): Promise<Blob> {
    if (blobId.startsWith('mock_')) {
      return this.retrieveFileMock(blobId);
    }

    try {
      const data = await client.walrus.readBlob({ blobId });
      // Convert Uint8Array<ArrayBufferLike> to Uint8Array<ArrayBuffer> for Blob compatibility
      const arrayBuffer = new Uint8Array(data);
      return new Blob([arrayBuffer], { type: 'application/octet-stream' });
    } catch (error) {
      console.error('[Walrus] Download failed:', error);
      throw new Error(`Download failed: ${(error as Error).message}`);
    }
  }

  // ===== Mock Storage Helpers =====

  /**
   * Store file in IndexedDB (mock)
   */
  private async storeFileMock(blobId: string, file: File): Promise<void> {
    try {
      const db = await this.openMockDB();
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      
      const arrayBuffer = await file.arrayBuffer();
      await store.put({
        blobId,
        data: arrayBuffer,
        name: file.name,
        type: file.type,
        timestamp: Date.now(),
      });

      await tx.done;
    } catch (error) {
      console.warn('[Walrus Mock] Failed to store file:', error);
    }
  }

  /**
   * Retrieve file from IndexedDB (mock)
   */
  private async retrieveFileMock(blobId: string): Promise<Blob> {
    try {
      const db = await this.openMockDB();
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const record = await store.get(blobId);

      if (!record) {
        throw new Error('Mock file not found');
      }

      return new Blob([record.data], { type: record.type });
    } catch (error) {
      console.error('[Walrus Mock] Failed to retrieve file:', error);
      throw error;
    }
  }

  /**
   * Get mock blob URL (object URL from IndexedDB)
   */
  private async getMockBlobUrl(blobId: string): Promise<string> {
    const blob = await this.retrieveFileMock(blobId);
    return URL.createObjectURL(blob);
  }

  /**
   * Open IndexedDB for mock storage
   */
  private async openMockDB(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('walrus-mock', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'blobId' });
        }
      };
    });
  }

  /**
   * Simple hash function for mock blobId
   */
  private async simpleHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  // ===== Cache Helpers =====

  private getCachedUrl(blobId: string): string | null {
    try {
      const cacheKey = `${this.cachePrefix}${blobId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const { url, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < this.cacheDuration) {
        return url;
      }

      localStorage.removeItem(cacheKey);
      return null;
    } catch {
      return null;
    }
  }

  private cacheUrl(blobId: string, url: string): void {
    try {
      const cacheKey = `${this.cachePrefix}${blobId}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        url,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('[Walrus] Cache failed:', error);
    }
  }

  clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          localStorage.removeItem(key);
        }
      });
      console.log('[Walrus] Cache cleared');
    } catch (error) {
      console.warn('[Walrus] Clear cache failed:', error);
    }
  }
}

// Export singleton
export const walrusService = new WalrusService();
