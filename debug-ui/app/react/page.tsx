"use client";

import React from "react";
import { useLibGooey } from "@/src/libgooey";
import { makeKick } from "@/src/kick";

// import WebAudioKickTest from "../webAudioKick";

export default function ReactTestPage() {
  const { audioContext, isLoaded, isLoading, error, initialize, stage } =
    useLibGooey({
      autoInit: false, // Manual initialization for demo
    });

  const handleInitialize = async () => {
    await initialize();
  };

  const triggerKick = () => {
    const ctx = audioContext;
    if (ctx && stage) {
      const kick = makeKick(ctx);
      stage.addInstrument("kick", kick);

      stage.trigger("kick");

      // const osc = ctx.createOscillator();
      // osc.type = "sine";
      // const gain = ctx.createGain();
      // osc.connect(gain);
      // gain.connect(ctx.destination);

      // // // Kick drum envelope
      // const now = ctx.currentTime;
      // osc.frequency.setValueAtTime(150, now);
      // // osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      // gain.gain.setValueAtTime(1, now);
      // gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      // osc.start(now);
      // osc.stop(now + 0.5);
      // // osc.onended = () => {
      // //   gain.disconnect();
      // // };
      console.log("Kick triggered!");
    }
  };

  // const triggerHiHat = () => {
  //   if (hiHat) {
  //     hiHat.trigger(0);
  //     console.log("Hi-Hat triggered!");
  //   }
  // };

  // const triggerSnare = () => {
  //   if (snareDrum) {
  //     snareDrum.trigger(0);
  //     console.log("Snare triggered!");
  //   }
  // };

  // const triggerTom = () => {
  //   if (tomDrum) {
  //     tomDrum.trigger(0);
  //     console.log("Tom triggered!");
  //   }
  // };

  // const startSequencer = () => {
  //   if (stage) {
  //     stage.sequencer_set_default_patterns();
  //     stage.sequencer_play();
  //     console.log("Sequencer started!");
  //   }
  // };

  // const stopSequencer = () => {
  //   if (stage) {
  //     stage.sequencer_stop();
  //     console.log("Sequencer stopped!");
  //   }
  // };

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

      <button onClick={triggerKick}>Kick</button>
    </div>
  );
}
