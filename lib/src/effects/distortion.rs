use super::AudioEffect;

/// Configuration for the soft clipping harmonic distortion effect
#[derive(Clone, Copy, Debug)]
pub struct DistortionConfig {
    /// Drive amount (0.0 to 1.0) - controls the intensity of the distortion
    pub drive: f32,
    /// Output gain (0.0 to 1.0) - controls the output level after distortion
    pub output_gain: f32,
    /// Pre-filter frequency (Hz) - high-pass filter before distortion
    pub pre_filter_freq: f32,
    /// Post-filter frequency (Hz) - low-pass filter after distortion
    pub post_filter_freq: f32,
}

impl DistortionConfig {
    pub fn new(drive: f32, output_gain: f32, pre_filter_freq: f32, post_filter_freq: f32) -> Self {
        Self {
            drive: drive.clamp(0.0, 1.0),
            output_gain: output_gain.clamp(0.0, 1.0),
            pre_filter_freq: pre_filter_freq.max(20.0).min(20000.0),
            post_filter_freq: post_filter_freq.max(20.0).min(20000.0),
        }
    }
    
    pub fn default() -> Self {
        Self::new(0.5, 0.8, 80.0, 8000.0)
    }
    
    pub fn subtle() -> Self {
        Self::new(0.3, 0.9, 100.0, 10000.0)
    }
    
    pub fn aggressive() -> Self {
        Self::new(0.8, 0.7, 60.0, 6000.0)
    }
    
    pub fn warm() -> Self {
        Self::new(0.4, 0.85, 120.0, 5000.0)
    }
}

/// Simple one-pole filter for pre/post filtering
#[derive(Clone, Copy, Debug)]
struct OnePointFilter {
    previous_input: f32,
    previous_output: f32,
    coefficient: f32,
}

impl OnePointFilter {
    fn new() -> Self {
        Self {
            previous_input: 0.0,
            previous_output: 0.0,
            coefficient: 0.0,
        }
    }
    
    fn set_frequency(&mut self, frequency: f32, sample_rate: f32) {
        let omega = 2.0 * std::f32::consts::PI * frequency / sample_rate;
        self.coefficient = omega / (omega + 1.0);
    }
    
    fn process_high_pass(&mut self, input: f32) -> f32 {
        let output = self.coefficient * (self.previous_output + input - self.previous_input);
        self.previous_input = input;
        self.previous_output = output;
        output
    }
    
    fn process_low_pass(&mut self, input: f32) -> f32 {
        let output = self.previous_output + self.coefficient * (input - self.previous_output);
        self.previous_output = output;
        output
    }
    
    fn reset(&mut self) {
        self.previous_input = 0.0;
        self.previous_output = 0.0;
    }
}

/// Soft clipping harmonic distortion effect
pub struct SoftClippingDistortion {
    pub config: DistortionConfig,
    pub sample_rate: f32,
    pub enabled: bool,
    
    // Filters for shaping the distortion
    pre_filter: OnePointFilter,
    post_filter: OnePointFilter,
}

impl SoftClippingDistortion {
    pub fn new(sample_rate: f32) -> Self {
        let config = DistortionConfig::default();
        Self::with_config(sample_rate, config)
    }
    
    pub fn with_config(sample_rate: f32, config: DistortionConfig) -> Self {
        let mut distortion = Self {
            config,
            sample_rate,
            enabled: false, // Default to disabled to prevent volume issues
            pre_filter: OnePointFilter::new(),
            post_filter: OnePointFilter::new(),
        };
        
        distortion.update_filters();
        distortion
    }
    
    fn update_filters(&mut self) {
        self.pre_filter.set_frequency(self.config.pre_filter_freq, self.sample_rate);
        self.post_filter.set_frequency(self.config.post_filter_freq, self.sample_rate);
    }
    
    pub fn set_config(&mut self, config: DistortionConfig) {
        self.config = config;
        self.update_filters();
    }
    
    pub fn set_drive(&mut self, drive: f32) {
        self.config.drive = drive.clamp(0.0, 1.0);
    }
    
    pub fn set_output_gain(&mut self, gain: f32) {
        self.config.output_gain = gain.clamp(0.0, 1.0);
    }
    
    /// Soft clipping function that adds harmonic distortion
    /// Uses a hyperbolic tangent function for smooth distortion
    fn soft_clip(&self, input: f32, drive: f32) -> f32 {
        if drive <= 0.0 {
            return input;
        }
        
        // Scale input based on drive amount
        let scaled = input * (1.0 + drive * 9.0); // Drive range 1x to 10x
        
        // Apply soft clipping using tanh function
        let clipped = scaled.tanh();
        
        // Compensate for gain reduction caused by clipping
        let compensation = 1.0 / (1.0 + drive * 0.5);
        
        clipped * compensation
    }
}

impl AudioEffect for SoftClippingDistortion {
    fn process(&mut self, input: f32) -> f32 {
        if !self.enabled {
            return input;
        }
        
        // Apply pre-filter (high-pass to remove low-frequency rumble)
        let filtered_input = self.pre_filter.process_high_pass(input);
        
        // Apply soft clipping distortion
        let distorted = self.soft_clip(filtered_input, self.config.drive);
        
        // Apply post-filter (low-pass to smooth harsh harmonics)
        let filtered_output = self.post_filter.process_low_pass(distorted);
        
        // Apply output gain and mix with original signal
        let processed = filtered_output * self.config.output_gain;
        
        // Return the processed signal
        processed
    }
    
    fn reset(&mut self) {
        self.pre_filter.reset();
        self.post_filter.reset();
    }
    
    fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
    
    fn is_enabled(&self) -> bool {
        self.enabled
    }
}