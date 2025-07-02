'use client';

import React, { useRef, useState } from 'react';
import init, { WasmStage, WasmKickDrum, WasmHiHat } from '../public/wasm/oscillator.js';

export default function WasmTest() {
  const stageRef = useRef<WasmStage | null>(null);
  const kickDrumRef = useRef<WasmKickDrum | null>(null);
  const hihatRef = useRef<WasmHiHat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const kickAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const hihatAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumes, setVolumes] = useState([1.0, 1.0, 1.0, 1.0]); // Volume for each instrument
  const [frequencies, setFrequencies] = useState([200, 300, 440, 600]); // Frequency for each instrument
  const [modulatorFrequencies, setModulatorFrequencies] = useState([100, 150, 220, 300]); // Modulator frequency for each instrument (for ring modulation)
  const [waveforms, setWaveforms] = useState([1, 1, 1, 1]); // Waveform for each instrument (0=Sine, 1=Square, 2=Saw, 3=Triangle, 4=RingMod, 5=Noise)
  const [enabled, setEnabled] = useState([true, true, true, true]); // Enabled state for each instrument
  const [adsrValues, setAdsrValues] = useState([
    { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }, // Bass Drum
    { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 }, // Snare
    { attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.05 }, // Hi-hat
    { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.5 }, // Cymbal
  ]);

  // Kick drum specific state
  const [kickPreset, setKickPreset] = useState('default');
  const [kickConfig, setKickConfig] = useState({
    frequency: 50.0,
    punch: 0.7,
    sub: 0.8,
    click: 0.3,
    decay: 0.8,
    pitchDrop: 0.6,
    volume: 0.8,
  });

  // Hi-hat specific state
  const [hihatPreset, setHihatPreset] = useState('closed_default');
  const [hihatConfig, setHihatConfig] = useState({
    baseFrequency: 8000.0,
    resonance: 0.7,
    brightness: 0.6,
    decayTime: 0.1,
    attackTime: 0.001,
    volume: 0.8,
    isOpen: false,
  });
  
  // Sequencer state
  const [sequencerSteps, setSequencerSteps] = useState<boolean[][]>(
    Array(4).fill(null).map(() => Array(16).fill(false))
  );
  const [isSequencerPlaying, setIsSequencerPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function loadWasm() {
    setIsLoading(true);
    try {
      // Initialize the WASM module
      await init();
      
      // Create stage instance with 44100 sample rate
      stageRef.current = new WasmStage(44100);
      
      // Add multiple oscillators with different frequencies
      stageRef.current.add_oscillator(44100, 200); // Bass drum
      stageRef.current.add_oscillator(44100, 300); // Snare
      stageRef.current.add_oscillator(44100, 440); // Hi-hat
      stageRef.current.add_oscillator(44100, 600); // Cymbal
      
      // Initialize ADSR settings for each instrument
      adsrValues.forEach((adsr, index) => {
        stageRef.current?.set_instrument_adsr(index, adsr.attack, adsr.decay, adsr.sustain, adsr.release);
      });
      
      // Initialize modulator frequencies for each instrument
      modulatorFrequencies.forEach((freq, index) => {
        stageRef.current?.set_instrument_modulator_frequency(index, freq);
      });
      
      // Create kick drum instance
      kickDrumRef.current = new WasmKickDrum(44100);
      
      // Create hi-hat instance
      hihatRef.current = WasmHiHat.new_with_preset(44100, 'closed_default');
      
      // Initialize Web Audio API
      audioContextRef.current = new AudioContext();
      
      setIsLoaded(true);
      console.log('WASM Stage with 4 oscillators, kick drum, hi-hat, sequencer, and Web Audio loaded successfully!');
    } catch (error) {
      console.error('Failed to load WASM:', error);
      alert('Failed to load WASM module: ' + String(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function startAudio() {
    if (!audioContextRef.current || !stageRef.current) {
      alert('WASM not loaded yet. Click "Load WASM" first.');
      return;
    }

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      setIsPlaying(true);
      console.log('Audio started!');
    } catch (error) {
      console.error('Failed to start audio:', error);
      alert('Failed to start audio');
    }
  }

  function stopAudio() {
    setIsPlaying(false);
    console.log('Audio stopped!');
  }

  function triggerAll() {
    if (!audioContextRef.current || !stageRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Trigger all instruments in the stage
      const currentTime = audioContextRef.current.currentTime;
      stageRef.current.trigger_all(currentTime);
      
      // Generate audio buffer (1 second of audio)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(1, bufferLength, sampleRate);
      
      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + (i / sampleRate);
        channelData[i] = stageRef.current.tick(time);
      }
      
      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      console.log('All instruments triggered!');
    } catch (error) {
      console.error('Failed to trigger instruments:', error);
      alert('Failed to trigger instruments');
    }
  }

  function triggerInstrument(index: number, name: string) {
    if (!audioContextRef.current || !stageRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Trigger specific instrument in the stage
      const currentTime = audioContextRef.current.currentTime;
      stageRef.current.trigger_instrument(index, currentTime);
      
      // Generate audio buffer (1 second of audio)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(1, bufferLength, sampleRate);
      
      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + (i / sampleRate);
        channelData[i] = stageRef.current.tick(time);
      }
      
      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      console.log(`${name} triggered!`);
    } catch (error) {
      console.error(`Failed to trigger ${name}:`, error);
      alert(`Failed to trigger ${name}`);
    }
  }

  function handleVolumeChange(index: number, volume: number) {
    if (!stageRef.current) return;
    
    // Update the WASM stage
    stageRef.current.set_instrument_volume(index, volume);
    
    // Update local state for UI
    setVolumes(prev => {
      const newVolumes = [...prev];
      newVolumes[index] = volume;
      return newVolumes;
    });
  }

  function handleFrequencyChange(index: number, frequency: number) {
    if (!stageRef.current) return;
    
    // Update the WASM stage
    stageRef.current.set_instrument_frequency(index, frequency);
    
    // Update local state for UI
    setFrequencies(prev => {
      const newFrequencies = [...prev];
      newFrequencies[index] = frequency;
      return newFrequencies;
    });
  }

  function handleModulatorFrequencyChange(index: number, frequency: number) {
    if (!stageRef.current) return;
    
    // Update the WASM stage
    stageRef.current.set_instrument_modulator_frequency(index, frequency);
    
    // Update local state for UI
    setModulatorFrequencies(prev => {
      const newFrequencies = [...prev];
      newFrequencies[index] = frequency;
      return newFrequencies;
    });
  }

  function handleWaveformChange(index: number, waveformType: number) {
    if (!stageRef.current) return;
    
    // Update the WASM stage
    stageRef.current.set_instrument_waveform(index, waveformType);
    
    // Update local state for UI
    setWaveforms(prev => {
      const newWaveforms = [...prev];
      newWaveforms[index] = waveformType;
      return newWaveforms;
    });
  }

  function handleEnabledChange(index: number, isEnabled: boolean) {
    if (!stageRef.current) return;
    
    // Update the WASM stage
    stageRef.current.set_instrument_enabled(index, isEnabled);
    
    // Update local state for UI
    setEnabled(prev => {
      const newEnabled = [...prev];
      newEnabled[index] = isEnabled;
      return newEnabled;
    });
  }

  function handleAdsrChange(index: number, param: 'attack' | 'decay' | 'sustain' | 'release', value: number) {
    if (!stageRef.current) return;
    
    // Update local state for UI
    setAdsrValues(prev => {
      const newAdsrValues = [...prev];
      newAdsrValues[index] = { ...newAdsrValues[index], [param]: value };
      
      // Update the WASM stage with new ADSR values
      const adsr = newAdsrValues[index];
      if (stageRef.current) {
        stageRef.current.set_instrument_adsr(index, adsr.attack, adsr.decay, adsr.sustain, adsr.release);
      }
      
      return newAdsrValues;
    });
  }

  function releaseInstrument(index: number, name: string) {
    if (!audioContextRef.current || !stageRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      stageRef.current.release_instrument(index, currentTime);
      console.log(`${name} released!`);
    } catch (error) {
      console.error(`Failed to release ${name}:`, error);
      alert(`Failed to release ${name}`);
    }
  }

  function releaseAll() {
    if (!audioContextRef.current || !stageRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      stageRef.current.release_all(currentTime);
      console.log('All instruments released!');
    } catch (error) {
      console.error('Failed to release all instruments:', error);
      alert('Failed to release all instruments');
    }
  }

  // Sequencer functions
  function toggleSequencerStep(instrumentIndex: number, stepIndex: number) {
    if (!stageRef.current) return;
    
    const newValue = !sequencerSteps[instrumentIndex][stepIndex];
    
    // Update WASM sequencer
    stageRef.current.sequencer_set_step(instrumentIndex, stepIndex, newValue);
    
    // Update local state
    setSequencerSteps(prev => {
      const newSteps = prev.map(row => [...row]);
      newSteps[instrumentIndex][stepIndex] = newValue;
      return newSteps;
    });
  }

  function startSequencer() {
    if (!audioContextRef.current || !stageRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      stageRef.current.sequencer_start(currentTime);
      setIsSequencerPlaying(true);
      
      // Start UI update interval to track current step
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (stageRef.current) {
          setCurrentStep(stageRef.current.sequencer_get_current_step());
        }
      }, 50); // Update every 50ms for smooth UI
      
      console.log('Sequencer started!');
    } catch (error) {
      console.error('Failed to start sequencer:', error);
      alert('Failed to start sequencer');
    }
  }

  function stopSequencer() {
    if (!stageRef.current) return;

    try {
      stageRef.current.sequencer_stop();
      setIsSequencerPlaying(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      console.log('Sequencer stopped!');
    } catch (error) {
      console.error('Failed to stop sequencer:', error);
      alert('Failed to stop sequencer');
    }
  }

  function resetSequencer() {
    if (!audioContextRef.current || !stageRef.current) return;

    try {
      const currentTime = audioContextRef.current.currentTime;
      stageRef.current.sequencer_reset(currentTime);
      setCurrentStep(0);
      console.log('Sequencer reset!');
    } catch (error) {
      console.error('Failed to reset sequencer:', error);
      alert('Failed to reset sequencer');
    }
  }

  function clearAllSteps() {
    if (!stageRef.current) return;

    // Clear all steps in WASM
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 16; j++) {
        stageRef.current.sequencer_set_step(i, j, false);
      }
    }

    // Clear local state
    setSequencerSteps(Array(4).fill(null).map(() => Array(16).fill(false)));
    console.log('All sequencer steps cleared!');
  }

  function handleBpmChange(newBpm: number) {
    if (!stageRef.current) return;
    
    stageRef.current.sequencer_set_bpm(newBpm);
    setBpm(newBpm);
  }

  // Kick drum functions
  function triggerKickDrum() {
    if (!audioContextRef.current || !kickDrumRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      kickDrumRef.current.trigger(currentTime);
      
      // Generate audio buffer for kick drum
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(1, bufferLength, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + (i / sampleRate);
        channelData[i] = kickDrumRef.current.tick(time);
      }
      
      // Stop previous kick audio source if playing
      if (kickAudioSourceRef.current) {
        kickAudioSourceRef.current.stop();
      }
      
      // Create and start new audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      kickAudioSourceRef.current = source;
      
      console.log('Kick drum triggered!');
    } catch (error) {
      console.error('Failed to trigger kick drum:', error);
      alert('Failed to trigger kick drum');
    }
  }

  // Hi-hat functions
  function triggerHiHat() {
    if (!audioContextRef.current || !hihatRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      hihatRef.current.trigger(currentTime);
      
      // Generate audio buffer for hi-hat
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(1, bufferLength, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + (i / sampleRate);
        channelData[i] = hihatRef.current.tick(time);
      }
      
      // Stop previous hi-hat audio source if playing
      if (hihatAudioSourceRef.current) {
        hihatAudioSourceRef.current.stop();
      }
      
      // Create and start new audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      hihatAudioSourceRef.current = source;
      
      console.log('Hi-hat triggered!');
    } catch (error) {
      console.error('Failed to trigger hi-hat:', error);
      alert('Failed to trigger hi-hat');
    }
  }

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WASM Audio Engine Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={loadWasm}
          disabled={isLoading || isLoaded}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : isLoaded ? 'Audio Engine Loaded (Stage + Kick + Hi-Hat + Sequencer)' : 'Load Audio Engine'}
        </button>
        
        <button
          onClick={isPlaying ? stopAudio : startAudio}
          disabled={!isLoaded}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPlaying ? 'Stop Audio' : 'Start Audio'}
        </button>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4 text-center">16-Step Sequencer (120 BPM)</h3>
          
          {/* Sequencer Transport Controls */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={isSequencerPlaying ? stopSequencer : startSequencer}
              disabled={!isLoaded || !isPlaying}
              className={`px-4 py-2 rounded font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed ${
                isSequencerPlaying 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isSequencerPlaying ? '⏹️ Stop' : '▶️ Play'} Sequencer
            </button>
            
            <button
              onClick={resetSequencer}
              disabled={!isLoaded}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ⏮️ Reset
            </button>
            
            <button
              onClick={clearAllSteps}
              disabled={!isLoaded}
              className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🧹 Clear
            </button>
          </div>

          {/* BPM Control */}
          <div className="flex items-center space-x-2 mb-4">
            <label className="font-medium text-sm">BPM:</label>
            <input
              type="range"
              min="60"
              max="180"
              step="1"
              value={bpm}
              onChange={(e) => handleBpmChange(parseInt(e.target.value))}
              disabled={!isLoaded}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="font-mono text-sm w-10 text-right">{bpm}</span>
          </div>

          {/* Step Grid */}
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">Step:</div>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 16 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-6 w-6 rounded text-xs flex items-center justify-center font-mono ${
                      currentStep === i && isSequencerPlaying
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Instrument Step Grid */}
            {[
              { name: '🥁 Bass', color: 'red', index: 0 },
              { name: '🥁 Snare', color: 'orange', index: 1 },
              { name: '🔔 Hi-hat', color: 'yellow', index: 2 },
              { name: '🥽 Cymbal', color: 'cyan', index: 3 }
            ].map((instrument) => (
              <div key={instrument.index} className="mb-2">
                <div className="text-xs text-gray-400 mb-1">{instrument.name}:</div>
                <div className="flex gap-1">
                  {Array.from({ length: 16 }, (_, stepIndex) => (
                    <button
                      key={stepIndex}
                      onClick={() => toggleSequencerStep(instrument.index, stepIndex)}
                      disabled={!isLoaded}
                      className={`h-6 w-6 rounded border border-gray-600 disabled:cursor-not-allowed ${
                        sequencerSteps[instrument.index][stepIndex]
                          ? (instrument.color === 'red' ? 'bg-red-500 hover:bg-red-600' :
                             instrument.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                             instrument.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                             'bg-cyan-500 hover:bg-cyan-600')
                          : 'bg-gray-700 hover:bg-gray-600'
                      } ${
                        currentStep === stepIndex && isSequencerPlaying
                          ? 'ring-2 ring-yellow-400'
                          : ''
                      }`}
                    >
                      {sequencerSteps[instrument.index][stepIndex] ? '●' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3 text-center">Specialized Drum Instruments</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={triggerKickDrum}
              disabled={!isLoaded || !isPlaying}
              className="px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              🥁 Kick Drum
            </button>
            
            <button
              onClick={triggerHiHat}
              disabled={!isLoaded || !isPlaying}
              className="px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              🔔 Hi-Hat
            </button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3 text-center">Manual Stage Instrument Controls</h3>
          
          <button
            onClick={triggerAll}
            disabled={!isLoaded || !isPlaying}
            className="w-full px-4 py-2 mb-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            🥁 Trigger All Stage Instruments
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => triggerInstrument(0, 'Bass Drum')}
              disabled={!isLoaded || !isPlaying}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              🥁 Bass (200Hz)
            </button>
            
            <button
              onClick={() => triggerInstrument(1, 'Snare')}
              disabled={!isLoaded || !isPlaying}
              className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              🥁 Snare (300Hz)
            </button>
            
            <button
              onClick={() => triggerInstrument(2, 'Hi-hat')}
              disabled={!isLoaded || !isPlaying}
              className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              🔔 Hi-hat (440Hz)
            </button>
            
            <button
              onClick={() => triggerInstrument(3, 'Cymbal')}
              disabled={!isLoaded || !isPlaying}
              className="px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              🥽 Cymbal (600Hz)
            </button>
          </div>
          
          <div className="mt-6">
            <h4 className="font-semibold mb-3 text-center">Stage Instrument Controls</h4>
            <div className="space-y-4">
              {[
                { name: '🥁 Bass Drum', color: 'red' },
                { name: '🥁 Snare', color: 'orange' },
                { name: '🔔 Hi-hat', color: 'yellow' },
                { name: '🥽 Cymbal', color: 'cyan' }
              ].map((instrument, index) => (
                <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">{instrument.name}</h5>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={enabled[index]}
                        onChange={(e) => handleEnabledChange(index, e.target.checked)}
                        disabled={!isLoaded}
                        className="rounded"
                      />
                      <span className="text-xs">Enabled</span>
                    </label>
                  </div>
                  
                  {/* Volume Control */}
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="w-12 text-xs font-medium">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volumes[index]}
                      onChange={(e) => handleVolumeChange(index, parseFloat(e.target.value))}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-10 text-xs font-mono text-right">
                      {volumes[index].toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Frequency Control */}
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="w-12 text-xs font-medium">Freq</label>
                    <input
                      type="range"
                      min="50"
                      max="2000"
                      step="10"
                      value={frequencies[index]}
                      onChange={(e) => handleFrequencyChange(index, parseInt(e.target.value))}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-16 text-xs font-mono text-right">
                      {frequencies[index]}Hz
                    </span>
                  </div>

                  {/* Modulator Frequency Control */}
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="w-12 text-xs font-medium">Mod</label>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="5"
                      value={modulatorFrequencies[index]}
                      onChange={(e) => handleModulatorFrequencyChange(index, parseInt(e.target.value))}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-16 text-xs font-mono text-right">
                      {modulatorFrequencies[index]}Hz
                    </span>
                  </div>
                  
                  {/* Waveform Control */}
                  <div className="flex items-center space-x-2 mb-3">
                    <label className="w-12 text-xs font-medium">Wave</label>
                    <select
                      value={waveforms[index]}
                      onChange={(e) => handleWaveformChange(index, parseInt(e.target.value))}
                      disabled={!isLoaded}
                      className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
                    >
                      <option value={0}>Sine</option>
                      <option value={1}>Square</option>
                      <option value={2}>Saw</option>
                      <option value={3}>Triangle</option>
                      <option value={4}>Ring Mod</option>
                      <option value={5}>Noise</option>
                    </select>
                  </div>
                  
                  {/* ADSR Controls */}
                  <div className="border-t border-gray-600 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-300">ADSR Envelope</label>
                      <button
                        onClick={() => releaseInstrument(index, instrument.name.split(' ')[1] || instrument.name)}
                        disabled={!isLoaded || !isPlaying}
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                      >
                        Release
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Attack</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0.001"
                            max="2"
                            step="0.001"
                            value={adsrValues[index].attack}
                            onChange={(e) => handleAdsrChange(index, 'attack', parseFloat(e.target.value))}
                            disabled={!isLoaded}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="w-12 text-xs font-mono text-right">
                            {adsrValues[index].attack.toFixed(3)}s
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Decay</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0.001"
                            max="2"
                            step="0.001"
                            value={adsrValues[index].decay}
                            onChange={(e) => handleAdsrChange(index, 'decay', parseFloat(e.target.value))}
                            disabled={!isLoaded}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="w-12 text-xs font-mono text-right">
                            {adsrValues[index].decay.toFixed(3)}s
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Sustain</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={adsrValues[index].sustain}
                            onChange={(e) => handleAdsrChange(index, 'sustain', parseFloat(e.target.value))}
                            disabled={!isLoaded}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="w-12 text-xs font-mono text-right">
                            {adsrValues[index].sustain.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Release</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0.001"
                            max="5"
                            step="0.001"
                            value={adsrValues[index].release}
                            onChange={(e) => handleAdsrChange(index, 'release', parseFloat(e.target.value))}
                            disabled={!isLoaded}
                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="w-12 text-xs font-mono text-right">
                            {adsrValues[index].release.toFixed(3)}s
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={releaseAll}
            disabled={!isLoaded || !isPlaying}
            className="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Release All Stage Instruments
          </button>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h2 className="font-semibold mb-2">Status:</h2>
        <p>WASM Stage: {isLoaded ? '✅ Loaded (4 oscillators)' : '❌ Not loaded'}</p>
        <p>Kick Drum: {kickDrumRef.current ? '✅ Ready' : '❌ No'}</p>
        <p>Hi-Hat: {hihatRef.current ? '✅ Ready' : '❌ No'}</p>
        <p>Audio Context: {audioContextRef.current ? '✅ Ready' : '❌ No'}</p>
        <p>Audio Playing: {isPlaying ? '✅ Yes' : '❌ No'}</p>
        <p>Sequencer: {isSequencerPlaying ? `✅ Playing (Step ${currentStep + 1}/16, ${bpm} BPM)` : '⏸️ Stopped'}</p>
      </div>
      
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded">
        <h3 className="font-semibold mb-2 text-blue-300">Audio Engine Features:</h3>
        <ul className="text-sm space-y-1 text-blue-100">
          <li>• <strong>16-Step Sequencer</strong>: Automatic timing and triggering at 120 BPM (adjustable 60-180)</li>
          <li>• <strong>Multi-instrument Stage</strong>: 4 oscillators with independent controls</li>
          <li>• <strong>Specialized Drums</strong>: Dedicated kick drum and hi-hat with realistic synthesis</li>
          <li>• <strong>Advanced Waveforms</strong>: Sine, Square, Saw, Triangle, Ring Modulation, Noise</li>
          <li>• <strong>Real-time Control</strong>: Live pattern editing, volume, frequency, modulation</li>
          <li>• <strong>ADSR Envelopes</strong>: Full Attack, Decay, Sustain, Release control per instrument</li>
          <li>• <strong>Audio Mixing</strong>: All components mixed with limiter to prevent clipping</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
        <h3 className="font-semibold mb-2 text-yellow-300">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-yellow-100">
          <li>Click "Load Audio Engine" to initialize all components</li>
          <li>Click "Start Audio" to begin audio processing</li>
          <li><strong>Using the Sequencer:</strong> Program patterns in the 16-step grid for Stage instruments</li>
          <li><strong>Specialized Drums:</strong> Use the dedicated Kick Drum and Hi-Hat buttons for realistic percussion</li>
          <li><strong>Stage Instruments:</strong> Control 4 versatile oscillators with full parameter access</li>
          <li>Adjust BPM, volumes, frequencies, waveforms, and ADSR envelopes in real-time</li>
          <li>Enable/disable instruments and use Ring Modulation with adjustable modulator frequencies</li>
        </ol>
      </div>
    </div>
  );
}