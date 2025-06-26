//! Shared audio engine logic for both native (CPAL) and WASM (web)

use std::sync::{Arc, Mutex};

pub struct AudioState {
    pub should_trigger: bool,
    pub trigger_time: f32,
}

impl AudioState {
    pub fn new() -> Self {
        Self {
            should_trigger: false,
            trigger_time: 0.0,
        }
    }
}

pub enum Waveform {
    Sine,
    Square,
    Saw,
    Triangle,
}

pub struct Envelope {
    pub attack_time: f32,   // seconds
    pub decay_time: f32,    // seconds
    pub sustain_level: f32, // 0.0 to 1.0
    pub release_time: f32,  // seconds
    pub current_time: f32,  // current time in the envelope
    pub is_active: bool,
    pub trigger_time: f32,  // when the envelope was triggered
}

impl Envelope {
    pub fn new() -> Self {
        Self {
            attack_time: 0.01,
            decay_time: 0.3,
            sustain_level: 0.0,
            release_time: 0.5,
            current_time: 0.0,
            is_active: false,
            trigger_time: 0.0,
        }
    }

    pub fn trigger(&mut self, time: f32) {
        self.is_active = true;
        self.trigger_time = time;
        self.current_time = 0.0;
    }

    pub fn get_amplitude(&mut self, current_time: f32) -> f32 {
        if !self.is_active {
            return 0.0;
        }
        let elapsed = current_time - self.trigger_time;
        self.current_time = elapsed;
        if elapsed < self.attack_time {
            elapsed / self.attack_time
        } else if elapsed < self.attack_time + self.decay_time {
            let decay_elapsed = elapsed - self.attack_time;
            let decay_progress = decay_elapsed / self.decay_time;
            1.0 - (1.0 - self.sustain_level) * decay_progress
        } else if elapsed < self.attack_time + self.decay_time + self.release_time {
            let release_elapsed = elapsed - self.attack_time - self.decay_time;
            let release_progress = release_elapsed / self.release_time;
            self.sustain_level * (1.0 - release_progress)
        } else {
            self.is_active = false;
            0.0
        }
    }
}

pub struct Oscillator {
    pub sample_rate: f32,
    pub waveform: Waveform,
    pub current_sample_index: f32,
    pub frequency_hz: f32,
    pub envelope: Envelope,
}

impl Oscillator {
    pub fn new(sample_rate: f32, frequency_hz: f32) -> Self {
        Self {
            sample_rate,
            waveform: Waveform::Square,
            current_sample_index: 0.0,
            frequency_hz,
            envelope: Envelope::new(),
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

    pub fn trigger(&mut self, time: f32) {
        self.envelope.trigger(time);
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        let raw_output = match self.waveform {
            Waveform::Sine => self.sine_wave(),
            Waveform::Square => self.square_wave(),
            Waveform::Saw => self.saw_wave(),
            Waveform::Triangle => self.triangle_wave(),
        };
        let envelope_amplitude = self.envelope.get_amplitude(current_time);
        raw_output * envelope_amplitude
    }
}

// Native (CPAL) entry points
#[cfg(feature = "native")]
pub mod native {
    use super::*;
    use cpal::{traits::{DeviceTrait, HostTrait, StreamTrait}, SizedSample, Sample, FromSample};
    use std::sync::{Arc, Mutex};
    use anyhow::Result;

    pub fn stream_setup_for(audio_state: Arc<Mutex<AudioState>>) -> Result<cpal::Stream> {
        let (_host, device, config) = host_device_setup()?;
        match config.sample_format() {
            cpal::SampleFormat::I8 => make_stream::<i8>(&device, &config.into(), audio_state),
            cpal::SampleFormat::I16 => make_stream::<i16>(&device, &config.into(), audio_state),
            cpal::SampleFormat::I32 => make_stream::<i32>(&device, &config.into(), audio_state),
            cpal::SampleFormat::I64 => make_stream::<i64>(&device, &config.into(), audio_state),
            cpal::SampleFormat::U8 => make_stream::<u8>(&device, &config.into(), audio_state),
            cpal::SampleFormat::U16 => make_stream::<u16>(&device, &config.into(), audio_state),
            cpal::SampleFormat::U32 => make_stream::<u32>(&device, &config.into(), audio_state),
            cpal::SampleFormat::U64 => make_stream::<u64>(&device, &config.into(), audio_state),
            cpal::SampleFormat::F32 => make_stream::<f32>(&device, &config.into(), audio_state),
            cpal::SampleFormat::F64 => make_stream::<f64>(&device, &config.into(), audio_state),
            sample_format => Err(anyhow::Error::msg(format!(
                "Unsupported sample format '{sample_format}'"
            ))),
        }
    }

    pub fn host_device_setup() -> Result<(cpal::Host, cpal::Device, cpal::SupportedStreamConfig)> {
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| anyhow::Error::msg("Default output device is not available"))?;
        println!("Output device : {}", device.name()?);
        let config = device.default_output_config()?;
        println!("Default output config : {:?}", config);
        Ok((host, device, config))
    }

    pub fn make_stream<T>(
        device: &cpal::Device,
        config: &cpal::StreamConfig,
        audio_state: Arc<Mutex<AudioState>>,
    ) -> Result<cpal::Stream>
    where
        T: SizedSample + FromSample<f32>,
    {
        let num_channels = config.channels as usize;
        let mut oscillator = Oscillator::new(
            config.sample_rate.0 as f32,
            300.0,
        );
        let err_fn = |err| eprintln!("Error building output sound stream: {}", err);
        let time_at_start = std::time::Instant::now();
        println!("Time at start: {:?}", time_at_start);
        let stream = device.build_output_stream(
            config,
            move |output: &mut [T], _: &cpal::OutputCallbackInfo| {
                let time_since_start = std::time::Instant::now()
                    .duration_since(time_at_start)
                    .as_secs_f32();
                {
                    let mut state = audio_state.lock().unwrap();
                    if state.should_trigger {
                        oscillator.trigger(time_since_start);
                        state.should_trigger = false;
                        state.trigger_time = time_since_start;
                        println!("Drum hit triggered at {:.2}s", time_since_start);
                    }
                }
                process_frame(output, &mut oscillator, num_channels, time_since_start)
            },
            err_fn,
            None,
        )?;
        Ok(stream)
    }

    fn process_frame<SampleType>(
        output: &mut [SampleType],
        oscillator: &mut Oscillator,
        num_channels: usize,
        current_time: f32,
    ) where
        SampleType: Sample + FromSample<f32>,
    {
        for frame in output.chunks_mut(num_channels) {
            let value: SampleType = SampleType::from_sample(oscillator.tick(current_time));
            for sample in frame.iter_mut() {
                *sample = value;
            }
        }
    }
}

// Web (WASM) entry points
#[cfg(feature = "web")]
pub mod web {
    use super::*;
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
    }
} 