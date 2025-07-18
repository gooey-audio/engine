import React from 'react';

import { useLibGooey } from './src/index';

export function DrumMachineExample() {
  const { 
    stage, 
    kickDrum, 
    hiHat, 
    snareDrum, 
    tomDrum, 
    isLoaded, 
    isLoading, 
    error,
    initialize 
  } = useLibGooey({
    autoInit: false // Manual initialization for demo
  });

  const handleInitialize = async () => {
    await initialize();
  };

  const triggerKick = () => {
    if (kickDrum) {
      kickDrum.trigger(0);
      console.log('Kick triggered!');
    }
  };

  const triggerHiHat = () => {
    if (hiHat) {
      hiHat.trigger(0);
      console.log('Hi-Hat triggered!');
    }
  };

  const triggerSnare = () => {
    if (snareDrum) {
      snareDrum.trigger(0);
      console.log('Snare triggered!');
    }
  };

  const triggerTom = () => {
    if (tomDrum) {
      tomDrum.trigger(0);
      console.log('Tom triggered!');
    }
  };

  const startSequencer = () => {
    if (stage) {
      stage.sequencer_set_default_patterns();
      stage.sequencer_play();
      console.log('Sequencer started!');
    }
  };

  const stopSequencer = () => {
    if (stage) {
      stage.sequencer_stop();
      console.log('Sequencer stopped!');
    }
  };

  if (isLoading) {
    return <div>Loading audio engine...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!isLoaded) {
    return (
      <div>
        <h2>LibGooey Drum Machine</h2>
        <p>Click to initialize the audio engine:</p>
        <button onClick={handleInitialize}>Initialize Audio</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>LibGooey Drum Machine</h2>
      <p>Audio engine loaded successfully! 🎵</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Individual Drums</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button 
            onClick={triggerKick}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#ff6b6b' }}
          >
            🥁 Kick
          </button>
          <button 
            onClick={triggerSnare}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#4ecdc4' }}
          >
            🥁 Snare
          </button>
          <button 
            onClick={triggerHiHat}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#ffe66d' }}
          >
            🔔 Hi-Hat
          </button>
          <button 
            onClick={triggerTom}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#a8e6cf' }}
          >
            🥁 Tom
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Sequencer</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={startSequencer}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#6c5ce7' }}
          >
            ▶️ Start Sequencer
          </button>
          <button 
            onClick={stopSequencer}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#fd79a8' }}
          >
            ⏹️ Stop Sequencer
          </button>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h4>Status</h4>
        <p>✅ Audio Context: {stage ? 'Active' : 'Inactive'}</p>
        <p>✅ Kick Drum: {kickDrum ? 'Ready' : 'Not ready'}</p>
        <p>✅ Hi-Hat: {hiHat ? 'Ready' : 'Not ready'}</p>
        <p>✅ Snare: {snareDrum ? 'Ready' : 'Not ready'}</p>
        <p>✅ Tom: {tomDrum ? 'Ready' : 'Not ready'}</p>
      </div>
    </div>
  );
} 