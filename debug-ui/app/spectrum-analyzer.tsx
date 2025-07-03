'use client';

import React, { useRef, useEffect, useState } from 'react';

interface SpectrumAnalyzerProps {
  audioContext: AudioContext | null;
  isActive: boolean;
  width?: number;
  height?: number;
  analyser?: AnalyserNode | null;
}

export default function SpectrumAnalyzer({ audioContext, isActive, width, height = 200, analyser }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(width || 800);

  // Use the passed analyser directly
  useEffect(() => {
    if (analyser) {
      console.log('Spectrum analyzer using external analyser node');
    }
  }, [analyser]);

  // Handle responsive width when no width prop is provided
  useEffect(() => {
    if (width) {
      setCanvasWidth(width);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width: observedWidth } = entry.contentRect;
        setCanvasWidth(Math.floor(observedWidth));
      }
    });

    resizeObserver.observe(canvas.parentElement!);

    return () => resizeObserver.disconnect();
  }, [width]);

  // Animation loop for drawing the spectrum
  useEffect(() => {
    if (!isActive || !analyser || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!canvasContext || !analyser) return;

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      canvasContext.fillStyle = 'rgb(30, 30, 30)';
      canvasContext.fillRect(0, 0, canvasWidth, height);

      // Draw frequency bars
      const barWidth = canvasWidth / bufferLength * 2.5;
      let x = 0;

      // Calculate frequency labels
      const sampleRate = analyser.context.sampleRate;
      const nyquist = sampleRate / 2;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        
        // Color gradient based on frequency and amplitude
        const frequency = (i / bufferLength) * nyquist;
        const hue = Math.min(240, 240 - (frequency / nyquist) * 240); // Blue to red
        const saturation = 80;
        const lightness = Math.min(70, 20 + (dataArray[i] / 255) * 50);
        
        canvasContext.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }

      // Draw frequency scale
      canvasContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
      canvasContext.font = '10px monospace';
      canvasContext.textAlign = 'center';
      
      // Mark important frequencies
      const frequencies = [100, 500, 1000, 2000, 5000, 10000];
      frequencies.forEach(freq => {
        if (freq < nyquist) {
          const x = (freq / nyquist) * (canvasWidth / 2.5);
          canvasContext.fillText(`${freq}Hz`, x, height - 5);
          
          // Draw frequency line
          canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          canvasContext.lineWidth = 1;
          canvasContext.beginPath();
          canvasContext.moveTo(x, 0);
          canvasContext.lineTo(x, height - 15);
          canvasContext.stroke();
        }
      });

      // Draw amplitude scale
      canvasContext.textAlign = 'left';
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * height;
        const db = -60 + (i / 4) * 60; // -60dB to 0dB range
        canvasContext.fillText(`${db}dB`, 5, y + 4);
        
        // Draw amplitude line
        canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        canvasContext.lineWidth = 1;
        canvasContext.beginPath();
        canvasContext.moveTo(40, y);
        canvasContext.lineTo(canvasWidth, y);
        canvasContext.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, canvasWidth, height, analyser]);

  return (
    <div className="spectrum-analyzer-container bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Spectrum Analyzer</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isActive && analyser ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-300">
            {isActive && analyser ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        className="w-full border border-gray-500 rounded bg-gray-900"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      <div className="mt-2 text-xs text-gray-400 text-center">
        Real-time frequency analysis of final audio output
      </div>
    </div>
  );
}

// Export the component with a ref to access connectSource method
export const SpectrumAnalyzerWithRef = React.forwardRef<
  { connectSource: (source: AudioNode) => void; getAnalyser: () => AnalyserNode | null; getMonitoringNode: () => GainNode | null },
  SpectrumAnalyzerProps
>((props, ref) => {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  // Setup the analyzer when audioContext is available
  useEffect(() => {
    if (!props.audioContext || isSetup) return;

    try {
      // Create analyzer node
      const analyser = props.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      // Create gain node for monitoring without affecting output
      const gainNode = props.audioContext.createGain();
      gainNode.gain.value = 1.0; // Pass-through gain
      
      // Create monitoring gain node that connects to analyzer
      const monitorGain = props.audioContext.createGain();
      monitorGain.gain.value = 1.0; // Monitor at full level
      
      // Replace the default destination with our monitoring setup
      // All audio will flow through: source -> gainNode -> destination
      //                                     \-> monitorGain -> analyser
      gainNode.connect(props.audioContext.destination);
      gainNode.connect(monitorGain);
      monitorGain.connect(analyser);
      
      analyserRef.current = analyser;
      gainNodeRef.current = gainNode;
      monitorGainRef.current = monitorGain;
      setIsSetup(true);
      
      console.log('Spectrum analyzer setup complete - monitoring final output');
    } catch (error) {
      console.error('Failed to setup spectrum analyzer:', error);
    }
  }, [props.audioContext, isSetup]);

  React.useImperativeHandle(ref, () => ({
    connectSource: (source: AudioNode) => {
      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
        console.log('Audio source connected to spectrum analyzer monitoring');
      }
    },
    getAnalyser: () => analyserRef.current,
    getMonitoringNode: () => gainNodeRef.current,
  }));

  return <SpectrumAnalyzer {...props} analyser={analyserRef.current} />;
});

SpectrumAnalyzerWithRef.displayName = 'SpectrumAnalyzerWithRef';