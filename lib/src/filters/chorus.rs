use std::collections::VecDeque;

/// A chorus effect that adds richness and depth to audio signals
/// by mixing the original signal with a delayed and modulated version
pub struct Chorus {
    /// Sample rate for timing calculations
    sample_rate: f32,
    /// Delay line buffer for storing delayed samples
    delay_buffer: VecDeque<f32>,
    /// Maximum delay time in samples
    max_delay_samples: usize,
    /// Current LFO phase for modulation
    lfo_phase: f32,
    /// LFO frequency in Hz (how fast the chorus oscillates)
    lfo_frequency: f32,
    /// Base delay time in samples
    base_delay_samples: f32,
    /// Modulation depth in samples
    modulation_depth_samples: f32,
    /// Wet/dry mix (0.0 = dry, 1.0 = wet)
    mix: f32,
    /// Whether the chorus is enabled
    enabled: bool,
}

impl Chorus {
    /// Create a new chorus effect
    pub fn new(sample_rate: f32) -> Self {
        let max_delay_ms = 50.0; // 50ms maximum delay
        let max_delay_samples = (max_delay_ms * sample_rate / 1000.0) as usize;
        
        Self {
            sample_rate,
            delay_buffer: VecDeque::with_capacity(max_delay_samples + 1),
            max_delay_samples,
            lfo_phase: 0.0,
            lfo_frequency: 0.5, // 0.5 Hz LFO
            base_delay_samples: 15.0 * sample_rate / 1000.0, // 15ms base delay
            modulation_depth_samples: 5.0 * sample_rate / 1000.0, // ±5ms modulation
            mix: 0.5, // 50% wet
            enabled: false,
        }
    }
    
    /// Process a single sample through the chorus effect
    pub fn process(&mut self, input: f32) -> f32 {
        if !self.enabled {
            return input;
        }
        
        // Add input to delay buffer
        self.delay_buffer.push_back(input);
        
        // Remove old samples if buffer is too long
        while self.delay_buffer.len() > self.max_delay_samples {
            self.delay_buffer.pop_front();
        }
        
        // Calculate current delay time using LFO
        let lfo_value = (self.lfo_phase * 2.0 * std::f32::consts::PI).sin();
        let current_delay = self.base_delay_samples + (lfo_value * self.modulation_depth_samples);
        
        // Ensure delay is within bounds
        let delay_samples = current_delay.max(1.0).min(self.delay_buffer.len() as f32 - 1.0);
        
        // Get delayed sample using linear interpolation
        let delayed_sample = self.get_delayed_sample(delay_samples);
        
        // Update LFO phase
        self.lfo_phase += self.lfo_frequency / self.sample_rate;
        if self.lfo_phase >= 1.0 {
            self.lfo_phase -= 1.0;
        }
        
        // Mix dry and wet signals
        input * (1.0 - self.mix) + delayed_sample * self.mix
    }
    
    /// Get a delayed sample using linear interpolation
    fn get_delayed_sample(&self, delay_samples: f32) -> f32 {
        if self.delay_buffer.is_empty() {
            return 0.0;
        }
        
        let buffer_len = self.delay_buffer.len();
        let index = buffer_len as f32 - delay_samples;
        
        if index < 0.0 {
            return 0.0;
        }
        
        let index_int = index as usize;
        let fraction = index - index_int as f32;
        
        if index_int >= buffer_len - 1 {
            return self.delay_buffer[buffer_len - 1];
        }
        
        let sample1 = self.delay_buffer[index_int];
        let sample2 = self.delay_buffer[index_int + 1];
        
        // Linear interpolation
        sample1 * (1.0 - fraction) + sample2 * fraction
    }
    
    /// Enable or disable the chorus effect
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
        if !enabled {
            // Clear delay buffer when disabled to prevent artifacts
            self.delay_buffer.clear();
            self.lfo_phase = 0.0;
        }
    }
    
    /// Check if the chorus is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }
    
    /// Set the chorus mix amount (0.0 = dry, 1.0 = wet)
    pub fn set_mix(&mut self, mix: f32) {
        self.mix = mix.clamp(0.0, 1.0);
    }
    
    /// Get the current mix amount
    pub fn get_mix(&self) -> f32 {
        self.mix
    }
    
    /// Set the LFO frequency in Hz
    pub fn set_lfo_frequency(&mut self, frequency: f32) {
        self.lfo_frequency = frequency.clamp(0.1, 10.0);
    }
    
    /// Get the current LFO frequency
    pub fn get_lfo_frequency(&self) -> f32 {
        self.lfo_frequency
    }
    
    /// Set the base delay time in milliseconds
    pub fn set_base_delay_ms(&mut self, delay_ms: f32) {
        let delay_ms = delay_ms.clamp(1.0, 40.0);
        self.base_delay_samples = delay_ms * self.sample_rate / 1000.0;
    }
    
    /// Get the current base delay time in milliseconds
    pub fn get_base_delay_ms(&self) -> f32 {
        self.base_delay_samples * 1000.0 / self.sample_rate
    }
    
    /// Set the modulation depth in milliseconds
    pub fn set_modulation_depth_ms(&mut self, depth_ms: f32) {
        let depth_ms = depth_ms.clamp(0.1, 20.0);
        self.modulation_depth_samples = depth_ms * self.sample_rate / 1000.0;
    }
    
    /// Get the current modulation depth in milliseconds
    pub fn get_modulation_depth_ms(&self) -> f32 {
        self.modulation_depth_samples * 1000.0 / self.sample_rate
    }
}