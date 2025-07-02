'use client';

import React, { useRef, useState } from 'react';
import init, { WasmStage, WasmKickDrum } from '../public/wasm/oscillator.js';

export default function WasmTest() {
  const stageRef = useRef<WasmStage | null>(null);
  const kickDrumRef = useRef<WasmKickDrum | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const kickAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumes, setVolumes] = useState([1.0, 1.0, 1.0, 1.0]); // Volume for each instrument
  const [frequencies, setFrequencies] = useState([200, 300, 440, 600]); // Frequency for each instrument
  const [modulatorFrequencies, setModulatorFrequencies] = useState([100, 150, 220, 300]); // Modulator frequency for each instrument (for ring modulation)
  const [waveforms, setWaveforms] = useState([1, 1, 1, 1]); // Waveform for each instrument (0=Sine, 1=Square, 2=Saw, 3=Triangle)
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
      
      // Initialize Web Audio API
      audioContextRef.current = new AudioContext();
      
      setIsLoaded(true);
      console.log('WASM Stage with 4 oscillators, kick drum, and Web Audio loaded successfully!');
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

  function handleModulatorFrequencyChange(index: number, frequency: number) {
    if (!stageRef.current) return;
    
    // Update the WASM stage
    stageRef.current.set_instrument_modulator_frequency(index, frequency);
    
    // Update local state for UI
    setModulatorFrequencies(prev => {
      const newModulatorFrequencies = [...prev];
      newModulatorFrequencies[index] = frequency;
      return newModulatorFrequencies;
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

  // Kick drum functions
  function triggerKickDrum() {
    if (!audioContextRef.current || !kickDrumRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Stop any existing kick drum sound
      if (kickAudioSourceRef.current) {
        try {
          kickAudioSourceRef.current.stop();
        } catch (e) {
          // Source might already be stopped, ignore error
        }
        kickAudioSourceRef.current = null;
      }
      
      // Trigger kick drum
      const currentTime = audioContextRef.current.currentTime;
      kickDrumRef.current.trigger(currentTime);
      
      // Generate audio buffer (2 seconds for longer kick sounds)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate * 2; // 2 seconds
      const audioBuffer = audioContextRef.current.createBuffer(1, bufferLength, sampleRate);
      
      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + (i / sampleRate);
        channelData[i] = kickDrumRef.current.tick(time);
      }
      
      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Clean up reference when source ends
      source.onended = () => {
        kickAudioSourceRef.current = null;
      };
      
      kickAudioSourceRef.current = source;
      source.start();
      
      console.log('Kick drum triggered!');
    } catch (error) {
      console.error('Failed to trigger kick drum:', error);
      alert('Failed to trigger kick drum');
    }
  }

  function releaseKickDrum() {
    if (!audioContextRef.current || !kickDrumRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      kickDrumRef.current.release(currentTime);
      console.log('Kick drum released!');
    } catch (error) {
      console.error('Failed to release kick drum:', error);
      alert('Failed to release kick drum');
    }
  }

  function handleKickConfigChange(param: keyof typeof kickConfig, value: number) {
    if (!kickDrumRef.current) return;
    
    // Update local state
    setKickConfig(prev => ({ ...prev, [param]: value }));
    
    // Update the kick drum
    switch (param) {
      case 'frequency':
        kickDrumRef.current.set_frequency(value);
        break;
      case 'punch':
        kickDrumRef.current.set_punch(value);
        break;
      case 'sub':
        kickDrumRef.current.set_sub(value);
        break;
      case 'click':
        kickDrumRef.current.set_click(value);
        break;
      case 'decay':
        kickDrumRef.current.set_decay(value);
        break;
      case 'pitchDrop':
        kickDrumRef.current.set_pitch_drop(value);
        break;
      case 'volume':
        kickDrumRef.current.set_volume(value);
        break;
    }
  }

  function handleKickPresetChange(preset: string) {
    if (!kickDrumRef.current) return;
    
    setKickPreset(preset);
    
    // Create new kick drum with preset
    kickDrumRef.current = WasmKickDrum.new_with_preset(44100, preset);
    
    // Update state to match preset values
    switch (preset) {
      case 'punchy':
        setKickConfig({ frequency: 60.0, punch: 0.9, sub: 0.6, click: 0.4, decay: 0.6, pitchDrop: 0.7, volume: 0.85 });
        break;
      case 'deep':
        setKickConfig({ frequency: 45.0, punch: 0.5, sub: 1.0, click: 0.2, decay: 1.2, pitchDrop: 0.5, volume: 0.9 });
        break;
      case 'tight':
        setKickConfig({ frequency: 70.0, punch: 0.8, sub: 0.7, click: 0.5, decay: 0.4, pitchDrop: 0.8, volume: 0.8 });
        break;
      default: // default
        setKickConfig({ frequency: 50.0, punch: 0.7, sub: 0.8, click: 0.3, decay: 0.8, pitchDrop: 0.6, volume: 0.8 });
    }
  }

  function handleCompressorEnabledChange(enabled: boolean) {
    if (!stageRef.current) return;
    
    stageRef.current.set_compressor_enabled(enabled);
    setCompressorEnabled(enabled);
  }

  function handleCompressorConfigChange(param: keyof typeof compressorConfig, value: number) {
    if (!stageRef.current) return;
    
    // Update local state
    setCompressorConfig(prev => ({ ...prev, [param]: value }));
    
    // Update the stage compressor
    switch (param) {
      case 'threshold':
        stageRef.current.set_compressor_threshold(value);
        break;
      case 'ratio':
        stageRef.current.set_compressor_ratio(value);
        break;
      case 'attack':
        stageRef.current.set_compressor_attack(value);
        break;
      case 'release':
        stageRef.current.set_compressor_release(value);
        break;
      case 'makeupGain':
        stageRef.current.set_compressor_makeup_gain(value);
        break;
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">WASM Audio Engine Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={loadWasm}
          disabled={isLoading || isLoaded}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : isLoaded ? 'Audio Engine Loaded (Stage + Kick)' : 'Load Audio Engine'}
        </button>
        
        <button
          onClick={isPlaying ? stopAudio : startAudio}
          disabled={!isLoaded}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPlaying ? 'Stop Audio' : 'Start Audio'}
        </button>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3 text-center">Instrument Controls</h3>
          
          <button
            onClick={triggerAll}
            disabled={!isLoaded || !isPlaying}
            className="w-full px-4 py-2 mb-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            🥁 Trigger All Instruments
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
            <h4 className="font-semibold mb-3 text-center">Instrument Controls</h4>
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
                    <button
                      onClick={() => handleEnabledChange(index, !enabled[index])}
                      disabled={!isLoaded}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors disabled:cursor-not-allowed ${
                        enabled[index]
                          ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600'
                          : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600'
                      }`}
                    >
                      {enabled[index] ? '🔊 ON' : '🔇 OFF'}
                    </button>
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
                    </select>
                  </div>
                  
                  {/* Modulator Frequency Control (only for Ring Mod) */}
                  {waveforms[index] === 4 && (
                    <div className="flex items-center space-x-2 mb-3">
                      <label className="w-12 text-xs font-medium">Mod</label>
                      <input
                        type="range"
                        min="50"
                        max="2000"
                        step="10"
                        value={modulatorFrequencies[index]}
                        onChange={(e) => handleModulatorFrequencyChange(index, parseInt(e.target.value))}
                        disabled={!isLoaded}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="w-16 text-xs font-mono text-right">
                        {modulatorFrequencies[index]}Hz
                      </span>
                    </div>
                  )}
                  
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
            Release All Instruments
          </button>

          {/* Compressor Section */}
          <div className="mt-8 pt-6 border-t border-gray-600">
            <h3 className="font-semibold mb-4 text-center text-lg">🎛️ Compressor</h3>
            
            {/* Compressor Enable/Disable */}
            <div className="flex items-center justify-center mb-4">
              <button
                onClick={() => handleCompressorEnabledChange(!compressorEnabled)}
                disabled={!isLoaded}
                className={`px-6 py-2 font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${
                  compressorEnabled
                    ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600'
                    : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600'
                }`}
              >
                {compressorEnabled ? '🎛️ COMPRESSOR ON' : '🔇 COMPRESSOR OFF'}
              </button>
            </div>

            {/* Compressor Controls */}
            <div className="space-y-3">
              {/* Threshold */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Threshold</label>
                <input
                  type="range"
                  min="-40"
                  max="0"
                  step="0.5"
                  value={compressorConfig.threshold}
                  onChange={(e) => handleCompressorConfigChange('threshold', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {compressorConfig.threshold.toFixed(1)}dB
                </span>
              </div>

              {/* Ratio */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Ratio</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={compressorConfig.ratio}
                  onChange={(e) => handleCompressorConfigChange('ratio', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {compressorConfig.ratio.toFixed(1)}:1
                </span>
              </div>

              {/* Attack */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Attack</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="0.1"
                  value={compressorConfig.attack}
                  onChange={(e) => handleCompressorConfigChange('attack', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {compressorConfig.attack.toFixed(1)}ms
                </span>
              </div>

              {/* Release */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Release</label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="1"
                  value={compressorConfig.release}
                  onChange={(e) => handleCompressorConfigChange('release', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {compressorConfig.release.toFixed(0)}ms
                </span>
              </div>

              {/* Makeup Gain */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Makeup</label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.1"
                  value={compressorConfig.makeupGain}
                  onChange={(e) => handleCompressorConfigChange('makeupGain', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {compressorConfig.makeupGain.toFixed(1)}dB
                </span>
              </div>
            </div>
          </div>

          {/* Kick Drum Section */}
          <div className="mt-8 pt-6 border-t border-gray-600">
            <h3 className="font-semibold mb-4 text-center text-lg">🥁 Kick Drum</h3>
            
            {/* Kick Drum Trigger Button */}
            <button
              onClick={triggerKickDrum}
              disabled={!isLoaded || !isPlaying}
              className="w-full px-4 py-3 mb-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
            >
              🥁 TRIGGER KICK
            </button>

            {/* Preset Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Preset</label>
              <select
                value={kickPreset}
                onChange={(e) => handleKickPresetChange(e.target.value)}
                disabled={!isLoaded}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
              >
                <option value="default">Default</option>
                <option value="punchy">Punchy</option>
                <option value="deep">Deep</option>
                <option value="tight">Tight</option>
              </select>
            </div>

            {/* Kick Drum Controls */}
            <div className="space-y-3">
              {/* Frequency */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Frequency</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="1"
                  value={kickConfig.frequency}
                  onChange={(e) => handleKickConfigChange('frequency', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.frequency.toFixed(0)}Hz
                </span>
              </div>

              {/* Volume */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={kickConfig.volume}
                  onChange={(e) => handleKickConfigChange('volume', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.volume.toFixed(2)}
                </span>
              </div>

              {/* Decay Time */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Decay</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.01"
                  value={kickConfig.decay}
                  onChange={(e) => handleKickConfigChange('decay', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.decay.toFixed(2)}s
                </span>
              </div>

              {/* Punch Amount */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Punch</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={kickConfig.punch}
                  onChange={(e) => handleKickConfigChange('punch', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.punch.toFixed(2)}
                </span>
              </div>

              {/* Sub Amount */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Sub Bass</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={kickConfig.sub}
                  onChange={(e) => handleKickConfigChange('sub', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.sub.toFixed(2)}
                </span>
              </div>

              {/* Click Amount */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Click</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={kickConfig.click}
                  onChange={(e) => handleKickConfigChange('click', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.click.toFixed(2)}
                </span>
              </div>

              {/* Pitch Drop */}
              <div className="flex items-center space-x-2">
                <label className="w-20 text-sm font-medium">Pitch Drop</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={kickConfig.pitchDrop}
                  onChange={(e) => handleKickConfigChange('pitchDrop', parseFloat(e.target.value))}
                  disabled={!isLoaded}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="w-12 text-sm font-mono text-right">
                  {kickConfig.pitchDrop.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Release Button */}
            <button
              onClick={releaseKickDrum}
              disabled={!isLoaded || !isPlaying}
              className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              Release Kick
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h2 className="font-semibold mb-2">Status:</h2>
        <p>WASM Stage: {isLoaded ? '✅ Loaded (4 oscillators)' : '❌ Not loaded'}</p>
        <p>Compressor: {isLoaded ? (compressorEnabled ? '✅ Enabled' : '⚪ Disabled') : '❌ Not loaded'}</p>
        <p>Kick Drum: {isLoaded && kickDrumRef.current ? '✅ Loaded' : '❌ Not loaded'}</p>
        <p>Audio Context: {audioContextRef.current ? '✅ Ready' : '❌ No'}</p>
        <p>Audio Playing: {isPlaying ? '✅ Yes' : '❌ No'}</p>
      </div>
      
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded">
        <h3 className="font-semibold mb-2 text-blue-300">Engine API Demo:</h3>
        <ul className="text-sm space-y-1 text-blue-100">
          <li>• <strong>Multi-instrument Stage</strong>: 4 oscillators with independent controls</li>
          <li>• <strong>Individual control</strong>: Trigger each instrument separately</li>
          <li>• <strong>Group control</strong>: Trigger all instruments simultaneously</li>
          <li>• <strong>Enable/disable</strong>: Toggle instruments on/off to mute/unmute individual instruments</li>
          <li>• <strong>Volume control</strong>: Adjust volume (0.0-1.0) for each instrument</li>
          <li>• <strong>Frequency control</strong>: Adjust frequency (50-2000Hz) for each instrument</li>
          <li>• <strong>Waveform control</strong>: Select waveform type (Sine, Square, Saw, Triangle, Ring Mod) for each instrument</li>
          <li>• <strong>Ring modulation</strong>: Modulator frequency control for Ring Mod waveform</li>
          <li>• <strong>ADSR envelope</strong>: Real-time Attack, Decay, Sustain, Release control per instrument</li>
          <li>• <strong>Release control</strong>: Manually trigger release phase for individual or all instruments</li>
          <li>• <strong>Kick Drum Instrument</strong>: Comprehensive 3-layer kick drum with sub-bass, punch, and click layers</li>
          <li>• <strong>Kick Presets</strong>: Built-in presets (Default, Punchy, Deep, Tight) for different kick styles</li>
          <li>• <strong>Kick Parameters</strong>: Frequency, punch, sub-bass, click, decay time, and pitch drop controls</li>
          <li>• <strong>Optional Compressor</strong>: Enable/disable compressor with threshold, ratio, attack, release, and makeup gain controls</li>
          <li>• <strong>Audio Processing Chain</strong>: Instruments → Sum → Compressor (optional) → Limiter → Output</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
        <h3 className="font-semibold mb-2 text-yellow-300">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-yellow-100">
          <li>Click "Load Audio Engine" to initialize the WASM Stage with 4 oscillators and kick drum</li>
          <li>Click "Start Audio" to begin audio processing</li>
          <li>Use individual instrument buttons to test single oscillators</li>
          <li>Adjust instrument controls for each oscillator:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li><strong>Enable/Disable:</strong> Click ON/OFF button to mute/unmute individual instruments</li>
            <li><strong>Volume:</strong> Control relative volume of each instrument (0.0-1.0)</li>
            <li><strong>Frequency:</strong> Change the pitch of each instrument (50-2000Hz)</li>
            <li><strong>Waveform:</strong> Select tone quality (Sine, Square, Saw, Triangle, Ring Mod)</li>
            <li><strong>Modulator:</strong> Control modulator frequency for Ring Mod waveform (50-2000Hz)</li>
          </ul>
          <li>Adjust ADSR envelope controls to shape the sound envelope:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li><strong>Attack:</strong> Time to reach full volume (0.001-2s)</li>
            <li><strong>Decay:</strong> Time to drop to sustain level (0.001-2s)</li>
            <li><strong>Sustain:</strong> Level held while triggered (0-1)</li>
            <li><strong>Release:</strong> Time to fade to silence (0.001-5s)</li>
          </ul>
          <li>Use "Release" buttons to manually trigger the release phase</li>
          <li>Use "Release All" to release all instruments simultaneously</li>
          <li>Use "Trigger All" to hear the mixed output of all instruments with all controls applied</li>
          <li>Test the comprehensive kick drum with its own dedicated section:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li><strong>Presets:</strong> Try different kick styles (Default, Punchy, Deep, Tight)</li>
            <li><strong>Frequency:</strong> Adjust fundamental frequency (20-200Hz)</li>
            <li><strong>Punch:</strong> Control mid-range impact layer</li>
            <li><strong>Sub Bass:</strong> Control low-end presence</li>
            <li><strong>Click:</strong> Control high-frequency transient</li>
            <li><strong>Decay:</strong> Adjust overall decay time</li>
            <li><strong>Pitch Drop:</strong> Control frequency sweep effect</li>
          </ul>
          <li>Experiment with the optional compressor for dynamic range control:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li><strong>Enable/Disable:</strong> Toggle compressor on/off to hear the difference</li>
            <li><strong>Threshold:</strong> Level above which compression starts (-40dB to 0dB)</li>
            <li><strong>Ratio:</strong> Amount of compression applied above threshold (1:1 to 20:1)</li>
            <li><strong>Attack:</strong> How quickly compression engages (1ms to 100ms)</li>
            <li><strong>Release:</strong> How quickly compression disengages (10ms to 1000ms)</li>
            <li><strong>Makeup Gain:</strong> Compensate for level reduction (-20dB to +20dB)</li>
          </ul>
        </ol>
      </div>
    </div>
  );
} 