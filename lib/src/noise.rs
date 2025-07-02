use rand::prelude::*;
use rand_pcg::Pcg64;

#[derive(Debug, Clone, Copy)]
pub enum NoiseType {
    White,
    Pink,
    Brown,
    Snare,
}

pub struct NoiseGenerator {
    noise_type: NoiseType,
    rng: Pcg64,
    // Pink noise state
    pink_state: [f32; 5],
    pink_running_sum: f32,
    // Brown noise state
    brown_last_value: f32,
    // High-pass filter state for snare noise
    hp_x1: f32,
    hp_y1: f32,
}

impl NoiseGenerator {
    pub fn new(noise_type: NoiseType, seed: u64) -> Self {
        Self {
            noise_type,
            rng: Pcg64::seed_from_u64(seed),
            pink_state: [0.0; 5],
            pink_running_sum: 0.0,
            brown_last_value: 0.0,
            hp_x1: 0.0,
            hp_y1: 0.0,
        }
    }

    pub fn generate(&mut self) -> f32 {
        match self.noise_type {
            NoiseType::White => self.white_noise(),
            NoiseType::Pink => self.pink_noise(),
            NoiseType::Brown => self.brown_noise(),
            NoiseType::Snare => self.snare_noise(),
        }
    }

    fn white_noise(&mut self) -> f32 {
        // Generate uniform random value between -1.0 and 1.0
        self.rng.gen::<f32>() * 2.0 - 1.0
    }

    fn pink_noise(&mut self) -> f32 {
        // Paul Kellett's refined pink noise algorithm
        let white = self.white_noise();
        
        self.pink_state[0] = 0.99886 * self.pink_state[0] + white * 0.0555179;
        self.pink_state[1] = 0.99332 * self.pink_state[1] + white * 0.0750759;
        self.pink_state[2] = 0.96900 * self.pink_state[2] + white * 0.1538520;
        self.pink_state[3] = 0.86650 * self.pink_state[3] + white * 0.3104856;
        self.pink_state[4] = 0.55000 * self.pink_state[4] + white * 0.5329522;
        
        let pink = self.pink_state[0] + self.pink_state[1] + self.pink_state[2] + self.pink_state[3] + self.pink_state[4] + white * 0.115926;
        
        // Normalize to roughly -1.0 to 1.0 range
        pink * 0.11
    }

    fn brown_noise(&mut self) -> f32 {
        // Brownian noise (random walk)
        let white = self.white_noise();
        self.brown_last_value = (self.brown_last_value + white * 0.02).clamp(-1.0, 1.0);
        self.brown_last_value
    }

    fn snare_noise(&mut self) -> f32 {
        // Start with white noise
        let white = self.white_noise();
        
        // Apply high-pass filter to emphasize high frequencies (snare character)
        // Simple high-pass filter: y[n] = a * (x[n] - x[n-1] + y[n-1])
        let a = 0.8; // High-pass coefficient
        let hp_output = a * (white - self.hp_x1 + self.hp_y1);
        
        self.hp_x1 = white;
        self.hp_y1 = hp_output;
        
        hp_output.clamp(-1.0, 1.0)
    }
}

// Helper structure for easily mixing noise into instruments
pub struct NoiseMixer {
    generator: NoiseGenerator,
    mix_level: f32, // 0.0 to 1.0
}

impl NoiseMixer {
    pub fn new(noise_type: NoiseType, seed: u64) -> Self {
        Self {
            generator: NoiseGenerator::new(noise_type, seed),
            mix_level: 0.5,
        }
    }

    pub fn set_mix_level(&mut self, level: f32) {
        self.mix_level = level.clamp(0.0, 1.0);
    }

    pub fn get_mix_level(&self) -> f32 {
        self.mix_level
    }

    pub fn mix_with_signal(&mut self, signal: f32) -> f32 {
        let noise = self.generator.generate();
        signal * (1.0 - self.mix_level) + noise * self.mix_level
    }

    pub fn generate_noise(&mut self) -> f32 {
        self.generator.generate() * self.mix_level
    }
}

// Convenience function for creating snare noise
pub fn snare_noise(seed: u64) -> NoiseGenerator {
    NoiseGenerator::new(NoiseType::Snare, seed)
}