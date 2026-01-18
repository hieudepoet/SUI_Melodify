import { Transaction } from '@mysten/sui/transactions';
import {
  PACKAGE_ID,
  MUSIC_REGISTRY_ID,
  LISTEN_CONFIG_ID,
  PARENT_POOL_ID,
  TREASURY_ID,
  STAKE_REGISTRY_ID,
  CLOCK_ID,
} from '../../config/constants';

/**
 * Build transaction to create a new music NFT
 */
export function buildCreateMusicTx(
  audioCid: string,
  previewCid: string,
  metadataUri: string,
  coverUri:string,
  royaltyBps: number
) {
  const tx = new Transaction();

  const [music] = tx.moveCall({
    target: `${PACKAGE_ID}::music::create_music`,
    arguments: [
      tx.pure.string(audioCid),
      tx.pure.string(previewCid),
      tx.pure.string(metadataUri),
      tx.pure.string(coverUri),
      tx.pure.u16(royaltyBps),
      tx.pure.option('id', null), // No parent (original music)
      tx.object(MUSIC_REGISTRY_ID),
    ],
  });

  return { tx, music };
}

/**
 * Build transaction to publish music (DRAFT → PUBLISHED)
 * Note: This now consumes the Music object and shares it publicly
 */
export function buildPublishMusicTx(musicId: string) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::music::publish`,
    arguments: [tx.object(musicId)], // Music object is consumed and shared
  });

  return tx;
}

/**
 * Build transaction to listen to music (pay and get ListenCap)
 */
export function buildListenTx(musicId: string, paymentAmount: number) {
  const tx = new Transaction();

  const [paymentCoin] = tx.splitCoins(tx.gas, [paymentAmount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::listen::listen`,
    arguments: [
      tx.object(musicId),
      paymentCoin,
      tx.object(TREASURY_ID),
      tx.object(PARENT_POOL_ID),
      tx.object(LISTEN_CONFIG_ID),
      tx.object(CLOCK_ID),
    ],
  });

  return { tx };
}

/**
 * Build transaction to stake SUI on music
 */
export function buildStakeTx(
  musicId: string,
  amount: number,
  lockEpochs: number
) {
  const tx = new Transaction();

  const [stakeCoin] = tx.splitCoins(tx.gas, [amount]);

  const [stakePosition] = tx.moveCall({
    target: `${PACKAGE_ID}::stake::stake`,
    arguments: [
      tx.object(musicId),
      stakeCoin,
      tx.pure.u64(lockEpochs),
      tx.object(STAKE_REGISTRY_ID),
      tx.object(CLOCK_ID),
    ],
  });

  return { tx, stakePosition };
}

/**
 * Build transaction to unstake
 */
export function buildUnstakeTx(positionId: string) {
  const tx = new Transaction();

  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::stake::unstake`,
    arguments: [
      tx.object(positionId),
      tx.object(STAKE_REGISTRY_ID),
    ],
  });

  return { tx, coin };
}

/**
 * Build transaction to withdraw revenue
 */
export function buildWithdrawRevenueTx(musicId: string, amount: number) {
  const tx = new Transaction();

  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::music::withdraw_revenue`,
    arguments: [
      tx.object(musicId),
      tx.pure.u64(amount),
    ],
  });

  return { tx, coin };
}
