# LibGooey React

React hooks for the LibGooey audio engine 

## Installation

```bash
npm install libgooey-react
```

## Quick Start

```tsx
import { useLibGooey } from 'libgooey-react';

function DrumMachine() {
  const { 
    stage, 
    kickDrum, 
    hiHat, 
    snareDrum, 
    tomDrum, 
    isLoaded, 
    isLoading, 
    error 
  } = useLibGooey();

  if (isLoading) return <div>Loading audio engine...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isLoaded) return <div>Not loaded</div>;

  const triggerKick = () => {
    kickDrum?.trigger(0);
  };

  const triggerHiHat = () => {
    hiHat?.trigger(0);
  };

  return (
    <div>
      <button onClick={triggerKick}>Kick</button>
      <button onClick={triggerHiHat}>Hi-Hat</button>
    </div>
  );
}
```

## Advanced Usage

### Custom Configuration

```tsx
const { stage, isLoaded } = useLibGooey({
  wasmUrl: 'https://your-cdn.com/libgooey.js',
  sampleRate: 48000,
  autoInit: false
});

// Manual initialization
useEffect(() => {
  if (!isLoaded) {
    initialize();
  }
}, []);
```

### Individual Instrument Creation

```tsx
const { createKickDrum, createHiHat } = useLibGooey();

useEffect(() => {
  const setupInstruments = async () => {
    const kick = await createKickDrum(44100);
    const hihat = await createHiHat(44100);
    
    // Configure instruments
    kick.set_frequency(60);
    kick.set_decay(0.5);
    
    hihat.set_frequency(8000);
    hihat.set_decay(0.1);
  };
  
  setupInstruments();
}, []);
```

### Stage Management

```tsx
const { stage } = useLibGooey();

useEffect(() => {
  if (stage) {
    // Add oscillators
    stage.add_oscillator(44100, 440); // A4
    stage.add_oscillator(44100, 880); // A5
    
    // Configure ADSR
    stage.set_instrument_adsr(0, 0.01, 0.1, 0.7, 0.3);
    
    // Set waveform
    stage.set_instrument_waveform(0, 1); // Square wave
    
    // Enable sequencer
    stage.sequencer_set_default_patterns();
    stage.sequencer_play();
  }
}, [stage]);
```

## API Reference

### `useLibGooey(options?)`

#### Options

- `wasmUrl?: string` - Custom CDN URL for WASM module (default: jsDelivr)
- `sampleRate?: number` - Audio sample rate (default: 44100)
- `autoInit?: boolean` - Auto-initialize on mount (default: true)

#### Returns

- `stage: WasmStage | null` - Main audio stage
- `kickDrum: WasmKickDrum | null` - Kick drum instance
- `hiHat: WasmHiHat | null` - Hi-hat instance
- `snareDrum: WasmSnareDrum | null` - Snare drum instance
- `tomDrum: WasmTomDrum | null` - Tom drum instance
- `audioContext: AudioContext | null` - Web Audio context
- `isLoaded: boolean` - Whether WASM is loaded
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message if any
- `initialize: () => Promise<void>` - Manual initialization
- `createStage: (sampleRate?) => Promise<WasmStage>` - Create new stage
- `createKickDrum: (sampleRate?) => Promise<WasmKickDrum>` - Create kick drum
- `createHiHat: (sampleRate?) => Promise<WasmHiHat>` - Create hi-hat
- `createSnareDrum: (sampleRate?) => Promise<WasmSnareDrum>` - Create snare
- `createTomDrum: (sampleRate?) => Promise<WasmTomDrum>` - Create tom
- `cleanup: () => void` - Cleanup resources

## CDN Hosting

The library loads WASM from a CDN by default. You can:

1. **Use the default**: `https://cdn.jsdelivr.net/npm/libgooey@latest/wasm/libgooey.js`
2. **Host your own**: Upload WASM files to your preferred CDN
3. **Self-host**: Serve WASM files from your domain

## Browser Support

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 79+

Requires WebAssembly and Web Audio API support.

## License

MIT 