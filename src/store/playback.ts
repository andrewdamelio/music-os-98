import { create } from 'zustand';

// Ephemeral, high-frequency transport state. Kept out of the main store so the
// per-step updates (~8Hz at 120 BPM 16ths) don't re-render every component that
// happens to read bpm, project name, etc. from useOSStore.
interface PlaybackState {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentStep: -1,
  setCurrentStep: (step) => set({ currentStep: step }),
}));
