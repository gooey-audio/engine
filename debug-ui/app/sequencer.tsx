'use client';

import React, { useState, useEffect } from 'react';
import { WasmStage } from '../public/wasm/oscillator.js';

interface SequencerProps {
  stage: WasmStage | null;
  isPlaying: boolean;
  audioContext?: AudioContext | null;
}

export default function Sequencer({ stage, isPlaying, audioContext }: SequencerProps) {
  const [patterns, setPatterns] = useState<boolean[][]>([
    new Array(16).fill(false), // Kick Drum
    new Array(16).fill(false), // Snare
    new Array(16).fill(false), // Hi-hat  
    new Array(16).fill(false), // Tom
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [sequencerPlaying, setSequencerPlaying] = useState(false);

  const instrumentNames = ['Kick', 'Snare', 'Hi-hat', 'Tom'];
  const instrumentColors = [
    'bg-red-600 hover:bg-red-700',     // Kick - Red
    'bg-blue-600 hover:bg-blue-700',   // Snare - Blue  
    'bg-yellow-600 hover:bg-yellow-700', // Hi-hat - Yellow
    'bg-purple-600 hover:bg-purple-700', // Tom - Purple
  ];

  // Update current step display
  useEffect(() => {
    if (!stage || !sequencerPlaying) return;

    const interval = setInterval(() => {
      if (stage) {
        const step = stage.sequencer_get_current_step();
        setCurrentStep(step);
      }
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, [stage, sequencerPlaying]);

  // Sync patterns from WASM and set up default pattern
  useEffect(() => {
    if (!stage) return;
    
    // Use the new default pattern setup method
    if (typeof stage.sequencer_set_default_patterns === 'function') {
      stage.sequencer_set_default_patterns();
    } else {
      // Fallback to manual setup for backwards compatibility
      // Kick drum on steps 1, 5, 9, 13 (beats 1, 2, 3, 4)
      stage.sequencer_set_step(0, 0, true);
      stage.sequencer_set_step(0, 4, true);
      stage.sequencer_set_step(0, 8, true);
      stage.sequencer_set_step(0, 12, true);
      
      // Snare on steps 5, 13 (beats 2, 4)
      stage.sequencer_set_step(1, 4, true);
      stage.sequencer_set_step(1, 12, true);
      
      // Hi-hat on every other step
      for (let i = 0; i < 16; i += 2) {
        stage.sequencer_set_step(2, i, true);
      }
    }
    
    const syncedPatterns = patterns.map((pattern, instrumentIndex) =>
      pattern.map((_, stepIndex) => stage.sequencer_get_step(instrumentIndex, stepIndex))
    );
    setPatterns(syncedPatterns);
  }, [stage]);

  const toggleStep = (instrumentIndex: number, stepIndex: number) => {
    if (!stage) return;

    const newValue = !patterns[instrumentIndex][stepIndex];
    stage.sequencer_set_step(instrumentIndex, stepIndex, newValue);
    
    setPatterns(prev => {
      const newPatterns = [...prev];
      newPatterns[instrumentIndex] = [...newPatterns[instrumentIndex]];
      newPatterns[instrumentIndex][stepIndex] = newValue;
      return newPatterns;
    });
  };

  const handlePlay = () => {
    if (!stage) return;
    
    if (sequencerPlaying) {
      stage.sequencer_stop();
      setSequencerPlaying(false);
    } else {
      // Use sequencer_play_at_time with current time for proper timing
      const currentTime = audioContext ? audioContext.currentTime : performance.now() / 1000;
      
      if (typeof stage.sequencer_play_at_time === 'function') {
        stage.sequencer_play_at_time(currentTime);
      } else {
        stage.sequencer_play();
      }
      setSequencerPlaying(true);
    }
  };

  const handleReset = () => {
    if (!stage) return;
    
    stage.sequencer_reset();
    setCurrentStep(0);
  };

  const handleClearAll = () => {
    if (!stage) return;
    
    stage.sequencer_clear_all();
    setPatterns([
      new Array(16).fill(false),
      new Array(16).fill(false), 
      new Array(16).fill(false),
      new Array(16).fill(false),
    ]);
  };

  const handleBpmChange = (newBpm: number) => {
    if (!stage) return;
    
    stage.sequencer_set_bpm(newBpm);
    setBpm(newBpm);
  };

  if (!stage) {
    return (
      <div className="sequencer-container bg-gray-800 p-4 rounded-lg border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-3">16-Step Sequencer</h3>
        <div className="text-gray-400">WASM not loaded</div>
      </div>
    );
  }

  return (
    <div className="sequencer-container bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">16-Step Sequencer</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${sequencerPlaying ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          <span className="text-sm text-gray-300">
            {sequencerPlaying ? 'Playing' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center space-x-3 mb-4">
        <button
          onClick={handlePlay}
          className={`px-4 py-2 rounded font-medium ${
            sequencerPlaying 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          } text-white transition-colors`}
        >
          {sequencerPlaying ? '⏸ Stop' : '▶ Play'}
        </button>
        
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          ⏮ Reset
        </button>
        
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium transition-colors"
        >
          🗑 Clear
        </button>
      </div>

      {/* BPM Control */}
      <div className="flex items-center space-x-3 mb-4">
        <label className="text-white font-medium min-w-fit">BPM:</label>
        <input
          type="range"
          min="60"
          max="180"
          value={bpm}
          onChange={(e) => handleBpmChange(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-white font-mono min-w-fit">{bpm}</span>
      </div>

      {/* Step Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Step numbers header */}
          <div className="flex mb-2">
            <div className="w-24 flex-shrink-0"></div>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="w-8 h-6 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Instrument rows */}
          {instrumentNames.map((name, instrumentIndex) => (
            <div key={instrumentIndex} className="flex items-center mb-2">
              <div className="w-24 text-sm text-white font-medium text-right pr-3 flex-shrink-0">
                {name}
              </div>
              {Array.from({ length: 16 }, (_, stepIndex) => (
                <button
                  key={stepIndex}
                  onClick={() => toggleStep(instrumentIndex, stepIndex)}
                  className={`w-8 h-8 rounded border-2 mr-1 transition-all flex-shrink-0 ${
                    patterns[instrumentIndex][stepIndex]
                      ? `${instrumentColors[instrumentIndex]} border-white`
                      : 'bg-gray-700 hover:bg-gray-600 border-gray-500 hover:border-gray-400'
                  } ${
                    stepIndex === currentStep && sequencerPlaying
                      ? 'ring-2 ring-white animate-pulse'
                      : ''
                  }`}
                  disabled={!isPlaying}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Click checkboxes to program patterns. Current step: {currentStep + 1}/16
      </div>
    </div>
  );
}