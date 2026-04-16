// MusicOS 98 — Web Audio Engine
// Handles all synthesis, scheduling, routing, and effects

export type DrumChannel = 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom1' | 'tom2' | 'cymbal';

export const DRUM_CHANNELS: DrumChannel[] = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom1', 'tom2', 'cymbal'];

export interface MixerChannel {
  id: number;
  name: string;
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  sends: number[];
}

export interface SynthParams {
  oscillatorType: OscillatorType;
  osc2Type: OscillatorType;
  osc2Detune: number;
  osc2Mix: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFreq: number;
  filterQ: number;
  filterEnvAmount: number;
  lfoRate: number;
  lfoDepth: number;
  lfoTarget: 'filter' | 'pitch' | 'amp';
  masterGain: number;
}

export interface FXParams {
  delay: { time: number; feedback: number; wet: number; enabled: boolean };
  reverb: { decay: number; wet: number; enabled: boolean };
  distortion: { amount: number; wet: number; enabled: boolean };
  filter: { freq: number; q: number; type: BiquadFilterType; enabled: boolean };
  chorus: { rate: number; depth: number; wet: number; enabled: boolean };
  bitcrusher: { bits: number; wet: number; enabled: boolean };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  masterCompressor: DynamicsCompressorNode | null = null;
  masterAnalyser: AnalyserNode | null = null;

  // Mixer channels (gain nodes for each instrument bus)
  mixerInputs: GainNode[] = [];
  mixerPanners: StereoPannerNode[] = [];
  mixerFaders: GainNode[] = [];
  mixerMutes: GainNode[] = [];
  mixerSendGains: GainNode[] = []; // per-channel FX send amount
  channelAnalysers: AnalyserNode[] = [];

  // Drum engine
  drumPattern: boolean[][] = Array.from({ length: 8 }, () => Array(16).fill(false));
  drumGains: Record<DrumChannel, GainNode | null> = {
    kick: null, snare: null, hihat: null, openhat: null,
    clap: null, tom1: null, tom2: null, cymbal: null,
  };

  // Synth engine
  synthParams: SynthParams = {
    oscillatorType: 'sawtooth',
    osc2Type: 'square',
    osc2Detune: 7,
    osc2Mix: 0.3,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.6,
    release: 0.4,
    filterFreq: 2000,
    filterQ: 2,
    filterEnvAmount: 0.5,
    lfoRate: 3,
    lfoDepth: 0,
    lfoTarget: 'filter',
    masterGain: 0.7,
  };
  activeVoices: Map<string, { osc1: OscillatorNode; osc2: OscillatorNode; osc2Mix: GainNode; gainNode: GainNode; filter: BiquadFilterNode; lfo: OscillatorNode; lfoGain: GainNode }> = new Map();

  // FX chain (global)
  fxParams: FXParams = {
    delay: { time: 0.375, feedback: 0.35, wet: 0.25, enabled: false },
    reverb: { decay: 2.5, wet: 0.2, enabled: false },
    distortion: { amount: 20, wet: 0.5, enabled: false },
    filter: { freq: 2000, q: 1, type: 'lowpass', enabled: false },
    chorus: { rate: 0.5, depth: 0.003, wet: 0.3, enabled: false },
    bitcrusher: { bits: 8, wet: 0.5, enabled: false },
  };

  // FX nodes
  fxDelayNode: DelayNode | null = null;
  fxDelayFeedback: GainNode | null = null;
  fxDelayWet: GainNode | null = null;
  fxDelayDry: GainNode | null = null;
  fxReverbNode: ConvolverNode | null = null;
  fxReverbWet: GainNode | null = null;
  fxReverbDry: GainNode | null = null;
  fxDistortion: WaveShaperNode | null = null;
  fxDistortionWet: GainNode | null = null;
  fxDistortionDry: GainNode | null = null;
  fxFilterNode: BiquadFilterNode | null = null;
  fxFilterWet: GainNode | null = null;
  fxFilterDry: GainNode | null = null;
  fxChorusDelay: DelayNode | null = null;
  fxChorusLFO: OscillatorNode | null = null;
  fxChorusWet: GainNode | null = null;
  fxChorusDry: GainNode | null = null;

  // FX bus — all mixer channels route here, then through the FX chain to masterFaderNode
  fxBusInput: GainNode | null = null;

  // Master channel — sits after the FX chain, before the compressor
  masterFaderNode: GainNode | null = null;
  masterMuteNode: GainNode | null = null;

  // User insert: Compressor (between masterMuteNode and masterGain)
  userCompEnabled = false;
  userCompNode: DynamicsCompressorNode | null = null;
  userCompMakeup: GainNode | null = null;
  userCompWet: GainNode | null = null;
  userCompBypass: GainNode | null = null;
  userCompOutput: GainNode | null = null;

  // User insert: EQ — 5 bands (lowshelf, peaking×3, highshelf) in series after comp
  userEQEnabled = false;
  userEQBands: BiquadFilterNode[] = [];
  userEQWet: GainNode | null = null;
  userEQBypass: GainNode | null = null;
  userEQOutput: GainNode | null = null;

  // Piano roll
  pianoRollNotes: { note: number; beat: number; duration: number; channel: number }[] = [];
  pianoRollEnabled = false;
  // Loop length in beats — configurable, default 4 beats = 16 steps
  pianoRollBeats = 4;

  // Drum step count (16 or 32)
  drumStepCount = 16;
  // Swing (0 = straight, 0.5 = full swing)
  drumSwing = 0;

  // Metronome — a sample-accurate click on quarter notes when playing
  metronomeEnabled = false;

  // Transport
  bpm = 128;
  isPlaying = false;
  currentStep = -1;
  nextNoteTime = 0;
  scheduleAheadTime = 0.1;
  lookahead = 25;
  schedulerTimerId: ReturnType<typeof setTimeout> | null = null;
  stepCallbacks: ((step: number) => void)[] = [];

  // Piano roll scheduler
  pianoRollBeat = 0;        // scheduling counter (runs ahead)
  pianoRollDisplayBeat = 0; // display counter (fires at audio time, used by UI)
  pianoRollBeatsPerLoop = 8;
  pianoRollScheduledAhead = 0;

  // Recorder
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  recordingStream: MediaStream | null = null;
  recordingDest: MediaStreamAudioDestinationNode | null = null;

  // Schedule offset: use baseLatency (one audio frame) so notes always land in the next
  // processing block. Falls back to 0.005 on browsers that don't expose baseLatency yet.
  get scheduleOffset(): number {
    return this.ctx ? (this.ctx.baseLatency || 0.005) : 0.005;
  }

  // Ensures the context is running, then calls fn. Always synchronous if context is
  // already running; async path only fires on first interaction or after tab-hide resume.
  ensureRunning(fn: () => void) {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'running') { fn(); return; }
    ctx.resume().then(fn);
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });
    } catch {
      // AudioContext creation may fail before user gesture — will retry on play
      return;
    }
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;

    // Master channel (ch 7) — sits between FX output and the final gain/compressor
    this.masterFaderNode = this.ctx.createGain();
    this.masterFaderNode.gain.value = 0.9; // matches defaultMixerChannels[7].gain
    this.masterMuteNode = this.ctx.createGain();
    this.masterMuteNode.gain.value = 1;

    this.masterFaderNode.connect(this.masterMuteNode);

    // ── User Compressor insert ──────────────────────────────────────────────
    this.userCompNode = this.ctx.createDynamicsCompressor();
    this.userCompNode.threshold.value = -20;
    this.userCompNode.knee.value = 10;
    this.userCompNode.ratio.value = 4;
    this.userCompNode.attack.value = 0.003;
    this.userCompNode.release.value = 0.25;
    this.userCompMakeup = this.ctx.createGain();
    this.userCompMakeup.gain.value = 1.0;
    this.userCompWet = this.ctx.createGain();
    this.userCompWet.gain.value = 0;   // bypassed by default
    this.userCompBypass = this.ctx.createGain();
    this.userCompBypass.gain.value = 1; // bypass on by default
    this.userCompOutput = this.ctx.createGain();
    this.masterMuteNode.connect(this.userCompNode);
    this.userCompNode.connect(this.userCompMakeup);
    this.userCompMakeup.connect(this.userCompWet);
    this.masterMuteNode.connect(this.userCompBypass);
    this.userCompWet.connect(this.userCompOutput);
    this.userCompBypass.connect(this.userCompOutput);

    // ── User EQ insert (5 bands in series) ─────────────────────────────────
    const eqFreqs = [80, 250, 1000, 4000, 12000];
    const eqTypes: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
    this.userEQWet = this.ctx.createGain();
    this.userEQWet.gain.value = 0;
    this.userEQBypass = this.ctx.createGain();
    this.userEQBypass.gain.value = 1;
    this.userEQOutput = this.ctx.createGain();
    eqFreqs.forEach((freq, i) => {
      const band = this.ctx!.createBiquadFilter();
      band.type = eqTypes[i];
      band.frequency.value = freq;
      band.gain.value = 0;
      band.Q.value = 1;
      if (i === 0) {
        this.userCompOutput!.connect(band);
      } else {
        this.userEQBands[i - 1].connect(band);
      }
      this.userEQBands.push(band);
    });
    this.userEQBands[4].connect(this.userEQWet);
    this.userCompOutput.connect(this.userEQBypass);
    this.userEQWet.connect(this.userEQOutput);
    this.userEQBypass.connect(this.userEQOutput);
    this.userEQOutput.connect(this.masterGain);

    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // FX bus input — all mixer channels feed here, then through FX chain to master
    this.fxBusInput = this.ctx.createGain();

    // Create 8 mixer channels
    // Routing: input → pan → fader → [analyser tap] → mute → [sendGain → fxBusInput] + [direct → masterFaderNode]
    for (let i = 0; i < 8; i++) {
      const input = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner();
      const fader = this.ctx.createGain();
      const mute = this.ctx.createGain();
      const sendGain = this.ctx.createGain();
      sendGain.gain.value = 0; // off by default — set per channel via setChannelSend
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      input.connect(pan);
      pan.connect(fader);
      fader.connect(analyser); // meter tap
      fader.connect(mute);
      // Dry path: directly to masterFaderNode (always on)
      mute.connect(this.masterFaderNode!);
      // Wet/send path: through sendGain → fxBusInput → FX chain → masterFaderNode (additive)
      mute.connect(sendGain);
      sendGain.connect(this.fxBusInput!);
      this.mixerInputs.push(input);
      this.mixerPanners.push(pan);
      this.mixerFaders.push(fader);
      this.mixerMutes.push(mute);
      this.mixerSendGains.push(sendGain);
      this.channelAnalysers.push(analyser);
    }

    // Create drum channel gains
    DRUM_CHANNELS.forEach((ch, i) => {
      const g = this.ctx!.createGain();
      g.connect(this.mixerInputs[0]);
      this.drumGains[ch] = g;
    });

    this.setupFX();

    // Ch 6 (FX) meter taps the signal entering the FX bus
    this.fxBusInput!.connect(this.channelAnalysers[6]);
    // Ch 7 (Master) meter taps the post-FX master fader output
    this.masterFaderNode!.connect(this.channelAnalysers[7]);
  }

  setChannelSend(channelIdx: number, amount: number) {
    const g = this.mixerSendGains[channelIdx];
    if (g) g.gain.value = Math.max(0, Math.min(1, amount));
  }

  // ── User Compressor ──────────────────────────────────────────────────────

  setUserCompEnabled(enabled: boolean) {
    if (!this.ctx) return;
    this.userCompEnabled = enabled;
    const t = this.ctx.currentTime;
    this.userCompWet?.gain.setTargetAtTime(enabled ? 1 : 0, t, 0.015);
    this.userCompBypass?.gain.setTargetAtTime(enabled ? 0 : 1, t, 0.015);
  }

  setUserCompParam(param: 'threshold' | 'ratio' | 'attack' | 'release' | 'knee' | 'makeupGain', value: number) {
    if (!this.ctx || !this.userCompNode) return;
    const t = this.ctx.currentTime;
    switch (param) {
      case 'threshold': this.userCompNode.threshold.setTargetAtTime(value, t, 0.01); break;
      case 'ratio':     this.userCompNode.ratio.setTargetAtTime(value, t, 0.01); break;
      case 'attack':    this.userCompNode.attack.setTargetAtTime(value, t, 0.01); break;
      case 'release':   this.userCompNode.release.setTargetAtTime(value, t, 0.01); break;
      case 'knee':      this.userCompNode.knee.setTargetAtTime(value, t, 0.01); break;
      case 'makeupGain': this.userCompMakeup?.gain.setTargetAtTime(value, t, 0.01); break;
    }
  }

  getUserCompReduction(): number {
    return this.userCompNode?.reduction ?? 0;
  }

  // ── User EQ ──────────────────────────────────────────────────────────────

  setUserEQEnabled(enabled: boolean) {
    if (!this.ctx) return;
    this.userEQEnabled = enabled;
    const t = this.ctx.currentTime;
    this.userEQWet?.gain.setTargetAtTime(enabled ? 1 : 0, t, 0.015);
    this.userEQBypass?.gain.setTargetAtTime(enabled ? 0 : 1, t, 0.015);
  }

  setUserEQBand(bandIdx: number, gainDb: number, freq?: number, q?: number) {
    const band = this.userEQBands[bandIdx];
    if (!band || !this.ctx) return;
    const t = this.ctx.currentTime;
    band.gain.setTargetAtTime(gainDb, t, 0.01);
    if (freq !== undefined) band.frequency.setTargetAtTime(freq, t, 0.01);
    if (q !== undefined) band.Q.setTargetAtTime(q, t, 0.01);
  }

  getUserEQFrequencyResponse(freqArray: Float32Array): { mag: Float32Array; phase: Float32Array } {
    const combined = new Float32Array(freqArray.length).fill(1);
    const phaseOut = new Float32Array(freqArray.length);
    for (const band of this.userEQBands) {
      const mag = new Float32Array(freqArray.length);
      const ph = new Float32Array(freqArray.length);
      band.getFrequencyResponse(
        freqArray as Float32Array<ArrayBuffer>,
        mag as Float32Array<ArrayBuffer>,
        ph as Float32Array<ArrayBuffer>,
      );
      for (let i = 0; i < combined.length; i++) combined[i] *= mag[i];
    }
    return { mag: combined, phase: phaseOut };
  }

  setupFX() {
    if (!this.ctx || !this.masterGain || !this.fxBusInput) return;
    const ctx = this.ctx;

    // ── Create all FX nodes ──────────────────────────────────────────────────

    // Delay
    this.fxDelayNode = ctx.createDelay(2.0);
    this.fxDelayFeedback = ctx.createGain();
    this.fxDelayWet = ctx.createGain();
    this.fxDelayDry = ctx.createGain();
    this.fxDelayNode.delayTime.value = this.fxParams.delay.time;
    this.fxDelayFeedback.gain.value = this.fxParams.delay.feedback;
    this.fxDelayWet.gain.value = this.fxParams.delay.enabled ? this.fxParams.delay.wet : 0;
    this.fxDelayDry.gain.value = 1;
    // Delay feedback loop
    this.fxDelayNode.connect(this.fxDelayFeedback);
    this.fxDelayFeedback.connect(this.fxDelayNode);

    // Reverb (impulse)
    this.fxReverbNode = ctx.createConvolver();
    this.fxReverbWet = ctx.createGain();
    this.fxReverbDry = ctx.createGain();
    this.fxReverbWet.gain.value = this.fxParams.reverb.enabled ? this.fxParams.reverb.wet : 0;
    this.fxReverbDry.gain.value = 1;
    this.buildReverbImpulse(this.fxParams.reverb.decay);

    // Distortion
    this.fxDistortion = ctx.createWaveShaper();
    this.fxDistortionWet = ctx.createGain();
    this.fxDistortionDry = ctx.createGain();
    this.fxDistortionWet.gain.value = this.fxParams.distortion.enabled ? this.fxParams.distortion.wet : 0;
    this.fxDistortionDry.gain.value = 1;
    this.buildDistortionCurve(this.fxParams.distortion.amount);

    // Filter
    this.fxFilterNode = ctx.createBiquadFilter();
    this.fxFilterNode.type = this.fxParams.filter.type;
    this.fxFilterNode.frequency.value = this.fxParams.filter.freq;
    this.fxFilterNode.Q.value = this.fxParams.filter.q;
    this.fxFilterWet = ctx.createGain();
    this.fxFilterDry = ctx.createGain();
    this.fxFilterWet.gain.value = this.fxParams.filter.enabled ? 1 : 0;
    this.fxFilterDry.gain.value = this.fxParams.filter.enabled ? 0 : 1;

    // Chorus
    this.fxChorusDelay = ctx.createDelay(0.05);
    this.fxChorusDelay.delayTime.value = this.fxParams.chorus.depth;
    this.fxChorusLFO = ctx.createOscillator();
    this.fxChorusLFO.frequency.value = this.fxParams.chorus.rate;
    const chorusLFOGain = ctx.createGain();
    chorusLFOGain.gain.value = this.fxParams.chorus.depth;
    this.fxChorusLFO.connect(chorusLFOGain);
    chorusLFOGain.connect(this.fxChorusDelay.delayTime);
    try { this.fxChorusLFO.start(); } catch {}
    this.fxChorusWet = ctx.createGain();
    this.fxChorusDry = ctx.createGain();
    this.fxChorusWet.gain.value = this.fxParams.chorus.enabled ? this.fxParams.chorus.wet : 0;
    this.fxChorusDry.gain.value = 1;

    // ── Wire FX chain in series: fxBusInput → delay → reverb → dist → filter → chorus → masterGain ──

    let node: AudioNode = this.fxBusInput;

    // Delay (wet/dry)
    const delayMerge = ctx.createGain();
    node.connect(this.fxDelayDry);
    node.connect(this.fxDelayNode);
    this.fxDelayNode.connect(this.fxDelayWet);
    this.fxDelayDry.connect(delayMerge);
    this.fxDelayWet.connect(delayMerge);
    node = delayMerge;

    // Reverb (wet/dry)
    const reverbMerge = ctx.createGain();
    node.connect(this.fxReverbDry);
    node.connect(this.fxReverbNode);
    this.fxReverbNode.connect(this.fxReverbWet);
    this.fxReverbDry.connect(reverbMerge);
    this.fxReverbWet.connect(reverbMerge);
    node = reverbMerge;

    // Distortion (wet/dry)
    const distMerge = ctx.createGain();
    node.connect(this.fxDistortionDry);
    node.connect(this.fxDistortion);
    this.fxDistortion.connect(this.fxDistortionWet);
    this.fxDistortionDry.connect(distMerge);
    this.fxDistortionWet.connect(distMerge);
    node = distMerge;

    // Filter (wet/dry)
    const filterMerge = ctx.createGain();
    node.connect(this.fxFilterDry);
    node.connect(this.fxFilterNode);
    this.fxFilterNode.connect(this.fxFilterWet);
    this.fxFilterDry.connect(filterMerge);
    this.fxFilterWet.connect(filterMerge);
    node = filterMerge;

    // Chorus (wet/dry)
    const chorusMerge = ctx.createGain();
    node.connect(this.fxChorusDry);
    node.connect(this.fxChorusDelay);
    this.fxChorusDelay.connect(this.fxChorusWet);
    this.fxChorusDry.connect(chorusMerge);
    this.fxChorusWet.connect(chorusMerge);
    node = chorusMerge;

    // Final output to master fader (ch 7) → master mute → masterGain
    node.connect(this.masterFaderNode!);
  }

  buildReverbImpulse(decay: number) {
    if (!this.ctx || !this.fxReverbNode) return;
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * decay;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    this.fxReverbNode.buffer = impulse;
  }

  buildDistortionCurve(amount: number) {
    if (!this.fxDistortion) return;
    const n = 256;
    const curve = new Float32Array(n);
    const k = amount;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    this.fxDistortion.curve = curve;
  }

  // Apply FX to a source node, returns the output node
  applyFX(source: AudioNode, fxType: keyof FXParams): AudioNode {
    if (!this.ctx) return source;
    switch (fxType) {
      case 'delay': {
        if (!this.fxDelayNode || !this.fxDelayWet || !this.fxDelayDry) return source;
        const merger = this.ctx.createGain();
        source.connect(this.fxDelayDry);
        source.connect(this.fxDelayNode);
        this.fxDelayNode.connect(this.fxDelayWet);
        this.fxDelayDry.connect(merger);
        this.fxDelayWet.connect(merger);
        return merger;
      }
      default: return source;
    }
  }

  // ── DRUM SYNTHESIS ──────────────────────────────────────────────────────────

  triggerDrum(channel: DrumChannel, time: number, velocity = 1.0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = this.drumGains[channel];
    if (!out) return;

    switch (channel) {
      case 'kick': this.synthKick(ctx, time, velocity, out); break;
      case 'snare': this.synthSnare(ctx, time, velocity, out); break;
      case 'hihat': this.synthHihat(ctx, time, velocity, out, false); break;
      case 'openhat': this.synthHihat(ctx, time, velocity, out, true); break;
      case 'clap': this.synthClap(ctx, time, velocity, out); break;
      case 'tom1': this.synthTom(ctx, time, velocity, out, 160); break;
      case 'tom2': this.synthTom(ctx, time, velocity, out, 100); break;
      case 'cymbal': this.synthCymbal(ctx, time, velocity, out); break;
    }
  }

  private synthKick(ctx: AudioContext, time: number, vel: number, out: AudioNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();

    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.08);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(vel * 1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    click.frequency.value = 800;
    clickGain.gain.setValueAtTime(vel * 0.4, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(gain); gain.connect(out);
    click.connect(clickGain); clickGain.connect(out);
    osc.start(time); osc.stop(time + 0.55);
    click.start(time); click.stop(time + 0.05);
  }

  private synthSnare(ctx: AudioContext, time: number, vel: number, out: AudioNode) {
    // Noise component
    const bufSize = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vel * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(out);
    noise.start(time); noise.stop(time + 0.2);

    // Tone
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(vel * 0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(oscGain); oscGain.connect(out);
    osc.start(time); osc.stop(time + 0.12);
  }

  private synthHihat(ctx: AudioContext, time: number, vel: number, out: AudioNode, open: boolean) {
    const bufSize = Math.floor(ctx.sampleRate * (open ? 0.4 : 0.05));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hiFilter = ctx.createBiquadFilter();
    hiFilter.type = 'highpass';
    hiFilter.frequency.value = 7000;
    const bandFilter = ctx.createBiquadFilter();
    bandFilter.type = 'bandpass';
    bandFilter.frequency.value = 10000;
    const noiseGain = ctx.createGain();
    const decay = open ? 0.35 : 0.04;
    noiseGain.gain.setValueAtTime(vel * 0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(hiFilter); hiFilter.connect(bandFilter);
    bandFilter.connect(noiseGain); noiseGain.connect(out);
    noise.start(time); noise.stop(time + decay + 0.01);
  }

  private synthClap(ctx: AudioContext, time: number, vel: number, out: AudioNode) {
    const offsets = [0, 0.01, 0.02, 0.03];
    offsets.forEach(offset => {
      const bufSize = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1200;
      f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel * 0.6, time + offset);
      g.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.06);
      noise.connect(f); f.connect(g); g.connect(out);
      noise.start(time + offset); noise.stop(time + offset + 0.08);
    });
  }

  private synthTom(ctx: AudioContext, time: number, vel: number, out: AudioNode, freq: number) {
    // Main tone — sine with pitch sweep
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.6, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 1.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    // Punch transient — short noise burst
    const bufSize = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = freq * 2;
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.6, time);
    ng.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain); gain.connect(out);
    noise.connect(nf); nf.connect(ng); ng.connect(out);
    osc.start(time); osc.stop(time + 0.45);
    noise.start(time); noise.stop(time + 0.05);
  }

  private synthCymbal(ctx: AudioContext, time: number, vel: number, out: AudioNode) {
    const bufSize = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hiPass = ctx.createBiquadFilter();
    hiPass.type = 'highpass';
    hiPass.frequency.value = 5000;
    const shapeFilter = ctx.createBiquadFilter();
    shapeFilter.type = 'peaking';
    shapeFilter.frequency.value = 8000;
    shapeFilter.gain.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.35, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 1.1);
    noise.connect(hiPass); hiPass.connect(shapeFilter);
    shapeFilter.connect(g); g.connect(out);
    noise.start(time); noise.stop(time + 1.25);
  }

  // ── SYNTH ENGINE ─────────────────────────────────────────────────────────────

  noteOn(noteNumber: number, channelIndex = 1) {
    if (!this.ctx) return;
    window.dispatchEvent(new CustomEvent('sheep-jump'));
    const ctx = this.ctx;
    const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const key = `${channelIndex}-${noteNumber}`;

    // Release existing voice for this note
    if (this.activeVoices.has(key)) this.noteOff(noteNumber, channelIndex);

    const p = this.synthParams;

    // Oscillators
    const osc1 = ctx.createOscillator();
    osc1.type = p.oscillatorType;
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = p.osc2Type;
    osc2.frequency.value = freq;
    osc2.detune.value = p.osc2Detune;

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = p.osc2Mix;

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterFreq;
    filter.Q.value = p.filterQ;

    // Envelope — offset by output latency for tight live playing feel
    const envGain = ctx.createGain();
    const now = ctx.currentTime + this.scheduleOffset;
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(p.masterGain, now + p.attack);
    envGain.gain.linearRampToValueAtTime(p.masterGain * p.sustain, now + p.attack + p.decay);

    // Filter envelope
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.linearRampToValueAtTime(p.filterFreq * (1 + p.filterEnvAmount * 4), now + p.attack);
    filter.frequency.linearRampToValueAtTime(p.filterFreq, now + p.attack + p.decay * 0.5);

    // LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = p.lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = p.lfoDepth;
    lfo.connect(lfoGain);
    if (p.lfoTarget === 'filter') lfoGain.connect(filter.frequency);
    else if (p.lfoTarget === 'pitch') { lfoGain.connect(osc1.frequency); lfoGain.connect(osc2.frequency); }
    else if (p.lfoTarget === 'amp') lfoGain.connect(envGain.gain);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(envGain);
    envGain.connect(this.mixerInputs[channelIndex] || this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this.activeVoices.set(key, { osc1, osc2, osc2Mix: osc2Gain, gainNode: envGain, filter, lfo, lfoGain });
  }

  noteOff(noteNumber: number, channelIndex = 1) {
    if (!this.ctx) return;
    const key = `${channelIndex}-${noteNumber}`;
    const voice = this.activeVoices.get(key);
    if (!voice) return;

    // Delete immediately so rapid noteOn can create a fresh voice without collision
    this.activeVoices.delete(key);

    const now = this.ctx.currentTime;
    const release = this.synthParams.release;
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.linearRampToValueAtTime(0, now + release);

    // Schedule oscillator stop at the precise end of the release tail (Web Audio time),
    // then disconnect nodes slightly after. setTimeout is only used for the disconnect
    // (which doesn't need sample-accuracy).
    const stopAt = now + release + 0.02;
    try { voice.osc1.stop(stopAt); voice.osc2.stop(stopAt); voice.lfo.stop(stopAt); } catch {}
    setTimeout(() => {
      try {
        voice.osc1.disconnect(); voice.osc2.disconnect(); voice.osc2Mix.disconnect();
        voice.gainNode.disconnect(); voice.filter.disconnect();
        voice.lfo.disconnect(); voice.lfoGain.disconnect();
      } catch {}
    }, (release + 0.1) * 1000);
  }

  updateSynthParam<K extends keyof SynthParams>(param: K, value: SynthParams[K]) {
    this.synthParams[param] = value;
  }

  // ── MIXER ────────────────────────────────────────────────────────────────────

  setChannelGain(ch: number, gain: number) {
    if (ch === 7) {
      if (this.masterFaderNode) this.masterFaderNode.gain.value = gain;
    } else {
      if (this.mixerFaders[ch]) this.mixerFaders[ch].gain.value = gain;
    }
  }

  setChannelPan(ch: number, pan: number) {
    // ch 7 (master) has no signal routed through its panner — skip
    if (ch === 7) return;
    if (this.mixerPanners[ch]) this.mixerPanners[ch].pan.value = pan;
  }

  setChannelMute(ch: number, muted: boolean) {
    if (ch === 7) {
      // Mute the entire master output
      if (this.masterMuteNode) this.masterMuteNode.gain.value = muted ? 0 : 1;
    } else if (ch === 6) {
      // Mute/unmute all FX wet signals (bypass all effects)
      const p = this.fxParams;
      if (this.fxDelayWet) this.fxDelayWet.gain.value = !muted && p.delay.enabled ? p.delay.wet : 0;
      if (this.fxReverbWet) this.fxReverbWet.gain.value = !muted && p.reverb.enabled ? p.reverb.wet : 0;
      if (this.fxDistortionWet) this.fxDistortionWet.gain.value = !muted && p.distortion.enabled ? p.distortion.wet : 0;
      if (this.fxFilterWet) this.fxFilterWet.gain.value = !muted && p.filter.enabled ? 1 : 0;
      if (this.fxFilterDry) this.fxFilterDry.gain.value = !muted && p.filter.enabled ? 0 : 1;
      if (this.fxChorusWet) this.fxChorusWet.gain.value = !muted && p.chorus.enabled ? p.chorus.wet : 0;
    } else {
      if (this.mixerMutes[ch]) this.mixerMutes[ch].gain.value = muted ? 0 : 1;
    }
  }

  setMasterGain(gain: number) {
    if (this.masterGain) this.masterGain.gain.value = gain;
  }

  // ── FX ENGINE ────────────────────────────────────────────────────────────────

  updateFX<K extends keyof FXParams>(fx: K, params: Partial<FXParams[K]>) {
    Object.assign(this.fxParams[fx], params);
    const p = this.fxParams;

    if (fx === 'delay') {
      if (this.fxDelayNode) this.fxDelayNode.delayTime.value = p.delay.time;
      if (this.fxDelayFeedback) this.fxDelayFeedback.gain.value = p.delay.feedback;
      if (this.fxDelayWet) this.fxDelayWet.gain.value = p.delay.enabled ? p.delay.wet : 0;
    }
    if (fx === 'reverb') {
      if (this.fxReverbWet) this.fxReverbWet.gain.value = p.reverb.enabled ? p.reverb.wet : 0;
      if ((params as Partial<FXParams['reverb']>).decay !== undefined) this.buildReverbImpulse(p.reverb.decay);
    }
    if (fx === 'distortion') {
      if (this.fxDistortionWet) this.fxDistortionWet.gain.value = p.distortion.enabled ? p.distortion.wet : 0;
      if ((params as Partial<FXParams['distortion']>).amount !== undefined) this.buildDistortionCurve(p.distortion.amount);
    }
    if (fx === 'filter') {
      if (this.fxFilterNode) {
        this.fxFilterNode.frequency.value = p.filter.freq;
        this.fxFilterNode.Q.value = p.filter.q;
        this.fxFilterNode.type = p.filter.type;
      }
      if (this.fxFilterWet) this.fxFilterWet.gain.value = p.filter.enabled ? 1 : 0;
      if (this.fxFilterDry) this.fxFilterDry.gain.value = p.filter.enabled ? 0 : 1;
    }
    if (fx === 'chorus') {
      if (this.fxChorusLFO) this.fxChorusLFO.frequency.value = p.chorus.rate;
      if (this.fxChorusWet) this.fxChorusWet.gain.value = p.chorus.enabled ? p.chorus.wet : 0;
    }
    if (fx === 'bitcrusher') {
      if (this.fxDistortionWet) this.fxDistortionWet.gain.value = p.bitcrusher.enabled ? p.bitcrusher.wet : 0;
    }
  }

  // ── TRANSPORT / SEQUENCER ───────────────────────────────────────────────────

  start() {
    if (!this.ctx) this.init();
    if (!this.ctx) return; // AudioContext unavailable
    if (this.isPlaying) return;
    const _doStart = () => {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.currentStep = -1;
      this.stepIndex = 0;
      this.nextNoteTime = this.ctx!.currentTime + 0.05;
      this.pianoRollBeat = 0;
      this.pianoRollDisplayBeat = 0;
      this.scheduler();
    };
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(_doStart);
    } else {
      _doStart();
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerTimerId !== null) clearTimeout(this.schedulerTimerId);
    this.schedulerTimerId = null;
    this.currentStep = -1;
    // Stop all active voices cleanly. Copy keys before deleting to avoid mutating during iteration.
    const keys = Array.from(this.activeVoices.keys());
    for (const k of keys) {
      const [chStr, noteStr] = k.split('-');
      this.noteOff(parseInt(noteStr), parseInt(chStr));
    }
    this.notifyStep(-1);
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
  }

  onStep(cb: (step: number) => void) {
    this.stepCallbacks.push(cb);
    return () => { this.stepCallbacks = this.stepCallbacks.filter(c => c !== cb); };
  }

  private notifyStep(step: number) {
    this.currentStep = step;
    this.stepCallbacks.forEach(cb => cb(step));
  }

  // stepIndex tracks which 16th-note step we're scheduling next
  private stepIndex = 0;

  private scheduler() {
    if (!this.ctx || !this.isPlaying) return;
    const secondsPerBeat = 60 / this.bpm;
    // Always 16th-note steps — 32-step mode is 2 bars, not faster notes
    const baseStepDuration = secondsPerBeat / 4;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      // Swing: odd steps (1, 3, 5…) are pushed forward by swing amount
      const swingOffset = (this.drumStepCount === 16 && this.drumSwing > 0 && this.stepIndex % 2 === 1)
        ? baseStepDuration * this.drumSwing
        : 0;
      this.scheduleStep(this.stepIndex, this.nextNoteTime + swingOffset);
      this.stepIndex = (this.stepIndex + 1) % this.drumStepCount;
      this.nextNoteTime += baseStepDuration;
    }

    this.schedulerTimerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  // Precisely scheduled note using Web Audio timing (for piano roll)
  noteOnScheduled(noteNumber: number, channelIndex: number, startTime: number, duration: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const p = this.synthParams;
    const endTime = startTime + duration;

    const osc1 = ctx.createOscillator();
    osc1.type = p.oscillatorType;
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = p.osc2Type;
    osc2.frequency.value = freq;
    osc2.detune.value = p.osc2Detune;

    const osc2Mix = ctx.createGain();
    osc2Mix.gain.value = p.osc2Mix;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, startTime);
    filter.frequency.linearRampToValueAtTime(
      p.filterFreq * (1 + p.filterEnvAmount * 4),
      startTime + p.attack
    );
    filter.frequency.linearRampToValueAtTime(p.filterFreq, startTime + p.attack + p.decay * 0.5);
    filter.Q.value = p.filterQ;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(p.masterGain, startTime + p.attack);
    env.gain.linearRampToValueAtTime(p.masterGain * p.sustain, startTime + p.attack + p.decay);
    // Release at end of note duration
    const releaseStart = Math.max(startTime + p.attack + p.decay, endTime - p.release);
    env.gain.setValueAtTime(p.masterGain * p.sustain, releaseStart);
    env.gain.linearRampToValueAtTime(0, releaseStart + p.release);

    osc1.connect(filter);
    osc2.connect(osc2Mix);
    osc2Mix.connect(filter);
    filter.connect(env);
    env.connect(this.mixerInputs[channelIndex] ?? this.masterGain!);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(releaseStart + p.release + 0.02);
    osc2.stop(releaseStart + p.release + 0.02);
  }

  private scheduleMetronomeClick(time: number, downbeat: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    // Route direct to destination so the click is never ducked by mixer mutes/solo/master fader
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = downbeat ? 1500 : 1000;
    const g = ctx.createGain();
    const peak = downbeat ? 0.5 : 0.35;
    const dur = 0.06;
    // Linear attack/decay — keeps the transient audible and sidesteps exponentialRamp corner cases
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.002);
    g.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.01);
    osc.onended = () => { try { osc.disconnect(); g.disconnect(); } catch {} };
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx) return;
    const secondsPerBeat = 60 / this.bpm;
    const secondsPerStep = secondsPerBeat / 4;

    // UI step notification (setTimeout is fine — this is display only)
    const delay = Math.max(0, (time - this.ctx.currentTime) * 1000);
    setTimeout(() => { if (this.isPlaying) this.notifyStep(step); }, delay);

    // Drum triggers — scheduled precisely in Web Audio time
    DRUM_CHANNELS.forEach((ch, i) => {
      if (this.drumPattern[i]?.[step]) this.triggerDrum(ch, time);
    });

    // Metronome click on every quarter note. Downbeat (step 0) is higher pitch.
    if (this.metronomeEnabled && step % 4 === 0) {
      this.scheduleMetronomeClick(time, step === 0);
    }

    // Piano roll — independent step counter that resets at pianoRollBeats * 4 steps.
    // Match notes by rounding their beat position to the nearest 16th-note step (snap grid).
    // This is exact — no float tolerance needed — because piano-roll notes are already
    // snap-quantized when placed.
    if (this.pianoRollEnabled && this.pianoRollNotes.length > 0) {
      const currentStepAbs = this.pianoRollBeat;
      this.pianoRollNotes.forEach(note => {
        const noteStep = Math.round(note.beat * 4);
        if (noteStep === currentStepAbs) {
          const duration = note.duration * secondsPerBeat;
          this.noteOnScheduled(note.note, note.channel, time, duration);
        }
      });
    }
    // Update display beat at audio time (not scheduler time) so playhead stays in sync
    const capturedDisplayBeat = this.pianoRollBeat;
    setTimeout(() => {
      if (this.isPlaying) this.pianoRollDisplayBeat = capturedDisplayBeat;
    }, delay);
    // Advance piano roll counter (independent of drum loop length)
    this.pianoRollBeat = (this.pianoRollBeat + 1) % (this.pianoRollBeats * 4);
  }

  // ── ANALYSER ──────────────────────────────────────────────────────────────

  getWaveformData(): Float32Array | null {
    if (!this.masterAnalyser) return null;
    const data = new Float32Array(this.masterAnalyser.fftSize);
    this.masterAnalyser.getFloatTimeDomainData(data);
    return data;
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.masterAnalyser) return null;
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(data);
    return data;
  }

  /** Returns 0–1 RMS level for the given mixer channel (post-fader, pre-mute). */
  getChannelLevel(idx: number): number {
    const analyser = this.channelAnalysers[idx];
    if (!analyser) return 0;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  // ── RECORDER ──────────────────────────────────────────────────────────────

  async startRecording() {
    if (!this.ctx || !this.masterAnalyser) return;
    // Clean up any prior recording dest that wasn't properly torn down
    if (this.recordingDest) { try { this.recordingDest.disconnect(); } catch {} this.recordingDest = null; }
    this.recordingDest = this.ctx.createMediaStreamDestination();
    // Tap the post-analyser signal (end of chain) so the recording captures exactly what you hear
    this.masterAnalyser.connect(this.recordingDest);
    this.mediaRecorder = new MediaRecorder(this.recordingDest.stream);
    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
    this.mediaRecorder.start();
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise(resolve => {
      if (!this.mediaRecorder) { resolve(null); return; }
      const rec = this.mediaRecorder;
      const dest = this.recordingDest;
      rec.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        // Disconnect the tap and stop the stream so the node can be GC'd
        try { dest?.disconnect(); } catch {}
        try { dest?.stream.getTracks().forEach(t => t.stop()); } catch {}
        if (this.recordingDest === dest) this.recordingDest = null;
        if (this.mediaRecorder === rec) this.mediaRecorder = null;
        this.recordedChunks = [];
        resolve(blob);
      };
      rec.stop();
    });
  }

  // ── DRUM PATTERN ──────────────────────────────────────────────────────────

  setDrumStep(channel: number, step: number, active: boolean) {
    if (!this.drumPattern[channel]) this.drumPattern[channel] = Array(16).fill(false);
    this.drumPattern[channel][step] = active;
  }

  clearDrumPattern() {
    this.drumPattern = Array.from({ length: 8 }, () => Array(16).fill(false));
  }

  loadDefaultPattern() {
    this.clearDrumPattern();
    // Kick: 1 5 9 13
    [0, 4, 8, 12].forEach(s => { this.drumPattern[0][s] = true; });
    // Snare: 5 13
    [4, 12].forEach(s => { this.drumPattern[1][s] = true; });
    // Hi-hat: every 2
    [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => { this.drumPattern[2][s] = true; });
    // Open hat: 6 14
    [6, 14].forEach(s => { this.drumPattern[3][s] = true; });
  }
}

export const audioEngine = new AudioEngine();
