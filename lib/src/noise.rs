use rand::Rng;

/// Noise generator for creating various types of noise
pub struct NoiseGenerator {
    /// Random number generator for noise generation
    rng: rand::rngs::ThreadRng,
    /// Current sample for noise generation
    current_sample: f32,
    /// Sample rate for the noise generator
    sample_rate: f32,
    /// Current sample index for tracking position
    sample_index: u32,
}

impl NoiseGenerator {
    /// Create a new noise generator
    pub fn new(sample_rate: f32) -> Self {
        Self {
            rng: rand::thread_rng(),
            current_sample: 0.0,
            sample_rate,
            sample_index: 0,
        }
    }

    /// Generate white noise (random values between -1.0 and 1.0)
    pub fn white_noise(&mut self) -> f32 {
        self.sample_index = self.sample_index.wrapping_add(1);
        self.rng.gen_range(-1.0..=1.0)
    }

    /// Generate pink noise (1/f noise, more energy at lower frequencies)
    pub fn pink_noise(&mut self) -> f32 {
        self.sample_index = self.sample_index.wrapping_add(1);
        // Simple pink noise approximation using multiple white noise sources
        // This is a basic implementation - more sophisticated algorithms exist
        let white = self.rng.gen_range(-1.0..=1.0);
        let filtered = white * 0.5 + self.current_sample * 0.5;
        self.current_sample = filtered;
        filtered
    }

    /// Generate brown noise (Brownian noise, even more energy at lower frequencies)
    pub fn brown_noise(&mut self) -> f32 {
        self.sample_index = self.sample_index.wrapping_add(1);
        let white = self.rng.gen_range(-0.1..=0.1); // Smaller range for brown noise
        self.current_sample = (self.current_sample + white).clamp(-1.0, 1.0);
        self.current_sample
    }

    /// Generate filtered white noise suitable for snare drums
    /// This creates a noise that's more focused in the mid-high frequency range
    pub fn snare_noise(&mut self) -> f32 {
        self.sample_index = self.sample_index.wrapping_add(1);
        // Generate white noise
        let white = self.rng.gen_range(-1.0..=1.0);
        
        // Simple high-pass filtering to emphasize higher frequencies
        // This is a basic implementation - more sophisticated filtering could be added
        let high_passed = white - self.current_sample * 0.9;
        self.current_sample = white;
        
        // Scale and clamp the output
        (high_passed * 0.7).clamp(-1.0, 1.0)
    }

    /// Reset the noise generator state
    pub fn reset(&mut self) {
        self.current_sample = 0.0;
        self.sample_index = 0;
    }
}

/// Enum representing different types of noise
#[derive(Debug, Clone, Copy)]
pub enum NoiseType {
    White,
    Pink,
    Brown,
    Snare,
}

/// Abstraction for mixing noise into instruments
pub struct NoiseMixer {
    generator: NoiseGenerator,
    noise_type: NoiseType,
    mix_level: f32, // 0.0 to 1.0, amount of noise to mix in
}

impl NoiseMixer {
    /// Create a new noise mixer
    pub fn new(sample_rate: f32, noise_type: NoiseType, mix_level: f32) -> Self {
        Self {
            generator: NoiseGenerator::new(sample_rate),
            noise_type,
            mix_level: mix_level.clamp(0.0, 1.0),
        }
    }

    /// Generate noise sample based on the configured noise type
    pub fn generate_noise(&mut self) -> f32 {
        match self.noise_type {
            NoiseType::White => self.generator.white_noise(),
            NoiseType::Pink => self.generator.pink_noise(),
            NoiseType::Brown => self.generator.brown_noise(),
            NoiseType::Snare => self.generator.snare_noise(),
        }
    }

    /// Mix noise with an input signal
    pub fn mix_with_signal(&mut self, input_signal: f32) -> f32 {
        let noise = self.generate_noise();
        let mixed = input_signal * (1.0 - self.mix_level) + noise * self.mix_level;
        mixed.clamp(-1.0, 1.0)
    }

    /// Set the noise mix level (0.0 to 1.0)
    pub fn set_mix_level(&mut self, level: f32) {
        self.mix_level = level.clamp(0.0, 1.0);
    }

    /// Get the current noise mix level
    pub fn get_mix_level(&self) -> f32 {
        self.mix_level
    }

    /// Set the noise type
    pub fn set_noise_type(&mut self, noise_type: NoiseType) {
        self.noise_type = noise_type;
    }

    /// Get the current noise type
    pub fn get_noise_type(&self) -> NoiseType {
        self.noise_type
    }

    /// Reset the noise generator
    pub fn reset(&mut self) {
        self.generator.reset();
    }
}