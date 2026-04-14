import { useState } from 'react';

const TOPICS = [
  {
    title: '🎵 Getting Started',
    content: `Welcome to MusicOS 98 — the world's only operating system built entirely for music production.

To get started:
1. Press SPACE to start/stop playback
2. Double-click desktop icons to open apps
3. The Beat Machine has a default pattern pre-loaded
4. Open the SynthStation and play notes with your keyboard

Keyboard shortcuts:
• SPACE — Play / Stop
• A W S E D F T G Y H U J K O L P — Piano keyboard (SynthStation focus)
• Z / X — Octave down / up

All apps use real Web Audio API synthesis — no samples faked.`,
  },
  {
    title: '🥁 Beat Machine',
    content: `A 16-step drum sequencer with 8 channels of synthetic percussion.

Controls:
• Click any lit step button to toggle it on/off
• Click a channel name to preview that drum sound
• Volume knob on each channel controls level
• BPM and Swing knobs at the top — drag to adjust
• Bank A / B buttons switch between two pattern banks

Drum synthesis:
• Kick: oscillator with exponential pitch/amp decay
• Snare: noise burst + tuned oscillator body
• Hi-hat: filtered white noise (short decay)
• Open Hat: filtered white noise (long decay)
• Clap: multi-layered noise bursts
• Toms: pitch-decaying sine waves

Step indicator at the bottom of each column shows the
current playback position in real time.`,
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

Key highlights follow the actual transposed pitch on the keyboard.
The dot-matrix visualizer shows energy at the note's frequency column.

Tips:
• High resonance + filter envelope = classic synth sweeps
• LFO on filter = autowah / wah-wah effect
• OSC 2 detune + mix = chorus/fat sound`,
  },
  {
    title: '🎼 Piano Roll',
    content: `Draw melodic sequences for the SynthStation.

Tools:
• Draw (pencil): click to place notes
• Erase: click existing notes to remove

Toolbar options:
• SNAP — quantize placement (1/32 to 1/4 beat)
• DUR — note duration (1/32 to 1/2)
• BARS — loop length (1, 2, 4, 8, or 16 bars)
• Zoom slider — horizontal zoom
• Enabled/Disabled — toggle piano roll playback

The piano roll plays back through the SynthStation (channel 1).
Click piano keys on the left to audition pitches.
Playhead shows position during transport playback.`,
  },
  {
    title: '🎛️ FX Rack',
    content: `Six professional effects on the global FX bus.

DELAY — Tape echo
• Time, Feedback, Wet/Dry

REVERB — Convolution reverb
• Decay, Wet/Dry
• Presets: Room, Hall, Plate, Cave, Chamber

DISTORTION — Waveshaper
• Drive amount
• Presets: Soft Clip, Hard Clip, Fuzz, Overdrive

FILTER — State-variable filter
• LP, HP, BP, Notch, Peak modes
• Frequency and Q (resonance)

CHORUS — Modulated delay
• Rate, Depth, Wet/Dry

BITCRUSHER — Lo-fi crunch
• Bit depth reduction

All effects have individual Enable buttons and wet/dry control.
The FX bus is channel 6 in the Mixer (muting it bypasses all FX).`,
  },
  {
    title: '🎚️ Mixer',
    content: `8-channel mixer with real-time VU metering and FX sends.

Channel strips:
• VU meters — 16-segment stereo, peak hold, post-fader
• Fader — drag up/down to set volume
• Pan knob — double-click to reset to center
• FX Send knob — how much of this channel goes to the FX bus
• M — Mute channel
• S — Solo channel

Channel routing:
• Ch 0 — Drums (Beat Machine)
• Ch 1 — Synth (SynthStation + Piano Roll)
• Ch 2 — Pads (Pad Machine)
• Ch 3 — Keys (spare bus)
• Ch 4 — Aux (spare bus)
• Ch 5 — FX Bus (mute = bypass all effects)
• Ch 6 — Master output

FX Send: each channel has a send knob that routes a portion
of its signal through the FX Rack chain. Turn up to add
reverb/delay/etc. to individual channels independently.

Header shows a stereo output meter for the full mix.`,
  },
  {
    title: '🎛️ Pad Machine',
    content: `16-pad sample launcher in a 4×4 grid.

Loading samples:
1. Click a pad to select it (highlighted border)
2. Browse the sample library on the right sidebar
3. Click any sample name to assign it to the selected pad
4. Click "+ Upload" to load your own audio files (WAV, MP3, OGG, etc.)
   — uploaded files appear at the top of the sidebar under "My Uploads"

Pad modes (toggle with the mode button in the controls bar):
• ONESHOT — plays the sample once on click (good for drums, hits)
• HOLD — toggles looping on/off (good for loops, ambient pads)
  Click a HOLD pad again to stop it

Active HOLD pads glow with their color and show "● PLAYING".
The "Clear" button removes the sample from the selected pad.`,
  },
  {
    title: '💿 Sampler',
    content: `Load audio files and play/manipulate them.

To load samples:
1. Drag audio files into the drop zone
2. Or click to browse — WAV, MP3, OGG, FLAC supported

Controls:
• START / END — trim the sample playback range
• PITCH — transpose ±24 semitones
• Reverse — play backwards
• Loop — loop the sample
• Play button — audition

Double-click a sample name to play it.`,
  },
  {
    title: '📼 Tape Deck',
    content: `Record the master audio output to a file.

1. Click RECORD to start recording
2. Play music (drums, synth, anything running through master)
3. Click STOP to finish — file downloads automatically

The recording captures the full master mix including FX.
Output format: WebM audio (plays in all modern browsers).
Reels spin visually while recording is active.`,
  },
  {
    title: '🔢 Tempo Calc',
    content: `Calculate BPM and delay times.

Tap Tempo:
• Click TAP TEMPO repeatedly in rhythm
• System averages the tap intervals to detect BPM
• Click Apply to set as the project tempo

Quick presets: 60 → 180 BPM in common increments

Delay time table shows exact millisecond values for all note
divisions (whole, half, quarter, 8th, 16th, triplets) at the
current BPM — useful for dialing in hardware delays or reverb.`,
  },
  {
    title: '📊 Oscilloscope',
    content: `Real-time audio visualization.

Modes:
• SCOPE — time-domain waveform (oscilloscope)
• SPECTRUM — frequency spectrum (bar graph)

Controls:
• Gain — amplify the display signal
• Color — choose waveform display color

Reads from the master analyser node — shows everything
in the final mix in real time at 60fps.`,
  },
  {
    title: '⛷️ SkiFree',
    content: `A remake of the classic Windows 3.x SkiFree game.

Controls:
• Arrow Left / A — turn left
• Arrow Right / D — turn right
• Speed increases the further you ski

Obstacles:
• Trees and rocks — crash into them and you'll wipe out
• Ski lift poles — avoid the base
• Flags — purely decorative, ski through freely

The Yeti:
After 500m a white furry yeti appears and chases you.
It's faster than you and will catch up — it always does.
The game auto-restarts a few seconds after you get eaten.
Click the canvas any time to restart immediately.

High score is saved between sessions.`,
  },
  {
    title: '💽 Disk Defragmenter',
    content: `Simulates a Windows 98-era disk defragmentation.

The block grid shows all 480 disk clusters:
• White — Empty
• Blue — Optimized (contiguous)
• Red — Fragmented
• Cyan — System files (unmovable)
• Green — Currently being read
• Yellow — Currently being written

Phases:
1. Analyzing — scans all clusters, maps fragmentation
2. Defragmenting — moves fragmented blocks to fill gaps,
   consolidating free space to the end of the disk
3. Complete — all movable files are contiguous

Classic behavior:
The defragmenter may restart itself if it detects that
another program has written to the drive. This is accurate
to the original Windows 98 behavior and is deeply annoying.

Drive D: is also available (cosmetically identical to C:).`,
  },
  {
    title: '🐑 ScreenMate',
    content: `A sheep that lives on your desktop.

• Double-click the ScreenMate icon to summon or dismiss the sheep
• The sheep roams freely over everything — windows, taskbar, the works
• It walks, runs, and falls asleep on its own

You can drag the sheep anywhere with your mouse.
Release it mid-air for a satisfying throw — it has physics.

Based on eSheep64 by Adrianotiger (sprite sheet used with thanks).`,
  },
  {
    title: '⌨️ Keyboard Shortcuts',
    content: `Global:
• SPACE — Play / Stop transport

SynthStation (when focused):
• A W S E D F T G Y H U J K O L P — Piano notes
• Z — Octave down
• X — Octave up

Transport bar:
• Click the project name to rename it inline
• Press Enter or click away to confirm
• Press Escape to cancel

Window management:
• Double-click title bar — Maximize / restore
• Drag title bar — Move window
• Drag window edge/corner — Resize
• Click taskbar button — Focus or minimize

Desktop right-click menu:
• Change Wallpaper — cycle through 17 gradient wallpapers
  (dark, mid-tone, light, and vivid — saved between sessions)
• New Project — clear everything and start fresh
• Save Project — download as .mos98 file
• Open Project — load a .mos98 file
• Audio Settings — opens the FX Rack`,
  },
  {
    title: '💾 Projects',
    content: `Save and load your entire project state.

Save:
• Click 💾 Save in the transport bar, or
• Right-click desktop → Save Project
• Downloads a .mos98 file (JSON format)

Load:
• Click 📂 Load in the transport bar, or
• Right-click desktop → Open Project...
• Accepts .mos98 and .json files

What is saved:
• Project name and BPM
• Full drum pattern + swing + channel gains
• All synth parameters (oscillators, filter, envelope, LFO)
• Piano roll notes and loop length
• Mixer channel states
• FX Rack settings

Note: User-uploaded samples in the Pad Machine are not saved
in the project file (audio data is too large). Re-upload them
after loading a project.`,
  },
  {
    title: '🐛 Tips & Easter Eggs',
    content: `Things to try:
• VU meters respond in real time even without transport running
  — just play the synth
• Piano roll note colors: cyan = white key, purple = black key
• The SynthStation dot-matrix visualizer tracks note frequency
• Boot screen has a fake BIOS POST sequence
• Tap the Tempo Calc in rhythm to detect BPM by ear
• The Tape Deck reels spin while recording
• Drum steps glow in their channel's accent color
• Right-click desktop → Change Wallpaper cycles 17 gradients
• Click the project name in the transport bar to rename it
• Throw the sheep by dragging and releasing — it has momentum
• The sheep will fall asleep if left alone long enough

Performance tips:
• FX Rack effects are CPU-intensive — disable unused ones
• Reverb is the most expensive effect — keep wet mix low
• Up to 8 simultaneous synth voices before clipping
• Mute the FX Bus channel in the Mixer to bypass all effects

Credits:
Built with React + Web Audio API + Zustand
eSheep64 sprite by Adrianotiger
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
        width: 190, flexShrink: 0, borderRight: '1px solid var(--px-border)',
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
