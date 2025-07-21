"use client";

import { useRef, useCallback, useEffect } from 'react';

interface KickConfig {
  kickFrequency: number;     // Base frequency (40-80Hz typical)
  punchAmount: number;       // Mid-frequency presence (0.0-1.0)
  subAmount: number;         // Sub-bass presence (0.0-1.0)
  clickAmount: number;       // High-frequency click (0.0-1.0)
  decayTime: number;         // Overall decay length in seconds
  pitchDrop: number;         // Frequency sweep amount (0.0-1.0)
  volume: number;            // Overall volume (0.0-1.0)
}

const DEFAULT_CONFIG: KickConfig = {
  kickFrequency: 60.0,
  punchAmount: 0.80,
  subAmount: 0.80,
  clickAmount: 0.20,
  decayTime: 0.28,
  pitchDrop: 0.20,
  volume: 0.80
};

export function useWebAudioKick(config: KickConfig = DEFAULT_CONFIG) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
      }
    }
  }, []);

  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) return false;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    isInitialized.current = true;
    return true;
  }, []);

  const triggerKick = useCallback(async () => {
    if (!audioContextRef.current || !isInitialized.current) {
      console.warn('Audio context not initialized');
      return;
    }

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Create master gain node
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = config.volume;

    // Calculate pitch envelope parameters
    const pitchStartMultiplier = 1.0 + config.pitchDrop * 2.0;
    
    // Sub oscillator: Deep sine wave
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(config.kickFrequency, now);
    
    // Apply pitch envelope to sub oscillator
    const subFreqEnd = config.kickFrequency;
    const subFreqStart = config.kickFrequency * pitchStartMultiplier;
    subOsc.frequency.setValueAtTime(subFreqStart, now);
    subOsc.frequency.exponentialRampToValueAtTime(subFreqEnd, now + config.decayTime);
    
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.setTargetAtTime(config.subAmount * config.volume, now + 0.001, 0.001);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + config.decayTime);
    
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    
    // Punch oscillator: Triangle wave for mid-range impact  
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    
    const punchFreqStart = config.kickFrequency * 2.5 * pitchStartMultiplier;
    const punchFreqEnd = config.kickFrequency * 2.5;
    punchOsc.frequency.setValueAtTime(punchFreqStart, now);
    punchOsc.frequency.exponentialRampToValueAtTime(punchFreqEnd, now + config.decayTime);
    
    punchGain.gain.setValueAtTime(0, now);
    punchGain.gain.setTargetAtTime(config.punchAmount * config.volume * 0.7, now + 0.001, 0.001);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + config.decayTime);
    
    punchOsc.connect(punchGain);
    punchGain.connect(masterGain);

    // Click oscillator: High-frequency filtered noise transient
    // Create noise buffer
    const bufferSize = ctx.sampleRate * (config.decayTime * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const clickSource = ctx.createBufferSource();
    const clickGain = ctx.createGain();
    const clickFilter = ctx.createBiquadFilter();
    
    clickSource.buffer = noiseBuffer;
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = 8000;
    clickFilter.Q.value = 4.0;
    
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.setTargetAtTime(config.clickAmount * config.volume * 0.3, now + 0.001, 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + config.decayTime * 0.2);
    
    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(masterGain);

    // FM snap for beater sound - simplified version
    const fmCarrier = ctx.createOscillator();
    const fmModulator = ctx.createOscillator();
    const fmModGain = ctx.createGain();
    const fmGain = ctx.createGain();
    
    fmCarrier.type = 'sine';
    fmCarrier.frequency.value = 100;
    fmModulator.type = 'sine';
    fmModulator.frequency.value = 300;
    
    fmModGain.gain.value = 50; // Modulation depth
    fmGain.gain.setValueAtTime(0, now);
    fmGain.gain.setTargetAtTime(0.1 * config.volume, now + 0.001, 0.001);
    fmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    fmModulator.connect(fmModGain);
    fmModGain.connect(fmCarrier.frequency);
    fmCarrier.connect(fmGain);
    fmGain.connect(masterGain);

    // Start and stop all oscillators
    const stopTime = now + Math.max(config.decayTime, 0.5);
    
    subOsc.start(now);
    subOsc.stop(stopTime);
    
    punchOsc.start(now);
    punchOsc.stop(stopTime);
    
    clickSource.start(now);
    
    fmCarrier.start(now);
    fmCarrier.stop(now + 0.1);
    fmModulator.start(now);
    fmModulator.stop(now + 0.1);

  }, [config]);

  return {
    triggerKick,
    initializeAudio,
    isAudioSupported: typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)
  };
}

export default function WebAudioKickTest() {
  const { triggerKick, initializeAudio, isAudioSupported } = useWebAudioKick();

  const handleInitialize = async () => {
    const success = await initializeAudio();
    if (success) {
      console.log('WebAudio initialized successfully');
    } else {
      console.error('Failed to initialize WebAudio');
    }
  };

  const handleTriggerKick = async () => {
    await triggerKick();
    console.log('WebAudio kick triggered!');
  };

  if (!isAudioSupported) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">WebAudio Not Supported</h3>
        <p>Your browser does not support WebAudio API</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-green-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">WebAudio Kick Drum</h3>
      <div className="space-y-3">
        <button
          onClick={handleInitialize}
          className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Initialize WebAudio
        </button>
        <button
          onClick={handleTriggerKick}
          className="w-full px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          🥁 Trigger WebAudio Kick
        </button>
      </div>
    </div>
  );
}