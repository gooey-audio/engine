//! Shared audio engine logic for both native (CPAL) and WASM (web)

pub mod oscillator;
pub mod envelope;
pub mod waveform;
pub mod audio_state;
pub mod stage;
pub mod fm_oscillator;
pub mod instrument;

// WASM bindings (web)
#[cfg(feature = "web")]
pub mod web {
    use super::oscillator::Oscillator;
    use super::stage::Stage;
    use super::envelope::ADSRConfig;
    use super::fm_oscillator::FMOscillator;
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
    pub struct WasmFMOscillator {
        fm_oscillator: FMOscillator,
    }

    #[wasm_bindgen]
    impl WasmFMOscillator {
        #[wasm_bindgen(constructor)]
        pub fn new(sample_rate: f32, carrier_freq: f32, modulator_freq: f32) -> WasmFMOscillator {
            WasmFMOscillator {
                fm_oscillator: FMOscillator::new(sample_rate, carrier_freq, modulator_freq),
            }
        }

        #[wasm_bindgen]
        pub fn trigger(&mut self, time: f32) {
            self.fm_oscillator.trigger(time);
        }

        #[wasm_bindgen]
        pub fn tick(&mut self, current_time: f32) -> f32 {
            self.fm_oscillator.tick(current_time)
        }

        #[wasm_bindgen]
        pub fn release(&mut self, time: f32) {
            self.fm_oscillator.release(time);
        }

        #[wasm_bindgen]
        pub fn set_volume(&mut self, volume: f32) {
            self.fm_oscillator.set_volume(volume);
        }

        #[wasm_bindgen]
        pub fn set_carrier_freq(&mut self, freq: f32) {
            self.fm_oscillator.set_carrier_freq(freq);
        }

        #[wasm_bindgen]
        pub fn set_modulator_freq(&mut self, freq: f32) {
            self.fm_oscillator.set_modulator_freq(freq);
        }

        #[wasm_bindgen]
        pub fn set_mod_index_adsr(&mut self, attack: f32, decay: f32, sustain: f32, release: f32) {
            let config = ADSRConfig::new(attack, decay, sustain, release);
            self.fm_oscillator.set_mod_index_adsr(config);
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
            }
        }
    }
} 