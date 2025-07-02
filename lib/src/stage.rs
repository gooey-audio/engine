use crate::envelope::ADSRConfig;
use crate::oscillator::Oscillator;

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub compressor: Compressor,
    pub limiter: BrickWallLimiter,
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            compressor: Compressor::new(sample_rate),
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
        // Apply compressor before limiter if enabled
        output = self.compressor.process(output);
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

    // Compressor control methods
    pub fn set_compressor_enabled(&mut self, enabled: bool) {
        self.compressor.enabled = enabled;
    }

    pub fn is_compressor_enabled(&self) -> bool {
        self.compressor.enabled
    }

    pub fn set_compressor_threshold(&mut self, threshold: f32) {
        self.compressor.threshold = threshold;
    }

    pub fn get_compressor_threshold(&self) -> f32 {
        self.compressor.threshold
    }

    pub fn set_compressor_ratio(&mut self, ratio: f32) {
        self.compressor.ratio = ratio;
    }

    pub fn get_compressor_ratio(&self) -> f32 {
        self.compressor.ratio
    }

    pub fn set_compressor_attack(&mut self, attack_ms: f32) {
        self.compressor.set_attack(attack_ms);
    }

    pub fn get_compressor_attack(&self) -> f32 {
        self.compressor.get_attack()
    }

    pub fn set_compressor_release(&mut self, release_ms: f32) {
        self.compressor.set_release(release_ms);
    }

    pub fn get_compressor_release(&self) -> f32 {
        self.compressor.get_release()
    }

    pub fn set_compressor_makeup_gain(&mut self, gain_db: f32) {
        self.compressor.makeup_gain_db = gain_db;
    }

    pub fn get_compressor_makeup_gain(&self) -> f32 {
        self.compressor.makeup_gain_db
    }
}

/// A compressor that applies dynamic range compression to audio signals
pub struct Compressor {
    pub enabled: bool,
    pub threshold: f32,           // dB
    pub ratio: f32,               // compression ratio (e.g., 4.0 = 4:1)
    pub attack_coeff: f32,        // attack time coefficient
    pub release_coeff: f32,       // release time coefficient
    pub makeup_gain_db: f32,      // makeup gain in dB
    envelope_follower: f32,       // current envelope level
    sample_rate: f32,             // for calculating time constants
}

impl Compressor {
    pub fn new(sample_rate: f32) -> Self {
        let mut compressor = Self {
            enabled: false,
            threshold: -12.0,    // -12dB threshold
            ratio: 4.0,          // 4:1 ratio
            attack_coeff: 0.0,
            release_coeff: 0.0,
            makeup_gain_db: 0.0, // 0dB makeup gain
            envelope_follower: 0.0,
            sample_rate,
        };
        compressor.set_attack(3.0);   // 3ms attack
        compressor.set_release(100.0); // 100ms release
        compressor
    }

    pub fn set_attack(&mut self, attack_ms: f32) {
        // Convert milliseconds to time constant coefficient
        let attack_seconds = attack_ms / 1000.0;
        self.attack_coeff = (-1.0 / (attack_seconds * self.sample_rate)).exp();
    }

    pub fn get_attack(&self) -> f32 {
        // Convert back to milliseconds
        if self.attack_coeff == 0.0 {
            return 0.001;
        }
        -1000.0 / (self.attack_coeff.ln() * self.sample_rate)
    }

    pub fn set_release(&mut self, release_ms: f32) {
        // Convert milliseconds to time constant coefficient
        let release_seconds = release_ms / 1000.0;
        self.release_coeff = (-1.0 / (release_seconds * self.sample_rate)).exp();
    }

    pub fn get_release(&self) -> f32 {
        // Convert back to milliseconds
        if self.release_coeff == 0.0 {
            return 10.0;
        }
        -1000.0 / (self.release_coeff.ln() * self.sample_rate)
    }

    pub fn process(&mut self, input: f32) -> f32 {
        if !self.enabled {
            return input;
        }

        // Convert input to dB
        let input_db = if input.abs() > 0.000001 {
            20.0 * input.abs().log10()
        } else {
            -120.0 // Very quiet signal
        };

        // Envelope follower
        let target_level = input_db;
        if target_level > self.envelope_follower {
            // Attack
            self.envelope_follower = target_level + (self.envelope_follower - target_level) * self.attack_coeff;
        } else {
            // Release
            self.envelope_follower = target_level + (self.envelope_follower - target_level) * self.release_coeff;
        }

        // Calculate gain reduction
        let gain_reduction_db = if self.envelope_follower > self.threshold {
            let over_threshold = self.envelope_follower - self.threshold;
            over_threshold * (1.0 - 1.0 / self.ratio)
        } else {
            0.0
        };

        // Apply makeup gain and gain reduction
        let total_gain_db = self.makeup_gain_db - gain_reduction_db;
        let gain_linear = (total_gain_db * 0.05 * std::f32::consts::LN_10).exp(); // Convert dB to linear

        input * gain_linear
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
