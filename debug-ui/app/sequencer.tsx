'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SequencerProps {
  stageRef: React.MutableRefObject<any | null>;
  isLoaded: boolean;
  isPlaying: boolean;
}

export default function Sequencer({ stageRef, isLoaded, isPlaying }: SequencerProps) {
  const [sequencerBpm, setSequencerBpm] = useState(120);
  const [sequencerPlaying, setSequencerPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [patterns, setPatterns] = useState<boolean[][]>([
    new Array(16).fill(false), // Bass Drum
    new Array(16).fill(false), // Snare
    new Array(16).fill(false), // Hi-hat
    new Array(16).fill(false), // Cymbal
  ]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const instrumentNames = ['🥁 Bass', '🥁 Snare', '🔔 Hi-hat', '🥽 Cymbal'];
  const instrumentColors = ['bg-red-600', 'bg-orange-600', 'bg-yellow-600', 'bg-cyan-600'];

  // Update current step indicator
  useEffect(() => {
    if (!sequencerPlaying || !stageRef.current) return;

    const stepInterval = setInterval(() => {
      if (stageRef.current) {
        const step = stageRef.current.sequencer_get_current_step();
        setCurrentStep(step);
      }
    }, 50); // Update every 50ms for smooth visual feedback

    return () => clearInterval(stepInterval);
  }, [sequencerPlaying, stageRef]);

  function handleSequencerPlay() {
    if (!stageRef.current || !isLoaded) return;

    if (sequencerPlaying) {
      stageRef.current.sequencer_stop();
      setSequencerPlaying(false);
    } else {
      stageRef.current.sequencer_play();
      setSequencerPlaying(true);
    }
  }

  function handleSequencerReset() {
    if (!stageRef.current) return;
    stageRef.current.sequencer_reset();
    setCurrentStep(0);
  }

  function handleSequencerClear() {
    if (!stageRef.current) return;
    stageRef.current.sequencer_clear_all();
    setPatterns(patterns.map(pattern => new Array(16).fill(false)));
  }

  function handleBpmChange(newBpm: number) {
    setSequencerBpm(newBpm);
    if (stageRef.current) {
      stageRef.current.sequencer_set_bpm(newBpm);
    }
  }

  function handleStepToggle(instrument: number, step: number) {
    if (!stageRef.current) return;

    const newPatterns = [...patterns];
    newPatterns[instrument][step] = !newPatterns[instrument][step];
    setPatterns(newPatterns);

    // Update the WASM sequencer
    stageRef.current.sequencer_set_step(instrument, step, newPatterns[instrument][step]);
  }

  return (
    <div className="sequencer-container bg-gray-800 p-4 rounded-lg border border-gray-600 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">16-Step Sequencer</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${sequencerPlaying ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-300">
            {sequencerPlaying ? 'Playing' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center space-x-3 mb-4">
        <button
          onClick={handleSequencerPlay}
          disabled={!isLoaded || !isPlaying}
          className={`px-4 py-2 rounded font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed ${
            sequencerPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {sequencerPlaying ? '⏸️ Stop' : '▶️ Play'}
        </button>

        <button
          onClick={handleSequencerReset}
          disabled={!isLoaded}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          🔄 Reset
        </button>

        <button
          onClick={handleSequencerClear}
          disabled={!isLoaded}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          🗑️ Clear All
        </button>

        <div className="flex items-center space-x-2 ml-6">
          <label className="text-sm font-medium text-white">BPM:</label>
          <input
            type="range"
            min="60"
            max="180"
            step="1"
            value={sequencerBpm}
            onChange={(e) => handleBpmChange(parseInt(e.target.value))}
            disabled={!isLoaded}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-sm font-mono text-white w-8 text-right">
            {sequencerBpm}
          </span>
        </div>
      </div>

      {/* Step Grid */}
      <div className="space-y-3 overflow-x-auto">
        {instrumentNames.map((name, instrumentIndex) => (
          <div key={instrumentIndex} className="flex items-center space-x-2 min-w-fit">
            <div className={`w-24 text-xs font-medium text-white text-center py-1 rounded ${instrumentColors[instrumentIndex]} flex-shrink-0`}>
              {name}
            </div>
            <div className="flex space-x-1 flex-shrink-0">
              {Array.from({ length: 16 }, (_, stepIndex) => (
                <button
                  key={stepIndex}
                  onClick={() => handleStepToggle(instrumentIndex, stepIndex)}
                  disabled={!isLoaded}
                  className={`w-8 h-8 rounded border-2 transition-all duration-100 disabled:cursor-not-allowed ${
                    patterns[instrumentIndex][stepIndex]
                      ? `${instrumentColors[instrumentIndex]} border-white shadow-lg`
                      : 'bg-gray-700 border-gray-500 hover:bg-gray-600'
                  } ${
                    currentStep === stepIndex && sequencerPlaying
                      ? 'ring-2 ring-white ring-opacity-80 animate-pulse'
                      : ''
                  }`}
                >
                  <span className="text-xs font-bold text-white">
                    {stepIndex + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Step Counter */}
      <div className="mt-4 flex items-center justify-center">
        <div className="text-sm text-gray-300">
          Current Step: <span className="font-mono font-bold text-white">{currentStep + 1}/16</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Click grid squares to program drum patterns • Real-time pattern editing while playing
      </div>
    </div>
  );
}