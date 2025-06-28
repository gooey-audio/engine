use crate::envelope::{ADSRConfig, Envelope};
use crate::instrument::Instrument;

pub struct FMOscillator {
    pub sample_rate: f32,
    pub carrier_freq: f32,
    pub modulator_freq: f32,
    pub time: f32,
    pub mod_index_envelope: Envelope,
    pub volume: f32,
}

impl FMOscillator {
    pub fn new(sample_rate: f32, carrier_freq: f32, modulator_freq: f32) -> Self {
        // Create a fast-decay envelope for drum-like sound as specified in the pseudocode
        let mod_index_config = ADSRConfig::new(
            0.001, // Very fast attack
            0.01,  // Fast decay (10ms as mentioned in pseudocode)
            0.0,   // No sustain - decays to zero
            0.001, // Fast release
        );

        Self {
            sample_rate,
            carrier_freq,
            modulator_freq,
            time: 0.0,
            mod_index_envelope: Envelope::with_config(mod_index_config),
            volume: 1.0,
        }
    }

    pub fn trigger(&mut self, time: f32) {
        self.mod_index_envelope.trigger(time);
        self.time = 0.0; // Reset time when triggered
    }

    pub fn release(&mut self, time: f32) {
        self.mod_index_envelope.release(time);
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume.clamp(0.0, 1.0);
    }

    pub fn set_carrier_freq(&mut self, freq: f32) {
        self.carrier_freq = freq;
    }

    pub fn set_modulator_freq(&mut self, freq: f32) {
        self.modulator_freq = freq;
    }

    pub fn set_mod_index_adsr(&mut self, config: ADSRConfig) {
        self.mod_index_envelope.set_config(config);
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        // Calculate dt (time step)
        let dt = 1.0 / self.sample_rate;

        // Get current modulation index from envelope (starts at 1.0, decays to 0.0)
        let mod_index = self.mod_index_envelope.get_amplitude(current_time);

        // Calculate modulator signal: sin(2π * modulator_freq * time)
        let two_pi = 2.0 * std::f32::consts::PI;
        let modulator = (two_pi * self.modulator_freq * self.time).sin();

        // Calculate FM synthesis: sin(2π * carrier_freq * time + mod_index * modulator)
        let sample = (two_pi * self.carrier_freq * self.time + mod_index * modulator).sin();

        // Advance time
        self.time += dt;

        // Apply volume and return
        sample * self.volume
    }
}

impl Instrument for FMOscillator {
    fn trigger(&mut self, time: f32) {
        self.trigger(time);
    }

    fn release(&mut self, time: f32) {
        self.release(time);
    }

    fn tick(&mut self, current_time: f32) -> f32 {
        self.tick(current_time)
    }

    fn set_volume(&mut self, volume: f32) {
        self.set_volume(volume);
    }

    fn get_volume(&self) -> f32 {
        self.volume
    }

    fn set_adsr(&mut self, config: ADSRConfig) {
        self.set_mod_index_adsr(config);
    }
}
