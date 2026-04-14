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

export interface PianoNote {
  id: string;
  note: number;
  beat: number;
  duration: number;
  channel: number;
}

export const APPS: AppDef[] = [
  { id: 'drum-machine', title: 'Beat Machine', icon: '🥁', component: 'DrumMachine', defaultSize: { w: 820, h: 420 }, singleton: true },
  { id: 'synth', title: 'SynthStation', icon: '🎹', component: 'Synth', defaultSize: { w: 860, h: 460 }, singleton: true },
  { id: 'mixer', title: 'Mixer', icon: '🎚️', component: 'Mixer', defaultSize: { w: 760, h: 530 }, singleton: true },
  { id: 'piano-roll', title: 'Piano Roll', icon: '🎼', component: 'PianoRoll', defaultSize: { w: 820, h: 540 }, singleton: true },
  { id: 'fx-rack', title: 'FX Rack', icon: '🎛️', component: 'FXRack', defaultSize: { w: 540, h: 660 }, singleton: true },
  { id: 'sampler', title: 'Sampler', icon: '💿', component: 'Sampler', defaultSize: { w: 580, h: 460 }, singleton: true },
  { id: 'tape-deck', title: 'Tape Deck', icon: '📼', component: 'TapeDeck', defaultSize: { w: 480, h: 380 }, singleton: true },
  { id: 'file-browser', title: 'Sample Library', icon: '📁', component: 'FileBrowser', defaultSize: { w: 540, h: 460 }, singleton: true },
  { id: 'tempo-calc', title: 'Tempo Calc', icon: '🔢', component: 'TempoCalc', defaultSize: { w: 340, h: 400 }, singleton: true },
  { id: 'help', title: 'Help & Manual', icon: '❓', component: 'Help', defaultSize: { w: 620, h: 520 }, singleton: true },
  { id: 'oscilloscope', title: 'Oscilloscope', icon: '📊', component: 'Oscilloscope', defaultSize: { w: 460, h: 340 }, singleton: true },
  { id: 'pad-machine', title: 'Pad Machine', icon: '🎮', component: 'PadMachine', defaultSize: { w: 720, h: 540 }, singleton: true },
  { id: 'ski-free', title: 'SkiFree', icon: '⛷️', component: 'SkiFree', defaultSize: { w: 600, h: 480 }, singleton: true },
  { id: 'screen-mate', title: 'ScreenMate 🐑', icon: '🐑', component: 'ScreenMate', defaultSize: { w: 400, h: 300 }, singleton: false },
  { id: 'defrag', title: 'Disk Defragmenter', icon: '💽', component: 'Defrag', defaultSize: { w: 560, h: 500 }, singleton: true },
];

let zCounter = 100;
let stepUnsub: (() => void) | null = null;

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
  play: () => void;
  stop: () => void;
  setBPM: (bpm: number) => void;
  setCurrentStep: (step: number) => void;
  toggleLoop: () => void;
  toggleRecord: () => void;
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
  setDrumSwing: (swing: number) => void;
  setDrumStepCount: (n: number) => void;
  selectPattern: (idx: number) => void;
  setDrumChannelGain: (channel: number, gain: number) => void;
  drumChannelGains: number[];

  // Synth params
  synthParams: SynthParams;
  updateSynthParam: <K extends keyof SynthParams>(param: K, value: SynthParams[K]) => void;

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
    const viewport = { w: window.innerWidth, h: window.innerHeight - 60 };
    const x = pos?.x ?? Math.max(20, Math.floor(Math.random() * (viewport.w - app.defaultSize.w - 40)));
    const y = pos?.y ?? Math.max(30, Math.floor(Math.random() * (viewport.h - app.defaultSize.h - 80)));

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
          a.click();
        }
      });
      set({ isRecording: false });
    }
  },

  setProjectName: (name) => set({ projectName: name }),

  saveProject: () => {
    const s = get();
    const data = {
      version: 1,
      projectName: s.projectName,
      bpm: s.bpm,
      drumPattern: s.drumPattern,
      drumSwing: s.drumSwing,
      drumChannelGains: s.drumChannelGains,
      synthParams: s.synthParams,
      pianoNotes: s.pianoNotes,
      pianoRollEnabled: s.pianoRollEnabled,
      mixerChannels: s.mixerChannels,
      fxParams: s.fxParams,
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
      if (!data || data.version !== 1) return;
      if (data.projectName) set({ projectName: data.projectName });
      if (data.bpm) { audioEngine.setBPM(data.bpm); set({ bpm: data.bpm }); }
      if (data.drumPattern) {
        audioEngine.drumPattern = data.drumPattern.map((row: boolean[]) => [...row]);
        set({ drumPattern: data.drumPattern });
      }
      if (data.drumSwing !== undefined) set({ drumSwing: data.drumSwing });
      if (data.drumChannelGains) {
        data.drumChannelGains.forEach((gain: number, i: number) => {
          const ch = DRUM_CHANNELS[i] as DrumChannel;
          if (audioEngine.drumGains[ch]) audioEngine.drumGains[ch]!.gain.value = gain;
        });
        set({ drumChannelGains: data.drumChannelGains });
      }
      if (data.synthParams) {
        Object.entries(data.synthParams as SynthParams).forEach(([k, v]) => {
          audioEngine.updateSynthParam(k as keyof SynthParams, v as any);
        });
        set({ synthParams: { ...audioEngine.synthParams, ...data.synthParams } });
      }
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
      if (data.mixerChannels) {
        data.mixerChannels.forEach((ch: any, i: number) => {
          if (ch.gain !== undefined) audioEngine.setChannelGain(i, ch.gain);
          if (ch.pan !== undefined) audioEngine.setChannelPan(i, ch.pan);
          if (ch.muted !== undefined) audioEngine.setChannelMute(i, ch.muted);
        });
        set({ mixerChannels: data.mixerChannels });
      }
      if (data.fxParams) {
        (Object.keys(data.fxParams) as Array<keyof FXParams>).forEach(fx => {
          audioEngine.updateFX(fx, data.fxParams[fx]);
        });
        set({ fxParams: { ...audioEngine.fxParams, ...data.fxParams } });
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
    const { drumPatterns, currentPatternIdx } = get();
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
    const { drumPatterns, currentPatternIdx, drumStepCount } = get();
    const empty = Array.from({ length: 8 }, () => Array(32).fill(false));
    const newPatterns = drumPatterns.map((pat, pi) => pi === currentPatternIdx ? empty : pat);
    set({ drumPatterns: newPatterns, drumPattern: empty });
    audioEngine.drumPattern = empty;
  },

  loadDefaultPattern: () => {
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

  // Piano roll
  pianoNotes: [],
  pianoRollEnabled: false,
  pianoRollBeats: 4,
  addPianoNote: (note) => {
    set(s => {
      const notes = [...s.pianoNotes, note];
      audioEngine.pianoRollNotes = notes.map(n => ({
        note: n.note, beat: n.beat, duration: n.duration, channel: n.channel,
      }));
      return { pianoNotes: notes };
    });
  },
  removePianoNote: (id) => {
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
      if (update.muted !== undefined) audioEngine.setChannelMute(ch, update.muted);
      if (update.fxSend !== undefined) audioEngine.setChannelSend(ch, update.fxSend);
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
}));
