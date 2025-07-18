import { useEffect, useRef, useState, useCallback } from 'react';

// WASM types - these will be imported from the CDN-hosted WASM
export interface WasmStage {
  free(): void;
  add_oscillator(sample_rate: number, frequency_hz: number): void;
  tick(current_time: number): number;
  trigger_all(): void;
  trigger_instrument(index: number): void;
  set_instrument_volume(index: number, volume: number): void;
  get_instrument_volume(index: number): number;
  release_instrument(index: number): void;
  release_all(): void;
  set_instrument_adsr(index: number, attack: number, decay: number, sustain: number, release: number): void;
  set_instrument_frequency(index: number, frequency_hz: number): void;
  get_instrument_frequency(index: number): number;
  set_instrument_waveform(index: number, waveform_type: number): void;
  get_instrument_waveform(index: number): number;
  set_instrument_modulator_frequency(index: number, frequency_hz: number): void;
  get_instrument_modulator_frequency(index: number): number;
  set_instrument_enabled(index: number, enabled: boolean): void;
  is_instrument_enabled(index: number): boolean;
  sequencer_play(): void;
  sequencer_play_at_time(time: number): void;
  sequencer_stop(): void;
  sequencer_reset(): void;
  sequencer_clear_all(): void;
  sequencer_set_step(instrument: number, step: number, enabled: boolean): void;
  sequencer_get_step(instrument: number, step: number): boolean;
  sequencer_set_bpm(bpm: number): void;
  sequencer_get_bpm(): number;
  sequencer_get_current_step(): number;
  sequencer_is_playing(): boolean;
  sequencer_set_default_patterns(): void;
  get_kick_frequency(): number;
  get_snare_frequency(): number;
  get_hihat_frequency(): number;
  get_tom_frequency(): number;
  set_kick_config(frequency: number, punch: number, sub: number, click: number, decay: number, pitch_drop: number, volume: number): void;
  set_snare_config(frequency: number, tonal: number, noise: number, crack: number, decay: number, pitch_drop: number, volume: number): void;
  set_hihat_config(frequency: number, resonance: number, brightness: number, decay: number, attack: number, volume: number, is_open: boolean): void;
  set_tom_config(frequency: number, tonal: number, punch: number, decay: number, pitch_drop: number, volume: number): void;
  load_kick_preset(preset_name: string): void;
  load_snare_preset(preset_name: string): void;
  load_hihat_preset(preset_name: string): void;
  load_tom_preset(preset_name: string): void;
  set_saturation(saturation: number): void;
  get_saturation(): number;
  trigger_kick(): void;
  trigger_snare(): void;
  trigger_hihat(): void;
  trigger_tom(): void;
}

export interface WasmKickDrum {
  free(): void;
  new_with_preset(sample_rate: number, preset_name: string): WasmKickDrum;
  trigger(time: number): void;
  release(time: number): void;
  tick(current_time: number): number;
  is_active(): boolean;
  set_volume(volume: number): void;
  set_frequency(frequency: number): void;
  set_decay(decay_time: number): void;
  set_punch(punch_amount: number): void;
  set_sub(sub_amount: number): void;
  set_click(click_amount: number): void;
  set_pitch_drop(pitch_drop: number): void;
  set_config(kick_frequency: number, punch_amount: number, sub_amount: number, click_amount: number, decay_time: number, pitch_drop: number, volume: number): void;
}

export interface WasmHiHat {
  free(): void;
  new_closed(sample_rate: number): WasmHiHat;
  new_open(sample_rate: number): WasmHiHat;
  new_with_preset(sample_rate: number, preset_name: string): WasmHiHat;
  trigger(time: number): void;
  release(time: number): void;
  tick(current_time: number): number;
  is_active(): boolean;
  set_volume(volume: number): void;
  set_frequency(frequency: number): void;
  set_decay(decay_time: number): void;
  set_brightness(brightness: number): void;
  set_resonance(resonance: number): void;
  set_attack(attack_time: number): void;
  set_open(is_open: boolean): void;
  set_config(base_frequency: number, resonance: number, brightness: number, decay_time: number, attack_time: number, volume: number, is_open: boolean): void;
}

export interface WasmSnareDrum {
  free(): void;
  new_with_preset(sample_rate: number, preset_name: string): WasmSnareDrum;
  trigger(time: number): void;
  release(time: number): void;
  tick(current_time: number): number;
  is_active(): boolean;
  set_volume(volume: number): void;
  set_frequency(frequency: number): void;
  set_decay(decay_time: number): void;
  set_tonal(tonal_amount: number): void;
  set_noise(noise_amount: number): void;
  set_crack(crack_amount: number): void;
  set_pitch_drop(pitch_drop: number): void;
  set_config(snare_frequency: number, tonal_amount: number, noise_amount: number, crack_amount: number, decay_time: number, pitch_drop: number, volume: number): void;
}

export interface WasmTomDrum {
  free(): void;
  new_with_preset(sample_rate: number, preset_name: string): WasmTomDrum;
  trigger(time: number): void;
  release(time: number): void;
  tick(current_time: number): number;
  is_active(): boolean;
  set_volume(volume: number): void;
  set_frequency(frequency: number): void;
  set_decay(decay_time: number): void;
  set_tonal(tonal_amount: number): void;
  set_punch(punch_amount: number): void;
  set_pitch_drop(pitch_drop: number): void;
  set_config(tom_frequency: number, tonal_amount: number, punch_amount: number, decay_time: number, pitch_drop: number, volume: number): void;
}

export interface LibGooeyWasm {
  WasmStage: new (sample_rate: number) => WasmStage;
  WasmKickDrum: new (sample_rate: number) => WasmKickDrum;
  WasmHiHat: {
    new (sample_rate: number): WasmHiHat;
    new_closed(sample_rate: number): WasmHiHat;
    new_open(sample_rate: number): WasmHiHat;
    new_with_preset(sample_rate: number, preset_name: string): WasmHiHat;
  };
  WasmSnareDrum: new (sample_rate: number) => WasmSnareDrum;
  WasmTomDrum: new (sample_rate: number) => WasmTomDrum;
  init(): Promise<void>;
}

export interface UseLibGooeyOptions {
  wasmUrl?: string;
  sampleRate?: number;
  autoInit?: boolean;
}

export interface UseLibGooeyReturn {
  // WASM instances
  stage: WasmStage | null;
  kickDrum: WasmKickDrum | null;
  hiHat: WasmHiHat | null;
  snareDrum: WasmSnareDrum | null;
  tomDrum: WasmTomDrum | null;
  
  // Audio context
  audioContext: AudioContext | null;
  
  // State
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  createStage: (sampleRate?: number) => Promise<WasmStage>;
  createKickDrum: (sampleRate?: number) => Promise<WasmKickDrum>;
  createHiHat: (sampleRate?: number) => Promise<WasmHiHat>;
  createSnareDrum: (sampleRate?: number) => Promise<WasmSnareDrum>;
  createTomDrum: (sampleRate?: number) => Promise<WasmTomDrum>;
  
  // Cleanup
  cleanup: () => void;
}

// Default CDN URL - you can change this to your preferred CDN
const DEFAULT_WASM_URL = 'https://cdn.jsdelivr.net/npm/libgooey@latest/wasm/libgooey.js';

// Global WASM module cache
let wasmModule: LibGooeyWasm | null = null;
let wasmPromise: Promise<LibGooeyWasm> | null = null;

async function loadWasmModule(wasmUrl: string): Promise<LibGooeyWasm> {
  if (wasmModule) {
    return wasmModule;
  }
  
  if (wasmPromise) {
    return wasmPromise;
  }
  
  wasmPromise = (async () => {
    try {
      // Dynamic import of the WASM module from CDN
      const module = await import(/* webpackIgnore: true */ wasmUrl);
      await module.default();
      wasmModule = module as LibGooeyWasm;
      return wasmModule;
    } catch (error) {
      console.error('Failed to load LibGooey WASM module:', error);
      throw error;
    }
  })();
  
  return wasmPromise;
}

export function useLibGooey(options: UseLibGooeyOptions = {}): UseLibGooeyReturn {
  const {
    wasmUrl = DEFAULT_WASM_URL,
    sampleRate = 44100,
    autoInit = true
  } = options;
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const stageRef = useRef<WasmStage | null>(null);
  const kickDrumRef = useRef<WasmKickDrum | null>(null);
  const hiHatRef = useRef<WasmHiHat | null>(null);
  const snareDrumRef = useRef<WasmSnareDrum | null>(null);
  const tomDrumRef = useRef<WasmTomDrum | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const initialize = useCallback(async () => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load WASM module
      const wasm = await loadWasmModule(wasmUrl);
      
      // Initialize audio context
      audioContextRef.current = new AudioContext();
      
      // Create stage
      stageRef.current = new wasm.WasmStage(sampleRate);
      
      // Create individual instruments
      kickDrumRef.current = new wasm.WasmKickDrum(sampleRate);
      hiHatRef.current = wasm.WasmHiHat.new_with_preset(sampleRate, 'closed_default');
      snareDrumRef.current = new wasm.WasmSnareDrum(sampleRate);
      tomDrumRef.current = new wasm.WasmTomDrum(sampleRate);
      
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize LibGooey');
    } finally {
      setIsLoading(false);
    }
  }, [wasmUrl, sampleRate, isLoaded, isLoading]);
  
  const createStage = useCallback(async (customSampleRate?: number) => {
    const wasm = await loadWasmModule(wasmUrl);
    return new wasm.WasmStage(customSampleRate || sampleRate);
  }, [wasmUrl, sampleRate]);
  
  const createKickDrum = useCallback(async (customSampleRate?: number) => {
    const wasm = await loadWasmModule(wasmUrl);
    return new wasm.WasmKickDrum(customSampleRate || sampleRate);
  }, [wasmUrl, sampleRate]);
  
  const createHiHat = useCallback(async (customSampleRate?: number) => {
    const wasm = await loadWasmModule(wasmUrl);
    return wasm.WasmHiHat.new_with_preset(customSampleRate || sampleRate, 'closed_default');
  }, [wasmUrl, sampleRate]);
  
  const createSnareDrum = useCallback(async (customSampleRate?: number) => {
    const wasm = await loadWasmModule(wasmUrl);
    return new wasm.WasmSnareDrum(customSampleRate || sampleRate);
  }, [wasmUrl, sampleRate]);
  
  const createTomDrum = useCallback(async (customSampleRate?: number) => {
    const wasm = await loadWasmModule(wasmUrl);
    return new wasm.WasmTomDrum(customSampleRate || sampleRate);
  }, [wasmUrl, sampleRate]);
  
  const cleanup = useCallback(() => {
    // Free WASM instances
    stageRef.current?.free();
    kickDrumRef.current?.free();
    hiHatRef.current?.free();
    snareDrumRef.current?.free();
    tomDrumRef.current?.free();
    
    // Close audio context
    audioContextRef.current?.close();
    
    // Reset refs
    stageRef.current = null;
    kickDrumRef.current = null;
    hiHatRef.current = null;
    snareDrumRef.current = null;
    tomDrumRef.current = null;
    audioContextRef.current = null;
    
    setIsLoaded(false);
    setError(null);
  }, []);
  
  // Auto-initialize if requested
  useEffect(() => {
    if (autoInit && !isLoaded && !isLoading) {
      initialize();
    }
  }, [autoInit, isLoaded, isLoading, initialize]);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    // WASM instances
    stage: stageRef.current,
    kickDrum: kickDrumRef.current,
    hiHat: hiHatRef.current,
    snareDrum: snareDrumRef.current,
    tomDrum: tomDrumRef.current,
    
    // Audio context
    audioContext: audioContextRef.current,
    
    // State
    isLoaded,
    isLoading,
    error,
    
    // Actions
    initialize,
    createStage,
    createKickDrum,
    createHiHat,
    createSnareDrum,
    createTomDrum,
    
    // Cleanup
    cleanup
  };
} 