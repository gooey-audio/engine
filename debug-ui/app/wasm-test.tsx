'use client';

import React, { useRef, useState } from 'react';
import init, { WasmOscillator } from '../public/wasm/oscillator.js';

export default function WasmTest() {
  const oscRef = useRef<WasmOscillator | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadWasm() {
    setIsLoading(true);
    try {
      // Initialize the WASM module
      await init();
      
      // Create oscillator instance (44100 sample rate, 300 Hz for drum-like sound)
      oscRef.current = new WasmOscillator(44100, 300);
      setIsLoaded(true);
      console.log('WASM loaded successfully!');
    } catch (error) {
      console.error('Failed to load WASM:', error);
      alert('Failed to load WASM module');
    } finally {
      setIsLoading(false);
    }
  }

  function triggerOsc() {
    if (oscRef.current) {
      try {
        // Trigger the oscillator at current time (0 for immediate)
        oscRef.current.trigger(0);
        console.log('Oscillator triggered!');
      } catch (error) {
        console.error('Failed to trigger oscillator:', error);
        alert('Failed to trigger oscillator');
      }
    } else {
      alert('WASM not loaded yet. Click "Load WASM" first.');
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">WASM Audio Engine Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={loadWasm}
          disabled={isLoading || isLoaded}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : isLoaded ? 'WASM Loaded' : 'Load WASM'}
        </button>
        
        <button
          onClick={triggerOsc}
          disabled={!isLoaded}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Trigger Oscillator
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Status:</h2>
        <p>WASM Loaded: {isLoaded ? '✅ Yes' : '❌ No'}</p>
        <p>Oscillator Ready: {isLoaded ? '✅ Yes' : '❌ No'}</p>
      </div>
    </div>
  );
} 