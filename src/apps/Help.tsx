import { useState } from 'react';

const TOPICS = [
  {
    title: '🎵 Getting Started',
    content: `Welcome to MusicOS 98 — the world's only operating system built entirely for music production.

To get started:
1. Press SPACE to start/stop playback
2. Double-click any desktop icon to open an app
3. The Beat Machine loads with a default pattern
4. Open SynthStation and play keys with your computer keyboard

Keyboard shortcuts:
• SPACE — Play / Stop
• A W S E D F T G Y H U J K O L P — Piano keyboard
• Z / X — Octave down / up

All synthesis uses the real Web Audio API.`,
  },
  {
    title: '🥁 Beat Machine',
    content: `16-step drum sequencer with 8 channels of synthesized percussion.

Controls:
• Click any step button to toggle on/off
• Click a channel label to preview that drum sound
• Drag the volume knob per channel to adjust level
• BPM knob — drag up/down to change tempo
• Swing knob — add groove/swing feel
• Pattern banks A/B/C/D — 4 independent patterns
• STEPS — switch between 16 and 32 steps

Drum synthesis (all generated, no sample files):
• Kick: sine oscillator with exponential pitch sweep + transient click
• Snare: noise + tuned body oscillator
• Hi-hat: filtered white noise, fast decay
• Open Hat: filtered white noise, slow decay
• Clap: multi-burst layered noise
• Tom Hi/Lo: pitch-sweeping sine with noise punch transient
• Cymbal: high-pass filtered noise with long tail

Step indicator at the bottom lights with playback position.`,
  },
  {
    title: '🎹 SynthStation',
    content: `SubTrax Engine — full-featured subtractive synthesizer.

Architecture:
• 2 oscillators (Sine, Sawtooth, Square, Triangle)
• Resonant filter with envelope modulation
• Full ADSR amplitude envelope
• LFO (modulates filter cutoff, pitch, or amplitude)
• Up to 8-voice polyphony

Mouse: click keys in the keyboard display
Keyboard: A W S E D F T G Y H U J K O L P
Octave: Z (down), X (up) — OCT display shows current octave

Patches:
• 20 factory patches included: leads, bass, pads, stabs
• Click any patch to load it instantly
• "Save Current" — type a name and save your own patches
• User patches stored in localStorage, persist between sessions
• User patches shown in purple; click × to delete

Tips:
• High resonance + filter envelope = classic synth sweeps
• LFO on filter = autowah / wah-wah
• OSC 2 detune + mix = fat chorus sound
• Siren patch: LFO on pitch for alarm/air raid effect`,
  },
  {
    title: '🎼 Piano Roll',
    content: `Draw melodic sequences that play through SynthStation.

Drawing:
• Click an empty cell to place a note
• Click an existing note to remove it (same tool — no mode switching)
• Notes snap to the selected SNAP grid automatically

Toolbar:
• SNAP — quantize placement: 1/32, 1/16, 1/8, 1/4 note
• LENGTH — note duration: 1/32 through 1/2 note
• BARS — loop length: 1, 2, 4, 8, or 16 bars
• Zoom — horizontal zoom slider
• ON/OFF — toggle piano roll playback
• Clear — remove all notes

The green playhead shows position during transport.
Click piano keys on the left to audition any pitch.
The piano roll loops independently of the drum machine.`,
  },
  {
    title: '🎛️ FX Rack',
    content: `Six professional effects on the global FX send bus.

DELAY — Tape echo
• Time: delay length | Feedback: echo decay | Wet: dry/wet mix

REVERB — Convolution reverb
• Decay: room size | Wet: dry/wet mix
• Presets: Room, Hall, Plate, Cave, Chamber

DISTORTION — Waveshaper
• Drive: distortion amount | Wet: dry/wet mix
• Presets: Soft Clip, Hard Clip, Fuzz, Overdrive

FILTER — State-variable filter
• LP, HP, BP, Notch, Peak modes
• Freq: cutoff frequency | Q: resonance

CHORUS — Modulated delay
• Rate: LFO speed | Depth: modulation | Wet: dry/wet mix

BITCRUSHER — Lo-fi crunch
• Bits: bit depth reduction

Each effect has an ON/BYPASS toggle and wet/dry control.
Route signal to the FX bus using the FX SND knob on mixer channels.`,
  },
  {
    title: '🎚️ Mixer',
    content: `6-channel mixer with real-time VU metering.

Channel strips (left to right):
• Drums (Beat Machine)
• Synth (SynthStation + Piano Roll)
• Pads (Pad Machine)
• Keys (spare bus)
— divider —
• FX Bus (post-FX chain output)
• Master

Per-channel controls:
• VU meters — 16-segment stereo, peak hold
• Fader — drag to set volume
• Pan knob — drag left/right (double-click to center)
• FX SND knob — send amount to FX Rack (channels 0–3)
• M — Mute | S — Solo

Header shows stereo output meter for the full mix.`,
  },
  {
    title: '🔊 Compressor',
    content: `Dynamics compressor on the master bus insert.

Toggle ON/BYPASS to engage. Parameters:

• THRESH — Threshold (dBFS) — level above which compression starts
• RATIO — Compression ratio (1:1 = transparent, 20:1 = limiter)
• ATTACK — Time to respond to a peak above threshold
• RELEASE — Time to recover when signal drops below threshold
• KNEE — Soft knee width for gradual onset
• MAKEUP — Output gain compensation after compression

The GR meter shows real-time gain reduction in dB.
Runs in series with the EQ on the master insert chain.`,
  },
  {
    title: '🎚️ Parametric EQ',
    content: `5-band parametric equalizer on the master bus insert.

Bands (left to right):
• LOW — Low shelf, 80Hz (boost or cut bass body)
• LM — Low-mid peaking, 250Hz (warmth/muddiness)
• MID — Peaking, 1kHz (presence/honk)
• HM — High-mid peaking, 4kHz (air/bite)
• HIGH — High shelf, 12kHz (presence/brilliance)

Controls:
• Drag the vertical fader up/down to boost or cut ±18dB
• Double-click any fader to reset to 0dB
• Toggle ON/BYPASS to engage or bypass the EQ

The frequency response curve updates in real time as you
adjust the bands. Colored dots show each band's position.`,
  },
  {
    title: '📊 Oscilloscope',
    content: `Real-time audio visualization from the master output.

Modes:
• SCOPE — time-domain waveform with phosphor glow effect
• SPECTRUM — frequency spectrum bar graph

Controls:
• Gain — amplify the display for quiet signals
• Color swatches — change waveform color
• Scale labels show current amplitude range

When signal is present:
The scope draws 3 overlapping layers (outer glow, mid glow,
bright core) for a classic analog CRT phosphor look.
The idle state shows a subtle pulsing flat line.`,
  },
  {
    title: '🌊 MilkDrop Viz',
    content: `Winamp-inspired audio visualizations. 10 modes total.

• Click anywhere to cycle to the next visualization
• Click the dots at the bottom to jump to a specific mode

Visualizations:
1. Spectrum Storm — colorful frequency bars with bloom
2. Waveform Tunnel — waveform drawn as receding rings
3. Starburst — radial frequency rays rotating with bass
4. Aurora Borealis — wavy bands like the northern lights
5. Particle Swarm — bass-triggered particle explosions
6. Radial Rings — concentric circles driven by frequencies
7. Matrix Rain — audio-reactive code rain (green/cyan)
8. Plasma Wave — swirling plasma driven by frequency
9. Lissajous — XY waveform figure with trailing glow
10. Kaleidoscope — radial symmetry driven by frequencies

All visualizations are reactive to the master audio output.
Visuals are more dramatic with music playing.`,
  },
  {
    title: '🎛️ Pad Machine',
    content: `16-pad sample launcher in a 4×4 grid.

Loading samples:
1. Click a pad to select it
2. Browse the sample library on the right sidebar
3. Click any sample to assign to the selected pad
4. Click "+ Upload" to load your own audio files (WAV, MP3, OGG)
   — uploaded files appear under "My Uploads"

Pad modes:
• ONESHOT — plays once on click (good for drums, hits)
• HOLD — toggles looping on/off (good for ambient pads/loops)
  Click a HOLD pad again to stop it

Active HOLD pads glow and show "● PLAYING".
The "Clear" button removes the sample from the selected pad.`,
  },
  {
    title: '💿 Sampler',
    content: `Load audio files and play/manipulate them.

To load:
1. Drag audio files into the drop zone, or
2. Click to browse — WAV, MP3, OGG, FLAC supported

Controls:
• START / END — trim sample playback range
• PITCH — transpose ±24 semitones
• Reverse — play backwards
• Loop — loop the sample
• Play button — audition

Samples are stored in memory only — re-upload after refresh.`,
  },
  {
    title: '📼 Tape Deck',
    content: `Record the master audio output to a file.

1. Click RECORD to start recording
2. Play music — everything through the master goes in
3. Click STOP — file downloads automatically

Output format: WebM audio (plays in all modern browsers).
The recording captures the full mix including FX, EQ, compression.
Reels spin visually while recording.`,
  },
  {
    title: '🔢 Tempo Calc',
    content: `Calculate BPM and musical delay times.

Tap Tempo:
• Click TAP TEMPO repeatedly in rhythm
• System averages tap intervals to detect BPM
• Click Apply to set the project tempo

Quick presets: 60–180 BPM at common values

Delay time table shows exact millisecond values for all note
divisions at the current BPM — useful for hardware delays.`,
  },
  {
    title: '⛷️ SkiFree',
    content: `A remake of the classic Windows 3.x SkiFree game.

Controls:
• Arrow Left / A — turn left
• Arrow Right / D — turn right

Obstacles:
• Trees and rocks — crash = end run
• Ski lift poles — avoid the base
• Flags — decorative, ski through freely

The Yeti:
After 500m a yeti appears and chases you.
It's faster than you — it always catches up.
The game auto-restarts 3 seconds after you're caught or crash.
Click the canvas any time to restart immediately.

High score is saved between sessions.`,
  },
  {
    title: '🐑 Screen Mate Poo',
    content: `A poo companion that lives on your desktop.

• Double-click the ScreenMate icon (poo sprite) to summon/dismiss
• The companion roams freely over everything on screen
• It walks, runs, climbs walls, falls asleep, and more
• Drag it anywhere — release mid-air for physics-based throwing

Random events (happen on their own):
• Climbing walls and walking upside-down along the top
• Burning and landing in a bathtub
• Bouncing / boing
• Sitting and staring | Yawning | Sleeping | Rolling around
• UFO abduction and return
• Black sheep encounter
• Eating flowers
• Alien encounter (UFO drops an alien who waves)

Console debug commands (open browser DevTools → Console):
• sheep.burn()       — fire sequence
• sheep.boing()      — bounce
• sheep.climb()      — wall climb
• sheep.blacksheep() — second sheep encounter
• sheep.ufo()        — UFO abduction
• sheep.alien()      — UFO alien encounter
• sheep.sleep()      — poo sleeping animation
• sheep.sit()        — poo sitting animation
• sheep.yawn()       — poo yawning animation
• sheep.roll()       — poo rolling animation
• sheep.flower()     — spawn a flower to eat
• sheep.jump()       — jump
• sheep.random()     — trigger a random event

Based on eSheep64 by Adrianotiger (sprite used with thanks).
Scmpoo sprite sheets by original ScreenMate authors.`,
  },
  {
    title: '⌨️ Keyboard & Controls',
    content: `Global:
• SPACE — Play / Stop transport

SynthStation (keyboard focus):
• A W S E D F T G Y H U J K O L P — Piano notes
• Z — Octave down | X — Octave up

Transport bar:
• Click project name to rename (Enter to confirm, Esc to cancel)
• 💾 Save — download .mos98 project file
• 📂 Load — open .mos98 file

Window management:
• Double-click title bar — Maximize / restore
• Drag title bar — Move window
• Drag window edge/corner — Resize
• Click taskbar button — Focus or minimize window

Desktop right-click:
• Change Wallpaper — cycle 17 gradients (saved in localStorage)
• New Project — clear and start fresh
• Save Project — download .mos98 file
• Open Project — load .mos98 file
• About — open Help`,
  },
  {
    title: '💾 Projects',
    content: `Save and load your entire project state.

Save:
• Click 💾 in the transport bar, or
• Right-click desktop → Save Project
• Downloads a .mos98 file (JSON format)

Load:
• Click 📂 in the transport bar, or
• Right-click desktop → Open Project...
• Accepts .mos98 and .json files

What is saved:
• Project name and BPM
• Full drum patterns (A/B/C/D) + swing + step count + channel gains
• All synth parameters
• Piano roll notes and loop length
• Mixer channel states (gain, pan, mute, solo, FX sends)
• FX Rack settings

What is NOT saved:
• Synth patches (stored separately in localStorage)
• Uploaded samples in Pad Machine (audio data too large)
• Wallpaper preference (stored in localStorage separately)`,
  },
  {
    title: '🐛 Tips & Easter Eggs',
    content: `Things to try:
• VU meters respond even without transport — just play synth
• Piano roll: cyan notes = white keys, purple = black keys
• Dot-matrix visualizer in SynthStation tracks note frequency position
• Boot screen has a fake BIOS POST sequence on first load
• Right-click desktop → Change Wallpaper cycles 17 gradients
• Drag and throw the ScreenMate poo — it has real momentum physics
• MilkDrop Matrix Rain reacts to audio — frequency drives fall speed
• Compressor GR meter shows how hard it's working in real time
• EQ frequency curve updates live as you drag band faders

Performance tips:
• FX Rack reverb is most CPU-intensive — keep wet mix low
• Up to 8 simultaneous synth voices before clipping
• Disable unused FX Rack effects to save CPU
• Mute the FX Bus channel in Mixer to bypass all effects at once

Credits:
Built with React 18 + Web Audio API + Zustand + TypeScript
eSheep64 sprite by Adrianotiger
Scmpoo sprites from original ScreenMate
MusicOS 98 — Where nostalgia meets synthesis

"If it sounds right, it is right."`,
  },
];

export default function Help() {
  const [selectedTopic, setSelectedTopic] = useState(0);

  return (
    <div className="plugin-bg" style={{ display: 'flex', height: '100%' }}>
      {/* Topics list */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: '1px solid var(--px-border)',
        overflowY: 'auto', padding: 4,
      }}>
        <div style={{ fontSize: 9, color: 'var(--px-text-dim)', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Contents
        </div>
        {TOPICS.map((topic, i) => (
          <div
            key={i}
            onClick={() => setSelectedTopic(i)}
            style={{
              padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 2,
              background: selectedTopic === i ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: selectedTopic === i ? 'var(--px-cyan)' : 'var(--px-text)',
              borderLeft: selectedTopic === i ? '2px solid var(--px-cyan)' : '2px solid transparent',
              marginBottom: 1,
            }}
          >
            {topic.title}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        <div style={{
          color: 'var(--px-cyan)', fontFamily: "'VT323', monospace", fontSize: 22,
          marginBottom: 12, borderBottom: '1px solid var(--px-border)', paddingBottom: 8,
        }}>
          {TOPICS[selectedTopic].title}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--px-text)', lineHeight: 1.8,
          fontFamily: "'Share Tech Mono', monospace",
          whiteSpace: 'pre-wrap',
        }}>
          {TOPICS[selectedTopic].content}
        </div>
      </div>
    </div>
  );
}
