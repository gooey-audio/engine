'use client';

import React, { useRef, useState } from 'react';
import init, { WasmStage } from '../public/wasm/oscillator.js';

export default function WasmTest() {
  const stageRef = useRef<WasmStage | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumes, setVolumes] = useState([1.0, 1.0, 1.0, 1.0]); // Volume for each instrument
  const [adsrValues, setAdsrValues] = useState([
    { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }, // Bass Drum
    { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 }, // Snare
    { attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.05 }, // Hi-hat
    { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.5 }, // Cymbal
  ]);

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
      
      // Initialize Web Audio API
      audioContextRef.current = new AudioContext();
      
      setIsLoaded(true);
      console.log('WASM Stage with 4 oscillators and Web Audio loaded successfully!');
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

  function handleAdsrChange(index: number, param: 'attack' | 'decay' | 'sustain' | 'release', value: number) {
    if (!stageRef.current) return;
    
    // Update local state for UI
    setAdsrValues(prev => {
      const newAdsrValues = [...prev];
      newAdsrValues[index] = { ...newAdsrValues[index], [param]: value };
      
      // Update the WASM stage with new ADSR values
      const adsr = newAdsrValues[index];
      stageRef.current.set_instrument_adsr(index, adsr.attack, adsr.decay, adsr.sustain, adsr.release);
      
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
          
          <div className="mt-6">
            <h4 className="font-semibold mb-3 text-center">Volume Controls</h4>
            <div className="space-y-3">
              {[
                { name: '🥁 Bass Drum', color: 'red' },
                { name: '🥁 Snare', color: 'orange' },
                { name: '🔔 Hi-hat', color: 'yellow' },
                { name: '🥽 Cymbal', color: 'cyan' }
              ].map((instrument, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <label className="w-24 text-sm font-medium truncate" title={instrument.name}>
                    {instrument.name}
                  </label>
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
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-3 text-center">ADSR Envelope Controls</h4>
            <div className="space-y-4">
              {[
                { name: '🥁 Bass Drum', color: 'red' },
                { name: '🥁 Snare', color: 'orange' },
                { name: '🔔 Hi-hat', color: 'yellow' },
                { name: '🥽 Cymbal', color: 'cyan' }
              ].map((instrument, index) => (
                <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">
                      {instrument.name}
                    </label>
                    <button
                      onClick={() => releaseInstrument(index, instrument.name.split(' ')[1] || instrument.name)}
                      disabled={!isLoaded || !isPlaying}
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                    >
                      Release
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
              ))}
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
          <li>• <strong>Multi-instrument</strong>: Stage contains 4 oscillators at different frequencies</li>
          <li>• <strong>Individual control</strong>: Trigger each instrument separately</li>
          <li>• <strong>Group control</strong>: Trigger all instruments simultaneously</li>
          <li>• <strong>Volume control</strong>: Adjust volume (0.0-1.0) for each instrument with sliders</li>
          <li>• <strong>ADSR envelope</strong>: Real-time Attack, Decay, Sustain, Release control per instrument</li>
          <li>• <strong>Release control</strong>: Manually trigger release phase for individual or all instruments</li>
          <li>• <strong>Audio mixing</strong>: Stage.tick() sums all instrument outputs with volume applied</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
        <h3 className="font-semibold mb-2 text-yellow-300">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-yellow-100">
          <li>Click "Load Stage" to initialize the WASM Stage with 4 oscillators</li>
          <li>Click "Start Audio" to begin audio processing</li>
          <li>Use individual instrument buttons to test single oscillators</li>
          <li>Adjust volume sliders to control the relative volume of each instrument (0.0-1.0)</li>
          <li>Adjust ADSR envelope controls to shape the sound of each instrument:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li><strong>Attack:</strong> Time to reach full volume (0.001-2s)</li>
            <li><strong>Decay:</strong> Time to drop to sustain level (0.001-2s)</li>
            <li><strong>Sustain:</strong> Level held while triggered (0-1)</li>
            <li><strong>Release:</strong> Time to fade to silence (0.001-5s)</li>
          </ul>
          <li>Use "Release" buttons to manually trigger the release phase</li>
          <li>Use "Trigger All" to hear the mixed output of all instruments</li>
        </ol>
      </div>
    </div>
  );
} 