<img width="1405" height="756" alt="MusicOS 98 screenshot" src="https://github.com/user-attachments/assets/bc7d1c96-2794-4891-9a78-8c9404dee98e" />

# MusicOS 98

A Windows 98-themed browser-based music production environment. Make beats, write melodies, and hang out with a desktop pet sheep — all in the aesthetic of 1998.

## Apps

| App | Description |
|-----|-------------|
| **Drum Machine** | 16/32-step sequencer with swing, per-track volume, and multiple drum voices |
| **Piano Roll** | MIDI-style note editor with adjustable loop length, snap, and zoom |
| **Synth** | Polyphonic synthesizer with oscillator, filter, envelope, and reverb controls |
| **Mixer** | Per-channel volume/pan/mute/solo with master bus |
| **FX Rack** | Effects chain — delay, distortion, chorus, compressor |
| **Sampler** | Record or load audio samples and map them to pads |
| **Pad Machine** | 8-pad sample launcher |
| **Oscilloscope** | Real-time waveform visualizer |
| **Tape Deck** | Record your session to a downloadable audio file |
| **Tempo Calc** | BPM tap tempo and note-duration calculator |
| **Disk Defragmenter** | Authentic Windows 98 defrag simulation |
| **SkiFree** | Browser port of the classic SkiFree game — watch out for the yeti |
| **Desktop Pet** | eSheep64-inspired desktop companion with special events |

## Transport

The top bar controls global playback. BPM is adjustable via click-to-edit or ±1 buttons. Projects save and load as `.mos98` JSON files.

## Desktop Pet Events

The sheep triggers random special events every 25–60 seconds. You can also trigger them from the browser console:

```js
sheep.burn()       // on fire — flies across the screen and lands in a bathtub
sheep.boing()      // bounce
sheep.climb()      // climbs the screen edge and walks upside-down across the top
sheep.blacksheep() // a second sheep runs past
sheep.ufo()        // UFO abduction
sheep.alien()      // alien encounter — a visitor descends and waves
sheep.flower()     // spawn a flower to eat
sheep.jump()       // jump
sheep.random()     // random event
```

## Tech Stack

- **React 18** + **TypeScript**
- **Zustand** for global state
- **Web Audio API** for all sound synthesis and scheduling
- **Vite** for bundling
- Sprite assets: eSheep64 (Adrianotiger), Scmpoo (lwu309)

## Dev

```bash
npm install
npm run dev
```
