import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { listenTransaction, checkListenAccess } from '@/services/sui/listen';
import { useState, useEffect } from 'react';

interface ListenResult {
  listenCapId: string;
  digest: string;
}

export function useListen(musicId: string) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [listenCapId, setListenCapId] = useState<string | null>(null);

  // Check if user already has access
  useEffect(() => {
    if (!currentAccount || !musicId) return;
    
    checkListenAccess(currentAccount.address, musicId, suiClient).then((result) => {
      setHasAccess(result.hasAccess);
      setListenCapId(result.listenCapId || null);
    });
  }, [currentAccount, musicId, suiClient]);

  const payToListen = async (amount: string): Promise<ListenResult> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { tx, listenCap } = listenTransaction({
        musicId,
        payment: amount,
      });
      
      // Transfer ListenCap to user
      tx.transferObjects([listenCap], currentAccount.address);

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
      
      // Find created ListenCap in the transaction effects
      const created = result.effects?.created?.find(
        (obj: any) => obj.owner && 'AddressOwner' in obj.owner
      );
      
      if (!created) {
        throw new Error('ListenCap not found in transaction');
      }

      const capId = created.reference.objectId;
      setListenCapId(capId);
      setHasAccess(true);

      return {
        listenCapId: capId,
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
    payToListen,
    isLoading,
    error,
    hasAccess,
    listenCapId,
  };
}
