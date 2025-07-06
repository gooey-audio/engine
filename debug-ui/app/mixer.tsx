'use client';

import React from 'react';

interface MixerProps {
  kickVolume: number;
  snareVolume: number;
  hihatVolume: number;
  tomVolume: number;
  onKickVolumeChange: (volume: number) => void;
  onSnareVolumeChange: (volume: number) => void;
  onHihatVolumeChange: (volume: number) => void;
  onTomVolumeChange: (volume: number) => void;
  isLoaded?: boolean;
}

export default function Mixer({
  kickVolume,
  snareVolume,
  hihatVolume,
  tomVolume,
  onKickVolumeChange,
  onSnareVolumeChange,
  onHihatVolumeChange,
  onTomVolumeChange,
  isLoaded = false,
}: MixerProps) {
  const instrumentData = [
    {
      name: 'Kick',
      volume: kickVolume,
      onChange: onKickVolumeChange,
      color: 'bg-red-600',
      colorHover: 'hover:bg-red-700',
    },
    {
      name: 'Snare',
      volume: snareVolume,
      onChange: onSnareVolumeChange,
      color: 'bg-blue-600',
      colorHover: 'hover:bg-blue-700',
    },
    {
      name: 'Hi-hat',
      volume: hihatVolume,
      onChange: onHihatVolumeChange,
      color: 'bg-yellow-600',
      colorHover: 'hover:bg-yellow-700',
    },
    {
      name: 'Tom',
      volume: tomVolume,
      onChange: onTomVolumeChange,
      color: 'bg-purple-600',
      colorHover: 'hover:bg-purple-700',
    },
  ];

  const handleVolumeChange = (instrument: typeof instrumentData[0], value: number) => {
    instrument.onChange(value);
  };

  const handleReset = () => {
    // Reset to default values with headroom (0.6 = -4.4dB)
    onKickVolumeChange(0.6);
    onSnareVolumeChange(0.6);
    onHihatVolumeChange(0.6);
    onTomVolumeChange(0.6);
  };

  if (!isLoaded) {
    return (
      <div className="mixer-container bg-gray-800 p-4 rounded-lg border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-3">Mixer</h3>
        <div className="text-gray-400">WASM not loaded</div>
      </div>
    );
  }

  return (
    <div className="mixer-container bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Mixer</h3>
        <button
          onClick={handleReset}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {instrumentData.map((instrument) => (
          <div key={instrument.name} className="flex flex-col items-center">
            {/* Volume Slider */}
            <div className="flex flex-col items-center h-32 mb-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={instrument.volume}
                onChange={(e) => handleVolumeChange(instrument, parseFloat(e.target.value))}
                className="h-24 w-4 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-vertical"
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                }}
              />
              <div className="mt-2 text-xs text-gray-400 font-mono">
                {Math.round(instrument.volume * 100)}%
              </div>
            </div>

            {/* Volume Level Indicator */}
            <div className="w-8 h-2 bg-gray-700 rounded-full mb-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  instrument.volume > 0.8 ? 'bg-red-500' : 
                  instrument.volume > 0.6 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${instrument.volume * 100}%` }}
              />
            </div>

            {/* Instrument Label */}
            <div className={`px-2 py-1 rounded text-xs font-medium text-white ${instrument.color}`}>
              {instrument.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <span>Default values set to 60% for headroom</span>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Safe</span>
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>Loud</span>
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
            <span>Hot</span>
          </div>
        </div>
      </div>
    </div>
  );
}