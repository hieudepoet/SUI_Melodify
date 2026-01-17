import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { createMusicTransaction } from '@/services/sui/music';
import { useState } from 'react';

interface MintMusicParams {
  audioCid: string;
  previewCid: string;
  metadataUri: string;
  coverUri: string;
  royaltyBps: number;
  parentId?: string;
}

interface MintMusicResult {
  musicId: string;
  digest: string;
}

export function useMintMusic() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mintMusic = async (params: MintMusicParams): Promise<MintMusicResult> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { tx, music } = createMusicTransaction(params);
      
      // Transfer music NFT to creator
      tx.transferObjects([music], currentAccount.address);

      // Execute transaction and wait for result
      const result = await new Promise<any>((resolve, reject) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      setIsLoading(false);

      // Find created Music NFT in the transaction effects
      const created = result.effects?.created?.find(
        (obj: any) => obj.owner && 'AddressOwner' in obj.owner
      );

      if (!created) {
        throw new Error('Music NFT not found in transaction');
      }

      const musicId = created.reference.objectId;

      return {
        musicId,
        digest: result.digest,
      };
    } catch (err) {
      setIsLoading(false);
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    }
  };

  return {
    mintMusic,
    isLoading,
    error,
  };
}
