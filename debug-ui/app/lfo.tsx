'use client';

import React from 'react';

interface LfoProps {
  enabled: boolean;
  depth: number;
  waveform: number; // 0=Sine, 1=Square, 2=Saw, 3=Triangle
  rate: number; // 0=1/16th, 1=1/8th, 2=1/4th
  onEnabledChange: (enabled: boolean) => void;
  onDepthChange: (depth: number) => void;
  onWaveformChange: (waveform: number) => void;
  onRateChange: (rate: number) => void;
  isLoaded?: boolean;
}

export default function Lfo({
  enabled,
  depth,
  waveform,
  rate,
  onEnabledChange,
  onDepthChange,
  onWaveformChange,
  onRateChange,
  isLoaded = false,
}: LfoProps) {
  const waveformOptions = [
    { value: 0, label: '~', name: 'Sine' },
    { value: 1, label: '⌐', name: 'Square' },
    { value: 2, label: '/', name: 'Saw' },
    { value: 3, label: '△', name: 'Triangle' },
  ];

  const rateOptions = [
    { value: 0, label: '1/16' },
    { value: 1, label: '1/8' },
    { value: 2, label: '1/4' },
  ];

  const handleReset = () => {
    onEnabledChange(false);
    onDepthChange(0.5);
    onWaveformChange(0);
    onRateChange(2);
  };

  if (!isLoaded) {
    return (
      <div className="lfo-container bg-gray-800 p-4 rounded-lg border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-3">LFO 1</h3>
        <div className="text-gray-400">WASM not loaded</div>
      </div>
    );
  }

  return (
    <div className="lfo-container bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">LFO 1</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => onEnabledChange(!enabled)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              enabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Depth Control */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Depth
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={depth}
              onChange={(e) => onDepthChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              disabled={!enabled}
            />
            <span className="text-sm text-gray-400 w-12 text-right">
              {Math.round(depth * 100)}%
            </span>
          </div>
        </div>

        {/* Waveform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Waveform
          </label>
          <div className="grid grid-cols-4 gap-1">
            {waveformOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onWaveformChange(option.value)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  waveform === option.value
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
                disabled={!enabled}
                title={option.name}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rate (BPM Sync)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {rateOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onRateChange(option.value)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  rate === option.value
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
                disabled={!enabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Display */}
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400 mb-1">Modulation Target</div>
          <div className="text-sm text-white">Hi-hat Filter Cutoff</div>
        </div>
      </div>
    </div>
  );
}