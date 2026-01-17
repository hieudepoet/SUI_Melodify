export interface MusicObject {
  id: string;
  creator: string;
  audio_cid: string;
  preview_cid: string;
  metadata_uri: string;
  cover_uri: string;
  parent: string | null;
  total_listens: number;  // Converted from u64
  revenue_pool: number;    // Converted from Balance<SUI> to SUI
  royalty_bps: number;
  status: number;
  version: string;
}

export interface ListenCapObject {
  id: string;
  music_id: string;
  listener: string;
  created_at: string;
  expires_at: string;
  version: string;
}

export interface StakePositionObject {
  id: string;
  music_id: string;
  staker: string;
  amount: string;
  staked_at_epoch: string;
  unlock_epoch: string;
  staked_at_ms: string;
}

export const MusicStatus = {
  DRAFT: 0,
  PUBLISHED: 1,
  FROZEN: 2,
} as const;
