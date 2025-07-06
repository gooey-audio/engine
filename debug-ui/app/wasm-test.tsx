"use client";

import React, { useRef, useState } from "react";
import init, {
  WasmStage,
  WasmKickDrum,
  WasmHiHat,
  WasmSnareDrum,
  WasmTomDrum,
} from "../public/wasm/oscillator.js";

import Sequencer from "./sequencer";
import Mixer from "./mixer";
import { SpectrumAnalyzerWithRef } from "./spectrum-analyzer";
import { SpectrogramDisplayWithRef } from "./spectrogram-display";

export default function WasmTest() {
  const stageRef = useRef<WasmStage | null>(null);
  const kickDrumRef = useRef<WasmKickDrum | null>(null);
  const hihatRef = useRef<WasmHiHat | null>(null);
  const snareRef = useRef<WasmSnareDrum | null>(null);
  const tomRef = useRef<WasmTomDrum | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const kickAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const hihatAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const snareAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const tomAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const spectrumAnalyzerRef = useRef<{
    connectSource: (source: AudioNode) => void;
    getAnalyser: () => AnalyserNode | null;
    getMonitoringNode: () => GainNode | null;
  } | null>(null);
  
  const spectrogramRef = useRef<{
    connectSource: (source: AudioNode) => void;
  } | null>(null);
  
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "oscillators" | "kick" | "hihat" | "snare" | "tom"
  >("kick");
  const [volumes, setVolumes] = useState([1.0, 1.0, 1.0, 1.0]); // Volume for each instrument
  const [frequencies, setFrequencies] = useState([200, 300, 440, 600]); // Frequency for each instrument
  const [modulatorFrequencies, setModulatorFrequencies] = useState([
    100, 150, 220, 300,
  ]); // Modulator frequency for each instrument (for ring modulation)
  const [waveforms, setWaveforms] = useState([1, 1, 1, 1]); // Waveform for each instrument (0=Sine, 1=Square, 2=Saw, 3=Triangle)
  const [enabled, setEnabled] = useState([false, false, false, false]); // Enabled state for each instrument - disabled by default
  const [adsrValues, setAdsrValues] = useState([
    { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }, // Bass Drum
    { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 }, // Snare
    { attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.05 }, // Hi-hat
    { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.5 }, // Cymbal
  ]);

  // Kick drum specific state
  const [kickPreset, setKickPreset] = useState("default");
  const [kickConfig, setKickConfig] = useState({
    frequency: 50.0,
    punch: 0.7,
    sub: 0.8,
    click: 0.3,
    decay: 0.8,
    pitchDrop: 0.6,
    volume: 0.6,
  });

  // Hi-hat specific state
  const [hihatPreset, setHihatPreset] = useState("closed_default");
  const [hihatConfig, setHihatConfig] = useState({
    baseFrequency: 8000.0,
    resonance: 0.7,
    brightness: 0.6,
    decayTime: 0.1,
    attackTime: 0.001,
    volume: 0.6,
    isOpen: false,
  });

  // Snare specific state
  const [snarePreset, setSnarePreset] = useState("default");
  const [snareConfig, setSnareConfig] = useState({
    frequency: 200.0,
    tonal: 0.4,
    noise: 0.7,
    crack: 0.5,
    decay: 0.15,
    pitchDrop: 0.3,
    volume: 0.6,
  });

  // Tom specific state
  const [tomPreset, setTomPreset] = useState("default");
  const [tomConfig, setTomConfig] = useState({
    frequency: 120.0,
    tonal: 0.8,
    punch: 0.4,
    decay: 0.4,
    pitchDrop: 0.3,
    volume: 0.6,
  });

  // Keyboard mapping state
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);

  // Keyboard mapping configuration
  const keyMappings = {
    a: {
      name: "Kick Drum",
      action: () => triggerKickDrum(),
      color: "bg-red-500",
      emoji: "🥁",
    },
    s: {
      name: "Snare Drum",
      action: () => triggerSnareDrum(),
      color: "bg-orange-500",
      emoji: "🥁",
    },
    d: {
      name: "Hi-Hat",
      action: () => triggerHiHat(),
      color: "bg-yellow-500",
      emoji: "🔔",
    },
    f: {
      name: "Tom Drum",
      action: () => triggerTomDrum(),
      color: "bg-purple-500",
      emoji: "🥁",
    },
  };

  // Keyboard event handlers
  React.useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Prevent default behavior for our mapped keys
      if (key in keyMappings) {
        event.preventDefault();

        // Only trigger if not already pressed (prevent key repeat)
        if (!pressedKeys.has(key)) {
          setPressedKeys((prev) => new Set(prev).add(key));
          keyMappings[key as keyof typeof keyMappings].action();
          console.log(
            `Keyboard trigger: ${key.toUpperCase()} -> ${
              keyMappings[key as keyof typeof keyMappings].name
            }`
          );
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key in keyMappings) {
        event.preventDefault();
        setPressedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    };

    // Add global event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keyboardEnabled, pressedKeys, isLoaded, isPlaying]);

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
        stageRef.current?.set_instrument_adsr(
          index,
          adsr.attack,
          adsr.decay,
          adsr.sustain,
          adsr.release
        );
      });

      // Initialize modulator frequencies for each instrument
      modulatorFrequencies.forEach((freq, index) => {
        stageRef.current?.set_instrument_modulator_frequency(index, freq);
      });

      // Initialize enabled state for each instrument (basic oscillators disabled by default)
      enabled.forEach((isEnabled, index) => {
        stageRef.current?.set_instrument_enabled(index, isEnabled);
      });

      // Create kick drum instance
      kickDrumRef.current = new WasmKickDrum(44100);

      // Create hi-hat instance
      hihatRef.current = WasmHiHat.new_with_preset(44100, "closed_default");

      // Create snare instance
      snareRef.current = new WasmSnareDrum(44100);

      // Create tom instance
      tomRef.current = new WasmTomDrum(44100);

      // Initialize Web Audio API
      audioContextRef.current = new AudioContext();

      setIsLoaded(true);
      console.log(
        "WASM Stage with 4 oscillators, kick drum, hi-hat, snare, tom, and Web Audio loaded successfully!"
      );
    } catch (error) {
      console.error("Failed to load WASM:", error);
      alert("Failed to load WASM module: " + String(error));
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
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      
      // Create a continuous audio processing loop using ScriptProcessorNode
      // This is needed for the sequencer to advance through steps
      const bufferSize = 4096;
      const processor = audioContextRef.current.createScriptProcessor(bufferSize, 0, 1);
      audioProcessorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        if (!stageRef.current || !audioContextRef.current) return;
        
        const outputBuffer = event.outputBuffer;
        const outputData = outputBuffer.getChannelData(0);
        
        // Process audio samples continuously
        for (let i = 0; i < outputBuffer.length; i++) {
          const currentTime = audioContextRef.current.currentTime + (i / audioContextRef.current.sampleRate);
          outputData[i] = stageRef.current.tick(currentTime);
        }
      };
      
      // Connect the processor to the audio graph
      if (spectrumAnalyzerRef.current && spectrumAnalyzerRef.current.getMonitoringNode()) {
        processor.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        processor.connect(audioContextRef.current.destination);
      }
      
      setIsPlaying(true);
      console.log('Audio started with continuous processing!');
    } catch (error) {
      console.error("Failed to start audio:", error);
      alert("Failed to start audio");
    }
  }

  function stopAudio() {
    // Disconnect the audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    setIsPlaying(false);
    console.log("Audio stopped!");
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
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferLength,
        sampleRate
      );

      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + i / sampleRate;
        channelData[i] = stageRef.current.tick(time);
      }

      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to spectrum analyzer monitoring if available, otherwise directly to destination
      if (
        spectrumAnalyzerRef.current &&
        spectrumAnalyzerRef.current.getMonitoringNode()
      ) {
        source.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        source.connect(audioContextRef.current.destination);
      }
      source.start();

      console.log("All instruments triggered!");
    } catch (error) {
      console.error("Failed to trigger instruments:", error);
      alert("Failed to trigger instruments");
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
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferLength,
        sampleRate
      );

      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + i / sampleRate;
        channelData[i] = stageRef.current.tick(time);
      }

      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to spectrum analyzer monitoring if available, otherwise directly to destination
      if (
        spectrumAnalyzerRef.current &&
        spectrumAnalyzerRef.current.getMonitoringNode()
      ) {
        source.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        source.connect(audioContextRef.current.destination);
      }
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
    setVolumes((prev) => {
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
    setFrequencies((prev) => {
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
    setWaveforms((prev) => {
      const newWaveforms = [...prev];
      newWaveforms[index] = waveformType;
      return newWaveforms;
    });
  }

  function handleAdsrChange(
    index: number,
    param: "attack" | "decay" | "sustain" | "release",
    value: number
  ) {
    if (!stageRef.current) return;

    // Update local state for UI
    setAdsrValues((prev) => {
      const newAdsrValues = [...prev];
      newAdsrValues[index] = { ...newAdsrValues[index], [param]: value };

      // Update the WASM stage with new ADSR values
      const adsr = newAdsrValues[index];
      if (stageRef.current) {
        stageRef.current.set_instrument_adsr(
          index,
          adsr.attack,
          adsr.decay,
          adsr.sustain,
          adsr.release
        );
      }

      return newAdsrValues;
    });
  }

  function handleModulatorFrequencyChange(index: number, frequency: number) {
    if (!stageRef.current) return;

    // Update the WASM stage
    stageRef.current.set_instrument_modulator_frequency(index, frequency);

    // Update local state for UI
    setModulatorFrequencies((prev) => {
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
    setEnabled((prev) => {
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
      console.log("All instruments released!");
    } catch (error) {
      console.error("Failed to release all instruments:", error);
      alert("Failed to release all instruments");
    }
  }

  // Kick drum functions
  function triggerKickDrum() {
    if (!audioContextRef.current || !kickDrumRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Stop any existing kick drum sound
      if (kickAudioSourceRef.current) {
        try {
          kickAudioSourceRef.current.stop();
        } catch (e) {
          // Source might already be stopped, ignore error
        }
        kickAudioSourceRef.current = null;
      }

      // Trigger kick drum
      const currentTime = audioContextRef.current.currentTime;
      kickDrumRef.current.trigger(currentTime);

      // Generate audio buffer (2 seconds for longer kick sounds)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate * 2; // 2 seconds
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferLength,
        sampleRate
      );

      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + i / sampleRate;
        channelData[i] = kickDrumRef.current.tick(time);
      }

      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to spectrum analyzer monitoring if available, otherwise directly to destination
      if (
        spectrumAnalyzerRef.current &&
        spectrumAnalyzerRef.current.getMonitoringNode()
      ) {
        source.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      // Clean up reference when source ends
      source.onended = () => {
        kickAudioSourceRef.current = null;
      };

      kickAudioSourceRef.current = source;
      source.start();

      console.log("Kick drum triggered!");
    } catch (error) {
      console.error("Failed to trigger kick drum:", error);
      alert("Failed to trigger kick drum");
    }
  }

  function releaseKickDrum() {
    if (!audioContextRef.current || !kickDrumRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      kickDrumRef.current.release(currentTime);
      console.log("Kick drum released!");
    } catch (error) {
      console.error("Failed to release kick drum:", error);
      alert("Failed to release kick drum");
    }
  }

  function handleKickConfigChange(
    param: keyof typeof kickConfig,
    value: number
  ) {
    if (!kickDrumRef.current) return;

    // Update local state
    setKickConfig((prev) => ({ ...prev, [param]: value }));

    // Update the kick drum
    switch (param) {
      case "frequency":
        kickDrumRef.current.set_frequency(value);
        break;
      case "punch":
        kickDrumRef.current.set_punch(value);
        break;
      case "sub":
        kickDrumRef.current.set_sub(value);
        break;
      case "click":
        kickDrumRef.current.set_click(value);
        break;
      case "decay":
        kickDrumRef.current.set_decay(value);
        break;
      case "pitchDrop":
        kickDrumRef.current.set_pitch_drop(value);
        break;
      case "volume":
        kickDrumRef.current.set_volume(value);
        break;
    }
  }

  function handleKickPresetChange(preset: string) {
    if (!kickDrumRef.current) return;

    setKickPreset(preset);

    // Create new kick drum with preset
    kickDrumRef.current = WasmKickDrum.new_with_preset(44100, preset);

    // Update state to match preset values
    switch (preset) {
      case "punchy":
        setKickConfig({
          frequency: 60.0,
          punch: 0.9,
          sub: 0.6,
          click: 0.4,
          decay: 0.6,
          pitchDrop: 0.7,
          volume: 0.85,
        });
        break;
      case "deep":
        setKickConfig({
          frequency: 45.0,
          punch: 0.5,
          sub: 1.0,
          click: 0.2,
          decay: 1.2,
          pitchDrop: 0.5,
          volume: 0.9,
        });
        break;
      case "tight":
        setKickConfig({
          frequency: 70.0,
          punch: 0.8,
          sub: 0.7,
          click: 0.5,
          decay: 0.4,
          pitchDrop: 0.8,
          volume: 0.6,
        });
        break;
      default: // default
        setKickConfig({
          frequency: 50.0,
          punch: 0.7,
          sub: 0.8,
          click: 0.3,
          decay: 0.8,
          pitchDrop: 0.6,
          volume: 0.6,
        });
    }
  }

  // Hi-hat functions
  function triggerHiHat(preset?: string) {
    if (!audioContextRef.current || !hihatRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Stop any existing hi-hat sound
      if (hihatAudioSourceRef.current) {
        try {
          hihatAudioSourceRef.current.stop();
        } catch (e) {
          // Source might already be stopped, ignore error
        }
        hihatAudioSourceRef.current = null;
      }

      // Change preset if provided
      if (preset && preset !== hihatPreset) {
        hihatRef.current = WasmHiHat.new_with_preset(44100, preset);
        setHihatPreset(preset);
        updateHihatConfigFromPreset(preset);
      }

      // Trigger hi-hat
      const currentTime = audioContextRef.current.currentTime;
      hihatRef.current.trigger(currentTime);

      // Generate audio buffer (1 second for hi-hat sounds)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate * 1; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferLength,
        sampleRate
      );

      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + i / sampleRate;
        channelData[i] = hihatRef.current.tick(time);
      }

      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to spectrum analyzer monitoring if available, otherwise directly to destination
      if (
        spectrumAnalyzerRef.current &&
        spectrumAnalyzerRef.current.getMonitoringNode()
      ) {
        source.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      // Clean up reference when source ends
      source.onended = () => {
        hihatAudioSourceRef.current = null;
      };

      hihatAudioSourceRef.current = source;
      source.start();

      console.log(`Hi-hat ${preset || hihatPreset} triggered!`);
    } catch (error) {
      console.error("Failed to trigger hi-hat:", error);
      alert("Failed to trigger hi-hat");
    }
  }

  function releaseHiHat() {
    if (!audioContextRef.current || !hihatRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      hihatRef.current.release(currentTime);
      console.log("Hi-hat released!");
    } catch (error) {
      console.error("Failed to release hi-hat:", error);
      alert("Failed to release hi-hat");
    }
  }

  function updateHihatConfigFromPreset(preset: string) {
    // Update state to match preset values based on HiHatConfig presets
    switch (preset) {
      case "closed_default":
        setHihatConfig({
          baseFrequency: 8000.0,
          resonance: 0.7,
          brightness: 0.6,
          decayTime: 0.1,
          attackTime: 0.001,
          volume: 0.6,
          isOpen: false,
        });
        break;
      case "open_default":
        setHihatConfig({
          baseFrequency: 8000.0,
          resonance: 0.5,
          brightness: 0.8,
          decayTime: 0.8,
          attackTime: 0.001,
          volume: 0.7,
          isOpen: true,
        });
        break;
      case "closed_tight":
        setHihatConfig({
          baseFrequency: 10000.0,
          resonance: 0.8,
          brightness: 0.5,
          decayTime: 0.05,
          attackTime: 0.001,
          volume: 0.9,
          isOpen: false,
        });
        break;
      case "open_bright":
        setHihatConfig({
          baseFrequency: 12000.0,
          resonance: 0.4,
          brightness: 1.0,
          decayTime: 1.2,
          attackTime: 0.001,
          volume: 0.6,
          isOpen: true,
        });
        break;
      case "closed_dark":
        setHihatConfig({
          baseFrequency: 6000.0,
          resonance: 0.6,
          brightness: 0.3,
          decayTime: 0.15,
          attackTime: 0.002,
          volume: 0.7,
          isOpen: false,
        });
        break;
      case "open_long":
        setHihatConfig({
          baseFrequency: 7000.0,
          resonance: 0.3,
          brightness: 0.7,
          decayTime: 2.0,
          attackTime: 0.001,
          volume: 0.6,
          isOpen: true,
        });
        break;
      default:
        setHihatConfig({
          baseFrequency: 8000.0,
          resonance: 0.7,
          brightness: 0.6,
          decayTime: 0.1,
          attackTime: 0.001,
          volume: 0.6,
          isOpen: false,
        });
    }
  }

  function handleHihatConfigChange(
    param: keyof typeof hihatConfig,
    value: number | boolean
  ) {
    if (!hihatRef.current) return;

    // Update local state
    setHihatConfig((prev) => ({ ...prev, [param]: value }));

    // Update the hi-hat
    switch (param) {
      case "baseFrequency":
        hihatRef.current.set_frequency(value as number);
        break;
      case "resonance":
        hihatRef.current.set_resonance(value as number);
        break;
      case "brightness":
        hihatRef.current.set_brightness(value as number);
        break;
      case "decayTime":
        hihatRef.current.set_decay(value as number);
        break;
      case "attackTime":
        hihatRef.current.set_attack(value as number);
        break;
      case "volume":
        hihatRef.current.set_volume(value as number);
        break;
      case "isOpen":
        hihatRef.current.set_open(value as boolean);
        break;
    }
  }

  function handleHihatPresetChange(preset: string) {
    if (!hihatRef.current) return;

    setHihatPreset(preset);

    // Create new hi-hat with preset
    hihatRef.current = WasmHiHat.new_with_preset(44100, preset);

    // Update state to match preset values
    updateHihatConfigFromPreset(preset);
  }

  // Snare drum functions
  function triggerSnareDrum() {
    if (!audioContextRef.current || !snareRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Stop any existing snare sound
      if (snareAudioSourceRef.current) {
        try {
          snareAudioSourceRef.current.stop();
        } catch (e) {
          // Source might already be stopped, ignore error
        }
        snareAudioSourceRef.current = null;
      }

      // Trigger snare
      const currentTime = audioContextRef.current.currentTime;
      snareRef.current.trigger(currentTime);

      // Generate audio buffer (1 second for snare sounds)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate * 1; // 1 second
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferLength,
        sampleRate
      );

      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + i / sampleRate;
        channelData[i] = snareRef.current.tick(time);
      }

      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to spectrum analyzer monitoring if available, otherwise directly to destination
      if (
        spectrumAnalyzerRef.current &&
        spectrumAnalyzerRef.current.getMonitoringNode()
      ) {
        source.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      // Clean up reference when source ends
      source.onended = () => {
        snareAudioSourceRef.current = null;
      };

      snareAudioSourceRef.current = source;
      source.start();

      console.log("Snare drum triggered!");
    } catch (error) {
      console.error("Failed to trigger snare drum:", error);
      alert("Failed to trigger snare drum");
    }
  }

  function releaseSnareDrum() {
    if (!audioContextRef.current || !snareRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      snareRef.current.release(currentTime);
      console.log("Snare drum released!");
    } catch (error) {
      console.error("Failed to release snare drum:", error);
      alert("Failed to release snare drum");
    }
  }

  function handleSnareConfigChange(
    param: keyof typeof snareConfig,
    value: number
  ) {
    if (!snareRef.current) return;

    // Update local state
    setSnareConfig((prev) => ({ ...prev, [param]: value }));

    // Update the snare drum
    switch (param) {
      case "frequency":
        snareRef.current.set_frequency(value);
        break;
      case "tonal":
        snareRef.current.set_tonal(value);
        break;
      case "noise":
        snareRef.current.set_noise(value);
        break;
      case "crack":
        snareRef.current.set_crack(value);
        break;
      case "decay":
        snareRef.current.set_decay(value);
        break;
      case "pitchDrop":
        snareRef.current.set_pitch_drop(value);
        break;
      case "volume":
        snareRef.current.set_volume(value);
        break;
    }
  }

  function handleSnarePresetChange(preset: string) {
    if (!snareRef.current) return;

    setSnarePreset(preset);

    // Create new snare drum with preset
    snareRef.current = WasmSnareDrum.new_with_preset(44100, preset);

    // Update state to match preset values
    switch (preset) {
      case "crispy":
        setSnareConfig({
          frequency: 250.0,
          tonal: 0.3,
          noise: 0.8,
          crack: 0.7,
          decay: 0.12,
          pitchDrop: 0.4,
          volume: 0.85,
        });
        break;
      case "deep":
        setSnareConfig({
          frequency: 180.0,
          tonal: 0.6,
          noise: 0.6,
          crack: 0.3,
          decay: 0.2,
          pitchDrop: 0.2,
          volume: 0.9,
        });
        break;
      case "tight":
        setSnareConfig({
          frequency: 220.0,
          tonal: 0.3,
          noise: 0.8,
          crack: 0.8,
          decay: 0.08,
          pitchDrop: 0.5,
          volume: 0.6,
        });
        break;
      case "fat":
        setSnareConfig({
          frequency: 160.0,
          tonal: 0.7,
          noise: 0.5,
          crack: 0.4,
          decay: 0.25,
          pitchDrop: 0.1,
          volume: 0.9,
        });
        break;
      default: // default
        setSnareConfig({
          frequency: 200.0,
          tonal: 0.4,
          noise: 0.7,
          crack: 0.5,
          decay: 0.15,
          pitchDrop: 0.3,
          volume: 0.6,
        });
    }
  }

  // Tom drum functions
  function triggerTomDrum() {
    if (!audioContextRef.current || !tomRef.current || !isPlaying) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      // Stop any existing tom sound
      if (tomAudioSourceRef.current) {
        try {
          tomAudioSourceRef.current.stop();
        } catch (e) {
          // Source might already be stopped, ignore error
        }
        tomAudioSourceRef.current = null;
      }

      // Trigger tom
      const currentTime = audioContextRef.current.currentTime;
      tomRef.current.trigger(currentTime);

      // Generate audio buffer (2 seconds for tom sounds)
      const sampleRate = audioContextRef.current.sampleRate;
      const bufferLength = sampleRate * 2; // 2 seconds
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        bufferLength,
        sampleRate
      );

      // Get the channel data and fill it with WASM-generated samples
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < bufferLength; i++) {
        const time = currentTime + i / sampleRate;
        channelData[i] = tomRef.current.tick(time);
      }

      // Create buffer source and play it
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to spectrum analyzer monitoring if available, otherwise directly to destination
      if (
        spectrumAnalyzerRef.current &&
        spectrumAnalyzerRef.current.getMonitoringNode()
      ) {
        source.connect(spectrumAnalyzerRef.current.getMonitoringNode()!);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      // Clean up reference when source ends
      source.onended = () => {
        tomAudioSourceRef.current = null;
      };

      tomAudioSourceRef.current = source;
      source.start();

      console.log("Tom drum triggered!");
    } catch (error) {
      console.error("Failed to trigger tom drum:", error);
      alert("Failed to trigger tom drum");
    }
  }

  function releaseTomDrum() {
    if (!audioContextRef.current || !tomRef.current) {
      alert('Audio not started yet. Click "Start Audio" first.');
      return;
    }

    try {
      const currentTime = audioContextRef.current.currentTime;
      tomRef.current.release(currentTime);
      console.log("Tom drum released!");
    } catch (error) {
      console.error("Failed to release tom drum:", error);
      alert("Failed to release tom drum");
    }
  }

  function handleTomConfigChange(param: keyof typeof tomConfig, value: number) {
    if (!tomRef.current) return;

    // Update local state
    setTomConfig((prev) => ({ ...prev, [param]: value }));

    // Update the tom drum
    switch (param) {
      case "frequency":
        tomRef.current.set_frequency(value);
        break;
      case "tonal":
        tomRef.current.set_tonal(value);
        break;
      case "punch":
        tomRef.current.set_punch(value);
        break;
      case "decay":
        tomRef.current.set_decay(value);
        break;
      case "pitchDrop":
        tomRef.current.set_pitch_drop(value);
        break;
      case "volume":
        tomRef.current.set_volume(value);
        break;
    }
  }

  function handleTomPresetChange(preset: string) {
    if (!tomRef.current) return;

    setTomPreset(preset);

    // Create new tom drum with preset
    tomRef.current = WasmTomDrum.new_with_preset(44100, preset);

    // Update state to match preset values
    switch (preset) {
      case "high_tom":
        setTomConfig({
          frequency: 180.0,
          tonal: 0.9,
          punch: 0.5,
          decay: 0.3,
          pitchDrop: 0.4,
          volume: 0.85,
        });
        break;
      case "mid_tom":
        setTomConfig({
          frequency: 120.0,
          tonal: 0.8,
          punch: 0.4,
          decay: 0.4,
          pitchDrop: 0.3,
          volume: 0.6,
        });
        break;
      case "low_tom":
        setTomConfig({
          frequency: 90.0,
          tonal: 0.7,
          punch: 0.3,
          decay: 0.6,
          pitchDrop: 0.2,
          volume: 0.85,
        });
        break;
      case "floor_tom":
        setTomConfig({
          frequency: 70.0,
          tonal: 0.6,
          punch: 0.2,
          decay: 0.8,
          pitchDrop: 0.15,
          volume: 0.9,
        });
        break;
      default: // default
        setTomConfig({
          frequency: 120.0,
          tonal: 0.8,
          punch: 0.4,
          decay: 0.4,
          pitchDrop: 0.3,
          volume: 0.6,
        });
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        WASM Audio Engine Test
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Controls */}
        <div className="space-y-4">
          <button
            onClick={loadWasm}
            disabled={isLoading || isLoaded}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Loading..."
              : isLoaded
              ? "Audio Engine Loaded (Stage + Kick)"
              : "Load Audio Engine"}
          </button>

          <button
            onClick={isPlaying ? stopAudio : startAudio}
            disabled={!isLoaded}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isPlaying ? "Stop Audio" : "Start Audio"}
          </button>

          {/* Keyboard Mapping Widget */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">⌨️ Keyboard Mapping</h3>
              <button
                onClick={() => setKeyboardEnabled(!keyboardEnabled)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  keyboardEnabled
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {keyboardEnabled ? "🔊 ON" : "🔇 OFF"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(keyMappings).map(([key, mapping]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border-2 transition-all duration-150 ${
                    pressedKeys.has(key)
                      ? `${mapping.color} border-white scale-95 shadow-lg`
                      : "bg-gray-800 border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{mapping.emoji}</span>
                      <div>
                        <div className="text-sm font-medium">
                          {mapping.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Press {key.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                        pressedKeys.has(key)
                          ? "bg-white text-gray-900"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      {key.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-400 mb-2">
              💡 Click anywhere on the page to ensure keyboard focus, then press
              A, S, D, or F to trigger instruments
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t pt-4">
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab("oscillators")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "oscillators"
                    ? "bg-blue-600 text-white border-b-2 border-blue-600"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🎵 Oscillators
              </button>
              <button
                onClick={() => setActiveTab("kick")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "kick"
                    ? "bg-red-600 text-white border-b-2 border-red-600"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🥁 Kick Drum
              </button>
              <button
                onClick={() => setActiveTab("hihat")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "hihat"
                    ? "bg-yellow-600 text-white border-b-2 border-yellow-600"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🔔 Hi-Hat
              </button>
              <button
                onClick={() => setActiveTab("snare")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "snare"
                    ? "bg-orange-600 text-white border-b-2 border-orange-600"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🥁 Snare
              </button>
              <button
                onClick={() => setActiveTab("tom")}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === "tom"
                    ? "bg-purple-600 text-white border-b-2 border-purple-600"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🥁 Tom
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "oscillators" && (
              <div>
                <h3 className="font-semibold mb-3 text-center">
                  Instrument Controls
                </h3>

                <button
                  onClick={triggerAll}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full px-4 py-2 mb-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  🥁 Trigger All Instruments
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => triggerInstrument(0, "Bass Drum")}
                    disabled={!isLoaded || !isPlaying}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    🥁 Bass (200Hz)
                  </button>

                  <button
                    onClick={() => triggerInstrument(1, "Snare")}
                    disabled={!isLoaded || !isPlaying}
                    className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    🥁 Snare (300Hz)
                  </button>

                  <button
                    onClick={() => triggerInstrument(2, "Hi-hat")}
                    disabled={!isLoaded || !isPlaying}
                    className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    🔔 Hi-hat (440Hz)
                  </button>

                  <button
                    onClick={() => triggerInstrument(3, "Cymbal")}
                    disabled={!isLoaded || !isPlaying}
                    className="px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    🥽 Cymbal (600Hz)
                  </button>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold mb-3 text-center">
                    Instrument Controls
                  </h4>
                  <div className="space-y-4">
                    {[
                      { name: "🥁 Bass Drum", color: "red" },
                      { name: "🥁 Snare", color: "orange" },
                      { name: "🔔 Hi-hat", color: "yellow" },
                      { name: "🥽 Cymbal", color: "cyan" },
                    ].map((instrument, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">
                            {instrument.name}
                          </h5>
                          <button
                            onClick={() =>
                              handleEnabledChange(index, !enabled[index])
                            }
                            disabled={!isLoaded}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors disabled:cursor-not-allowed ${
                              enabled[index]
                                ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600"
                                : "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-600"
                            }`}
                          >
                            {enabled[index] ? "🔊 ON" : "🔇 OFF"}
                          </button>
                        </div>

                        {/* Volume Control */}
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="w-12 text-xs font-medium">
                            Volume
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volumes[index]}
                            onChange={(e) =>
                              handleVolumeChange(
                                index,
                                parseFloat(e.target.value)
                              )
                            }
                            disabled={!isLoaded}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="w-10 text-xs font-mono text-right">
                            {volumes[index].toFixed(2)}
                          </span>
                        </div>

                        {/* Frequency Control */}
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="w-12 text-xs font-medium">
                            Freq
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="2000"
                            step="10"
                            value={frequencies[index]}
                            onChange={(e) =>
                              handleFrequencyChange(
                                index,
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!isLoaded}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="w-16 text-xs font-mono text-right">
                            {frequencies[index]}Hz
                          </span>
                        </div>

                        {/* Waveform Control */}
                        <div className="flex items-center space-x-2 mb-3">
                          <label className="w-12 text-xs font-medium">
                            Wave
                          </label>
                          <select
                            value={waveforms[index]}
                            onChange={(e) =>
                              handleWaveformChange(
                                index,
                                parseInt(e.target.value)
                              )
                            }
                            disabled={!isLoaded}
                            className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
                          >
                            <option value={0}>Sine</option>
                            <option value={1}>Square</option>
                            <option value={2}>Saw</option>
                            <option value={3}>Triangle</option>
                            <option value={4}>Ring Mod</option>
                          </select>
                        </div>

                        {/* Modulator Frequency Control (only for Ring Mod) */}
                        {waveforms[index] === 4 && (
                          <div className="flex items-center space-x-2 mb-3">
                            <label className="w-12 text-xs font-medium">
                              Mod
                            </label>
                            <input
                              type="range"
                              min="50"
                              max="2000"
                              step="10"
                              value={modulatorFrequencies[index]}
                              onChange={(e) =>
                                handleModulatorFrequencyChange(
                                  index,
                                  parseInt(e.target.value)
                                )
                              }
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
                            <label className="text-xs font-medium text-gray-300">
                              ADSR Envelope
                            </label>
                            <button
                              onClick={() =>
                                releaseInstrument(
                                  index,
                                  instrument.name.split(" ")[1] ||
                                    instrument.name
                                )
                              }
                              disabled={!isLoaded || !isPlaying}
                              className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                            >
                              Release
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Attack
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="range"
                                  min="0.001"
                                  max="2"
                                  step="0.001"
                                  value={adsrValues[index].attack}
                                  onChange={(e) =>
                                    handleAdsrChange(
                                      index,
                                      "attack",
                                      parseFloat(e.target.value)
                                    )
                                  }
                                  disabled={!isLoaded}
                                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className="w-12 text-xs font-mono text-right">
                                  {adsrValues[index].attack.toFixed(3)}s
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Decay
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="range"
                                  min="0.001"
                                  max="2"
                                  step="0.001"
                                  value={adsrValues[index].decay}
                                  onChange={(e) =>
                                    handleAdsrChange(
                                      index,
                                      "decay",
                                      parseFloat(e.target.value)
                                    )
                                  }
                                  disabled={!isLoaded}
                                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className="w-12 text-xs font-mono text-right">
                                  {adsrValues[index].decay.toFixed(3)}s
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Sustain
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={adsrValues[index].sustain}
                                  onChange={(e) =>
                                    handleAdsrChange(
                                      index,
                                      "sustain",
                                      parseFloat(e.target.value)
                                    )
                                  }
                                  disabled={!isLoaded}
                                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className="w-12 text-xs font-mono text-right">
                                  {adsrValues[index].sustain.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Release
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="range"
                                  min="0.001"
                                  max="5"
                                  step="0.001"
                                  value={adsrValues[index].release}
                                  onChange={(e) =>
                                    handleAdsrChange(
                                      index,
                                      "release",
                                      parseFloat(e.target.value)
                                    )
                                  }
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

                <button
                  onClick={releaseAll}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  Release All Instruments
                </button>
              </div>
            )}

            {/* Kick Drum Tab */}
            {activeTab === "kick" && (
              <div>
                <h3 className="font-semibold mb-4 text-center text-lg">
                  🥁 Kick Drum
                </h3>

                {/* Kick Drum Trigger Button */}
                <button
                  onClick={triggerKickDrum}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full px-4 py-3 mb-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
                >
                  🥁 TRIGGER KICK
                </button>

                {/* Preset Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Preset
                  </label>
                  <select
                    value={kickPreset}
                    onChange={(e) => handleKickPresetChange(e.target.value)}
                    disabled={!isLoaded}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
                  >
                    <option value="default">Default</option>
                    <option value="punchy">Punchy</option>
                    <option value="deep">Deep</option>
                    <option value="tight">Tight</option>
                  </select>
                </div>

                {/* Kick Drum Controls */}
                <div className="space-y-3">
                  {/* Frequency */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Frequency
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="1"
                      value={kickConfig.frequency}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "frequency",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.frequency.toFixed(0)}Hz
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={kickConfig.volume}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "volume",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.volume.toFixed(2)}
                    </span>
                  </div>

                  {/* Decay Time */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Decay</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.01"
                      value={kickConfig.decay}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "decay",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.decay.toFixed(2)}s
                    </span>
                  </div>

                  {/* Punch Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Punch</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={kickConfig.punch}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "punch",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.punch.toFixed(2)}
                    </span>
                  </div>

                  {/* Sub Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Sub Bass</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={kickConfig.sub}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "sub",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.sub.toFixed(2)}
                    </span>
                  </div>

                  {/* Click Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Click</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={kickConfig.click}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "click",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.click.toFixed(2)}
                    </span>
                  </div>

                  {/* Pitch Drop */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Pitch Drop
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={kickConfig.pitchDrop}
                      onChange={(e) =>
                        handleKickConfigChange(
                          "pitchDrop",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {kickConfig.pitchDrop.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Release Button */}
                <button
                  onClick={releaseKickDrum}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  Release Kick
                </button>
              </div>
            )}

            {/* Hi-Hat Tab */}
            {activeTab === "hihat" && (
              <div>
                <h3 className="font-semibold mb-4 text-center text-lg">
                  🔔 Hi-Hat
                </h3>

                {/* Hi-Hat Preset Buttons */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-center">
                    Quick Triggers
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerHiHat("closed_default")}
                      disabled={!isLoaded || !isPlaying}
                      className="px-3 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded hover:from-yellow-700 hover:to-yellow-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      🔔 Closed
                    </button>

                    <button
                      onClick={() => triggerHiHat("open_default")}
                      disabled={!isLoaded || !isPlaying}
                      className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded hover:from-yellow-600 hover:to-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      🔔 Open
                    </button>

                    <button
                      onClick={() => triggerHiHat("closed_tight")}
                      disabled={!isLoaded || !isPlaying}
                      className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded hover:from-amber-700 hover:to-amber-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      🔔 Tight
                    </button>

                    <button
                      onClick={() => triggerHiHat("open_bright")}
                      disabled={!isLoaded || !isPlaying}
                      className="px-3 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded hover:from-yellow-500 hover:to-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      🔔 Bright
                    </button>

                    <button
                      onClick={() => triggerHiHat("closed_dark")}
                      disabled={!isLoaded || !isPlaying}
                      className="px-3 py-2 bg-gradient-to-r from-yellow-700 to-yellow-800 text-white rounded hover:from-yellow-800 hover:to-yellow-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      🔔 Dark
                    </button>

                    <button
                      onClick={() => triggerHiHat("open_long")}
                      disabled={!isLoaded || !isPlaying}
                      className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded hover:from-amber-600 hover:to-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      🔔 Long
                    </button>
                  </div>
                </div>

                {/* Preset Selection Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Current Preset
                  </label>
                  <select
                    value={hihatPreset}
                    onChange={(e) => handleHihatPresetChange(e.target.value)}
                    disabled={!isLoaded}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
                  >
                    <option value="closed_default">Closed Default</option>
                    <option value="open_default">Open Default</option>
                    <option value="closed_tight">Closed Tight</option>
                    <option value="open_bright">Open Bright</option>
                    <option value="closed_dark">Closed Dark</option>
                    <option value="open_long">Open Long</option>
                  </select>
                </div>

                {/* Hi-Hat Controls */}
                <div className="space-y-3">
                  {/* Base Frequency */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Frequency
                    </label>
                    <input
                      type="range"
                      min="4000"
                      max="16000"
                      step="100"
                      value={hihatConfig.baseFrequency}
                      onChange={(e) =>
                        handleHihatConfigChange(
                          "baseFrequency",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-16 text-sm font-mono text-right">
                      {hihatConfig.baseFrequency.toFixed(0)}Hz
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={hihatConfig.volume}
                      onChange={(e) =>
                        handleHihatConfigChange(
                          "volume",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {hihatConfig.volume.toFixed(2)}
                    </span>
                  </div>

                  {/* Decay Time */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Decay</label>
                    <input
                      type="range"
                      min="0.01"
                      max="3"
                      step="0.01"
                      value={hihatConfig.decayTime}
                      onChange={(e) =>
                        handleHihatConfigChange(
                          "decayTime",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {hihatConfig.decayTime.toFixed(2)}s
                    </span>
                  </div>

                  {/* Brightness */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Brightness
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={hihatConfig.brightness}
                      onChange={(e) =>
                        handleHihatConfigChange(
                          "brightness",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {hihatConfig.brightness.toFixed(2)}
                    </span>
                  </div>

                  {/* Resonance */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Resonance
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={hihatConfig.resonance}
                      onChange={(e) =>
                        handleHihatConfigChange(
                          "resonance",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {hihatConfig.resonance.toFixed(2)}
                    </span>
                  </div>

                  {/* Attack Time */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Attack</label>
                    <input
                      type="range"
                      min="0.001"
                      max="0.1"
                      step="0.001"
                      value={hihatConfig.attackTime}
                      onChange={(e) =>
                        handleHihatConfigChange(
                          "attackTime",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {hihatConfig.attackTime.toFixed(3)}s
                    </span>
                  </div>

                  {/* Open/Closed Toggle */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Type</label>
                    <button
                      onClick={() =>
                        handleHihatConfigChange("isOpen", !hihatConfig.isOpen)
                      }
                      disabled={!isLoaded}
                      className={`px-4 py-2 text-sm font-medium rounded transition-colors disabled:cursor-not-allowed ${
                        hihatConfig.isOpen
                          ? "bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-gray-600"
                          : "bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-600"
                      }`}
                    >
                      {hihatConfig.isOpen ? "🔔 Open" : "🔔 Closed"}
                    </button>
                  </div>
                </div>

                {/* Release Button */}
                <button
                  onClick={releaseHiHat}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  Release Hi-Hat
                </button>
              </div>
            )}

            {/* Snare Tab */}
            {activeTab === "snare" && (
              <div>
                <h3 className="font-semibold mb-4 text-center text-lg">
                  🥁 Snare Drum
                </h3>

                {/* Snare Drum Trigger Button */}
                <button
                  onClick={triggerSnareDrum}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full px-4 py-3 mb-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
                >
                  🥁 TRIGGER SNARE
                </button>

                {/* Preset Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Preset
                  </label>
                  <select
                    value={snarePreset}
                    onChange={(e) => handleSnarePresetChange(e.target.value)}
                    disabled={!isLoaded}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
                  >
                    <option value="default">Default</option>
                    <option value="crispy">Crispy</option>
                    <option value="deep">Deep</option>
                    <option value="tight">Tight</option>
                    <option value="fat">Fat</option>
                  </select>
                </div>

                {/* Snare Drum Controls */}
                <div className="space-y-3">
                  {/* Frequency */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Frequency
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="600"
                      step="1"
                      value={snareConfig.frequency}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "frequency",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.frequency.toFixed(0)}Hz
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareConfig.volume}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "volume",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.volume.toFixed(2)}
                    </span>
                  </div>

                  {/* Decay Time */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Decay</label>
                    <input
                      type="range"
                      min="0.01"
                      max="2"
                      step="0.01"
                      value={snareConfig.decay}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "decay",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.decay.toFixed(2)}s
                    </span>
                  </div>

                  {/* Tonal Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Tonal</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareConfig.tonal}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "tonal",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.tonal.toFixed(2)}
                    </span>
                  </div>

                  {/* Noise Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Noise</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareConfig.noise}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "noise",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.noise.toFixed(2)}
                    </span>
                  </div>

                  {/* Crack Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Crack</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareConfig.crack}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "crack",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.crack.toFixed(2)}
                    </span>
                  </div>

                  {/* Pitch Drop */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Pitch Drop
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={snareConfig.pitchDrop}
                      onChange={(e) =>
                        handleSnareConfigChange(
                          "pitchDrop",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {snareConfig.pitchDrop.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Release Button */}
                <button
                  onClick={releaseSnareDrum}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  Release Snare
                </button>
              </div>
            )}

            {/* Tom Tab */}
            {activeTab === "tom" && (
              <div>
                <h3 className="font-semibold mb-4 text-center text-lg">
                  🥁 Tom Drum
                </h3>

                {/* Tom Drum Trigger Button */}
                <button
                  onClick={triggerTomDrum}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full px-4 py-3 mb-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
                >
                  🥁 TRIGGER TOM
                </button>

                {/* Preset Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Preset
                  </label>
                  <select
                    value={tomPreset}
                    onChange={(e) => handleTomPresetChange(e.target.value)}
                    disabled={!isLoaded}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded disabled:cursor-not-allowed"
                  >
                    <option value="default">Default</option>
                    <option value="high_tom">High Tom</option>
                    <option value="mid_tom">Mid Tom</option>
                    <option value="low_tom">Low Tom</option>
                    <option value="floor_tom">Floor Tom</option>
                  </select>
                </div>

                {/* Tom Drum Controls */}
                <div className="space-y-3">
                  {/* Frequency */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Frequency
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="400"
                      step="1"
                      value={tomConfig.frequency}
                      onChange={(e) =>
                        handleTomConfigChange(
                          "frequency",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {tomConfig.frequency.toFixed(0)}Hz
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={tomConfig.volume}
                      onChange={(e) =>
                        handleTomConfigChange(
                          "volume",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {tomConfig.volume.toFixed(2)}
                    </span>
                  </div>

                  {/* Decay Time */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Decay</label>
                    <input
                      type="range"
                      min="0.05"
                      max="3"
                      step="0.01"
                      value={tomConfig.decay}
                      onChange={(e) =>
                        handleTomConfigChange(
                          "decay",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {tomConfig.decay.toFixed(2)}s
                    </span>
                  </div>

                  {/* Tonal Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Tonal</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={tomConfig.tonal}
                      onChange={(e) =>
                        handleTomConfigChange(
                          "tonal",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {tomConfig.tonal.toFixed(2)}
                    </span>
                  </div>

                  {/* Punch Amount */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">Punch</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={tomConfig.punch}
                      onChange={(e) =>
                        handleTomConfigChange(
                          "punch",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {tomConfig.punch.toFixed(2)}
                    </span>
                  </div>

                  {/* Pitch Drop */}
                  <div className="flex items-center space-x-2">
                    <label className="w-20 text-sm font-medium">
                      Pitch Drop
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={tomConfig.pitchDrop}
                      onChange={(e) =>
                        handleTomConfigChange(
                          "pitchDrop",
                          parseFloat(e.target.value)
                        )
                      }
                      disabled={!isLoaded}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="w-12 text-sm font-mono text-right">
                      {tomConfig.pitchDrop.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Release Button */}
                <button
                  onClick={releaseTomDrum}
                  disabled={!isLoaded || !isPlaying}
                  className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  Release Tom
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Spectrum Analyzer and Status */}
        <div className="space-y-4">
          {/* Spectrum Analyzer */}
          <div>
            <SpectrumAnalyzerWithRef
              ref={spectrumAnalyzerRef}
              audioContext={audioContextRef.current}
              isActive={isPlaying}
              width={600}
              height={200}
            />
          </div>

          {/* Sequencer */}
          <Sequencer stage={stageRef.current} isPlaying={isPlaying} />

          {/* Mixer */}
          <Mixer
            kickVolume={kickConfig.volume}
            snareVolume={snareConfig.volume}
            hihatVolume={hihatConfig.volume}
            tomVolume={tomConfig.volume}
            onKickVolumeChange={(volume) => handleKickConfigChange('volume', volume)}
            onSnareVolumeChange={(volume) => handleSnareConfigChange('volume', volume)}
            onHihatVolumeChange={(volume) => handleHihatConfigChange('volume', volume)}
            onTomVolumeChange={(volume) => handleTomConfigChange('volume', volume)}
            isLoaded={isLoaded}
          />

          {/* Spectrogram Display */}
          <div>
            <SpectrogramDisplayWithRef
              ref={spectrogramRef}
              audioContext={audioContextRef.current}
              isActive={isPlaying}
              width={600}
              height={200}
              analyser={spectrumAnalyzerRef.current?.getAnalyser() || null}
            />
          </div>

          
          <div className="p-4 bg-gray-800 rounded">
            <h2 className="font-semibold mb-2">Status:</h2>
            <p>
              WASM Stage:{" "}
              {isLoaded ? "✅ Loaded (4 oscillators)" : "❌ Not loaded"}
            </p>
            <p>
              Kick Drum:{" "}
              {isLoaded && kickDrumRef.current ? "✅ Loaded" : "❌ Not loaded"}
            </p>
            <p>
              Hi-Hat:{" "}
              {isLoaded && hihatRef.current ? "✅ Loaded" : "❌ Not loaded"}
            </p>
            <p>
              Snare:{" "}
              {isLoaded && snareRef.current ? "✅ Loaded" : "❌ Not loaded"}
            </p>
            <p>
              Tom: {isLoaded && tomRef.current ? "✅ Loaded" : "❌ Not loaded"}
            </p>
            <p>
              Audio Context: {audioContextRef.current ? "✅ Ready" : "❌ No"}
            </p>
            <p>Audio Playing: {isPlaying ? "✅ Yes" : "❌ No"}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded">
        <h3 className="font-semibold mb-2 text-blue-300">Engine API Demo:</h3>
        <ul className="text-sm space-y-1 text-blue-100">
          <li>
            • <strong>Multi-instrument Stage</strong>: 4 oscillators with
            independent controls
          </li>
          <li>
            • <strong>Individual control</strong>: Trigger each instrument
            separately
          </li>
          <li>
            • <strong>Group control</strong>: Trigger all instruments
            simultaneously
          </li>
          <li>
            • <strong>Enable/disable</strong>: Toggle instruments on/off to
            mute/unmute individual instruments
          </li>
          <li>
            • <strong>Volume control</strong>: Adjust volume (0.0-1.0) for each
            instrument
          </li>
          <li>
            • <strong>Frequency control</strong>: Adjust frequency (50-2000Hz)
            for each instrument
          </li>
          <li>
            • <strong>Waveform control</strong>: Select waveform type (Sine,
            Square, Saw, Triangle, Ring Mod) for each instrument
          </li>
          <li>
            • <strong>Ring modulation</strong>: Modulator frequency control for
            Ring Mod waveform
          </li>
          <li>
            • <strong>ADSR envelope</strong>: Real-time Attack, Decay, Sustain,
            Release control per instrument
          </li>
          <li>
            • <strong>Release control</strong>: Manually trigger release phase
            for individual or all instruments
          </li>
          <li>
            • <strong>Kick Drum Instrument</strong>: Comprehensive 3-layer kick
            drum with sub-bass, punch, and click layers
          </li>
          <li>
            • <strong>Kick Presets</strong>: Built-in presets (Default, Punchy,
            Deep, Tight) for different kick styles
          </li>
          <li>
            • <strong>Kick Parameters</strong>: Frequency, punch, sub-bass,
            click, decay time, and pitch drop controls
          </li>
          <li>
            • <strong>Hi-Hat Instrument</strong>: Noise-based hi-hat with dual
            oscillators and envelope control
          </li>
          <li>
            • <strong>Hi-Hat Presets</strong>: 6 built-in presets (Closed
            Default, Open Default, Closed Tight, Open Bright, Closed Dark, Open
            Long)
          </li>
          <li>
            • <strong>Hi-Hat Parameters</strong>: Base frequency, resonance,
            brightness, decay time, attack time, volume, and open/closed mode
          </li>
          <li>
            • <strong>Snare Instrument</strong>: Comprehensive 3-layer snare
            drum with tonal, noise, and crack components
          </li>
          <li>
            • <strong>Snare Presets</strong>: Built-in presets (Default, Crispy,
            Deep, Tight, Fat) for different snare styles
          </li>
          <li>
            • <strong>Snare Parameters</strong>: Frequency, tonal amount, noise
            amount, crack amount, decay time, and pitch drop controls
          </li>
          <li>
            • <strong>Tom Instrument</strong>: Comprehensive tom drum with tonal
            and punch layers for realistic drum sounds
          </li>
          <li>
            • <strong>Tom Presets</strong>: Built-in presets (Default, High Tom,
            Mid Tom, Low Tom, Floor Tom) for different tom styles
          </li>
          <li>
            • <strong>Tom Parameters</strong>: Frequency, tonal amount, punch
            amount, decay time, and pitch drop controls
          </li>
          <li>
            • <strong>Audio mixing</strong>: Stage.tick() sums all instrument
            outputs with controls applied
          </li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
        <h3 className="font-semibold mb-2 text-yellow-300">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1 text-yellow-100">
          <li>
            Click "Load Audio Engine" to initialize the WASM Stage with 4
            oscillators, kick drum, hi-hat, snare, and tom
          </li>
          <li>Click "Start Audio" to begin audio processing</li>
          <li>
            <strong>🎹 Keyboard Mapping:</strong> Use keyboard shortcuts for
            quick testing:
            <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200 mt-1">
              <li>
                <strong>A</strong> → Trigger Kick Drum
              </li>
              <li>
                <strong>S</strong> → Trigger Snare Drum
              </li>
              <li>
                <strong>D</strong> → Trigger Hi-Hat
              </li>
              <li>
                <strong>F</strong> → Trigger Cymbal
              </li>
              <li>Toggle keyboard mapping on/off with the ON/OFF button</li>
              <li>Visual feedback shows which keys are currently pressed</li>
            </ul>
          </li>
          <li>Use individual instrument buttons to test single oscillators</li>
          <li>Adjust instrument controls for each oscillator:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li>
              <strong>Enable/Disable:</strong> Click ON/OFF button to
              mute/unmute individual instruments
            </li>
            <li>
              <strong>Volume:</strong> Control relative volume of each
              instrument (0.0-1.0)
            </li>
            <li>
              <strong>Frequency:</strong> Change the pitch of each instrument
              (50-2000Hz)
            </li>
            <li>
              <strong>Waveform:</strong> Select tone quality (Sine, Square, Saw,
              Triangle, Ring Mod)
            </li>
            <li>
              <strong>Modulator:</strong> Control modulator frequency for Ring
              Mod waveform (50-2000Hz)
            </li>
          </ul>
          <li>Adjust ADSR envelope controls to shape the sound envelope:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li>
              <strong>Attack:</strong> Time to reach full volume (0.001-2s)
            </li>
            <li>
              <strong>Decay:</strong> Time to drop to sustain level (0.001-2s)
            </li>
            <li>
              <strong>Sustain:</strong> Level held while triggered (0-1)
            </li>
            <li>
              <strong>Release:</strong> Time to fade to silence (0.001-5s)
            </li>
          </ul>
          <li>Use "Release" buttons to manually trigger the release phase</li>
          <li>Use "Release All" to release all instruments simultaneously</li>
          <li>
            Use "Trigger All" to hear the mixed output of all instruments with
            all controls applied
          </li>
          <li>
            Test the comprehensive kick drum with its own dedicated section:
          </li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li>
              <strong>Presets:</strong> Try different kick styles (Default,
              Punchy, Deep, Tight)
            </li>
            <li>
              <strong>Frequency:</strong> Adjust fundamental frequency
              (20-200Hz)
            </li>
            <li>
              <strong>Punch:</strong> Control mid-range impact layer
            </li>
            <li>
              <strong>Sub Bass:</strong> Control low-end presence
            </li>
            <li>
              <strong>Click:</strong> Control high-frequency transient
            </li>
            <li>
              <strong>Decay:</strong> Adjust overall decay time
            </li>
            <li>
              <strong>Pitch Drop:</strong> Control frequency sweep effect
            </li>
          </ul>
          <li>Test the hi-hat instrument with its dedicated section:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li>
              <strong>Quick Triggers:</strong> Use preset buttons for instant
              testing (Closed, Open, Tight, Bright, Dark, Long)
            </li>
            <li>
              <strong>Preset Selection:</strong> Choose from 6 different hi-hat
              styles in the dropdown
            </li>
            <li>
              <strong>Base Frequency:</strong> Adjust the fundamental frequency
              (4000-16000Hz)
            </li>
            <li>
              <strong>Brightness:</strong> Control high-frequency emphasis and
              transient sharpness
            </li>
            <li>
              <strong>Resonance:</strong> Adjust metallic character and filter
              resonance
            </li>
            <li>
              <strong>Decay Time:</strong> Control how long the hi-hat rings out
            </li>
            <li>
              <strong>Attack Time:</strong> Adjust the initial transient speed
            </li>
            <li>
              <strong>Open/Closed Toggle:</strong> Switch between open and
              closed hi-hat modes
            </li>
          </ul>
          <li>Test the snare drum instrument with its dedicated section:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li>
              <strong>Presets:</strong> Try different snare styles (Default,
              Crispy, Deep, Tight, Fat)
            </li>
            <li>
              <strong>Frequency:</strong> Adjust fundamental frequency
              (100-600Hz)
            </li>
            <li>
              <strong>Tonal Amount:</strong> Control the body and pitch
              component of the snare
            </li>
            <li>
              <strong>Noise Amount:</strong> Control the main snare noise
              character
            </li>
            <li>
              <strong>Crack Amount:</strong> Control high-frequency snap and
              crack
            </li>
            <li>
              <strong>Decay Time:</strong> Adjust overall decay time (0.01-2s)
            </li>
            <li>
              <strong>Pitch Drop:</strong> Control frequency sweep effect for
              realistic sound
            </li>
          </ul>
          <li>Test the tom drum instrument with its dedicated section:</li>
          <ul className="list-disc list-inside ml-4 text-xs space-y-0.5 text-yellow-200">
            <li>
              <strong>Presets:</strong> Try different tom styles (Default, High
              Tom, Mid Tom, Low Tom, Floor Tom)
            </li>
            <li>
              <strong>Frequency:</strong> Adjust fundamental frequency
              (60-400Hz)
            </li>
            <li>
              <strong>Tonal Amount:</strong> Control the body and pitch
              component of the tom
            </li>
            <li>
              <strong>Punch Amount:</strong> Control mid-range impact and attack
              character
            </li>
            <li>
              <strong>Decay Time:</strong> Adjust overall decay time (0.05-3s)
            </li>
            <li>
              <strong>Pitch Drop:</strong> Control frequency sweep effect for
              realistic tom sound
            </li>
          </ul>
        </ol>
      </div>
    </div>
  );
}
