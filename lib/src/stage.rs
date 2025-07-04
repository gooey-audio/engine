use crate::envelope::ADSRConfig;
use crate::oscillator::Oscillator;

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub limiter: BrickWallLimiter,
    pub global_distortion_enabled: bool,
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
            global_distortion_enabled: false, // Default to disabled to prevent volume issues
        }
    }

    pub fn add(&mut self, mut instrument: Oscillator) {
        // Ensure the instrument uses the same sample rate as the stage
        instrument.sample_rate = self.sample_rate;
        self.instruments.push(instrument);
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        let mut output = 0.0;
        for instrument in &mut self.instruments {
            output += instrument.tick(current_time);
        }
        // Apply limiter to the combined output
        self.limiter.process(output)
    }

    pub fn trigger_all(&mut self, time: f32) {
        for instrument in &mut self.instruments {
            instrument.trigger(time);
        }
    }

    pub fn trigger_instrument(&mut self, index: usize, time: f32) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.trigger(time);
        }
    }

    pub fn set_instrument_volume(&mut self, index: usize, volume: f32) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.set_volume(volume);
        }
    }

    pub fn get_instrument_volume(&self, index: usize) -> f32 {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.volume
        } else {
            0.0
        }
    }

    pub fn release_instrument(&mut self, index: usize, time: f32) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.release(time);
        }
    }

    pub fn release_all(&mut self, time: f32) {
        for instrument in &mut self.instruments {
            instrument.release(time);
        }
    }

    pub fn set_instrument_adsr(&mut self, index: usize, config: ADSRConfig) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.set_adsr(config);
        }
    }

    pub fn set_instrument_frequency(&mut self, index: usize, frequency_hz: f32) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.frequency_hz = frequency_hz;
        }
    }

    pub fn get_instrument_frequency(&self, index: usize) -> f32 {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.frequency_hz
        } else {
            0.0
        }
    }

    pub fn set_instrument_waveform(&mut self, index: usize, waveform: crate::waveform::Waveform) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.waveform = waveform;
        }
    }

    pub fn get_instrument_waveform(&self, index: usize) -> crate::waveform::Waveform {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.waveform
        } else {
            crate::waveform::Waveform::Sine
        }
    }

    pub fn set_instrument_modulator_frequency(&mut self, index: usize, frequency_hz: f32) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.set_modulator_frequency(frequency_hz);
        }
    }

    pub fn get_instrument_modulator_frequency(&self, index: usize) -> f32 {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.get_modulator_frequency()
        } else {
            0.0
        }
    }

    pub fn set_instrument_enabled(&mut self, index: usize, enabled: bool) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.set_enabled(enabled);
        }
    }

    pub fn is_instrument_enabled(&self, index: usize) -> bool {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.is_enabled()
        } else {
            false
        }
    }

    /// Set the limiter threshold (typically 0.0 to 1.0)
    pub fn set_limiter_threshold(&mut self, threshold: f32) {
        self.limiter.threshold = threshold;
    }

    /// Get the current limiter threshold
    pub fn get_limiter_threshold(&self) -> f32 {
        self.limiter.threshold
    }
    
    /// Set the global distortion enabled state
    pub fn set_global_distortion_enabled(&mut self, enabled: bool) {
        self.global_distortion_enabled = enabled;
    }
    
    /// Get the global distortion enabled state
    pub fn is_global_distortion_enabled(&self) -> bool {
        self.global_distortion_enabled
    }
}

/// A brick wall limiter that prevents audio signals from exceeding a threshold
pub struct BrickWallLimiter {
    pub threshold: f32,
}

impl BrickWallLimiter {
    pub fn new(threshold: f32) -> Self {
        Self { threshold }
    }

    /// Apply brick wall limiting to the input signal
    pub fn process(&self, input: f32) -> f32 {
        if input > self.threshold {
            self.threshold
        } else if input < -self.threshold {
            -self.threshold
        } else {
            input
        }
    }
}
