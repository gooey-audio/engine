"use client";

import React from "react";
import { useLibGooey } from "libgooey-react";

export default function ReactTestPage() {
  const {
    stage,
    kickDrum,
    hiHat,
    snareDrum,
    tomDrum,
    audioContext,
    isLoaded,
    isLoading,
    error,
    initialize,
  } = useLibGooey({
    autoInit: false, // Manual initialization for demo
  });

  const handleInitialize = async () => {
    await initialize();
  };

  const triggerKick = () => {
    if (kickDrum) {
      kickDrum.trigger(0);
      console.log("Kick triggered!");
    }
  };

  const triggerHiHat = () => {
    if (hiHat) {
      hiHat.trigger(0);
      console.log("Hi-Hat triggered!");
    }
  };

  const triggerSnare = () => {
    if (snareDrum) {
      snareDrum.trigger(0);
      console.log("Snare triggered!");
    }
  };

  const triggerTom = () => {
    if (tomDrum) {
      tomDrum.trigger(0);
      console.log("Tom triggered!");
    }
  };

  const startSequencer = () => {
    if (stage) {
      stage.sequencer_set_default_patterns();
      stage.sequencer_play();
      console.log("Sequencer started!");
    }
  };

  const stopSequencer = () => {
    if (stage) {
      stage.sequencer_stop();
      console.log("Sequencer stopped!");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">LibGooey React Hook Test</h1>
        <div className="text-lg">Loading audio engine...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">LibGooey React Hook Test</h1>
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">LibGooey React Hook Test</h1>
        <p className="mb-4">Click to initialize the audio engine:</p>
        <button
          onClick={handleInitialize}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Initialize Audio
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">LibGooey React Hook Test</h1>
      <p className="text-green-600 mb-6">
        ✅ Audio engine loaded successfully!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Individual Drums */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Individual Drums</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={triggerKick}
              className="px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              🥁 Kick
            </button>
            <button
              onClick={triggerSnare}
              className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              🥁 Snare
            </button>
            <button
              onClick={triggerHiHat}
              className="px-4 py-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              🔔 Hi-Hat
            </button>
            <button
              onClick={triggerTom}
              className="px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              🥁 Tom
            </button>
          </div>
        </div>

        {/* Sequencer */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Sequencer</h2>
          <div className="space-y-3">
            <button
              onClick={startSequencer}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              ▶️ Start Sequencer
            </button>
            <button
              onClick={stopSequencer}
              className="w-full px-4 py-3 bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
            >
              ⏹️ Stop Sequencer
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="font-medium">Audio Context:</span>
            <span className={audioContext ? "text-green-600" : "text-red-600"}>
              {audioContext ? " ✅ Active" : " ❌ Inactive"}
            </span>
          </div>
          <div>
            <span className="font-medium">Stage:</span>
            <span className={stage ? "text-green-600" : "text-red-600"}>
              {stage ? " ✅ Ready" : " ❌ Not ready"}
            </span>
          </div>
          <div>
            <span className="font-medium">Kick Drum:</span>
            <span className={kickDrum ? "text-green-600" : "text-red-600"}>
              {kickDrum ? " ✅ Ready" : " ❌ Not ready"}
            </span>
          </div>
          <div>
            <span className="font-medium">Hi-Hat:</span>
            <span className={hiHat ? "text-green-600" : "text-red-600"}>
              {hiHat ? " ✅ Ready" : " ❌ Not ready"}
            </span>
          </div>
          <div>
            <span className="font-medium">Snare:</span>
            <span className={snareDrum ? "text-green-600" : "text-red-600"}>
              {snareDrum ? " ✅ Ready" : " ❌ Not ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Instructions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>Click "Initialize Audio" to load the WASM module</li>
          <li>Click individual drum buttons to trigger sounds</li>
          <li>Use the sequencer to play automatic patterns</li>
          <li>Check the browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
}
