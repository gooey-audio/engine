use crate::envelope::{ADSRConfig, Envelope};
use crate::noise::{NoiseGenerator, NoiseType};
use crate::waveform::Waveform;

pub struct SnareInstrument {
    pub sample_rate: f32,
    pub current_sample_index: f32,
    pub frequency_hz: f32, // Frequency for the tonal component
    pub envelope: Envelope,
    pub volume: f32,
    pub enabled: bool,
    
    // Noise component
    noise_generator: NoiseGenerator,
    noise_mix_level: f32, // 0.0 = pure tonal, 1.0 = pure noise
    
    // Mix between tonal and noise (different from noise_mix_level)
    tonal_noise_mix: f32, // 0.0 = pure tonal, 1.0 = pure noise
}

impl SnareInstrument {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            current_sample_index: 0.0,
            frequency_hz: 200.0, // Typical snare fundamental frequency
            envelope: Envelope::with_config(Self::drum_adsr_default()),
            volume: 1.0,
            enabled: true,
            noise_generator: NoiseGenerator::new(NoiseType::Snare, 12345), // Fixed seed for consistency
            noise_mix_level: 0.7, // 70% noise intensity
            tonal_noise_mix: 0.3, // 30% tonal, 70% noise
        }
    }

    // ADSR configuration optimized for drum sounds
    pub fn drum_adsr_default() -> ADSRConfig {
        ADSRConfig::new(
            0.001, // Very fast attack (1ms)
            0.05,  // Short decay (50ms)
            0.1,   // Low sustain (10%)
            0.2,   // Quick release (200ms)
        )
    }

    fn advance_sample(&mut self) {
        self.current_sample_index = (self.current_sample_index + 1.0) % self.sample_rate;
    }

    fn triangle_wave(&mut self) -> f32 {
        self.advance_sample();
        let two_pi = 2.0 * std::f32::consts::PI;
        let phase = self.current_sample_index * self.frequency_hz * two_pi / self.sample_rate;
        
        // Triangle wave using sine wave approximation
        let sine = phase.sin();
        if sine >= 0.0 {
            1.0 - 2.0 * (phase % (std::f32::consts::PI)) / std::f32::consts::PI
        } else {
            -1.0 + 2.0 * ((phase + std::f32::consts::PI) % (std::f32::consts::PI)) / std::f32::consts::PI
        }
    }

    pub fn trigger(&mut self, time: f32) {
        self.envelope.trigger(time);
    }

    pub fn release(&mut self, time: f32) {
        self.envelope.release(time);
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume.clamp(0.0, 1.0);
    }

    pub fn set_adsr(&mut self, config: ADSRConfig) {
        self.envelope.set_config(config);
    }

    pub fn set_frequency(&mut self, frequency_hz: f32) {
        self.frequency_hz = frequency_hz.max(50.0);
    }

    pub fn get_frequency(&self) -> f32 {
        self.frequency_hz
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn set_noise_mix_level(&mut self, level: f32) {
        self.noise_mix_level = level.clamp(0.0, 1.0);
    }

    pub fn get_noise_mix_level(&self) -> f32 {
        self.noise_mix_level
    }

    pub fn set_tonal_noise_mix(&mut self, mix: f32) {
        self.tonal_noise_mix = mix.clamp(0.0, 1.0);
    }

    pub fn get_tonal_noise_mix(&self) -> f32 {
        self.tonal_noise_mix
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.enabled {
            return 0.0;
        }

        // Generate tonal component (triangle wave)
        let tonal = self.triangle_wave();
        
        // Generate noise component
        let noise = self.noise_generator.generate() * self.noise_mix_level;
        
        // Mix tonal and noise components
        let mixed_signal = tonal * (1.0 - self.tonal_noise_mix) + noise * self.tonal_noise_mix;
        
        // Apply envelope and volume
        let envelope_amplitude = self.envelope.get_amplitude(current_time);
        mixed_signal * envelope_amplitude * self.volume
    }
}