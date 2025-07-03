use crate::envelope::ADSRConfig;
use crate::oscillator::Oscillator;

pub struct Sequencer {
    pub patterns: Vec<Vec<bool>>, // 4 instruments x 16 steps
    pub current_step: usize,
    pub step_duration: f32, // Duration of each step in seconds
    pub bpm: f32,
    pub is_playing: bool,
    pub last_step_time: f32,
}

impl Sequencer {
    pub fn new(bpm: f32, sample_rate: f32) -> Self {
        // Initialize patterns for 4 instruments, 16 steps each
        let patterns = vec![vec![false; 16]; 4];
        let step_duration = 60.0 / (bpm * 4.0); // 16th notes (4 steps per beat)
        
        Self {
            patterns,
            current_step: 0,
            step_duration,
            bpm,
            is_playing: false,
            last_step_time: 0.0,
        }
    }
    
    pub fn set_bpm(&mut self, bpm: f32) {
        self.bpm = bpm;
        self.step_duration = 60.0 / (bpm * 4.0); // 16th notes
    }
    
    pub fn set_step(&mut self, instrument: usize, step: usize, enabled: bool) {
        if instrument < self.patterns.len() && step < 16 {
            self.patterns[instrument][step] = enabled;
        }
    }
    
    pub fn get_step(&self, instrument: usize, step: usize) -> bool {
        if instrument < self.patterns.len() && step < 16 {
            self.patterns[instrument][step]
        } else {
            false
        }
    }
    
    pub fn clear_all(&mut self) {
        for pattern in &mut self.patterns {
            for step in pattern {
                *step = false;
            }
        }
    }
    
    pub fn reset(&mut self) {
        self.current_step = 0;
        self.last_step_time = 0.0;
    }
    
    pub fn play(&mut self) {
        self.is_playing = true;
    }
    
    pub fn stop(&mut self) {
        self.is_playing = false;
    }
    
    pub fn tick(&mut self, current_time: f32) -> Vec<usize> {
        let mut triggered_instruments = Vec::new();
        
        if !self.is_playing {
            return triggered_instruments;
        }
        
        // Check if it's time for the next step
        if current_time - self.last_step_time >= self.step_duration {
            // Check which instruments should be triggered at current step
            for (instrument_index, pattern) in self.patterns.iter().enumerate() {
                if pattern[self.current_step] {
                    triggered_instruments.push(instrument_index);
                }
            }
            
            // Advance to next step
            self.current_step = (self.current_step + 1) % 16;
            self.last_step_time = current_time;
        }
        
        triggered_instruments
    }
}

pub struct Stage {
    pub sample_rate: f32,
    pub instruments: Vec<Oscillator>,
    pub limiter: BrickWallLimiter,
    pub sequencer: Sequencer,
}

impl Stage {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            instruments: Vec::new(),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
            sequencer: Sequencer::new(120.0, sample_rate), // Default 120 BPM
        }
    }

    pub fn add(&mut self, mut instrument: Oscillator) {
        // Ensure the instrument uses the same sample rate as the stage
        instrument.sample_rate = self.sample_rate;
        self.instruments.push(instrument);
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        // Process sequencer and automatically trigger instruments
        let triggered_instruments = self.sequencer.tick(current_time);
        for instrument_index in triggered_instruments {
            self.trigger_instrument(instrument_index, current_time);
        }
        
        // Process all instruments and sum their outputs
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

    // Sequencer methods
    pub fn sequencer_play(&mut self) {
        self.sequencer.play();
    }
    
    pub fn sequencer_stop(&mut self) {
        self.sequencer.stop();
    }
    
    pub fn sequencer_reset(&mut self) {
        self.sequencer.reset();
    }
    
    pub fn sequencer_clear_all(&mut self) {
        self.sequencer.clear_all();
    }
    
    pub fn sequencer_set_bpm(&mut self, bpm: f32) {
        self.sequencer.set_bpm(bpm);
    }
    
    pub fn sequencer_get_bpm(&self) -> f32 {
        self.sequencer.bpm
    }
    
    pub fn sequencer_set_step(&mut self, instrument: usize, step: usize, enabled: bool) {
        self.sequencer.set_step(instrument, step, enabled);
    }
    
    pub fn sequencer_get_step(&self, instrument: usize, step: usize) -> bool {
        self.sequencer.get_step(instrument, step)
    }
    
    pub fn sequencer_get_current_step(&self) -> usize {
        self.sequencer.current_step
    }
    
    pub fn sequencer_is_playing(&self) -> bool {
        self.sequencer.is_playing
    }

    /// Set the limiter threshold (typically 0.0 to 1.0)
    pub fn set_limiter_threshold(&mut self, threshold: f32) {
        self.limiter.threshold = threshold;
    }

    /// Get the current limiter threshold
    pub fn get_limiter_threshold(&self) -> f32 {
        self.limiter.threshold
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
