use crate::oscillator::Oscillator;

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

/// Represents a processing stage in the audio pipeline with oscillator and limiter
pub struct ProcessingStage {
    pub oscillator: Oscillator,
    pub limiter: BrickWallLimiter,
}

impl ProcessingStage {
    pub fn new(sample_rate: f32, frequency_hz: f32) -> Self {
        Self {
            oscillator: Oscillator::new(sample_rate, frequency_hz),
            limiter: BrickWallLimiter::new(1.0), // Default threshold at 1.0 to prevent clipping
        }
    }

    pub fn trigger(&mut self, time: f32) {
        self.oscillator.trigger(time);
    }

    /// Process audio through the complete stage pipeline: oscillator -> limiter
    pub fn tick(&mut self, current_time: f32) -> f32 {
        let oscillator_output = self.oscillator.tick(current_time);
        self.limiter.process(oscillator_output)
    }

    /// Set the limiter threshold (typically 0.0 to 1.0)
    pub fn set_limiter_threshold(&mut self, threshold: f32) {
        self.limiter.threshold = threshold;
    }
}
