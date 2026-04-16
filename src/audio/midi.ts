// MusicOS 98 — Web MIDI input bridge
// Routes incoming Note On/Off from any connected MIDI controller to the synth engine.
// Gracefully degrades on browsers without Web MIDI (Safari) — no crashes, just no MIDI.

import { audioEngine } from './engine';

type MidiMsgListener = (msg: { type: 'on' | 'off'; note: number; velocity: number }) => void;

class MidiBridge {
  access: MIDIAccess | null = null;
  supported = false;
  enabled = false;
  connectedCount = 0;
  listeners: MidiMsgListener[] = [];

  isSupported() {
    return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
  }

  async enable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (this.access) { this.enabled = true; return true; }
    try {
      this.access = await navigator.requestMIDIAccess();
    } catch {
      return false;
    }
    this.supported = true;
    this.enabled = true;
    this.access.onstatechange = () => this.bindInputs();
    this.bindInputs();
    return true;
  }

  disable() {
    this.enabled = false;
    this.connectedCount = 0;
    if (this.access) {
      this.access.inputs.forEach(input => { input.onmidimessage = null; });
    }
    // Release any stuck synth notes (channel 1) without stopping the transport.
    // Iterate a snapshot of keys because noteOff mutates activeVoices.
    try {
      const keys = Array.from(audioEngine.activeVoices.keys());
      for (const k of keys) {
        const [chStr, noteStr] = k.split('-');
        if (parseInt(chStr) === 1) audioEngine.noteOff(parseInt(noteStr), 1);
      }
    } catch {}
  }

  private bindInputs() {
    if (!this.access) return;
    this.connectedCount = 0;
    this.access.inputs.forEach(input => {
      input.onmidimessage = e => this.handleMessage(e);
      this.connectedCount++;
    });
  }

  private handleMessage(e: MIDIMessageEvent) {
    if (!this.enabled || !e.data || e.data.length < 2) return;
    const [status, d1, d2 = 0] = e.data;
    const cmd = status & 0xf0;

    if (cmd === 0x90 && d2 > 0) {
      // Note On
      audioEngine.noteOn(d1, 1);
      this.listeners.forEach(l => l({ type: 'on', note: d1, velocity: d2 }));
    } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
      // Note Off (or Note On with velocity 0)
      audioEngine.noteOff(d1, 1);
      this.listeners.forEach(l => l({ type: 'off', note: d1, velocity: d2 }));
    }
    // Future: 0xB0 CC → macro controls, 0xE0 pitch bend
  }

  onMessage(cb: MidiMsgListener) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
}

export const midiBridge = new MidiBridge();
