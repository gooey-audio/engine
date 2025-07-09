use crate::gen::waveform::Waveform;
use std::f32::consts::PI;

#[derive(Debug, Clone, Copy)]
pub enum LfoRate {
    Sixteenth, // 1/16th note
    Eighth,    // 1/8th note  
    Quarter,   // 1/4th note
}

impl LfoRate {
    /// Get the multiplier for the base step interval
    pub fn get_multiplier(&self) -> f32 {
        match self {
            LfoRate::Sixteenth => 1.0,    // 1/16th note (base sequencer step)
            LfoRate::Eighth => 2.0,       // 1/8th note (2 sequencer steps)
            LfoRate::Quarter => 4.0,      // 1/4th note (4 sequencer steps)
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct LfoConfig {
    pub waveform: Waveform,
    pub rate: LfoRate,
    pub depth: f32,      // 0.0 to 1.0
    pub enabled: bool,
}

impl Default for LfoConfig {
    fn default() -> Self {
        Self {
            waveform: Waveform::Sine,
            rate: LfoRate::Quarter,
            depth: 0.5,
            enabled: false,
        }
    }
}

/// Low Frequency Oscillator for modulation
pub struct Lfo {
    config: LfoConfig,
    phase: f32,
    sample_rate: f32,
    frequency_hz: f32,
    last_bpm: f32,
    last_rate: LfoRate,
}

impl Lfo {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            config: LfoConfig::default(),
            phase: 0.0,
            sample_rate,
            frequency_hz: 2.0, // Default 2Hz
            last_bpm: 120.0,
            last_rate: LfoRate::Quarter,
        }
    }

    pub fn with_config(sample_rate: f32, config: LfoConfig) -> Self {
        let mut lfo = Self::new(sample_rate);
        lfo.config = config;
        lfo
    }

    /// Update the LFO frequency based on BPM and rate
    pub fn update_frequency(&mut self, bpm: f32) {
        let rate_changed = match (self.config.rate, self.last_rate) {
            (LfoRate::Sixteenth, LfoRate::Sixteenth) => false,
            (LfoRate::Eighth, LfoRate::Eighth) => false,
            (LfoRate::Quarter, LfoRate::Quarter) => false,
            _ => true,
        };
        
        if bpm != self.last_bpm || rate_changed {
            // Clamp BPM to reasonable range to prevent division by zero and extreme values
            let safe_bpm = bpm.max(1.0).min(1000.0);
            
            // Calculate step interval (16th notes)
            let step_interval = 60.0 / (safe_bpm * 4.0);
            
            // Calculate LFO frequency based on rate
            let rate_multiplier = self.config.rate.get_multiplier();
            let lfo_period = (step_interval * rate_multiplier).max(0.001); // Minimum 1ms period
            
            // Cap frequency to reasonable range (0.01 Hz to 100 Hz) and check for valid values
            let new_frequency = 1.0 / lfo_period;
            self.frequency_hz = if new_frequency.is_finite() {
                new_frequency.max(0.01).min(100.0)
            } else {
                2.0 // Fallback to 2 Hz default
            };
            
            self.last_bpm = bpm;
            self.last_rate = self.config.rate;
        }
    }

    /// Get the current LFO output value (-1.0 to 1.0)
    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.config.enabled {
            return 0.0;
        }

        // Calculate phase increment with bounds checking
        let phase_increment = if self.sample_rate > 0.0 {
            (2.0 * PI * self.frequency_hz / self.sample_rate).min(PI) // Cap at π to prevent excessive increment
        } else {
            0.0 // Fallback for invalid sample rate
        };
        
        // Generate waveform based on current phase
        let raw_value = match self.config.waveform {
            Waveform::Sine => (self.phase).sin(),
            Waveform::Square => {
                if (self.phase % (2.0 * PI)) < PI {
                    1.0
                } else {
                    -1.0
                }
            }
            Waveform::Saw => {
                let normalized_phase = (self.phase % (2.0 * PI)) / (2.0 * PI);
                2.0 * normalized_phase - 1.0
            }
            Waveform::Triangle => {
                let normalized_phase = (self.phase % (2.0 * PI)) / (2.0 * PI);
                if normalized_phase < 0.5 {
                    4.0 * normalized_phase - 1.0
                } else {
                    3.0 - 4.0 * normalized_phase
                }
            }
            // For other waveforms, default to sine
            _ => (self.phase).sin(),
        };

        // Update phase
        self.phase += phase_increment;
        
        // Keep phase in reasonable range using proper modulo arithmetic
        self.phase = self.phase % (2.0 * PI);

        // Apply depth and return
        raw_value * self.config.depth
    }

    /// Reset the LFO phase (useful for sync)
    pub fn reset(&mut self) {
        self.phase = 0.0;
    }

    /// Set the LFO configuration
    pub fn set_config(&mut self, config: LfoConfig) {
        self.config = config;
    }

    /// Get the current LFO configuration
    pub fn get_config(&self) -> LfoConfig {
        self.config
    }

    /// Set the waveform
    pub fn set_waveform(&mut self, waveform: Waveform) {
        self.config.waveform = waveform;
    }

    /// Set the rate
    pub fn set_rate(&mut self, rate: LfoRate) {
        self.config.rate = rate;
    }

    /// Set the depth
    pub fn set_depth(&mut self, depth: f32) {
        self.config.depth = depth.clamp(0.0, 1.0);
    }

    /// Set enabled state
    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
    }

    /// Get enabled state
    pub fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    /// Get the current frequency
    pub fn get_frequency(&self) -> f32 {
        self.frequency_hz
    }
}