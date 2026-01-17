import { Transaction } from '@mysten/sui/transactions';
import { SUI_CONFIG } from '@/config/sui';

/**
 * Create a new Music object (draft state)
 */
export function createMusicTransaction(params: {
  audioCid: string;
  previewCid: string;
  metadataUri: string;
  coverUri: string;
  royaltyBps: number;
  parentId?: string;
}) {
  const tx = new Transaction();
  
  const [music] = tx.moveCall({
    target: `${SUI_CONFIG.PACKAGE_ID}::music::create_music`,
    arguments: [
      tx.pure.string(params.audioCid),
      tx.pure.string(params.previewCid),
      tx.pure.string(params.metadataUri),
      tx.pure.string(params.coverUri),
      tx.pure.u16(params.royaltyBps),
      params.parentId 
        ? tx.pure.option('id', params.parentId)
        : tx.pure.option('id', null),
      tx.object(SUI_CONFIG.MUSIC_REGISTRY_ID),
    ],
  });
  
  return { tx, music };
}

/**
 * Publish a Music object (make it public)
 */
export function publishMusicTransaction(musicId: string) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${SUI_CONFIG.PACKAGE_ID}::music::publish`,
    arguments: [
      tx.object(musicId),
    ],
  });
  
  return tx;
}

/**
 * Withdraw revenue from a Music object
 */
export function withdrawRevenueTransaction(musicId: string, amount: string) {
  const tx = new Transaction();
  
  const [coin] = tx.moveCall({
    target: `${SUI_CONFIG.PACKAGE_ID}::music::withdraw_revenue`,
    arguments: [
      tx.object(musicId),
      tx.pure.u64(amount),
    ],
  });
  
  // Transfer coin to sender
  tx.transferObjects([coin], tx.pure.address('{{SENDER}}'));
  
  return tx;
}
