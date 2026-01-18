export interface Music {
  id: string;
  creator: string;
  audio_cid: string;
  preview_cid: string;
  metadata_uri: string;
  cover_uri: string;
  parent: string | null;
  total_listens: number;
  revenue_balance: number;
  royalty_bps: number;
  status: number; // 0=Draft, 1=Published, 2=Frozen
}

export interface ListenCap {
  id: string;
  music_id: string;
  listener: string;
  created_at: number;
  expires_at: number;
}

export interface StakePosition {
  id: string;
  music_id: string;
  staker: string;
  amount: number;
  staked_at_epoch: number;
  unlock_epoch: number;
  staked_at_ms: number;
}

export interface MusicMetadata {
  title: string;
  description: string;
  genre: string;
  duration?: number;
}
