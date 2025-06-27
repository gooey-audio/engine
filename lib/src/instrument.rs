use crate::envelope::ADSRConfig;

/// Trait for audio instruments that can be triggered, generate audio samples, and be controlled
pub trait Instrument {
    /// Trigger the instrument to start playing at the given time
    fn trigger(&mut self, time: f32);
    
    /// Release the instrument at the given time (start note off)
    fn release(&mut self, time: f32);
    
    /// Generate the next audio sample at the current time
    fn tick(&mut self, current_time: f32) -> f32;
    
    /// Set the volume of the instrument (0.0 to 1.0)
    fn set_volume(&mut self, volume: f32);
    
    /// Get the current volume of the instrument
    fn get_volume(&self) -> f32;
    
    /// Set the ADSR envelope configuration
    fn set_adsr(&mut self, config: ADSRConfig);
}