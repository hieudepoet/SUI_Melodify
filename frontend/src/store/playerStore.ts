import { create } from 'zustand';

interface PlayerState {
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    audioCid: string;
  } | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  
  setCurrentTrack: (track: PlayerState['currentTrack']) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  reset: () => set({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  }),
}));
