# Gooey Audio Engine

## Overview

This is a **Rust-based audio engine** primarily designed for embedding into web applications via **WebAssembly (WASM)** and **iOS projects**. The engine provides real-time audio synthesis capabilities with a focus on drum synthesis, sequencing, and audio processing.

## Architecture

The project follows a dual-target architecture:

- **Core Engine**: Written in Rust (`lib/` directory)
- **WASM Bindings**: Exposes engine functionality to JavaScript/Web
- **Debug UI**: Next.js-based web interface for testing and development
- **Native Support**: CPAL integration for standalone operation

## Project Structure

```
├── lib/                          # Main Rust audio engine
│   ├── Cargo.toml               # Rust project configuration
│   └── src/
│       ├── lib.rs               # Main library entry point with WASM bindings
│       ├── audio_state.rs       # Audio state management
│       ├── envelope.rs          # ADSR envelope implementation
│       ├── oscillator.rs        # Core oscillator functionality
│       ├── stage.rs             # Multi-instrument stage management
│       ├── waveform.rs          # Waveform generation (sine, square, saw, triangle, etc.)
│       ├── kick.rs              # Kick drum synthesis
│       ├── snare.rs             # Snare drum synthesis
│       ├── hihat.rs             # Hi-hat synthesis
│       ├── tom.rs               # Tom drum synthesis
│       ├── fm_snap.rs           # FM synthesis effects
│       └── filters/
│           ├── mod.rs           # Filter module exports
│           └── resonant_highpass.rs # High-pass filter implementation
├── debug-ui/                    # Next.js debug interface
│   ├── package.json            # Node.js dependencies
│   ├── app/
│   │   ├── page.tsx            # Main UI page
│   │   ├── wasm-test.tsx       # Primary WASM interface component
│   │   ├── sequencer.tsx       # 16-step sequencer UI
│   │   ├── mixer.tsx           # Volume mixer interface
│   │   ├── spectrum-analyzer.tsx   # Real-time frequency analysis
│   │   └── spectrogram-display.tsx # Time-frequency visualization
│   └── public/wasm/            # Built WASM files (generated)
├── target/                     # Rust build artifacts
├── Dockerfile                  # Container configuration
├── fly.toml                    # Fly.io deployment config
└── README.md                   # Basic project documentation
```

## Core Features

### Audio Synthesis
- **Drum Synthesis**: Dedicated synthesizers for kick, snare, hi-hat, and tom drums
- **Oscillators**: Multiple waveform types (sine, square, saw, triangle, ring modulation, noise)
- **Envelope Control**: ADSR (Attack, Decay, Sustain, Release) parameters
- **FM Synthesis**: Frequency modulation capabilities
- **Filters**: High-pass filtering with resonance control

### Sequencing
- **16-Step Sequencer**: Pattern-based drum sequencing
- **BPM Control**: Adjustable tempo (60-180 BPM)
- **Real-time Playback**: Start/stop/reset functionality
- **Pattern Programming**: Individual step control per instrument

### Audio Processing
- **Saturation**: Analog-style saturation effect
- **Volume Control**: Per-instrument mixing
- **Real-time Analysis**: Spectrum analyzer and spectrogram display

## Debug UI Components

The debug interface provides comprehensive control over the audio engine:

### 1. **Sequencer** (`sequencer.tsx`)
- 16-step pattern grid for 4 drum instruments
- Visual playback indicator with current step highlighting
- Transport controls (play/pause, stop, reset, clear)
- BPM slider control
- Color-coded instrument tracks

### 2. **Mixer** (`mixer.tsx`)
- 4-channel volume faders (kick, snare, hi-hat, tom)
- Visual level indicators with color coding:
  - Green: Safe levels
  - Yellow: Loud levels  
  - Red: Hot levels
- Reset to default levels functionality

### 3. **Spectrum Analyzer** (`spectrum-analyzer.tsx`)
- Real-time frequency analysis (FFT-based)
- Frequency range: 20Hz to Nyquist frequency
- Color-coded intensity display
- Frequency and amplitude scale markings

### 4. **Spectrogram Display** (`spectrogram-display.tsx`)
- Time-frequency representation of audio
- Scrolling waterfall display
- Color-coded intensity mapping
- Fallback manual drawing mode

### 5. **Instrument Controls** (`wasm-test.tsx`)
- Tabbed interface for each drum type
- Per-instrument parameter controls:
  - **Kick**: Frequency, punch, sub, click, decay, pitch drop
  - **Snare**: Frequency, tonal, noise, crack, decay, pitch drop
  - **Hi-hat**: Frequency, resonance, brightness, decay, attack, open/closed
  - **Tom**: Frequency, tonal, punch, decay, pitch drop
- Preset system for quick configuration
- Keyboard shortcuts (A, S, D, F keys)

## WASM Integration

The engine exposes JavaScript-friendly classes via `wasm-bindgen`:

- **WasmStage**: Main audio context and instrument management
- **WasmOscillator**: Individual oscillator control
- **WasmKickDrum**: Kick drum synthesis
- **WasmSnareDrum**: Snare drum synthesis
- **WasmHiHat**: Hi-hat synthesis
- **WasmTomDrum**: Tom drum synthesis

### Key WASM Methods
- `trigger()`: Start instrument playback
- `release()`: Stop instrument playback
- `tick()`: Generate audio samples
- `set_*()`: Parameter control methods
- `sequencer_*()`: Sequencer control methods

## Development Commands

### Rust (Audio Engine)
```bash
cd lib
cargo build --release                    # Build native version
cargo build --target wasm32-unknown-unknown --features web  # Build for WASM
```

### Debug UI
```bash
cd debug-ui
npm install                             # Install dependencies
npm run wasm:build                      # Build WASM and copy to public/
npm run wasm:dev                        # Build WASM and start dev server
npm run dev                             # Start development server
npm run build                           # Build for production
```

### Docker
```bash
docker build -t gooey-audio-engine .   # Build container
docker run -p 3000:3000 gooey-audio-engine  # Run container
```

## iOS Integration

The engine is designed to be embedded in iOS applications through:
- **Static Library**: Built as both `cdylib` and `rlib` crate types
- **C-Compatible API**: Rust functions can be exposed via C FFI
- **Native Audio**: CPAL backend for iOS Core Audio integration

## Performance Considerations

- **Real-time Audio**: Optimized for low-latency audio processing
- **Sample Rate**: Designed for 44.1kHz operation
- **Memory Management**: Efficient buffer management for real-time constraints
- **WASM Optimization**: Release builds with size optimization

## Testing and Debugging

Access the debug interface at: https://engine-sparkling-sea-2896.fly.dev/

The interface provides:
- Real-time audio synthesis testing
- Parameter tweaking and preset management
- Visual feedback through spectrum analysis
- Sequencer pattern programming
- Performance monitoring

## Common Development Tasks

When working with this codebase:

1. **Audio Engine Changes**: Edit Rust files in `lib/src/`, rebuild WASM
2. **UI Modifications**: Edit React components in `debug-ui/app/`
3. **New Instruments**: Add new synthesis modules following existing patterns
4. **Parameter Tuning**: Use the debug UI for real-time parameter adjustment
5. **Performance Testing**: Monitor spectrum analyzer and browser performance tools

## Dependencies

### Rust Dependencies
- `wasm-bindgen`: WASM bindings generation
- `js-sys`: JavaScript API access
- `web-sys`: Web API bindings (AudioContext)
- `cpal`: Cross-platform audio I/O (native)
- `anyhow`: Error handling

### JavaScript Dependencies
- `next`: React framework
- `react`: UI framework
- `spectrogram`: Audio visualization library
- `tailwindcss`: Styling framework
- `typescript`: Type safety

## Notes for Future Development

- The engine uses a tick-based audio processing model
- All audio processing is done in Rust for performance
- The WASM bridge is minimal and focused on control/parameter setting
- The debug UI serves as both a testing tool and reference implementation
- Consider iOS-specific optimizations when targeting mobile platforms
- The sequencer uses performance.now() for timing in web environments