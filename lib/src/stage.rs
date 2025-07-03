use crate::envelope::ADSRConfig;
use crate::oscillator::Oscillator;

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub limiter: BrickWallLimiter,
    pub sequencer: Sequencer,
}

/// A 16-step drum sequencer that manages pattern playback for multiple instruments
#[derive(Debug, Clone)]
pub struct Sequencer {
    /// 16-step patterns for each instrument (4 instruments, 16 steps each)
    patterns: [[bool; 16]; 4],
    /// Current step (0-15)
    current_step: usize,
    /// Whether the sequencer is playing
    is_playing: bool,
    /// BPM (beats per minute)
    bpm: f32,
    /// Time of the last step in seconds
    last_step_time: f32,
    /// Time interval between steps in seconds
    step_interval: f32,
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
            sequencer: Sequencer::new(),
        }
    }

    pub fn add(&mut self, mut instrument: Oscillator) {
        // Ensure the instrument uses the same sample rate as the stage
        instrument.sample_rate = self.sample_rate;
        self.instruments.push(instrument);
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        // Update sequencer and trigger instruments if needed
        if self.sequencer.is_playing {
            self.sequencer.update(current_time);

            // Check if we should trigger instruments on the current step
            if self.sequencer.should_trigger_step(current_time) {
                let current_step = self.sequencer.current_step;

                // Collect which instruments should be triggered to avoid borrow conflicts
                let mut instruments_to_trigger = Vec::new();
                for (instrument_index, pattern) in self.sequencer.patterns.iter().enumerate() {
                    if pattern[current_step] && instrument_index < self.instruments.len() {
                        instruments_to_trigger.push(instrument_index);
                    }
                }

                // Now trigger the instruments (with mutable access)
                for instrument_index in instruments_to_trigger {
                    self.trigger_instrument(instrument_index, current_time);
                }

                // Mark that we've processed this step
                self.sequencer.last_step_time = current_time;
                self.sequencer.advance_step();
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
            instrument.set_enabled(enabled);
        }
    }

    pub fn is_instrument_enabled(&self, index: usize) -> bool {
        if let Some(instrument) = self.instruments.get(index) {
            instrument.is_enabled()
        } else {
            false
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

    /// Start the sequencer
    pub fn sequencer_play(&mut self) {
        self.sequencer.play();
    }

    /// Stop the sequencer
    pub fn sequencer_stop(&mut self) {
        self.sequencer.stop();
    }

    /// Reset the sequencer to step 0
    pub fn sequencer_reset(&mut self) {
        self.sequencer.reset();
    }

    /// Clear all patterns
    pub fn sequencer_clear_all(&mut self) {
        self.sequencer.clear_all();
    }

    /// Set a step for a specific instrument
    pub fn sequencer_set_step(&mut self, instrument: usize, step: usize, enabled: bool) {
        self.sequencer.set_step(instrument, step, enabled);
    }

    /// Get a step for a specific instrument
    pub fn sequencer_get_step(&self, instrument: usize, step: usize) -> bool {
        self.sequencer.get_step(instrument, step)
    }

    /// Set the BPM
    pub fn sequencer_set_bpm(&mut self, bpm: f32) {
        self.sequencer.set_bpm(bpm);
    }

    /// Get the current BPM
    pub fn sequencer_get_bpm(&self) -> f32 {
        self.sequencer.bpm
    }

    /// Get the current step (0-15)
    pub fn sequencer_get_current_step(&self) -> usize {
        self.sequencer.current_step
    }

    /// Check if the sequencer is playing
    pub fn sequencer_is_playing(&self) -> bool {
        self.sequencer.is_playing
    }
}

impl Sequencer {
    pub fn new() -> Self {
        Self {
            patterns: [[false; 16]; 4],
            current_step: 0,
            is_playing: false,
            bpm: 120.0,
            last_step_time: 0.0,
            step_interval: 60.0 / (120.0 * 4.0), // 16th notes at 120 BPM
        }
    }

    pub fn play(&mut self) {
        self.is_playing = true;
    }

    pub fn stop(&mut self) {
        self.is_playing = false;
    }

    pub fn reset(&mut self) {
        self.current_step = 0;
        self.last_step_time = 0.0;
    }

    pub fn clear_all(&mut self) {
        self.patterns = [[false; 16]; 4];
    }

    pub fn set_step(&mut self, instrument: usize, step: usize, enabled: bool) {
        if instrument < 4 && step < 16 {
            self.patterns[instrument][step] = enabled;
        }
    }

    pub fn get_step(&self, instrument: usize, step: usize) -> bool {
        if instrument < 4 && step < 16 {
            self.patterns[instrument][step]
        } else {
            false
        }
    }

    pub fn set_bpm(&mut self, bpm: f32) {
        // Clamp BPM to reasonable range
        self.bpm = bpm.max(60.0).min(180.0);
        // Recalculate step interval (16th notes)
        self.step_interval = 60.0 / (self.bpm * 4.0);
    }

    pub fn update(&mut self, current_time: f32) {
        // This method is called from tick() to update internal state
        // The actual triggering logic is handled in tick()
    }

    pub fn should_trigger_step(&self, current_time: f32) -> bool {
        // Check if enough time has passed for the next step
        current_time - self.last_step_time >= self.step_interval
    }

    pub fn advance_step(&mut self) {
        self.current_step = (self.current_step + 1) % 16;
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
