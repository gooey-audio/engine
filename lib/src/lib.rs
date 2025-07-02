//! Shared audio engine logic for both native (CPAL) and WASM (web)

pub mod audio_state;
pub mod envelope;
pub mod kick;
pub mod oscillator;
pub mod stage;
pub mod waveform;

// WASM bindings (web)
#[cfg(feature = "web")]
pub mod web {
    use super::envelope::ADSRConfig;
    use super::kick::{KickConfig, KickDrum};
    use super::oscillator::Oscillator;
    use super::stage::Stage;
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

        #[wasm_bindgen]
        pub fn set_modulator_frequency(&mut self, frequency_hz: f32) {
            self.oscillator.set_modulator_frequency(frequency_hz);
        }

        #[wasm_bindgen]
        pub fn get_modulator_frequency(&self) -> f32 {
            self.oscillator.get_modulator_frequency()
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
        pub fn set_instrument_adsr(
            &mut self,
            index: usize,
            attack: f32,
            decay: f32,
            sustain: f32,
            release: f32,
        ) {
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
                4 => crate::waveform::Waveform::RingMod,
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
                crate::waveform::Waveform::RingMod => 4,
            }
        }

        #[wasm_bindgen]
        pub fn set_instrument_modulator_frequency(&mut self, index: usize, frequency_hz: f32) {
            self.stage
                .set_instrument_modulator_frequency(index, frequency_hz);
        }

        #[wasm_bindgen]
        pub fn get_instrument_modulator_frequency(&self, index: usize) -> f32 {
            self.stage.get_instrument_modulator_frequency(index)
        }

        #[wasm_bindgen]
        pub fn set_instrument_enabled(&mut self, index: usize, enabled: bool) {
            self.stage.set_instrument_enabled(index, enabled);
        }

        #[wasm_bindgen]
        pub fn is_instrument_enabled(&self, index: usize) -> bool {
            self.stage.is_instrument_enabled(index)
        }

        // Compressor control methods
        #[wasm_bindgen]
        pub fn set_compressor_enabled(&mut self, enabled: bool) {
            self.stage.set_compressor_enabled(enabled);
        }

        #[wasm_bindgen]
        pub fn is_compressor_enabled(&self) -> bool {
            self.stage.is_compressor_enabled()
        }

        #[wasm_bindgen]
        pub fn set_compressor_threshold(&mut self, threshold: f32) {
            self.stage.set_compressor_threshold(threshold);
        }

        #[wasm_bindgen]
        pub fn get_compressor_threshold(&self) -> f32 {
            self.stage.get_compressor_threshold()
        }

        #[wasm_bindgen]
        pub fn set_compressor_ratio(&mut self, ratio: f32) {
            self.stage.set_compressor_ratio(ratio);
        }

        #[wasm_bindgen]
        pub fn get_compressor_ratio(&self) -> f32 {
            self.stage.get_compressor_ratio()
        }

        #[wasm_bindgen]
        pub fn set_compressor_attack(&mut self, attack_ms: f32) {
            self.stage.set_compressor_attack(attack_ms);
        }

        #[wasm_bindgen]
        pub fn get_compressor_attack(&self) -> f32 {
            self.stage.get_compressor_attack()
        }

        #[wasm_bindgen]
        pub fn set_compressor_release(&mut self, release_ms: f32) {
            self.stage.set_compressor_release(release_ms);
        }

        #[wasm_bindgen]
        pub fn get_compressor_release(&self) -> f32 {
            self.stage.get_compressor_release()
        }

        #[wasm_bindgen]
        pub fn set_compressor_makeup_gain(&mut self, gain_db: f32) {
            self.stage.set_compressor_makeup_gain(gain_db);
        }

        #[wasm_bindgen]
        pub fn get_compressor_makeup_gain(&self) -> f32 {
            self.stage.get_compressor_makeup_gain()
        }
    }

    #[wasm_bindgen]
    pub struct WasmKickDrum {
        kick_drum: KickDrum,
    }

    #[wasm_bindgen]
    impl WasmKickDrum {
        #[wasm_bindgen(constructor)]
        pub fn new(sample_rate: f32) -> WasmKickDrum {
            WasmKickDrum {
                kick_drum: KickDrum::new(sample_rate),
            }
        }

        #[wasm_bindgen]
        pub fn new_with_preset(sample_rate: f32, preset_name: &str) -> WasmKickDrum {
            let config = match preset_name {
                "punchy" => KickConfig::punchy(),
                "deep" => KickConfig::deep(),
                "tight" => KickConfig::tight(),
                _ => KickConfig::default(),
            };
            WasmKickDrum {
                kick_drum: KickDrum::with_config(sample_rate, config),
            }
        }

        #[wasm_bindgen]
        pub fn trigger(&mut self, time: f32) {
            self.kick_drum.trigger(time);
        }

        #[wasm_bindgen]
        pub fn release(&mut self, time: f32) {
            self.kick_drum.release(time);
        }

        #[wasm_bindgen]
        pub fn tick(&mut self, current_time: f32) -> f32 {
            self.kick_drum.tick(current_time)
        }

        #[wasm_bindgen]
        pub fn is_active(&self) -> bool {
            self.kick_drum.is_active()
        }

        #[wasm_bindgen]
        pub fn set_volume(&mut self, volume: f32) {
            self.kick_drum.set_volume(volume);
        }

        #[wasm_bindgen]
        pub fn set_frequency(&mut self, frequency: f32) {
            self.kick_drum.set_frequency(frequency);
        }

        #[wasm_bindgen]
        pub fn set_decay(&mut self, decay_time: f32) {
            self.kick_drum.set_decay(decay_time);
        }

        #[wasm_bindgen]
        pub fn set_punch(&mut self, punch_amount: f32) {
            self.kick_drum.set_punch(punch_amount);
        }

        #[wasm_bindgen]
        pub fn set_sub(&mut self, sub_amount: f32) {
            self.kick_drum.set_sub(sub_amount);
        }

        #[wasm_bindgen]
        pub fn set_click(&mut self, click_amount: f32) {
            self.kick_drum.set_click(click_amount);
        }

        #[wasm_bindgen]
        pub fn set_pitch_drop(&mut self, pitch_drop: f32) {
            self.kick_drum.set_pitch_drop(pitch_drop);
        }

        #[wasm_bindgen]
        pub fn set_config(&mut self, 
            kick_frequency: f32,
            punch_amount: f32,
            sub_amount: f32,
            click_amount: f32,
            decay_time: f32,
            pitch_drop: f32,
            volume: f32,
        ) {
            let config = KickConfig::new(
                kick_frequency,
                punch_amount,
                sub_amount,
                click_amount,
                decay_time,
                pitch_drop,
                volume,
            );
            self.kick_drum.set_config(config);
        }
    }
}
