use std::f32::consts::TAU;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum LFOWaveform {
    Sine,
    Square,
    Saw,
    Triangle,
}

#[derive(Clone, Copy, Debug)]
pub struct LFOConfig {
    pub frequency: f32,    // LFO frequency in Hz
    pub depth: f32,        // Modulation depth (0.0-1.0)
    pub waveform: LFOWaveform,
    pub enabled: bool,
}

impl Default for LFOConfig {
    fn default() -> Self {
        Self {
            frequency: 2.0,  // 2 Hz default speed
            depth: 0.5,      // 50% modulation depth
            waveform: LFOWaveform::Sine,
            enabled: false,
        }
    }
}

pub struct LFO {
    pub config: LFOConfig,
    pub sample_rate: f32,
    pub phase: f32,
    pub last_time: f32,
}

impl LFO {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            config: LFOConfig::default(),
            sample_rate,
            phase: 0.0,
            last_time: 0.0,
        }
    }

    pub fn with_config(sample_rate: f32, config: LFOConfig) -> Self {
        Self {
            config,
            sample_rate,
            phase: 0.0,
            last_time: 0.0,
        }
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.config.enabled {
            return 0.0;
        }

        // Calculate phase increment based on time delta
        let time_delta = current_time - self.last_time;
        let phase_increment = self.config.frequency * time_delta * TAU;
        
        self.phase += phase_increment;
        
        // Keep phase in 0..TAU range
        while self.phase >= TAU {
            self.phase -= TAU;
        }
        
        self.last_time = current_time;

        // Generate waveform
        let raw_value = match self.config.waveform {
            LFOWaveform::Sine => self.phase.sin(),
            LFOWaveform::Square => if self.phase < std::f32::consts::PI { 1.0 } else { -1.0 },
            LFOWaveform::Saw => (self.phase / TAU) * 2.0 - 1.0,
            LFOWaveform::Triangle => {
                let normalized_phase = self.phase / TAU;
                if normalized_phase < 0.5 {
                    normalized_phase * 4.0 - 1.0
                } else {
                    (1.0 - normalized_phase) * 4.0 - 1.0
                }
            }
        };

        // Apply depth scaling
        raw_value * self.config.depth
    }

    pub fn set_frequency(&mut self, frequency: f32) {
        self.config.frequency = frequency.max(0.01).min(20.0); // Reasonable LFO range
    }

    pub fn set_depth(&mut self, depth: f32) {
        self.config.depth = depth.clamp(0.0, 1.0);
    }

    pub fn set_waveform(&mut self, waveform: LFOWaveform) {
        self.config.waveform = waveform;
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
        if enabled {
            // Reset phase when enabling
            self.phase = 0.0;
        }
    }

    pub fn reset_phase(&mut self) {
        self.phase = 0.0;
    }

    pub fn get_frequency(&self) -> f32 {
        self.config.frequency
    }

    pub fn get_depth(&self) -> f32 {
        self.config.depth
    }

    pub fn get_waveform(&self) -> LFOWaveform {
        self.config.waveform
    }

    pub fn is_enabled(&self) -> bool {
        self.config.enabled
    }
}