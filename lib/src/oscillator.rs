use crate::envelope::{ADSRConfig, Envelope};
use crate::waveform::Waveform;
use crate::noise::{NoiseGenerator, NoiseType};

pub struct Oscillator {
    pub sample_rate: f32,
    pub waveform: Waveform,
    pub current_sample_index: f32,
    pub frequency_hz: f32,
    pub envelope: Envelope,
    pub volume: f32,
    pub modulator_frequency_hz: f32,
    pub enabled: bool,
    // Noise generators for each noise type
    white_noise: NoiseGenerator,
    pink_noise: NoiseGenerator,
    brown_noise: NoiseGenerator,
    snare_noise: NoiseGenerator,
}

impl Oscillator {
    pub fn new(sample_rate: f32, frequency_hz: f32) -> Self {
        Self {
            sample_rate,
            waveform: Waveform::Square,
            current_sample_index: 0.0,
            frequency_hz,
            envelope: Envelope::new(),
            volume: 1.0,
            modulator_frequency_hz: frequency_hz * 0.5, // Default modulator at half carrier frequency
            enabled: true,
            // Initialize noise generators with different seeds for variation
            white_noise: NoiseGenerator::new(NoiseType::White, 12345),
            pink_noise: NoiseGenerator::new(NoiseType::Pink, 23456),
            brown_noise: NoiseGenerator::new(NoiseType::Brown, 34567),
            snare_noise: NoiseGenerator::new(NoiseType::Snare, 45678),
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

    fn sine_wave(&mut self) -> f32 {
        self.advance_sample();
        self.calculate_sine_output_from_freq(self.frequency_hz)
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

    fn square_wave(&mut self) -> f32 {
        self.generative_waveform(2, 1.0)
    }

    fn saw_wave(&mut self) -> f32 {
        self.generative_waveform(1, 1.0)
    }

    fn triangle_wave(&mut self) -> f32 {
        self.generative_waveform(2, 2.0)
    }

    fn ring_mod_wave(&mut self) -> f32 {
        self.advance_sample();
        let carrier = self.calculate_sine_output_from_freq(self.frequency_hz);
        let modulator = self.calculate_sine_output_from_freq(self.modulator_frequency_hz);
        carrier * modulator
    }

    fn white_noise_wave(&mut self) -> f32 {
        self.advance_sample();
        self.white_noise.generate()
    }

    fn pink_noise_wave(&mut self) -> f32 {
        self.advance_sample();
        self.pink_noise.generate()
    }

    fn brown_noise_wave(&mut self) -> f32 {
        self.advance_sample();
        self.brown_noise.generate()
    }

    fn snare_noise_wave(&mut self) -> f32 {
        self.advance_sample();
        self.snare_noise.generate()
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

    pub fn set_modulator_frequency(&mut self, frequency_hz: f32) {
        self.modulator_frequency_hz = frequency_hz.max(0.0);
    }

    pub fn get_modulator_frequency(&self) -> f32 {
        self.modulator_frequency_hz
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.enabled {
            return 0.0;
        }
        let raw_output = match self.waveform {
            Waveform::Sine => self.sine_wave(),
            Waveform::Square => self.square_wave(),
            Waveform::Saw => self.saw_wave(),
            Waveform::Triangle => self.triangle_wave(),
            Waveform::RingMod => self.ring_mod_wave(),
            Waveform::WhiteNoise => self.white_noise_wave(),
            Waveform::PinkNoise => self.pink_noise_wave(),
            Waveform::BrownNoise => self.brown_noise_wave(),
            Waveform::SnareNoise => self.snare_noise_wave(),
        };
        let envelope_amplitude = self.envelope.get_amplitude(current_time);
        raw_output * envelope_amplitude * self.volume
    }
}
