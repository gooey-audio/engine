'use client';

import React, { useRef, useState } from 'react';
import init, { WasmStage, WasmSnareInstrument } from '../public/wasm/oscillator.js';

export default function WasmTest() {
  const stageRef = useRef<WasmStage | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const snareRef = useRef<WasmSnareInstrument | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumes, setVolumes] = useState([1.0, 1.0, 1.0, 1.0]); // Volume for each instrument
  const [frequencies, setFrequencies] = useState([200, 300, 440, 600]); // Frequency for each instrument
  const [modulatorFrequencies, setModulatorFrequencies] = useState([100, 150, 220, 300]); // Modulator frequency for each instrument (for ring modulation)
  const [waveforms, setWaveforms] = useState([1, 1, 1, 1]); // Waveform for each instrument (0=Sine, 1=Square, 2=Saw, 3=Triangle)
  const [enabled, setEnabled] = useState([true, true, true, true]); // Enabled state for each instrument
  const [adsrValues, setAdsrValues] = useState([
    { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.3 }, // Bass Drum - updated sustain
    { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.1 }, // Snare - updated sustain
    { attack: 0.001, decay: 0.02, sustain: 0.1, release: 0.05 }, // Hi-hat - updated sustain
    { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.5 }, // Cymbal - updated sustain
  ]);

  // Dedicated snare instrument controls
  const [snareVolume, setSnareVolume] = useState(1.0);
  const [snareFrequency, setSnareFrequency] = useState(200);
  const [snareNoiseMix, setSnareNoiseMix] = useState(0.7);
  const [snareTonalNoiseMix, setSnareTonalNoiseMix] = useState(0.3);

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
      
      // Create dedicated snare instrument
      snareRef.current = new WasmSnareInstrument(44100);
      snareRef.current.set_drum_adsr();
      snareRef.current.set_frequency(snareFrequency);
      snareRef.current.set_volume(snareVolume);
      snareRef.current.set_noise_mix_level(snareNoiseMix);
      snareRef.current.set_tonal_noise_mix(snareTonalNoiseMix);

      // Initialize Web Audio API
      audioContextRef.current = new AudioContext();
      
      setIsLoaded(true);
      console.log('WASM Stage with 4 oscillators, dedicated snare instrument, and Web Audio loaded successfully!');
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

  function triggerDedicatedSnare() {
    if (!audioContextRef.current || !snareRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Trigger dedicated snare instrument
      const currentTime = audioContextRef.current.currentTime;
      snareRef.current.trigger(currentTime);
      
      // Generate audio buffer (1 second of audio)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(1, bufferLength, sampleRate);
      
      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + (i / sampleRate);
        channelData[i] = snareRef.current.tick(time);
      }
      
      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      console.log('Dedicated snare instrument triggered!');
    } catch (error) {
      console.error('Failed to trigger dedicated snare:', error);
      alert('Failed to trigger dedicated snare');
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">WASM Stage API Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={loadWasm}
          disabled={isLoading || isLoaded}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : isLoaded ? 'Stage Loaded (4 Oscillators)' : 'Load Stage'}
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

          <div className="mt-4 border-t border-gray-600 pt-4">
            <h4 className="font-semibold mb-3 text-center text-green-300">🎯 Dedicated Snare Instrument</h4>
            <button
              onClick={triggerDedicatedSnare}
              disabled={!isLoaded || !isPlaying}
              className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg border-2 border-green-500"
            >
              🥁 REALISTIC SNARE (Tonal + Noise)
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
                      <option value={5}>White Noise</option>
                      <option value={6}>Pink Noise</option>
                      <option value={7}>Brown Noise</option>
                      <option value={8}>Snare Noise</option>
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

          <div className="mt-6 border-t border-green-600 pt-4">
            <h4 className="font-semibold mb-3 text-center text-green-300">🎯 Dedicated Snare Controls</h4>
            <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-green-300 mb-1">Volume</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareVolume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setSnareVolume(newVolume);
                        if (snareRef.current) snareRef.current.set_volume(newVolume);
                      }}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-xs font-mono text-right text-green-200">
                      {snareVolume.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-green-300 mb-1">Frequency</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="10"
                      value={snareFrequency}
                      onChange={(e) => {
                        const newFreq = parseInt(e.target.value);
                        setSnareFrequency(newFreq);
                        if (snareRef.current) snareRef.current.set_frequency(newFreq);
                      }}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-xs font-mono text-right text-green-200">
                      {snareFrequency}Hz
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-green-300 mb-1">Noise Mix</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareNoiseMix}
                      onChange={(e) => {
                        const newMix = parseFloat(e.target.value);
                        setSnareNoiseMix(newMix);
                        if (snareRef.current) snareRef.current.set_noise_mix_level(newMix);
                      }}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-xs font-mono text-right text-green-200">
                      {(snareNoiseMix * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-green-300 mb-1">Tonal/Noise</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareTonalNoiseMix}
                      onChange={(e) => {
                        const newMix = parseFloat(e.target.value);
                        setSnareTonalNoiseMix(newMix);
                        if (snareRef.current) snareRef.current.set_tonal_noise_mix(newMix);
                      }}
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-xs font-mono text-right text-green-200">
                      {(snareTonalNoiseMix * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-400 text-center">
                Noise Mix: Overall noise intensity • Tonal/Noise: 0%=Pure Tonal, 100%=Pure Noise
              </div>
            </div>
          </div>

          <button
            onClick={releaseAll}
            disabled={!isLoaded || !isPlaying}
            className="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Release All Instruments
          </button>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h2 className="font-semibold mb-2">Status:</h2>
        <p>WASM Stage: {isLoaded ? '✅ Loaded (4 oscillators)' : '❌ Not loaded'}</p>
        <p>Audio Context: {audioContextRef.current ? '✅ Ready' : '❌ No'}</p>
        <p>Audio Playing: {isPlaying ? '✅ Yes' : '❌ No'}</p>
      </div>
      
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded">
        <h3 className="font-semibold mb-2 text-blue-300">Stage API Demo:</h3>
        <ul className="text-sm space-y-1 text-blue-100">
          <li>• <strong>Multi-instrument</strong>: Stage contains 4 oscillators with independent controls</li>
          <li>• <strong>Individual control</strong>: Trigger each instrument separately</li>
          <li>• <strong>Group control</strong>: Trigger all instruments simultaneously</li>
          <li>• <strong>Enable/disable</strong>: Toggle instruments on/off to mute/unmute individual instruments</li>
          <li>• <strong>Volume control</strong>: Adjust volume (0.0-1.0) for each instrument</li>
          <li>• <strong>Frequency control</strong>: Adjust frequency (50-2000Hz) for each instrument</li>
          <li>• <strong>Waveform control</strong>: Select waveform type (Sine, Square, Saw, Triangle, Ring Mod, White/Pink/Brown/Snare Noise) for each instrument</li>
          <li>• <strong>Ring modulation</strong>: Modulator frequency control for Ring Mod waveform</li>
          <li>• <strong>Noise generation</strong>: 4 types of noise (White, Pink, Brown, Snare-optimized) available</li>
          <li>• <strong>ADSR envelope</strong>: Real-time Attack, Decay, Sustain, Release control per instrument (drum-optimized defaults)</li>
          <li>• <strong>Release control</strong>: Manually trigger release phase for individual or all instruments</li>
          <li>• <strong>Audio mixing</strong>: Stage.tick() sums all instrument outputs with controls applied</li>
          <li>• <strong>🎯 Dedicated Snare</strong>: Realistic snare instrument combining tonal + noise components with specialized controls</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
        <h3 className="font-semibold mb-2 text-yellow-300">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-yellow-100">
          <li>Click "Load Stage" to initialize the WASM Stage with 4 oscillators</li>
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
          <li>🎯 <strong>Try the Dedicated Snare</strong>: Click "REALISTIC SNARE" for a proper drum sound that combines tonal and noise components</li>
          <li>Adjust snare controls to customize the sound: Volume, Frequency (tonal component), Noise Mix (overall noise intensity), and Tonal/Noise mix</li>
        </ol>
      </div>
    </div>
  );
} 