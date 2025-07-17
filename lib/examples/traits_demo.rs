//! Example demonstrating the trait-based audio engine architecture
//! This shows how to use the abstract interfaces without depending on concrete implementations

use oscillator::traits::{
    PlaybackInterface, PlaybackWrapper, AudioGenerator, AudioProcessor, Instrument, 
    Triggerable, Configurable, Effect, EffectProcessor
};
use std::sync::Arc;

/// Example of a simple oscillator that implements the Instrument trait
struct SimpleOscillator {
    sample_rate: f32,
    frequency: f32,
    phase: f32,
    is_active: bool,
    volume: f32,
    enabled: bool,
}

impl SimpleOscillator {
    fn new(sample_rate: f32, frequency: f32) -> Self {
        Self {
            sample_rate,
            frequency,
            phase: 0.0,
            is_active: false,
            volume: 1.0,
            enabled: true,
        }
    }
}

impl AudioGenerator for SimpleOscillator {
    fn generate(&mut self, time: f32) -> f32 {
        if !self.enabled || !self.is_active {
            return 0.0;
        }
        
        let sample = (self.phase * 2.0 * std::f32::consts::PI).sin();
        self.phase += self.frequency / self.sample_rate;
        
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        
        sample * self.volume
    }
    
    fn is_active(&self) -> bool {
        self.is_active && self.enabled
    }
    
    fn sample_rate(&self) -> f32 {
        self.sample_rate
    }
    
    fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
    }
}

impl Instrument for SimpleOscillator {
    fn trigger(&mut self, time: f32) {
        self.is_active = true;
        self.phase = 0.0;
    }
    
    fn release(&mut self, time: f32) {
        self.is_active = false;
    }
    
    fn is_playing(&self) -> bool {
        self.is_active
    }
    
    fn frequency(&self) -> f32 {
        self.frequency
    }
    
    fn set_frequency(&mut self, frequency: f32) {
        self.frequency = frequency;
    }
}

impl Triggerable for SimpleOscillator {
    fn trigger(&mut self, time: f32) {
        Instrument::trigger(self, time);
    }
    
    fn trigger_with_velocity(&mut self, time: f32, velocity: f32) {
        self.volume = velocity;
        Instrument::trigger(self, time);
    }
    
    fn trigger_with_note(&mut self, time: f32, note: u8) {
        // Convert MIDI note to frequency
        let frequency = 440.0 * 2.0_f32.powf((note as f32 - 69.0) / 12.0);
        self.set_frequency(frequency);
        Instrument::trigger(self, time);
    }
    
    fn trigger_with_params(&mut self, time: f32, params: oscillator::traits::TriggerParams) {
        self.volume = params.velocity;
        if let Some(note) = params.note {
            self.trigger_with_note(time, note);
        } else {
            Instrument::trigger(self, time);
        }
    }
}

impl Configurable for SimpleOscillator {
    fn config(&self) -> Box<dyn std::any::Any> {
        let config = (self.frequency, self.volume, self.enabled);
        Box::new(config)
    }
    
    fn set_config(&mut self, config: Box<dyn std::any::Any>) -> Result<(), String> {
        if let Ok((freq, vol, enabled)) = config.downcast::<(f32, f32, bool)>() {
            self.frequency = freq;
            self.volume = vol;
            self.enabled = enabled;
            Ok(())
        } else {
            Err("Invalid config type".to_string())
        }
    }
    
    fn get_parameter(&self, name: &str) -> Option<f32> {
        match name {
            "frequency" => Some(self.frequency),
            "volume" => Some(self.volume),
            _ => None,
        }
    }
    
    fn set_parameter(&mut self, name: &str, value: f32) -> Result<(), String> {
        match name {
            "frequency" => {
                self.frequency = value;
                Ok(())
            }
            "volume" => {
                self.volume = value;
                Ok(())
            }
            _ => Err(format!("Unknown parameter: {}", name)),
        }
    }
}

/// Example of a simple gain effect
struct GainEffect {
    sample_rate: f32,
    gain: f32,
    bypassed: bool,
    wet_dry_mix: f32,
}

impl GainEffect {
    fn new(sample_rate: f32, gain: f32) -> Self {
        Self {
            sample_rate,
            gain,
            bypassed: false,
            wet_dry_mix: 1.0,
        }
    }
}

impl oscillator::traits::AudioProcessor for GainEffect {
    fn process(&mut self, input: f32, _time: f32) -> f32 {
        if self.bypassed {
            return input;
        }
        
        let processed = input * self.gain;
        input * (1.0 - self.wet_dry_mix) + processed * self.wet_dry_mix
    }
    
    fn reset(&mut self) {
        // No state to reset for gain effect
    }
    
    fn sample_rate(&self) -> f32 {
        self.sample_rate
    }
    
    fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
    }
}

impl Effect for GainEffect {
    fn effect_type(&self) -> &'static str {
        "Gain"
    }
    
    fn is_bypassed(&self) -> bool {
        self.bypassed
    }
    
    fn set_bypass(&mut self, bypass: bool) {
        self.bypassed = bypass;
    }
    
    fn wet_dry_mix(&self) -> f32 {
        self.wet_dry_mix
    }
    
    fn set_wet_dry_mix(&mut self, mix: f32) {
        self.wet_dry_mix = mix.clamp(0.0, 1.0);
    }
}

fn main() {
    println!("=== Trait-Based Audio Engine Demo ===\n");
    
    // Create a playback interface
    let playback = Arc::new(PlaybackWrapper::new(44100.0));
    
    // Create an instrument using the trait interface
    let mut oscillator = SimpleOscillator::new(44100.0, 440.0);
    
    // Create an effect using the trait interface
    let mut gain_effect = GainEffect::new(44100.0, 2.0);
    
    println!("1. Using Instrument trait:");
    println!("   - Frequency: {} Hz", oscillator.frequency());
    println!("   - Volume: {}", oscillator.get_parameter("volume").unwrap());
    
    // Trigger the instrument
    let current_time = playback.current_time();
    Instrument::trigger(&mut oscillator, current_time);
    println!("   - Triggered at {:.2}s", current_time);
    println!("   - Is playing: {}", oscillator.is_playing());
    
    // Generate some audio
    let sample = oscillator.generate(current_time);
    println!("   - Generated sample: {:.3}", sample);
    
    // Use the Triggerable trait
    println!("\n2. Using Triggerable trait:");
    oscillator.trigger_with_velocity(current_time + 0.1, 0.5);
    oscillator.trigger_with_note(current_time + 0.2, 72); // C5
    println!("   - Triggered with velocity 0.5 and note C5");
    
    // Use the Configurable trait
    println!("\n3. Using Configurable trait:");
    oscillator.set_parameter("frequency", 880.0).unwrap();
    println!("   - Set frequency to 880 Hz");
    println!("   - New frequency: {} Hz", oscillator.get_parameter("frequency").unwrap());
    
    // Use the Effect trait
    println!("\n4. Using Effect trait:");
    println!("   - Effect type: {}", gain_effect.effect_type());
    println!("   - Bypassed: {}", gain_effect.is_bypassed());
    gain_effect.set_wet_dry_mix(0.7);
    println!("   - Wet/dry mix: {}", gain_effect.wet_dry_mix());
    
    // Process audio through the effect
    let processed = gain_effect.process(sample, current_time);
    println!("   - Original sample: {:.3}", sample);
    println!("   - Processed sample: {:.3}", processed);
    
    println!("\n=== Demo Complete ===");
    println!("This demonstrates how traits provide clean abstractions");
    println!("that are decoupled from concrete implementations.");
} 