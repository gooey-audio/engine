use crate::envelope::ADSRConfig;
use crate::oscillator::Oscillator;

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub limiter: BrickWallLimiter,
    pub sequencer: Sequencer,
}

pub struct Sequencer {
    pub steps: Vec<Vec<bool>>, // [instrument_index][step_index]
    pub current_step: usize,
    pub bpm: f32,
    pub last_step_time: f32,
    pub is_playing: bool,
}

impl Sequencer {
    pub fn new(num_instruments: usize) -> Self {
        Self {
            steps: vec![vec![false; 16]; num_instruments], // 16 steps per instrument
            current_step: 0,
            bpm: 120.0,
            last_step_time: 0.0,
            is_playing: false,
        }
    }

    pub fn set_step(&mut self, instrument_index: usize, step_index: usize, enabled: bool) {
        if let Some(instrument_steps) = self.steps.get_mut(instrument_index) {
            if let Some(step) = instrument_steps.get_mut(step_index) {
                *step = enabled;
            }
        }
    }

    pub fn get_step(&self, instrument_index: usize, step_index: usize) -> bool {
        self.steps.get(instrument_index)
            .and_then(|steps| steps.get(step_index))
            .copied()
            .unwrap_or(false)
    }

    pub fn get_step_interval(&self) -> f32 {
        // Calculate interval between steps in seconds
        // 120 BPM = 120 beats per minute = 2 beats per second
        // For 16 steps per beat pattern, each step is 1/8 of a beat
        60.0 / (self.bpm * 4.0) // 16 steps per 4 beats
    }

    pub fn should_advance_step(&self, current_time: f32) -> bool {
        if !self.is_playing {
            return false;
        }
        current_time - self.last_step_time >= self.get_step_interval()
    }

    pub fn advance_step(&mut self, current_time: f32) {
        self.current_step = (self.current_step + 1) % 16;
        self.last_step_time = current_time;
    }

    pub fn start(&mut self, current_time: f32) {
        self.is_playing = true;
        self.last_step_time = current_time;
        self.current_step = 0;
    }

    pub fn stop(&mut self) {
        self.is_playing = false;
    }

    pub fn reset(&mut self, current_time: f32) {
        self.current_step = 0;
        self.last_step_time = current_time;
    }
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
            sequencer: Sequencer::new(0), // Start with 0 instruments, will be updated when instruments are added
        }
    }

    pub fn add(&mut self, mut instrument: Oscillator) {
        // Ensure the instrument uses the same sample rate as the stage
        instrument.sample_rate = self.sample_rate;
        self.instruments.push(instrument);
        
        // Update sequencer to match the number of instruments
        self.sequencer.steps.push(vec![false; 16]);
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        // Handle sequencer timing
        if self.sequencer.should_advance_step(current_time) {
            self.sequencer.advance_step(current_time);
            
            // Trigger instruments that have hits on the current step
            for (instrument_index, instrument) in self.instruments.iter_mut().enumerate() {
                if self.sequencer.get_step(instrument_index, self.sequencer.current_step) {
                    instrument.trigger(current_time);
                }
            }
        }
        
        let mut output = 0.0;
        for instrument in &mut self.instruments {
            output += instrument.tick(current_time);
        }
        // Apply limiter to the combined output
        self.limiter.process(output)
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

    // Sequencer control methods
    pub fn sequencer_start(&mut self, current_time: f32) {
        self.sequencer.start(current_time);
    }

    pub fn sequencer_stop(&mut self) {
        self.sequencer.stop();
    }

    pub fn sequencer_reset(&mut self, current_time: f32) {
        self.sequencer.reset(current_time);
    }

    pub fn sequencer_set_step(&mut self, instrument_index: usize, step_index: usize, enabled: bool) {
        self.sequencer.set_step(instrument_index, step_index, enabled);
    }

    pub fn sequencer_get_step(&self, instrument_index: usize, step_index: usize) -> bool {
        self.sequencer.get_step(instrument_index, step_index)
    }

    pub fn sequencer_get_current_step(&self) -> usize {
        self.sequencer.current_step
    }

    pub fn sequencer_is_playing(&self) -> bool {
        self.sequencer.is_playing
    }

    pub fn sequencer_set_bpm(&mut self, bpm: f32) {
        self.sequencer.bpm = bpm;
    }

    pub fn sequencer_get_bpm(&self) -> f32 {
        self.sequencer.bpm
    }

    pub fn set_instrument_modulator_frequency(&mut self, index: usize, frequency_hz: f32) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.set_modulator_frequency(frequency_hz);
        }
    }

    pub fn get_instrument_modulator_frequency(&self, index: usize) -> f32 {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.get_modulator_frequency()
        } else {
            0.0
        }
    }

    pub fn set_instrument_enabled(&mut self, index: usize, enabled: bool) {
        if let Some(instrument) = self.instruments.get_mut(index) {
            instrument.enabled = enabled;
        }
    }

    pub fn is_instrument_enabled(&self, index: usize) -> bool {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.enabled
        } else {
            false
        }
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
