use crate::envelope::{Envelope, ADSRConfig};
use crate::noise::{NoiseMixer, NoiseType};
use crate::waveform::Waveform;

/// Snare drum instrument that combines tonal and noise components
pub struct SnareInstrument {
    /// Sample rate for the instrument
    pub sample_rate: f32,
    /// Current sample index for tonal component
    pub current_sample_index: f32,
    /// Frequency of the tonal component (typically low, around 200-250 Hz)
    pub frequency_hz: f32,
    /// Volume control (0.0 to 1.0)
    pub volume: f32,
    /// ADSR envelope for the overall instrument
    pub envelope: Envelope,
    /// Noise mixer for the noise component
    pub noise_mixer: NoiseMixer,
    /// Mix ratio between tonal and noise (0.0 = all tonal, 1.0 = all noise)
    pub tonal_noise_mix: f32,
    /// Waveform for the tonal component
    pub tonal_waveform: Waveform,
}

impl SnareInstrument {
    /// Create a new snare instrument with default settings
    pub fn new(sample_rate: f32) -> Self {
        // Default snare settings
        let frequency_hz = 200.0; // Low frequency tonal component
        let noise_mix_level = 0.6; // 60% noise, good for snare character
        let tonal_noise_mix = 0.3; // Mix favoring noise over tonal
        
        // Create drum-appropriate ADSR envelope
        let drum_adsr = ADSRConfig::new(
            0.001,  // Very fast attack (1ms)
            0.05,   // Quick decay (50ms)
            0.1,    // Low sustain (10% - characteristic of drums)
            0.2,    // Quick release (200ms)
        );

        Self {
            sample_rate,
            current_sample_index: 0.0,
            frequency_hz,
            volume: 1.0,
            envelope: Envelope::with_config(drum_adsr),
            noise_mixer: NoiseMixer::new(sample_rate, NoiseType::Snare, noise_mix_level),
            tonal_noise_mix,
            tonal_waveform: Waveform::Triangle, // Triangle wave for warmer tone
        }
    }

    /// Create a snare instrument with custom settings
    pub fn with_settings(
        sample_rate: f32,
        frequency_hz: f32,
        noise_mix_level: f32,
        tonal_noise_mix: f32,
        adsr_config: ADSRConfig,
    ) -> Self {
        Self {
            sample_rate,
            current_sample_index: 0.0,
            frequency_hz,
            volume: 1.0,
            envelope: Envelope::with_config(adsr_config),
            noise_mixer: NoiseMixer::new(sample_rate, NoiseType::Snare, noise_mix_level),
            tonal_noise_mix: tonal_noise_mix.clamp(0.0, 1.0),
            tonal_waveform: Waveform::Triangle,
        }
    }

    /// Trigger the snare instrument
    pub fn trigger(&mut self, time: f32) {
        self.envelope.trigger(time);
        self.noise_mixer.reset();
        self.current_sample_index = 0.0;
    }

    /// Release the snare instrument
    pub fn release(&mut self, time: f32) {
        self.envelope.release(time);
    }

    /// Set the volume (0.0 to 1.0)
    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume.clamp(0.0, 1.0);
    }

    /// Set the ADSR configuration
    pub fn set_adsr(&mut self, config: ADSRConfig) {
        self.envelope.set_config(config);
    }

    /// Set the noise mix level (0.0 to 1.0)
    pub fn set_noise_mix_level(&mut self, level: f32) {
        self.noise_mixer.set_mix_level(level);
    }

    /// Set the tonal/noise balance (0.0 = all tonal, 1.0 = all noise)
    pub fn set_tonal_noise_mix(&mut self, mix: f32) {
        self.tonal_noise_mix = mix.clamp(0.0, 1.0);
    }

    /// Set the frequency of the tonal component
    pub fn set_frequency(&mut self, frequency_hz: f32) {
        self.frequency_hz = frequency_hz;
    }

    /// Set the noise type
    pub fn set_noise_type(&mut self, noise_type: NoiseType) {
        self.noise_mixer.set_noise_type(noise_type);
    }

    /// Set the tonal waveform
    pub fn set_tonal_waveform(&mut self, waveform: Waveform) {
        // Only allow non-noise waveforms for tonal component
        match waveform {
            Waveform::Sine | Waveform::Square | Waveform::Saw | Waveform::Triangle => {
                self.tonal_waveform = waveform;
            }
            _ => {
                // Ignore noise waveforms for tonal component
            }
        }
    }

    fn advance_sample(&mut self) {
        self.current_sample_index = (self.current_sample_index + 1.0) % self.sample_rate;
    }

    fn calculate_sine_output_from_freq(&self, freq: f32) -> f32 {
        let two_pi = 2.0 * std::f32::consts::PI;
        (self.current_sample_index * freq * two_pi / self.sample_rate).sin()
    }

    fn is_multiple_of_freq_above_nyquist(&self, multiple: f32) -> bool {
        self.frequency_hz * multiple > self.sample_rate / 2.0
    }

    fn generative_waveform(&mut self, harmonic_index_increment: i32, gain_exponent: f32) -> f32 {
        self.advance_sample();
        let mut output = 0.0;
        let mut i = 1;
        while !self.is_multiple_of_freq_above_nyquist(i as f32) {
            let gain = 1.0 / (i as f32).powf(gain_exponent);
            output += gain * self.calculate_sine_output_from_freq(self.frequency_hz * i as f32);
            i += harmonic_index_increment;
        }
        output
    }

    fn generate_tonal_component(&mut self) -> f32 {
        match self.tonal_waveform {
            Waveform::Sine => {
                self.advance_sample();
                self.calculate_sine_output_from_freq(self.frequency_hz)
            }
            Waveform::Square => self.generative_waveform(2, 1.0),
            Waveform::Saw => self.generative_waveform(1, 1.0),
            Waveform::Triangle => self.generative_waveform(2, 2.0),
            _ => 0.0, // Noise waveforms not supported for tonal component
        }
    }

    /// Generate the next audio sample
    pub fn tick(&mut self, current_time: f32) -> f32 {
        // Generate tonal component
        let tonal_component = self.generate_tonal_component();
        
        // Generate noise component
        let noise_component = self.noise_mixer.generate_noise();
        
        // Mix tonal and noise components
        let mixed_signal = tonal_component * (1.0 - self.tonal_noise_mix) + 
                          noise_component * self.tonal_noise_mix;
        
        // Apply envelope and volume
        let envelope_amplitude = self.envelope.get_amplitude(current_time);
        mixed_signal * envelope_amplitude * self.volume
    }

    /// Check if the instrument is currently active
    pub fn is_active(&self) -> bool {
        self.envelope.is_active
    }
}