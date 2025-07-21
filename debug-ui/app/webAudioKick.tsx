"use client";

import { useRef, useCallback, useEffect } from 'react';
import { WebAudioStage, KickConfig, KickConfigDefaults } from '../lib';

export function useWebAudioKick(config?: Partial<KickConfig>) {
  const stageRef = useRef<WebAudioStage | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!stageRef.current) {
      stageRef.current = new WebAudioStage();
      // Apply custom config if provided
      if (config && stageRef.current.isActive) {
        stageRef.current.setKickConfig(config);
      }
    }
    
    return () => {
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []);

  const initializeAudio = useCallback(async () => {
    if (!stageRef.current) return false;

    const success = await stageRef.current.initialize();
    isInitialized.current = success;
    
    // Apply custom config after initialization if provided
    if (success && config) {
      stageRef.current.setKickConfig(config);
    }
    
    return success;
  }, [config]);

  const triggerKick = useCallback(() => {
    if (!stageRef.current || !isInitialized.current) {
      console.warn('Audio stage not initialized');
      return;
    }
    
    stageRef.current.triggerKick();
  }, []);

  const setConfig = useCallback((newConfig: Partial<KickConfig>) => {
    if (stageRef.current) {
      stageRef.current.setKickConfig(newConfig);
    }
  }, []);

  const setPreset = useCallback((preset: 'default' | 'punchy' | 'deep' | 'tight') => {
    if (stageRef.current) {
      stageRef.current.setKickPreset(preset);
    }
  }, []);

  return {
    triggerKick,
    initializeAudio,
    setConfig,
    setPreset,
    stage: stageRef.current,
    isInitialized: isInitialized.current,
    isAudioSupported: typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)
  };
}

export default function WebAudioKickTest() {
  const { triggerKick, initializeAudio, setPreset, isAudioSupported, isInitialized } = useWebAudioKick();

  const handleInitialize = async () => {
    const success = await initializeAudio();
    if (success) {
      console.log('WebAudio stage initialized successfully');
    } else {
      console.error('Failed to initialize WebAudio stage');
    }
  };

  const handleTriggerKick = () => {
    triggerKick();
    console.log('WebAudio kick triggered!');
  };

  const handlePresetChange = (preset: 'default' | 'punchy' | 'deep' | 'tight') => {
    setPreset(preset);
    console.log(`Kick preset changed to: ${preset}`);
  };

  if (!isAudioSupported) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">WebAudio Not Supported</h3>
        <p>Your browser does not support WebAudio API</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-green-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">WebAudio Kick Drum</h3>
      <div className="space-y-3">
        <button
          onClick={handleInitialize}
          disabled={isInitialized}
          className={`w-full px-4 py-3 text-white rounded transition-colors ${
            isInitialized 
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isInitialized ? '✅ WebAudio Initialized' : 'Initialize WebAudio'}
        </button>
        
        <button
          onClick={handleTriggerKick}
          disabled={!isInitialized}
          className={`w-full px-4 py-3 text-white rounded transition-colors ${
            !isInitialized
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          🥁 Trigger WebAudio Kick
        </button>
        
        {isInitialized && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Presets:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePresetChange('default')}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
              >
                Default
              </button>
              <button
                onClick={() => handlePresetChange('punchy')}
                className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
              >
                Punchy
              </button>
              <button
                onClick={() => handlePresetChange('deep')}
                className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
              >
                Deep
              </button>
              <button
                onClick={() => handlePresetChange('tight')}
                className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
              >
                Tight
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}