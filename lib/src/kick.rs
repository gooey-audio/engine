use crate::envelope::{ADSRConfig, Envelope};
use crate::oscillator::Oscillator;
use crate::waveform::Waveform;

#[derive(Clone, Copy, Debug)]
pub struct KickConfig {
    pub kick_frequency: f32, // Base frequency (40-80Hz typical)
    pub punch_amount: f32,   // Mid-frequency presence (0.0-1.0)
    pub sub_amount: f32,     // Sub-bass presence (0.0-1.0)
    pub click_amount: f32,   // High-frequency click (0.0-1.0)
    pub decay_time: f32,     // Overall decay length in seconds
    pub pitch_drop: f32,     // Frequency sweep amount (0.0-1.0)
    pub volume: f32,         // Overall volume (0.0-1.0)
}

impl KickConfig {
    pub fn new(
        kick_frequency: f32,
        punch_amount: f32,
        sub_amount: f32,
        click_amount: f32,
        decay_time: f32,
        pitch_drop: f32,
        volume: f32,
    ) -> Self {
        Self {
            kick_frequency: kick_frequency.max(20.0).min(200.0), // Reasonable kick range
            punch_amount: punch_amount.clamp(0.0, 1.0),
            sub_amount: sub_amount.clamp(0.0, 1.0),
            click_amount: click_amount.clamp(0.0, 1.0),
            decay_time: decay_time.max(0.01).min(5.0), // Reasonable decay range
            pitch_drop: pitch_drop.clamp(0.0, 1.0),
            volume: volume.clamp(0.0, 1.0),
        }
    }

    pub fn default() -> Self {
        Self::new(50.0, 0.7, 0.8, 0.3, 0.8, 0.6, 0.8)
    }

    pub fn punchy() -> Self {
        Self::new(60.0, 0.9, 0.6, 0.4, 0.6, 0.7, 0.85)
    }

    pub fn deep() -> Self {
        Self::new(45.0, 0.5, 1.0, 0.2, 1.2, 0.5, 0.9)
    }

    pub fn tight() -> Self {
        Self::new(70.0, 0.8, 0.7, 0.5, 0.4, 0.8, 0.8)
    }
}

pub struct KickDrum {
    pub sample_rate: f32,
    pub config: KickConfig,

    // Three oscillators for different frequency ranges
    pub sub_oscillator: Oscillator,   // Sub-bass (fundamental)
    pub punch_oscillator: Oscillator, // Mid-range punch
    pub click_oscillator: Oscillator, // High-frequency click

    // Pitch envelope for frequency sweeping
    pub pitch_envelope: Envelope,
    pub base_frequency: f32,
    pub pitch_start_multiplier: f32,

    // High-pass filter state for click oscillator
    pub click_filter_state: f32,

    pub is_active: bool,
}

impl KickDrum {
    pub fn new(sample_rate: f32) -> Self {
        let config = KickConfig::default();
        Self::with_config(sample_rate, config)
    }

    pub fn with_config(sample_rate: f32, config: KickConfig) -> Self {
        let mut kick = Self {
            sample_rate,
            config,
            sub_oscillator: Oscillator::new(sample_rate, config.kick_frequency),
            punch_oscillator: Oscillator::new(sample_rate, config.kick_frequency * 2.5),
            click_oscillator: Oscillator::new(sample_rate, config.kick_frequency * 40.0),
            pitch_envelope: Envelope::new(),
            base_frequency: config.kick_frequency,
            pitch_start_multiplier: 1.0 + config.pitch_drop * 2.0, // Start 1-3x higher
            click_filter_state: 0.0,
            is_active: false,
        };

        kick.configure_oscillators();
        kick
    }

    fn configure_oscillators(&mut self) {
        let config = self.config;

        // Sub oscillator: Deep sine wave with synchronized timing
        self.sub_oscillator.waveform = Waveform::Sine;
        self.sub_oscillator.frequency_hz = config.kick_frequency;
        self.sub_oscillator
            .set_volume(config.sub_amount * config.volume);
        self.sub_oscillator.set_adsr(ADSRConfig::new(
            0.001,             // Very fast attack
            config.decay_time, // Synchronized decay time
            0.0,               // No sustain
            config.decay_time * 0.2, // Synchronized release
        ));

        // Punch oscillator: Sine or triangle for mid-range impact
        self.punch_oscillator.waveform = Waveform::Triangle;
        self.punch_oscillator.frequency_hz = config.kick_frequency * 2.5;
        self.punch_oscillator
            .set_volume(config.punch_amount * config.volume * 0.7);
        self.punch_oscillator.set_adsr(ADSRConfig::new(
            0.001,             // Very fast attack
            config.decay_time, // Synchronized decay time
            0.0,               // No sustain
            config.decay_time * 0.2, // Synchronized release
        ));

        // Click oscillator: High-frequency filtered noise transient
        self.click_oscillator.waveform = Waveform::Noise;
        self.click_oscillator.frequency_hz = config.kick_frequency * 40.0;
        self.click_oscillator
            .set_volume(config.click_amount * config.volume * 0.3);
        self.click_oscillator.set_adsr(ADSRConfig::new(
            0.001,                     // Very fast attack
            config.decay_time * 0.2,   // Much shorter decay time for click
            0.0,                       // No sustain
            config.decay_time * 0.02,  // Extremely short release for click
        ));

        // Pitch envelope: Fast attack, synchronized decay for frequency sweeping
        self.pitch_envelope.set_config(ADSRConfig::new(
            0.001,             // Instant attack
            config.decay_time, // Synchronized decay time
            0.0,               // Drop to base frequency
            config.decay_time * 0.2, // Synchronized release
        ));
    }

    pub fn set_config(&mut self, config: KickConfig) {
        self.config = config;
        self.base_frequency = config.kick_frequency;
        self.pitch_start_multiplier = 1.0 + config.pitch_drop * 2.0;
        self.configure_oscillators();
    }

    pub fn trigger(&mut self, time: f32) {
        self.is_active = true;

        // Trigger all oscillators
        self.sub_oscillator.trigger(time);
        self.punch_oscillator.trigger(time);
        self.click_oscillator.trigger(time);

        // Trigger pitch envelope
        self.pitch_envelope.trigger(time);

        // Reset filter state for clean click transients
        self.click_filter_state = 0.0;
    }

    pub fn release(&mut self, time: f32) {
        if self.is_active {
            self.sub_oscillator.release(time);
            self.punch_oscillator.release(time);
            self.click_oscillator.release(time);
            self.pitch_envelope.release(time);
        }
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.is_active {
            return 0.0;
        }

        // Calculate pitch modulation
        let pitch_envelope_value = self.pitch_envelope.get_amplitude(current_time);
        let frequency_multiplier = 1.0 + (self.pitch_start_multiplier - 1.0) * pitch_envelope_value;

        // Apply pitch envelope to oscillators
        self.sub_oscillator.frequency_hz = self.base_frequency * frequency_multiplier;
        self.punch_oscillator.frequency_hz = self.base_frequency * 2.5 * frequency_multiplier;

        // Click oscillator gets less pitch modulation to maintain transient character
        let click_pitch_mod = 1.0 + (frequency_multiplier - 1.0) * 0.3;
        self.click_oscillator.frequency_hz = self.base_frequency * 40.0 * click_pitch_mod;

        // Sum all oscillator outputs
        let sub_output = self.sub_oscillator.tick(current_time);
        let punch_output = self.punch_oscillator.tick(current_time);
        let raw_click_output = self.click_oscillator.tick(current_time);
        
        // Apply resonant high-pass filtering to click for more realistic sound
        let filtered_click_output = self.apply_resonant_highpass_filter(raw_click_output);

        let total_output = sub_output + punch_output + filtered_click_output;

        // Check if kick is still active
        if !self.sub_oscillator.envelope.is_active
            && !self.punch_oscillator.envelope.is_active
            && !self.click_oscillator.envelope.is_active
        {
            self.is_active = false;
        }

        total_output
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.config.volume = volume.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_frequency(&mut self, frequency: f32) {
        self.config.kick_frequency = frequency.max(20.0).min(200.0);
        self.base_frequency = self.config.kick_frequency;
        self.configure_oscillators();
    }

    pub fn set_decay(&mut self, decay_time: f32) {
        self.config.decay_time = decay_time.max(0.01).min(5.0);
        self.configure_oscillators();
    }

    pub fn set_punch(&mut self, punch_amount: f32) {
        self.config.punch_amount = punch_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_sub(&mut self, sub_amount: f32) {
        self.config.sub_amount = sub_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_click(&mut self, click_amount: f32) {
        self.config.click_amount = click_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_pitch_drop(&mut self, pitch_drop: f32) {
        self.config.pitch_drop = pitch_drop.clamp(0.0, 1.0);
        self.pitch_start_multiplier = 1.0 + self.config.pitch_drop * 2.0;
    }

    fn apply_resonant_highpass_filter(&mut self, input: f32) -> f32 {
        // Resonant high-pass filter implementation
        // Cutoff frequency around 8kHz for click enhancement
        let cutoff_freq = 8000.0;
        let resonance = 4.0; // Increased resonance for more pronounced filtering
        
        // Calculate filter coefficients
        let omega = 2.0 * std::f32::consts::PI * cutoff_freq / self.sample_rate;
        let sin_omega = omega.sin();
        let cos_omega = omega.cos();
        let alpha = sin_omega / (2.0 * resonance);
        
        // High-pass filter coefficients
        let b0 = (1.0 + cos_omega) / 2.0;
        let b1 = -(1.0 + cos_omega);
        let b2 = (1.0 + cos_omega) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;
        
        // Normalize coefficients
        let norm_b0 = b0 / a0;
        let norm_b1 = b1 / a0;
        let norm_b2 = b2 / a0;
        let norm_a1 = a1 / a0;
        let norm_a2 = a2 / a0;
        
        // Apply filter (simple one-pole approximation for efficiency)
        let alpha_simple = 1.0 - (-2.0 * std::f32::consts::PI * cutoff_freq / self.sample_rate).exp();
        let high_pass = input - self.click_filter_state;
        self.click_filter_state += alpha_simple * high_pass;
        
        // Add resonance boost
        high_pass * (1.0 + resonance * 0.1)
    }
}
