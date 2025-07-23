import { useEffect, useRef, useState, useCallback } from "react";
import { Stage } from "@/src/stage";

export interface UseLibGooeyOptions {
  sampleRate?: number;
  autoInit?: boolean;
}

export interface UseLibGooeyReturn {
  // WASM instances
  // stage: WasmStage | null;
  // kickDrum: WasmKickDrum | null;
  // hiHat: WasmHiHat | null;
  // snareDrum: WasmSnareDrum | null;
  // tomDrum: WasmTomDrum | null;
  // // Audio context
  audioContext: AudioContext | null;
  // // State
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  stage: Stage | null;
  // // Actions
  initialize: () => Promise<void>;
  // createStage: (sampleRate?: number) => Promise<WasmStage>;
  // createKickDrum: (sampleRate?: number) => Promise<WasmKickDrum>;
  // createHiHat: (sampleRate?: number) => Promise<WasmHiHat>;
  // createSnareDrum: (sampleRate?: number) => Promise<WasmSnareDrum>;
  // createTomDrum: (sampleRate?: number) => Promise<WasmTomDrum>;
  // // Cleanup
  // cleanup: () => void;
}

export function useLibGooey(
  options: UseLibGooeyOptions = {}
): UseLibGooeyReturn {
  const { sampleRate = 44100, autoInit = true } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const stageRef = useRef<Stage | null>(null);

  // const kickDrumRef = useRef<WasmKickDrum | null>(null);
  // const hiHatRef = useRef<WasmHiHat | null>(null);
  // const snareDrumRef = useRef<WasmSnareDrum | null>(null);
  // const tomDrumRef = useRef<WasmTomDrum | null>(null);

  const initialize = useCallback(async () => {
    if (isLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);

    const ctx = new AudioContext();

    audioContextRef.current = ctx;
    stageRef.current = new Stage(ctx);

    console.log("context", ctx);

    try {
      console.log("would do init here");
      setIsLoaded(true);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  }, [sampleRate, isLoaded, isLoading]);

  const cleanup = useCallback(() => {
    console.log("do cleanup");
    // Free WASM instances
    // stageRef.current?.free();
    // kickDrumRef.current?.free();
    // hiHatRef.current?.free();
    // snareDrumRef.current?.free();
    // tomDrumRef.current?.free();
    // // Close audio context
    // audioContextRef.current?.close();
    // // Reset refs
    // stageRef.current = null;
    // kickDrumRef.current = null;
    // hiHatRef.current = null;
    // snareDrumRef.current = null;
    // tomDrumRef.current = null;
    // audioContextRef.current = null;
    // setIsLoaded(false);
    // setError(null);
  }, []);

  // Auto-initialize if requested
  // Cleanup on unmount
  useEffect(() => {
    if (autoInit && !isLoaded && !isLoading) {
      initialize();
    }
    return cleanup;
  }, [autoInit, isLoaded, isLoading, initialize]);

  return {
    isLoaded,
    isLoading,
    error,
    initialize,
    audioContext: audioContextRef.current,
    stage: stageRef.current,
  };
}

// // WASM instances
// stage: stageRef.current,
// kickDrum: kickDrumRef.current,
// hiHat: hiHatRef.current,
// snareDrum: snareDrumRef.current,
// tomDrum: tomDrumRef.current,

// // Audio context
// audioContext: audioContextRef.current,

// // State
// isLoaded,
// isLoading,
// error,

// // Actions
// initialize,
// createStage,
// createKickDrum,
// createHiHat,
// createSnareDrum,
// createTomDrum,

// // Cleanup
// cleanup,

// const createStage = useCallback(
//   async (customSampleRate?: number) => {
//     const wasm = await loadWasmModule(wasmUrl);
//     return new wasm.WasmStage(customSampleRate || sampleRate);
//   },
//   [wasmUrl, sampleRate]
// );

// const createKickDrum = useCallback(
//   async (customSampleRate?: number) => {
//     const wasm = await loadWasmModule(wasmUrl);
//     return new wasm.WasmKickDrum(customSampleRate || sampleRate);
//   },
//   [wasmUrl, sampleRate]
// );

// const createHiHat = useCallback(
//   async (customSampleRate?: number) => {
//     const wasm = await loadWasmModule(wasmUrl);
//     return wasm.WasmHiHat.new_with_preset(
//       customSampleRate || sampleRate,
//       "closed_default"
//     );
//   },
//   [wasmUrl, sampleRate]
// );

// const createSnareDrum = useCallback(
//   async (customSampleRate?: number) => {
//     const wasm = await loadWasmModule(wasmUrl);
//     return new wasm.WasmSnareDrum(customSampleRate || sampleRate);
//   },
//   [wasmUrl, sampleRate]
// );

// const createTomDrum = useCallback(
//   async (customSampleRate?: number) => {
//     const wasm = await loadWasmModule(wasmUrl);
//     return new wasm.WasmTomDrum(customSampleRate || sampleRate);
//   },
//   [wasmUrl, sampleRate]
// );
