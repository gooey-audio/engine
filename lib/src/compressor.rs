/// A compressor that applies dynamic range compression to audio signals
pub struct Compressor {
    pub enabled: bool,
    pub threshold: f32,           // dB
    pub ratio: f32,               // compression ratio (e.g., 4.0 = 4:1)
    pub attack_coeff: f32,        // attack time coefficient
    pub release_coeff: f32,       // release time coefficient
    pub makeup_gain_db: f32,      // makeup gain in dB
    envelope_follower: f32,       // current envelope level
    sample_rate: f32,             // for calculating time constants
}

impl Compressor {
    pub fn new(sample_rate: f32) -> Self {
        let mut compressor = Self {
            enabled: false,
            threshold: -12.0,    // -12dB threshold
            ratio: 4.0,          // 4:1 ratio
            attack_coeff: 0.0,
            release_coeff: 0.0,
            makeup_gain_db: 0.0, // 0dB makeup gain
            envelope_follower: 0.0,
            sample_rate,
        };
        compressor.set_attack(3.0);   // 3ms attack
        compressor.set_release(100.0); // 100ms release
        compressor
    }

    pub fn set_attack(&mut self, attack_ms: f32) {
        // Convert milliseconds to time constant coefficient
        let attack_seconds = attack_ms / 1000.0;
        self.attack_coeff = (-1.0 / (attack_seconds * self.sample_rate)).exp();
    }

    pub fn get_attack(&self) -> f32 {
        // Convert back to milliseconds
        if self.attack_coeff == 0.0 {
            return 0.001;
        }
        -1000.0 / (self.attack_coeff.ln() * self.sample_rate)
    }

    pub fn set_release(&mut self, release_ms: f32) {
        // Convert milliseconds to time constant coefficient
        let release_seconds = release_ms / 1000.0;
        self.release_coeff = (-1.0 / (release_seconds * self.sample_rate)).exp();
    }

    pub fn get_release(&self) -> f32 {
        // Convert back to milliseconds
        if self.release_coeff == 0.0 {
            return 10.0;
        }
        -1000.0 / (self.release_coeff.ln() * self.sample_rate)
    }

    pub fn process(&mut self, input: f32) -> f32 {
        if !self.enabled {
            return input;
        }

        // Convert input to dB
        let input_db = if input.abs() > 0.000001 {
            20.0 * input.abs().log10()
        } else {
            -120.0 // Very quiet signal
        };

        // Envelope follower
        let target_level = input_db;
        if target_level > self.envelope_follower {
            // Attack
            self.envelope_follower = target_level + (self.envelope_follower - target_level) * self.attack_coeff;
        } else {
            // Release
            self.envelope_follower = target_level + (self.envelope_follower - target_level) * self.release_coeff;
        }

        // Calculate gain reduction
        let gain_reduction_db = if self.envelope_follower > self.threshold {
            let over_threshold = self.envelope_follower - self.threshold;
            over_threshold * (1.0 - 1.0 / self.ratio)
        } else {
            0.0
        };

        // Apply makeup gain and gain reduction
        let total_gain_db = self.makeup_gain_db - gain_reduction_db;
        let gain_linear = (total_gain_db * 0.05 * std::f32::consts::LN_10).exp(); // Convert dB to linear

        input * gain_linear
    }
}