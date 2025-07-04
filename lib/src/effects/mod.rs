pub mod distortion;

pub use distortion::*;

/// Trait for audio effects that can be applied to audio signals
pub trait AudioEffect {
    /// Process a single audio sample
    fn process(&mut self, input: f32) -> f32;
    
    /// Reset the effect state
    fn reset(&mut self);
    
    /// Set whether the effect is enabled
    fn set_enabled(&mut self, enabled: bool);
    
    /// Check if the effect is enabled
    fn is_enabled(&self) -> bool;
}