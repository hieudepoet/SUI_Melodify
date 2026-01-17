// SEAL (Sui Encrypted Access Layer) Service
// For decrypting audio with ListenCap proof

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

/**
 * SEAL Service for managing encrypted audio access
 * Uses ListenCap as proof of payment for decryption
 */
export class SEALService {
  constructor(private client: SuiClient, private packageId: string) {}

  /**
   * Check if ListenCap is valid and approved for decryption
   * @param listenCapId ListenCap object ID
   * @param clockId Clock object ID (default: 0x6)
   * @returns true if access is approved
   */
  async isApproved(listenCapId: string, clockId: string = '0x6'): Promise<boolean> {
    try {
      // Create transaction to check approval
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::listen::seal_approve`,
        arguments: [
          tx.pure.vector('u8', []), // key_id (empty for check)
          tx.object(listenCapId),
          tx.object(clockId),
        ],
      });

      // DevInspect to simulate without executing
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0', // Dummy sender for read-only check
      });

      return result.effects.status.status === 'success';
    } catch (error) {
      console.error('[SEAL] Access check failed:', error);
      return false;
    }
  }

  /**
   * Check if ListenCap is still valid (not expired)
   * @param listenCapId ListenCap object ID
   * @returns true if valid
   */
  async isCapValid(listenCapId: string): Promise<boolean> {
    try {
      const cap = await this.client.getObject({
        id: listenCapId,
        options: { showContent: true },
      });

      const fields = cap.data?.content?.fields as any;
      if (!fields) return false;

      // Check expiry
      const now = Date.now();
      const expiresAt = Number(fields.expires_at);

      return now < expiresAt;
    } catch (error) {
      console.error('[SEAL] Cap validation failed:', error);
      return false;
    }
  }

  /**
   * Decrypt audio URL with ListenCap
   * In production, this would call Walrus SEAL API
   * For MVP, we just check access and return decrypted URL
   * 
   * @param encryptedBlobId Encrypted audio blob ID
   * @param listenCapId ListenCap object ID  
   * @returns Decrypted audio URL
   */
  async decryptAudio(encryptedBlobId: string, listenCapId: string): Promise<string> {
    console.log('[SEAL] Decrypting audio:', { encryptedBlobId, listenCapId });

    // Check if ListenCap is approved
    const approved = await this.isApproved(listenCapId);
    if (!approved) {
      throw new Error('Access denied: ListenCap not approved');
    }

    // Check if ListenCap is still valid
    const valid = await this.isCapValid(listenCapId);
    if (!valid) {
      throw new Error('Access denied: ListenCap expired');
    }

    // TODO: In production, call Walrus SEAL API for actual decryption
    // For now, return the blob ID (assuming no encryption for MVP)
    console.log('[SEAL] Access approved, returning decrypted URL');
    
    return encryptedBlobId;
  }

  /**
   * Get ListenCap details
   */
  async getListenCapInfo(listenCapId: string) {
    try {
      const cap = await this.client.getObject({
        id: listenCapId,
        options: { showContent: true },
      });

      const fields = cap.data?.content?.fields as any;
      if (!fields) return null;

      return {
        musicId: fields.music_id,
        listener: fields.listener,
        createdAt: Number(fields.created_at),
        expiresAt: Number(fields.expires_at),
        version: fields.version,
      };
    } catch (error) {
      console.error('[SEAL] Get cap info failed:', error);
      return null;
    }
  }
}

/**
 * Create SEAL service instance
 */
export function createSEALService(client: SuiClient, packageId: string): SEALService {
  return new SEALService(client, packageId);
}
