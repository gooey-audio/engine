'use client';

import React, { useRef, useEffect, useState } from 'react';

interface SpectrogramDisplayProps {
  audioContext: AudioContext | null;
  isActive: boolean;
  width?: number;
  height?: number;
  analyser?: AnalyserNode | null;
}

export default function SpectrogramDisplay({ 
  audioContext, 
  isActive, 
  width = 800, 
  height = 200, 
  analyser 
}: SpectrogramDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const spectrogramDataRef = useRef<number[][]>([]);
  const [spectrogramInstance, setSpectrogramInstance] = useState<any>(null);

  // Initialize spectrogram
  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const initSpectrogram = async () => {
      try {
        const spectrogramModule = await import('spectrogram');
        const Spectrogram = spectrogramModule.default || spectrogramModule;
        
        const spectrogram = new (Spectrogram as any)({
          canvas: canvasRef.current,
          audio: {
            enable: false // We'll provide data manually
          },
          colors: function(steps: number) {
            const colors = [];
            for (let i = 0; i < steps; i++) {
              const ratio = i / steps;
              // Create a color gradient from blue to red
              const hue = (1 - ratio) * 240; // Blue to red
              const saturation = 80;
              const lightness = 20 + ratio * 60; // Darker to lighter
              colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
            }
            return colors;
          },
          frequencyLabels: true,
          timeLabels: true,
          windowFunction: 'hanning',
          fftSize: 2048,
          noverlap: 512,
          zoomLevel: 1
        });
        
        setSpectrogramInstance(spectrogram);
      } catch (error) {
        console.error('Failed to initialize spectrogram:', error);
        // Fall back to manual drawing mode
        console.log('Using manual spectrogram drawing mode');
      }
    };

    initSpectrogram();
  }, [analyser]);

  // Animation loop for updating the spectrogram
  useEffect(() => {
    if (!isActive || !analyser) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function updateSpectrogram() {
      if (!analyser) return;

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Convert to array of numbers normalized to 0-1 range
      const normalizedData = Array.from(dataArray).map(value => value / 255);

      // Add new data to spectrogram
      spectrogramDataRef.current.push(normalizedData);

      // Keep only the last N time slices to prevent memory issues
      const maxTimeSlices = Math.floor(width / 2);
      if (spectrogramDataRef.current.length > maxTimeSlices) {
        spectrogramDataRef.current.shift();
      }

      // Update the spectrogram visualization
      if (spectrogramInstance) {
        try {
          spectrogramInstance.connectSource(normalizedData);
        } catch (error) {
          // If the direct data feeding doesn't work, we'll fall back to manual drawing
          drawManualSpectrogram(normalizedData);
        }
      } else {
        // Use manual drawing when spectrogram library is not available
        drawManualSpectrogram(normalizedData);
      }

      animationFrameRef.current = requestAnimationFrame(updateSpectrogram);
    }

    updateSpectrogram();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, analyser, spectrogramInstance, width]);

  // Manual spectrogram drawing as fallback
  const drawManualSpectrogram = (frequencyData: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Shift existing image data to the left
    const imageData = ctx.getImageData(1, 0, width - 1, height);
    ctx.putImageData(imageData, 0, 0);

    // Draw new frequency data as a vertical line on the right
    const sliceWidth = 1;
    const x = width - sliceWidth;

    for (let i = 0; i < frequencyData.length; i++) {
      const y = height - (i / frequencyData.length) * height;
      const intensity = frequencyData[i];
      
      // Color based on intensity
      const hue = (1 - intensity) * 240; // Blue to red
      const saturation = 80;
      const lightness = 20 + intensity * 60;
      
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.fillRect(x, y, sliceWidth, height / frequencyData.length);
    }
  };

  return (
    <div className="spectrogram-container bg-gray-800 p-4 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Spectrogram</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isActive && analyser ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-300">
            {isActive && analyser ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full border border-gray-500 rounded bg-gray-900"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      <div className="mt-2 text-xs text-gray-400 text-center">
        Time-frequency representation of audio output
      </div>
    </div>
  );
}

// Export the component with a ref to access methods
export const SpectrogramDisplayWithRef = React.forwardRef<
  { connectSource: (source: AudioNode) => void },
  SpectrogramDisplayProps
>((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    connectSource: (source: AudioNode) => {
      // This will use the same analyser as the spectrum analyzer
      // No need to create a new connection
      console.log('Spectrogram display connected to audio source');
    }
  }));

  return <SpectrogramDisplay {...props} />;
});

SpectrogramDisplayWithRef.displayName = 'SpectrogramDisplayWithRef';