use crate::oscillator::Oscillator;
use crate::envelope::ADSRConfig;

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub limiter: BrickWallLimiter,
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
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

    /// Set the limiter threshold (typically 0.0 to 1.0)
    pub fn set_limiter_threshold(&mut self, threshold: f32) {
        self.limiter.threshold = threshold;
    }

    /// Get the current limiter threshold
    pub fn get_limiter_threshold(&self) -> f32 {
        self.limiter.threshold
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
