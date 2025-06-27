//! Shared audio engine logic for both native (CPAL) and WASM (web)

pub mod oscillator;
pub mod envelope;
pub mod waveform;
pub mod audio_state;
pub mod stage;
pub mod noise;
pub mod snare;

// WASM bindings (web)
#[cfg(feature = "web")]
pub mod web {
    use super::oscillator::Oscillator;
    use super::stage::Stage;
    use super::envelope::ADSRConfig;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub struct WasmOscillator {
        oscillator: Oscillator,
    }

    #[wasm_bindgen]
    impl WasmOscillator {
        #[wasm_bindgen(constructor)]
        pub fn new(sample_rate: f32, frequency_hz: f32) -> WasmOscillator {
            WasmOscillator {
                oscillator: Oscillator::new(sample_rate, frequency_hz),
            }
        }

        #[wasm_bindgen]
        pub fn trigger(&mut self, time: f32) {
            self.oscillator.trigger(time);
        }

        #[wasm_bindgen]
        pub fn tick(&mut self, current_time: f32) -> f32 {
            self.oscillator.tick(current_time)
        }

        #[wasm_bindgen]
        pub fn release(&mut self, time: f32) {
            self.oscillator.release(time);
        }

        #[wasm_bindgen]
        pub fn set_adsr(&mut self, attack: f32, decay: f32, sustain: f32, release: f32) {
            let config = ADSRConfig::new(attack, decay, sustain, release);
            self.oscillator.set_adsr(config);
        }
    }

    #[wasm_bindgen]
    pub struct WasmStage {
        stage: Stage,
    }

    #[wasm_bindgen]
    impl WasmStage {
        #[wasm_bindgen(constructor)]
        pub fn new(sample_rate: f32) -> WasmStage {
            WasmStage {
                stage: Stage::new(sample_rate),
            }
        }

        #[wasm_bindgen]
        pub fn add_oscillator(&mut self, sample_rate: f32, frequency_hz: f32) {
            let oscillator = Oscillator::new(sample_rate, frequency_hz);
            self.stage.add(oscillator);
        }

        #[wasm_bindgen]
        pub fn tick(&mut self, current_time: f32) -> f32 {
            self.stage.tick(current_time)
        }

        #[wasm_bindgen]
        pub fn trigger_all(&mut self, time: f32) {
            self.stage.trigger_all(time);
        }

        #[wasm_bindgen]
        pub fn trigger_instrument(&mut self, index: usize, time: f32) {
            self.stage.trigger_instrument(index, time);
        }

        #[wasm_bindgen]
        pub fn set_instrument_volume(&mut self, index: usize, volume: f32) {
            self.stage.set_instrument_volume(index, volume);
        }

        #[wasm_bindgen]
        pub fn get_instrument_volume(&self, index: usize) -> f32 {
            self.stage.get_instrument_volume(index)
        }

        #[wasm_bindgen]
        pub fn release_instrument(&mut self, index: usize, time: f32) {
            self.stage.release_instrument(index, time);
        }

        #[wasm_bindgen]
        pub fn release_all(&mut self, time: f32) {
            self.stage.release_all(time);
        }

        #[wasm_bindgen]
        pub fn set_instrument_adsr(&mut self, index: usize, attack: f32, decay: f32, sustain: f32, release: f32) {
            let config = ADSRConfig::new(attack, decay, sustain, release);
            self.stage.set_instrument_adsr(index, config);
        }

        #[wasm_bindgen]
        pub fn set_instrument_frequency(&mut self, index: usize, frequency_hz: f32) {
            self.stage.set_instrument_frequency(index, frequency_hz);
        }

        #[wasm_bindgen]
        pub fn get_instrument_frequency(&self, index: usize) -> f32 {
            self.stage.get_instrument_frequency(index)
        }

        #[wasm_bindgen]
        pub fn set_instrument_waveform(&mut self, index: usize, waveform_type: u32) {
            let waveform = match waveform_type {
                0 => crate::waveform::Waveform::Sine,
                1 => crate::waveform::Waveform::Square,
                2 => crate::waveform::Waveform::Saw,
                3 => crate::waveform::Waveform::Triangle,
                4 => crate::waveform::Waveform::WhiteNoise,
                5 => crate::waveform::Waveform::PinkNoise,
                6 => crate::waveform::Waveform::BrownNoise,
                7 => crate::waveform::Waveform::SnareNoise,
                _ => crate::waveform::Waveform::Sine, // Default to sine for invalid values
            };
            self.stage.set_instrument_waveform(index, waveform);
        }

        #[wasm_bindgen]
        pub fn get_instrument_waveform(&self, index: usize) -> u32 {
            let waveform = self.stage.get_instrument_waveform(index);
            match waveform {
                crate::waveform::Waveform::Sine => 0,
                crate::waveform::Waveform::Square => 1,
                crate::waveform::Waveform::Saw => 2,
                crate::waveform::Waveform::Triangle => 3,
                crate::waveform::Waveform::WhiteNoise => 4,
                crate::waveform::Waveform::PinkNoise => 5,
                crate::waveform::Waveform::BrownNoise => 6,
                crate::waveform::Waveform::SnareNoise => 7,
            }
        }

        #[wasm_bindgen]
        pub fn set_instrument_drum_adsr(&mut self, index: usize) {
            let config = ADSRConfig::drum_default();
            self.stage.set_instrument_adsr(index, config);
        }
    }

    #[wasm_bindgen]
    pub struct WasmSnareInstrument {
        snare: crate::snare::SnareInstrument,
    }

    #[wasm_bindgen]
    impl WasmSnareInstrument {
        #[wasm_bindgen(constructor)]
        pub fn new(sample_rate: f32) -> WasmSnareInstrument {
            WasmSnareInstrument {
                snare: crate::snare::SnareInstrument::new(sample_rate),
            }
        }

        #[wasm_bindgen]
        pub fn trigger(&mut self, time: f32) {
            self.snare.trigger(time);
        }

        #[wasm_bindgen]
        pub fn release(&mut self, time: f32) {
            self.snare.release(time);
        }

        #[wasm_bindgen]
        pub fn tick(&mut self, current_time: f32) -> f32 {
            self.snare.tick(current_time)
        }

        #[wasm_bindgen]
        pub fn set_volume(&mut self, volume: f32) {
            self.snare.set_volume(volume);
        }

        #[wasm_bindgen]
        pub fn set_frequency(&mut self, frequency_hz: f32) {
            self.snare.set_frequency(frequency_hz);
        }

        #[wasm_bindgen]
        pub fn set_noise_mix_level(&mut self, level: f32) {
            self.snare.set_noise_mix_level(level);
        }

        #[wasm_bindgen]
        pub fn set_tonal_noise_mix(&mut self, mix: f32) {
            self.snare.set_tonal_noise_mix(mix);
        }

        #[wasm_bindgen]
        pub fn set_adsr(&mut self, attack: f32, decay: f32, sustain: f32, release: f32) {
            let config = ADSRConfig::new(attack, decay, sustain, release);
            self.snare.set_adsr(config);
        }

        #[wasm_bindgen]
        pub fn set_drum_adsr(&mut self) {
            let config = ADSRConfig::drum_default();
            self.snare.set_adsr(config);
        }

        #[wasm_bindgen]
        pub fn set_noise_type(&mut self, noise_type: u32) {
            let noise = match noise_type {
                0 => crate::noise::NoiseType::White,
                1 => crate::noise::NoiseType::Pink,
                2 => crate::noise::NoiseType::Brown,
                3 => crate::noise::NoiseType::Snare,
                _ => crate::noise::NoiseType::Snare, // Default to snare noise
            };
            self.snare.set_noise_type(noise);
        }

        #[wasm_bindgen]
        pub fn set_tonal_waveform(&mut self, waveform_type: u32) {
            let waveform = match waveform_type {
                0 => crate::waveform::Waveform::Sine,
                1 => crate::waveform::Waveform::Square,
                2 => crate::waveform::Waveform::Saw,
                3 => crate::waveform::Waveform::Triangle,
                _ => crate::waveform::Waveform::Triangle, // Default to triangle
            };
            self.snare.set_tonal_waveform(waveform);
        }

        #[wasm_bindgen]
        pub fn is_active(&self) -> bool {
            self.snare.is_active()
        }
    }
} 