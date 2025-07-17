"use client";

import React, { useEffect, useState } from "react";
import { WasmStage } from "../public/wasm/oscillator.js";

interface LFOProps {
  stageRef: React.RefObject<WasmStage>;
}

const LFO: React.FC<LFOProps> = ({ stageRef }) => {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState(2.0);
  const [depth, setDepth] = useState(0.5);
  const [waveform, setWaveform] = useState(0); // 0=Sine, 1=Square, 2=Saw, 3=Triangle

  // Update LFO when state changes
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.set_lfo_enabled(enabled);
    }
  }, [enabled]);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.set_lfo_frequency(frequency);
    }
  }, [frequency]);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.set_lfo_depth(depth);
    }
  }, [depth]);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.set_lfo_waveform(waveform);
    }
  }, [waveform]);

  const waveformNames = ["Sine", "Square", "Saw", "Triangle"];
  const waveformSymbols = ["~", "⌐", "/", "△"];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
      <h2 className="text-xl font-bold text-white mb-4">LFO 1 - Hi-hat Filter Cutoff</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enable/Disable */}
        <div className="flex items-center">
          <label className="text-white mr-3">Enable:</label>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`px-4 py-2 rounded ${
              enabled
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </button>
        </div>

        {/* Depth Control */}
        <div className="flex items-center">
          <label className="text-white mr-3 min-w-[60px]">Depth:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={depth}
            onChange={(e) => setDepth(parseFloat(e.target.value))}
            className="flex-1 mr-2"
          />
          <span className="text-white text-sm min-w-[40px]">
            {Math.round(depth * 100)}%
          </span>
        </div>

        {/* Speed Control */}
        <div className="flex items-center">
          <label className="text-white mr-3 min-w-[60px]">Speed:</label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={frequency}
            onChange={(e) => setFrequency(parseFloat(e.target.value))}
            className="flex-1 mr-2"
          />
          <span className="text-white text-sm min-w-[50px]">
            {frequency.toFixed(1)} Hz
          </span>
        </div>

        {/* Waveform Selection */}
        <div className="flex items-center">
          <label className="text-white mr-3 min-w-[60px]">Shape:</label>
          <div className="flex space-x-2">
            {waveformNames.map((name, index) => (
              <button
                key={index}
                onClick={() => setWaveform(index)}
                className={`px-3 py-1 rounded text-sm ${
                  waveform === index
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title={name}
              >
                {waveformSymbols[index]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div className="mt-4 text-sm text-gray-400">
        <p>
          <strong>Status:</strong> {enabled ? "Active" : "Inactive"} |{" "}
          <strong>Target:</strong> Hi-hat Filter Cutoff (±4kHz) |{" "}
          <strong>Waveform:</strong> {waveformNames[waveform]}
        </p>
      </div>
    </div>
  );
};

export default LFO;