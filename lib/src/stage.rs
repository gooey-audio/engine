use crate::envelope::ADSRConfig;
use crate::oscillator::Oscillator;

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub limiter: BrickWallLimiter,
    pub compressor: Compressor,
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
            compressor: Compressor::new(sample_rate),
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
        // Apply compressor then limiter to the combined output
        let compressed = self.compressor.process(output);
        self.limiter.process(compressed)
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

    /// Set the limiter threshold (typically 0.0 to 1.0)
    pub fn set_limiter_threshold(&mut self, threshold: f32) {
        self.limiter.threshold = threshold;
    }

    /// Get the current limiter threshold
    pub fn get_limiter_threshold(&self) -> f32 {
        self.limiter.threshold
    }

    /// Set the compressor threshold (dB)
    pub fn set_compressor_threshold(&mut self, threshold_db: f32) {
        self.compressor.threshold_db = threshold_db;
    }

    /// Get the current compressor threshold (dB)
    pub fn get_compressor_threshold(&self) -> f32 {
        self.compressor.threshold_db
    }

    /// Set the compressor ratio (1.0 = no compression, higher = more compression)
    pub fn set_compressor_ratio(&mut self, ratio: f32) {
        self.compressor.ratio = ratio.max(1.0); // Ensure ratio is at least 1.0
    }

    /// Get the current compressor ratio
    pub fn get_compressor_ratio(&self) -> f32 {
        self.compressor.ratio
    }

    /// Set the compressor attack time (seconds)
    pub fn set_compressor_attack(&mut self, attack_seconds: f32) {
        self.compressor.set_attack(attack_seconds);
    }

    /// Get the current compressor attack time (seconds)
    pub fn get_compressor_attack(&self) -> f32 {
        self.compressor.attack_seconds
    }

    /// Set the compressor release time (seconds)
    pub fn set_compressor_release(&mut self, release_seconds: f32) {
        self.compressor.set_release(release_seconds);
    }

    /// Get the current compressor release time (seconds)
    pub fn get_compressor_release(&self) -> f32 {
        self.compressor.release_seconds
    }

    /// Set the compressor makeup gain (dB)
    pub fn set_compressor_makeup_gain(&mut self, gain_db: f32) {
        self.compressor.makeup_gain_db = gain_db;
    }

    /// Get the current compressor makeup gain (dB)
    pub fn get_compressor_makeup_gain(&self) -> f32 {
        self.compressor.makeup_gain_db
    }

    /// Enable or disable the compressor
    pub fn set_compressor_enabled(&mut self, enabled: bool) {
        self.compressor.enabled = enabled;
    }

    /// Check if the compressor is enabled
    pub fn is_compressor_enabled(&self) -> bool {
        self.compressor.enabled
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

/// A basic compressor that applies dynamic range compression to audio signals
pub struct Compressor {
    pub sample_rate: f32,
    pub threshold_db: f32,
    pub ratio: f32,
    pub attack_seconds: f32,
    pub release_seconds: f32,
    pub makeup_gain_db: f32,
    pub enabled: bool,
    // Internal state
    envelope: f32,
    attack_coeff: f32,
    release_coeff: f32,
}

impl Compressor {
    pub fn new(sample_rate: f32) -> Self {
        let mut compressor = Self {
            sample_rate,
            threshold_db: -12.0,  // Default threshold at -12dB
            ratio: 4.0,           // 4:1 compression ratio
            attack_seconds: 0.003, // 3ms attack
            release_seconds: 0.1,  // 100ms release
            makeup_gain_db: 0.0,   // No makeup gain by default
            enabled: true,         // Enabled by default
            envelope: 0.0,
            attack_coeff: 0.0,
            release_coeff: 0.0,
        };
        
        // Calculate initial coefficients
        compressor.update_coefficients();
        compressor
    }

    fn update_coefficients(&mut self) {
        // Calculate attack and release coefficients for envelope follower
        self.attack_coeff = (-1.0 / (self.attack_seconds * self.sample_rate)).exp();
        self.release_coeff = (-1.0 / (self.release_seconds * self.sample_rate)).exp();
    }

    pub fn set_attack(&mut self, attack_seconds: f32) {
        self.attack_seconds = attack_seconds.max(0.001); // Minimum 1ms
        self.update_coefficients();
    }

    pub fn set_release(&mut self, release_seconds: f32) {
        self.release_seconds = release_seconds.max(0.001); // Minimum 1ms
        self.update_coefficients();
    }

    /// Convert dB to linear amplitude
    fn db_to_linear(db: f32) -> f32 {
        10.0_f32.powf(db / 20.0)
    }

    /// Convert linear amplitude to dB
    fn linear_to_db(linear: f32) -> f32 {
        20.0 * linear.abs().max(1e-10).log10()
    }

    /// Apply compression to the input signal
    pub fn process(&mut self, input: f32) -> f32 {
        if !self.enabled {
            return input;
        }

        // Get input level in dB
        let input_db = Self::linear_to_db(input);
        
        // Update envelope follower
        let target_envelope = if input_db > self.envelope {
            input_db
        } else {
            input_db
        };
        
        self.envelope = if target_envelope > self.envelope {
            // Attack
            target_envelope + (self.envelope - target_envelope) * self.attack_coeff
        } else {
            // Release
            target_envelope + (self.envelope - target_envelope) * self.release_coeff
        };

        // Calculate gain reduction
        let gain_reduction_db = if self.envelope > self.threshold_db {
            let overshoot = self.envelope - self.threshold_db;
            -(overshoot * (self.ratio - 1.0) / self.ratio)
        } else {
            0.0
        };

        // Apply gain reduction and makeup gain
        let total_gain_db = gain_reduction_db + self.makeup_gain_db;
        let gain_linear = Self::db_to_linear(total_gain_db);

        input * gain_linear
    }
}
