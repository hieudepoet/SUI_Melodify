import { Transaction } from '@mysten/sui/transactions';
import { SUI_CONFIG } from '@/config/sui';

/**
 * Pay to listen to a music track
 */
export function listenTransaction(params: {
  musicId: string;
  payment: string; // Amount in MIST (1 SUI = 1_000_000_000 MIST)
}) {
  const tx = new Transaction();
  
  // Split payment from gas
  const [coin] = tx.splitCoins(tx.gas, [params.payment]);
  
  // Call listen function
  const [listenCap] = tx.moveCall({
    target: `${SUI_CONFIG.PACKAGE_ID}::listen::listen`,
    arguments: [
      tx.object(params.musicId),
      coin,
      tx.object(SUI_CONFIG.LISTEN_CONFIG_ID),
      tx.object(SUI_CONFIG.PARENT_POOL_ID),
      tx.object(SUI_CONFIG.TREASURY_ID),
      tx.object(SUI_CONFIG.CLOCK_ID),
    ],
  });
  
  return { tx, listenCap };
}

/**
 * Check if user has valid ListenCap for a music track
 */
export async function checkListenAccess(
  userAddress: string,
  musicId: string,
  suiClient: any
): Promise<{ hasAccess: boolean; listenCapId?: string }> {
  try {
    // Query user's ListenCap objects
    const objects = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: `${SUI_CONFIG.PACKAGE_ID}::listen::ListenCap`,
      },
      options: {
        showContent: true,
      },
    });
    
    // Find ListenCap for this music
    for (const obj of objects.data) {
      const fields = obj.data?.content?.fields;
      if (fields && fields.music_id === musicId) {
        // Check if not expired
        const expiresAt = Number(fields.expires_at);
        const now = Date.now();
        
        if (now < expiresAt) {
          return {
            hasAccess: true,
            listenCapId: obj.data.objectId,
          };
        }
      }
    }
    
    return { hasAccess: false };
  } catch (error) {
    console.error('Error checking listen access:', error);
    return { hasAccess: false };
  }
}
