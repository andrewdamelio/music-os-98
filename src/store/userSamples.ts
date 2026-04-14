// Module-level map for user-uploaded AudioBuffers (not serializable, kept outside Zustand)
export const userSampleBuffers = new Map<string, AudioBuffer>();

// Simple pub/sub so components can react to new uploads without Zustand overhead
type Listener = (names: string[]) => void;
const listeners = new Set<Listener>();

export function subscribeUserSamples(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify() {
  const names = Array.from(userSampleBuffers.keys());
  listeners.forEach(fn => fn(names));
}

export function addUserSample(name: string, buffer: AudioBuffer) {
  userSampleBuffers.set(name, buffer);
  notify();
}

export function getUserSampleNames(): string[] {
  return Array.from(userSampleBuffers.keys());
}
