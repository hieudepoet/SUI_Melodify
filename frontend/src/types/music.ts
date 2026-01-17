export interface Music {
  id: string;
  title: string;
  description: string;
  creator: string;
  price: number; // in SUI
  audioHash: string;
  listenCount: number;
  revenue: number;
  genre: string;
  createdAt: string;
  duration: number; // in seconds
  coverUrl?: string;
}

export interface ListenCap {
  id: string;
  musicId: string;
  userId: string;
  createdAt: string;
  expiresAt?: string;
}

export interface User {
  address: string;
  balance: number; // in SUI
  totalTracks: number;
  totalRevenue: number;
  totalListens: number;
}
