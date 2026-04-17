import { create } from 'zustand';
import { audioEngine, DRUM_CHANNELS, type DrumChannel, type FXParams, type SynthParams } from '../audio/engine';

export interface AppDef {
  id: string;
  title: string;
  icon: string;
  component: string;
  defaultSize: { w: number; h: number };
  defaultPos?: { x: number; y: number };
  singleton?: boolean;
}

export interface WindowState {
  instanceId: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export interface MixerChannelState {
  name: string;
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
  fxSend: number; // 0–1 send level to FX bus
}

export interface CompParams {
  enabled: boolean;
  threshold: number; // dBFS
  ratio: number;
  attack: number;   // seconds
  release: number;  // seconds
  knee: number;     // dB
  makeup: number;   // linear gain
}

export interface EQParams {
  enabled: boolean;
  gains: number[]; // 5 bands in dB, indices 0–4
}

export type PadAssignment = {
  sampleName: string | null;
  mode: 'oneshot' | 'hold';
  color: string;
};

export interface PianoNote {
  id: string;
  note: number;
  beat: number;
  duration: number;
  channel: number;
}

export const APPS: AppDef[] = [
  { id: 'drum-machine', title: 'Beat Machine', icon: '🥁', component: 'DrumMachine', defaultSize: { w: 820, h: 420 }, singleton: true },
  { id: 'synth', title: 'SynthStation', icon: '🎹', component: 'Synth', defaultSize: { w: 860, h: 540 }, singleton: true },
  { id: 'mixer', title: 'Mixer', icon: '🎚️', component: 'Mixer', defaultSize: { w: 460, h: 580 }, singleton: true },
  { id: 'piano-roll', title: 'Piano Roll', icon: '🎼', component: 'PianoRoll', defaultSize: { w: 820, h: 540 }, singleton: true },
  { id: 'fx-rack', title: 'FX Rack', icon: '🎛️', component: 'FXRack', defaultSize: { w: 540, h: 660 }, singleton: true },
  { id: 'sampler', title: 'Sampler', icon: '💿', component: 'Sampler', defaultSize: { w: 580, h: 460 }, singleton: true },
  { id: 'tape-deck', title: 'Tape Deck', icon: '📼', component: 'TapeDeck', defaultSize: { w: 480, h: 380 }, singleton: true },
  { id: 'file-browser', title: 'Sample Library', icon: '📁', component: 'FileBrowser', defaultSize: { w: 540, h: 460 }, singleton: true },
  { id: 'tempo-calc', title: 'Tempo Calc', icon: '🔢', component: 'TempoCalc', defaultSize: { w: 340, h: 400 }, singleton: true },
  { id: 'help', title: 'Help & Manual', icon: '❓', component: 'Help', defaultSize: { w: 620, h: 520 }, singleton: true },
  { id: 'oscilloscope', title: 'Oscilloscope', icon: '📊', component: 'Oscilloscope', defaultSize: { w: 580, h: 240 }, singleton: true },
  { id: 'freecell', title: 'FreeCell', icon: '🃏', component: 'FreeCell', defaultSize: { w: 680, h: 520 }, singleton: true },
  { id: 'minesweeper', title: 'Minesweeper', icon: '💣', component: 'Minesweeper', defaultSize: { w: 184, h: 274 }, singleton: true },
  { id: 'milkdrop', title: 'MilkDrop Viz', icon: '🌊', component: 'MilkDrop', defaultSize: { w: 520, h: 420 }, singleton: true },
  { id: 'compressor', title: 'Compressor', icon: '🔊', component: 'Compressor', defaultSize: { w: 560, h: 320 }, singleton: true },
  { id: 'eq', title: 'Parametric EQ', icon: '🎛️', component: 'EQ', defaultSize: { w: 580, h: 420 }, singleton: true },
  { id: 'pad-machine', title: 'Pad Machine', icon: '🎶', component: 'PadMachine', defaultSize: { w: 720, h: 540 }, singleton: true },
  { id: 'ski-free', title: 'SkiFree', icon: '⛷️', component: 'SkiFree', defaultSize: { w: 600, h: 480 }, singleton: true },
  { id: 'screen-mate', title: 'Screen Mate Poo', icon: '🐑', component: 'ScreenMate', defaultSize: { w: 400, h: 300 }, singleton: false },
  { id: 'sub-seven', title: 'SubSeven 2.2 [G]old', icon: '💀', component: 'SubSeven', defaultSize: { w: 680, h: 520 }, singleton: true },
  { id: 'control-panel', title: 'Audio Control Panel', icon: '🔊', component: 'ControlPanel', defaultSize: { w: 320, h: 320 }, singleton: true },
  { id: 'icq', title: 'ICQ', icon: '🌸', component: 'ICQ', defaultSize: { w: 230, h: 440 }, singleton: true },
  { id: 'napster', title: 'Napster', icon: '🐱', component: 'Napster', defaultSize: { w: 760, h: 540 }, singleton: true },
];

let zCounter = 100;
let stepUnsub: (() => void) | null = null;
let drumClipboard: boolean[][] | null = null;

// Undo/redo: snapshots of drum patterns + piano notes only (audio state / transport is not history).
// Coalesce rapid mutations (e.g. piano-roll drag) into a single snapshot within a short window.
type HistorySnapshot = { drumPatterns: boolean[][][]; pianoNotes: PianoNote[] };
const HISTORY_LIMIT = 50;
const COALESCE_MS = 400;
const undoStack: HistorySnapshot[] = [];
const redoStack: HistorySnapshot[] = [];
let lastHistoryPush = 0;
function cloneSnapshot(s: { drumPatterns: boolean[][][]; pianoNotes: PianoNote[] }): HistorySnapshot {
  return {
    drumPatterns: s.drumPatterns.map(p => p.map(row => [...row])),
    pianoNotes: s.pianoNotes.map(n => ({ ...n })),
  };
}
// Push the current drum+piano state onto the undo stack, clearing redo.
// Coalesces rapid successive edits (e.g. a piano-roll drag) into one snapshot.
function pushHistory(state: { drumPatterns: boolean[][][]; pianoNotes: PianoNote[] }) {
  const now = Date.now();
  if (now - lastHistoryPush < COALESCE_MS) return;
  lastHistoryPush = now;
  undoStack.push(cloneSnapshot(state));
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
}

interface OSStore {
  // Boot
  booted: boolean;
  setBooted: (v: boolean) => void;

  // Windows
  windows: WindowState[];
  openApp: (appId: string, pos?: { x: number; y: number }) => void;
  closeWindow: (instanceId: string) => void;
  minimizeWindow: (instanceId: string) => void;
  restoreWindow: (instanceId: string) => void;
  maximizeWindow: (instanceId: string) => void;
  focusWindow: (instanceId: string) => void;
  moveWindow: (instanceId: string, x: number, y: number) => void;
  resizeWindow: (instanceId: string, w: number, h: number) => void;
  focusedWindowId: string | null;

  // Start menu
  startMenuOpen: boolean;
  setStartMenuOpen: (v: boolean) => void;

  // Context menu
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;

  // Transport
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  loopEnabled: boolean;
  isRecording: boolean;
  projectName: string;
  metronomeEnabled: boolean;
  play: () => void;
  stop: () => void;
  setBPM: (bpm: number) => void;
  setCurrentStep: (step: number) => void;
  toggleLoop: () => void;
  toggleRecord: () => void;
  toggleMetronome: () => void;
  setProjectName: (name: string) => void;
  saveProject: () => void;
  loadProjectFromJSON: (json: string) => void;

  // Drum machine
  drumPattern: boolean[][];       // current working pattern (alias to drumPatterns[currentPatternIdx])
  drumPatterns: boolean[][][];    // 4 pattern slots (A/B/C/D)
  currentPatternIdx: number;
  drumStepCount: number;
  drumSwing: number;
  toggleDrumStep: (channel: number, step: number) => void;
  clearDrumPattern: () => void;
  loadDefaultPattern: () => void;
  randomizeDrumPattern: () => void;
  copyDrumPattern: (fromIdx: number) => void;
  pasteDrumPattern: (toIdx: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setDrumSwing: (swing: number) => void;
  setDrumStepCount: (n: number) => void;
  selectPattern: (idx: number) => void;
  setDrumChannelGain: (channel: number, gain: number) => void;
  drumChannelGains: number[];

  // Synth params
  synthParams: SynthParams;
  updateSynthParam: <K extends keyof SynthParams>(param: K, value: SynthParams[K]) => void;
  activeSynthPatch: string;
  setActiveSynthPatch: (name: string) => void;

  // Piano roll
  pianoNotes: PianoNote[];
  pianoRollEnabled: boolean;
  pianoRollBeats: number;
  addPianoNote: (note: PianoNote) => void;
  removePianoNote: (id: string) => void;
  togglePianoRoll: (enabled: boolean) => void;
  setPianoNotes: (notes: PianoNote[]) => void;
  setPianoRollBeats: (beats: number) => void;

  // Mixer
  mixerChannels: MixerChannelState[];
  updateMixerChannel: (ch: number, update: Partial<MixerChannelState>) => void;

  // FX
  fxParams: FXParams;
  updateFX: <K extends keyof FXParams>(fx: K, update: Partial<FXParams[K]>) => void;

  // Pad Machine
  padAssignments: PadAssignment[];
  updatePadAssignment: (idx: number, update: Partial<PadAssignment>) => void;

  // Compressor (master insert)
  compParams: CompParams;
  setCompParam: (k: keyof CompParams, v: number | boolean) => void;

  // EQ (master insert)
  eqParams: EQParams;
  setEQEnabled: (enabled: boolean) => void;
  setEQBand: (idx: number, gain: number) => void;

  // ICQ
  icqStatus: 'online' | 'away' | 'dnd' | 'na' | 'offline';
  setIcqStatus: (s: 'online' | 'away' | 'dnd' | 'na' | 'offline') => void;
}

const defaultMixerChannels: MixerChannelState[] = [
  { name: 'Drums',   gain: 0.8,  pan: 0,    muted: false, solo: false, color: '#ff4488', fxSend: 0 },
  { name: 'Synth',   gain: 0.7,  pan: 0,    muted: false, solo: false, color: '#44ffcc', fxSend: 0 },
  { name: 'Pads',    gain: 0.75, pan: 0,    muted: false, solo: false, color: '#ffaa00', fxSend: 0 },
  { name: 'Keys',    gain: 0.8,  pan: 0,    muted: false, solo: false, color: '#aa88ff', fxSend: 0 },
  { name: 'Aux',     gain: 0.7,  pan: 0,    muted: false, solo: false, color: '#44aaff', fxSend: 0 },
  { name: 'Return',  gain: 0.6,  pan: 0,    muted: false, solo: false, color: '#66ff88', fxSend: 0 },
  { name: 'FX Bus',  gain: 0.5,  pan: 0,    muted: false, solo: false, color: '#ff8844', fxSend: 0 },
  { name: 'Master',  gain: 0.9,  pan: 0,    muted: false, solo: false, color: '#ffffff', fxSend: 0 },
];

export const useOSStore = create<OSStore>((set, get) => ({
  booted: false,
  setBooted: (v) => set({ booted: v }),

  windows: [],
  focusedWindowId: null,

  openApp: (appId, pos) => {
    const app = APPS.find(a => a.id === appId);
    if (!app) return;
    const { windows } = get();

    // Singleton: focus if already open
    if (app.singleton) {
      const existing = windows.find(w => w.appId === appId);
      if (existing) {
        get().focusWindow(existing.instanceId);
        if (existing.minimized) get().restoreWindow(existing.instanceId);
        return;
      }
    }

    const instanceId = `${appId}-${Date.now()}`;
    const TRANSPORT_H = 52; // transport bar is fixed at top ~48px + small gap
    const TASKBAR_H = 60;
    const viewport = { w: window.innerWidth, h: window.innerHeight - TASKBAR_H };
    const x = pos?.x ?? Math.max(20, Math.floor(Math.random() * (viewport.w - app.defaultSize.w - 40)));
    const y = pos?.y ?? Math.max(TRANSPORT_H, TRANSPORT_H + Math.floor(Math.random() * Math.max(0, viewport.h - app.defaultSize.h - TRANSPORT_H - 40)));

    const newWindow: WindowState = {
      instanceId,
      appId,
      title: app.title,
      x,
      y,
      w: app.defaultSize.w,
      h: app.defaultSize.h,
      minimized: false,
      maximized: false,
      zIndex: ++zCounter,
    };

    set(s => ({
      windows: [...s.windows, newWindow],
      focusedWindowId: instanceId,
    }));
  },

  closeWindow: (instanceId) => {
    set(s => ({
      windows: s.windows.filter(w => w.instanceId !== instanceId),
      focusedWindowId: s.focusedWindowId === instanceId ? null : s.focusedWindowId,
    }));
  },

  minimizeWindow: (instanceId) => {
    set(s => ({
      windows: s.windows.map(w => w.instanceId === instanceId ? { ...w, minimized: true } : w),
      focusedWindowId: s.windows.filter(w => !w.minimized && w.instanceId !== instanceId).slice(-1)[0]?.instanceId ?? null,
    }));
  },

  restoreWindow: (instanceId) => {
    set(s => ({
      windows: s.windows.map(w => w.instanceId === instanceId ? { ...w, minimized: false, maximized: false } : w),
      focusedWindowId: instanceId,
    }));
    get().focusWindow(instanceId);
  },

  maximizeWindow: (instanceId) => {
    set(s => ({
      windows: s.windows.map(w => w.instanceId === instanceId ? { ...w, maximized: !w.maximized, minimized: false } : w),
    }));
    get().focusWindow(instanceId);
  },

  focusWindow: (instanceId) => {
    set(s => ({
      focusedWindowId: instanceId,
      windows: s.windows.map(w => w.instanceId === instanceId ? { ...w, zIndex: ++zCounter } : w),
    }));
  },

  moveWindow: (instanceId, x, y) => {
    set(s => ({
      windows: s.windows.map(w => w.instanceId === instanceId ? { ...w, x, y } : w),
    }));
  },

  resizeWindow: (instanceId, w, h) => {
    set(s => ({
      windows: s.windows.map(win => win.instanceId === instanceId ? { ...win, w, h } : win),
    }));
  },

  startMenuOpen: false,
  setStartMenuOpen: (v) => set({ startMenuOpen: v }),

  contextMenu: null,
  showContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  hideContextMenu: () => set({ contextMenu: null }),

  // Transport
  isPlaying: false,
  bpm: 128,
  currentStep: -1,
  loopEnabled: true,
  isRecording: false,
  projectName: 'Untitled Project',
  metronomeEnabled: false,

  play: () => {
    audioEngine.init();
    audioEngine.setBPM(get().bpm);
    audioEngine.start();
    set({ isPlaying: true });
    if (stepUnsub) stepUnsub();
    stepUnsub = audioEngine.onStep((step) => {
      set({ currentStep: step });
    });
  },

  stop: () => {
    if (stepUnsub) { stepUnsub(); stepUnsub = null; }
    audioEngine.stop();
    set({ isPlaying: false, currentStep: -1 });
  },

  setBPM: (bpm) => {
    audioEngine.setBPM(bpm);
    set({ bpm });
  },

  setCurrentStep: (step) => set({ currentStep: step }),
  toggleLoop: () => set(s => ({ loopEnabled: !s.loopEnabled })),
  toggleMetronome: () => {
    const next = !get().metronomeEnabled;
    audioEngine.metronomeEnabled = next;
    set({ metronomeEnabled: next });
  },

  toggleRecord: () => {
    const { isRecording } = get();
    if (!isRecording) {
      audioEngine.init();
      audioEngine.startRecording();
      set({ isRecording: true });
    } else {
      audioEngine.stopRecording().then(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${get().projectName.replace(/\s+/g, '_')}_recording.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Give the browser a tick to start the download before revoking
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        }
      });
      set({ isRecording: false });
    }
  },

  setProjectName: (name) => set({ projectName: name }),

  saveProject: () => {
    const s = get();
    const data = {
      version: 2,
      projectName: s.projectName,
      bpm: s.bpm,
      // Drum machine — all 4 patterns + metadata
      drumPatterns: s.drumPatterns,
      currentPatternIdx: s.currentPatternIdx,
      drumStepCount: s.drumStepCount,
      drumSwing: s.drumSwing,
      drumChannelGains: s.drumChannelGains,
      // Synth
      synthParams: s.synthParams,
      activeSynthPatch: s.activeSynthPatch,
      // Piano roll
      pianoNotes: s.pianoNotes,
      pianoRollEnabled: s.pianoRollEnabled,
      pianoRollBeats: s.pianoRollBeats,
      // Pad Machine (sample names + modes only — buffers are regenerated on load)
      padAssignments: s.padAssignments,
      // Mixer
      mixerChannels: s.mixerChannels,
      // FX chain
      fxParams: s.fxParams,
      compParams: s.compParams,
      eqParams: s.eqParams,
      // Window layout
      windows: s.windows.map(w => ({
        appId: w.appId, x: w.x, y: w.y, w: w.w, h: w.h,
        minimized: w.minimized, maximized: w.maximized,
      })),
    };
    const json = JSON.stringify(data, null, 2);
    localStorage.setItem('musicOS98_project', json);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.projectName.replace(/\s+/g, '_')}.mos98`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  loadProjectFromJSON: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data || (data.version !== 1 && data.version !== 2)) return;

      audioEngine.init(); // ensure audio engine is ready before applying params

      if (data.projectName) set({ projectName: data.projectName });
      if (data.bpm) { audioEngine.setBPM(data.bpm); set({ bpm: data.bpm }); }

      // ── Drum machine ──────────────────────────────────────────────────────────
      if (data.drumPatterns && Array.isArray(data.drumPatterns)) {
        // v2: all 4 patterns
        const pats: boolean[][][] = data.drumPatterns.map((pat: boolean[][]) =>
          pat.map((row: boolean[]) => [...row])
        );
        const idx = data.currentPatternIdx ?? 0;
        const current = pats[idx] ?? pats[0];
        audioEngine.drumPattern = current.map(row => [...row]);
        set({ drumPatterns: pats, currentPatternIdx: idx, drumPattern: current });
      } else if (data.drumPattern) {
        // v1 compat: single pattern
        audioEngine.drumPattern = data.drumPattern.map((row: boolean[]) => [...row]);
        set({ drumPattern: data.drumPattern });
      }
      if (data.drumStepCount) {
        audioEngine.drumStepCount = data.drumStepCount;
        set({ drumStepCount: data.drumStepCount });
      }
      if (data.drumSwing !== undefined) {
        audioEngine.drumSwing = data.drumSwing;
        set({ drumSwing: data.drumSwing });
      }
      if (data.drumChannelGains) {
        data.drumChannelGains.forEach((gain: number, i: number) => {
          const ch = DRUM_CHANNELS[i] as DrumChannel;
          if (audioEngine.drumGains[ch]) audioEngine.drumGains[ch]!.gain.value = gain;
        });
        set({ drumChannelGains: data.drumChannelGains });
      }

      // ── Synth ─────────────────────────────────────────────────────────────────
      if (data.synthParams) {
        Object.entries(data.synthParams as SynthParams).forEach(([k, v]) => {
          audioEngine.updateSynthParam(k as keyof SynthParams, v as any);
        });
        set({ synthParams: { ...audioEngine.synthParams, ...data.synthParams } });
      }
      if (data.activeSynthPatch !== undefined) {
        set({ activeSynthPatch: data.activeSynthPatch });
      }

      // ── Piano roll ────────────────────────────────────────────────────────────
      if (data.pianoNotes) {
        audioEngine.pianoRollNotes = data.pianoNotes.map((n: any) => ({
          note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
        }));
        set({ pianoNotes: data.pianoNotes });
      }
      if (data.pianoRollEnabled !== undefined) {
        audioEngine.pianoRollEnabled = data.pianoRollEnabled;
        set({ pianoRollEnabled: data.pianoRollEnabled });
      }
      if (data.pianoRollBeats) {
        audioEngine.pianoRollBeats = data.pianoRollBeats;
        set({ pianoRollBeats: data.pianoRollBeats });
      }

      // ── Pad Machine ──────────────────────────────────────────────────────────
      if (data.padAssignments && Array.isArray(data.padAssignments)) {
        set({ padAssignments: data.padAssignments });
      }

      // ── Mixer ─────────────────────────────────────────────────────────────────
      if (data.mixerChannels) {
        data.mixerChannels.forEach((ch: any, i: number) => {
          if (ch.gain !== undefined) audioEngine.setChannelGain(i, ch.gain);
          if (ch.pan !== undefined) audioEngine.setChannelPan(i, ch.pan);
          if (ch.muted !== undefined) audioEngine.setChannelMute(i, ch.muted);
          if (ch.fxSend !== undefined) audioEngine.setChannelSend(i, ch.fxSend);
        });
        set({ mixerChannels: data.mixerChannels });
      }

      // ── FX chain ──────────────────────────────────────────────────────────────
      if (data.fxParams) {
        (Object.keys(data.fxParams) as Array<keyof FXParams>).forEach(fx => {
          audioEngine.updateFX(fx, data.fxParams[fx]);
        });
        set({ fxParams: { ...audioEngine.fxParams, ...data.fxParams } });
      }
      if (data.compParams) {
        const cp: CompParams = data.compParams;
        audioEngine.setUserCompEnabled(cp.enabled ?? false);
        if (cp.threshold !== undefined) audioEngine.setUserCompParam('threshold', cp.threshold);
        if (cp.ratio !== undefined) audioEngine.setUserCompParam('ratio', cp.ratio);
        if (cp.attack !== undefined) audioEngine.setUserCompParam('attack', cp.attack);
        if (cp.release !== undefined) audioEngine.setUserCompParam('release', cp.release);
        if (cp.knee !== undefined) audioEngine.setUserCompParam('knee', cp.knee);
        if (cp.makeup !== undefined) audioEngine.setUserCompParam('makeupGain', cp.makeup);
        set({ compParams: cp });
      }
      if (data.eqParams) {
        const eq: EQParams = data.eqParams;
        audioEngine.setUserEQEnabled(eq.enabled ?? false);
        if (eq.gains) eq.gains.forEach((gain: number, i: number) => audioEngine.setUserEQBand(i, gain));
        set({ eqParams: eq });
      }

      // ── Window layout ─────────────────────────────────────────────────────────
      if (data.windows && Array.isArray(data.windows)) {
        const restored: WindowState[] = (data.windows as any[]).map(w => {
          const app = APPS.find(a => a.id === w.appId);
          if (!app) return null;
          return {
            instanceId: `${w.appId}-${Date.now()}-${Math.random()}`,
            appId: w.appId,
            title: app.title,
            x: w.x ?? 50, y: w.y ?? 50,
            w: w.w ?? app.defaultSize.w, h: w.h ?? app.defaultSize.h,
            minimized: w.minimized ?? false, maximized: w.maximized ?? false,
            zIndex: ++zCounter,
          } as WindowState;
        }).filter(Boolean) as WindowState[];
        set({ windows: restored, focusedWindowId: restored[restored.length - 1]?.instanceId ?? null });
      }

      localStorage.setItem('musicOS98_project', json);
    } catch (e) {
      console.error('Failed to load project:', e);
    }
  },

  // Drum machine
  drumStepCount: 16,
  drumSwing: 0,
  drumChannelGains: Array(8).fill(0.8),
  currentPatternIdx: 0,
  drumPatterns: Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => Array(32).fill(false))),
  drumPattern: Array.from({ length: 8 }, () => Array(32).fill(false)),

  toggleDrumStep: (channel, step) => {
    const state = get();
    pushHistory(state);
    const { drumPatterns, currentPatternIdx } = state;
    const newPatterns = drumPatterns.map((pat, pi) =>
      pi === currentPatternIdx
        ? pat.map((row, i) => i === channel ? row.map((v, j) => j === step ? !v : v) : row)
        : pat
    );
    const newPattern = newPatterns[currentPatternIdx];
    set({ drumPatterns: newPatterns, drumPattern: newPattern });
    audioEngine.drumPattern = newPattern.map(row => [...row]);
  },

  clearDrumPattern: () => {
    pushHistory(get());
    const { drumPatterns, currentPatternIdx } = get();
    const empty = Array.from({ length: 8 }, () => Array(32).fill(false));
    const newPatterns = drumPatterns.map((pat, pi) => pi === currentPatternIdx ? empty : pat);
    set({ drumPatterns: newPatterns, drumPattern: empty });
    audioEngine.drumPattern = empty;
  },

  loadDefaultPattern: () => {
    pushHistory(get());
    audioEngine.init();
    audioEngine.loadDefaultPattern();
    const { drumPatterns, currentPatternIdx } = get();
    // Pad engine pattern to 32 steps
    const loaded = audioEngine.drumPattern.map(row => {
      const padded = [...row];
      while (padded.length < 32) padded.push(false);
      return padded;
    });
    const newPatterns = drumPatterns.map((pat, pi) => pi === currentPatternIdx ? loaded : pat);
    set({ drumPatterns: newPatterns, drumPattern: loaded });
    audioEngine.drumPattern = loaded;
  },

  randomizeDrumPattern: () => {
    pushHistory(get());
    const { drumPatterns, currentPatternIdx, drumStepCount } = get();
    // Density per channel tuned so patterns are musical, not just noise.
    // kick / snare / hihat / openhat / clap / tom1 / tom2 / cymbal
    const densities = [0.35, 0.22, 0.55, 0.08, 0.15, 0.08, 0.08, 0.05];
    const randomized: boolean[][] = Array.from({ length: 8 }, (_, ch) =>
      Array.from({ length: 32 }, (_, step) => {
        if (step >= drumStepCount) return false;
        // Favor on-grid hits (every 4th step) slightly
        const onBeatBoost = step % 4 === 0 ? 1.4 : 1;
        return Math.random() < densities[ch]! * onBeatBoost;
      }),
    );
    // Guarantee a kick on step 0 for groove
    randomized[0]![0] = true;
    const newPatterns = drumPatterns.map((pat, pi) => pi === currentPatternIdx ? randomized : pat);
    set({ drumPatterns: newPatterns, drumPattern: randomized });
    audioEngine.drumPattern = randomized.map(row => [...row]);
  },

  copyDrumPattern: (fromIdx) => {
    const { drumPatterns } = get();
    const src = drumPatterns[fromIdx];
    if (!src) return;
    drumClipboard = src.map(row => [...row]);
  },

  pasteDrumPattern: (toIdx) => {
    if (!drumClipboard) return;
    pushHistory(get());
    const { drumPatterns, currentPatternIdx } = get();
    const copied = drumClipboard.map(row => [...row]);
    const newPatterns = drumPatterns.map((pat, pi) => pi === toIdx ? copied : pat);
    set({
      drumPatterns: newPatterns,
      drumPattern: toIdx === currentPatternIdx ? copied : drumPatterns[currentPatternIdx]!,
    });
    if (toIdx === currentPatternIdx) {
      audioEngine.drumPattern = copied.map(row => [...row]);
    }
  },

  undo: () => {
    const prev = undoStack.pop();
    if (!prev) return;
    const cur = get();
    redoStack.push(cloneSnapshot(cur));
    // Reset coalesce window so the next edit creates a new history entry
    lastHistoryPush = 0;
    const currentPattern = prev.drumPatterns[cur.currentPatternIdx]!;
    set({
      drumPatterns: prev.drumPatterns.map(p => p.map(row => [...row])),
      drumPattern: currentPattern.map(row => [...row]),
      pianoNotes: prev.pianoNotes.map(n => ({ ...n })),
    });
    audioEngine.drumPattern = currentPattern.map(row => [...row]);
    audioEngine.pianoRollNotes = prev.pianoNotes.map(n => ({
      note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
    }));
  },

  redo: () => {
    const next = redoStack.pop();
    if (!next) return;
    const cur = get();
    undoStack.push(cloneSnapshot(cur));
    lastHistoryPush = 0;
    const currentPattern = next.drumPatterns[cur.currentPatternIdx]!;
    set({
      drumPatterns: next.drumPatterns.map(p => p.map(row => [...row])),
      drumPattern: currentPattern.map(row => [...row]),
      pianoNotes: next.pianoNotes.map(n => ({ ...n })),
    });
    audioEngine.drumPattern = currentPattern.map(row => [...row]);
    audioEngine.pianoRollNotes = next.pianoNotes.map(n => ({
      note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
    }));
  },

  canUndo: () => undoStack.length > 0,
  canRedo: () => redoStack.length > 0,

  setDrumSwing: (swing) => {
    set({ drumSwing: swing });
    audioEngine.drumSwing = swing;
  },

  setDrumStepCount: (n) => {
    set({ drumStepCount: n });
    audioEngine.drumStepCount = n;
  },

  selectPattern: (idx) => {
    const { drumPatterns } = get();
    const pat = drumPatterns[idx];
    set({ currentPatternIdx: idx, drumPattern: pat });
    audioEngine.drumPattern = pat.map(row => [...row]);
  },

  setDrumChannelGain: (channel, gain) => {
    const gains = [...get().drumChannelGains];
    gains[channel] = gain;
    set({ drumChannelGains: gains });
    const ch = DRUM_CHANNELS[channel] as DrumChannel;
    if (audioEngine.drumGains[ch]) {
      audioEngine.drumGains[ch]!.gain.value = gain;
    }
  },

  // Synth
  synthParams: audioEngine.synthParams,
  updateSynthParam: (param, value) => {
    audioEngine.updateSynthParam(param, value);
    set(s => ({ synthParams: { ...s.synthParams, [param]: value } }));
  },
  activeSynthPatch: '',
  setActiveSynthPatch: (name) => set({ activeSynthPatch: name }),

  // Piano roll
  pianoNotes: [],
  pianoRollEnabled: false,
  pianoRollBeats: 4,
  addPianoNote: (note) => {
    pushHistory(get());
    set(s => {
      const notes = [...s.pianoNotes, note];
      audioEngine.pianoRollNotes = notes.map(n => ({
        note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
      }));
      return { pianoNotes: notes };
    });
  },
  removePianoNote: (id) => {
    pushHistory(get());
    set(s => {
      const notes = s.pianoNotes.filter(n => n.id !== id);
      audioEngine.pianoRollNotes = notes.map(n => ({
        note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
      }));
      return { pianoNotes: notes };
    });
  },
  togglePianoRoll: (enabled) => {
    audioEngine.pianoRollEnabled = enabled;
    set({ pianoRollEnabled: enabled });
  },
  setPianoNotes: (notes) => {
    pushHistory(get());
    audioEngine.pianoRollNotes = notes.map(n => ({
      note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
    }));
    set({ pianoNotes: notes });
  },
  setPianoRollBeats: (beats) => {
    audioEngine.pianoRollBeats = beats;
    audioEngine.pianoRollBeat = 0; // reset beat counter when loop length changes
    set({ pianoRollBeats: beats });
  },

  // Mixer
  mixerChannels: defaultMixerChannels,
  updateMixerChannel: (ch, update) => {
    set(s => {
      const channels = s.mixerChannels.map((c, i) => i === ch ? { ...c, ...update } : c);
      if (update.gain !== undefined) audioEngine.setChannelGain(ch, update.gain);
      if (update.pan !== undefined) audioEngine.setChannelPan(ch, update.pan);
      if (update.fxSend !== undefined) audioEngine.setChannelSend(ch, update.fxSend);

      // FX bus (6) and master (7) mute directly — not part of solo logic
      if (update.muted !== undefined && ch >= 6) {
        audioEngine.setChannelMute(ch, update.muted);
      }

      // Solo/mute logic: channels 0-5 are instrument buses
      // When any channel is soloed, only soloed channels pass audio — mute state is preserved
      // but overridden by solo. When all solos are cleared, restore each channel's own mute flag.
      const anySolo = channels.slice(0, 6).some(c => c.solo);
      channels.forEach((c, i) => {
        if (i >= 6) return; // leave FX bus and master alone
        const effectiveMute = anySolo ? !c.solo : c.muted;
        audioEngine.setChannelMute(i, effectiveMute);
      });

      return { mixerChannels: channels };
    });
  },

  // FX
  fxParams: audioEngine.fxParams,
  updateFX: (fx, update) => {
    audioEngine.updateFX(fx, update as any);
    set(s => ({
      fxParams: { ...s.fxParams, [fx]: { ...s.fxParams[fx], ...update } },
    }));
  },

  // Pad Machine
  padAssignments: Array.from({ length: 16 }, () => ({ sampleName: null, mode: 'oneshot' as const, color: '' })),
  updatePadAssignment: (idx, update) => set(s => {
    const next = [...s.padAssignments];
    next[idx] = { ...next[idx], ...update };
    return { padAssignments: next };
  }),

  // Compressor
  compParams: { enabled: false, threshold: -20, ratio: 4, attack: 0.003, release: 0.25, knee: 10, makeup: 1.0 },
  setCompParam: (k, v) => {
    set(s => ({ compParams: { ...s.compParams, [k]: v } }));
    if (k === 'enabled') {
      audioEngine.setUserCompEnabled(v as boolean);
    } else {
      const engineKey = k === 'makeup' ? 'makeupGain' : k as any;
      audioEngine.setUserCompParam(engineKey, v as number);
    }
  },

  // EQ
  eqParams: { enabled: false, gains: [0, 0, 0, 0, 0] },
  setEQEnabled: (enabled) => {
    set(s => ({ eqParams: { ...s.eqParams, enabled } }));
    audioEngine.setUserEQEnabled(enabled);
  },
  setEQBand: (idx, gain) => {
    set(s => {
      const gains = [...s.eqParams.gains];
      gains[idx] = parseFloat(gain.toFixed(2));
      audioEngine.setUserEQBand(idx, gains[idx]);
      return { eqParams: { ...s.eqParams, gains } };
    });
  },

  // ICQ
  icqStatus: 'online',
  setIcqStatus: (s) => set({ icqStatus: s }),
}));
