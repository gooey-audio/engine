use crate::envelope::{ADSRConfig, Envelope};
use crate::gen::oscillator::Oscillator;
use crate::filters::ResonantHighpassFilter;

/// A compositional instrument that can contain multiple oscillators, filters, and envelopes
pub struct Instrument {
    pub sample_rate: f32,
    pub oscillators: Vec<Oscillator>,
    pub filters: Vec<ResonantHighpassFilter>,
    pub envelope: Envelope,
    pub volume: f32,
    pub enabled: bool,
    current_time: f32,
}

impl Instrument {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            oscillators: Vec::new(),
            filters: Vec::new(),
            envelope: Envelope::new(),
            volume: 1.0,
            enabled: true,
            current_time: 0.0,
        }
    }

    /// Add an oscillator to the instrument
    pub fn add_oscillator(&mut self, frequency_hz: f32) -> usize {
        let oscillator = Oscillator::new(self.sample_rate, frequency_hz);
        self.oscillators.push(oscillator);
        self.oscillators.len() - 1 // Return the index of the added oscillator
    }

    /// Add a filter to the instrument
    pub fn add_filter(&mut self, cutoff_freq: f32, resonance: f32) -> usize {
        let filter = ResonantHighpassFilter::new(self.sample_rate, cutoff_freq, resonance);
        self.filters.push(filter);
        self.filters.len() - 1 // Return the index of the added filter
    }

    /// Set the envelope configuration
    pub fn set_envelope(&mut self, attack: f32, decay: f32, sustain: f32, release: f32) {
        let config = ADSRConfig::new(attack, decay, sustain, release);
        self.envelope.set_config(config);
    }

    /// Set the volume of the instrument
    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume.clamp(0.0, 1.0);
    }

    /// Get the current volume
    pub fn get_volume(&self) -> f32 {
        self.volume
    }

    /// Set oscillator waveform by index
    pub fn set_oscillator_waveform(&mut self, index: usize, waveform: crate::gen::waveform::Waveform) {
        if let Some(oscillator) = self.oscillators.get_mut(index) {
            oscillator.waveform = waveform;
        }
    }

    /// Set oscillator frequency by index
    pub fn set_oscillator_frequency(&mut self, index: usize, frequency_hz: f32) {
        if let Some(oscillator) = self.oscillators.get_mut(index) {
            oscillator.frequency_hz = frequency_hz;
        }
    }

    /// Set oscillator volume by index
    pub fn set_oscillator_volume(&mut self, index: usize, volume: f32) {
        if let Some(oscillator) = self.oscillators.get_mut(index) {
            oscillator.set_volume(volume);
        }
    }

    /// Set filter cutoff frequency by index
    pub fn set_filter_cutoff(&mut self, index: usize, cutoff_freq: f32) {
        if let Some(filter) = self.filters.get_mut(index) {
            filter.set_cutoff_freq(cutoff_freq);
        }
    }

    /// Set filter resonance by index
    pub fn set_filter_resonance(&mut self, index: usize, resonance: f32) {
        if let Some(filter) = self.filters.get_mut(index) {
            filter.set_resonance(resonance);
        }
    }

    /// Get the number of oscillators
    pub fn oscillator_count(&self) -> usize {
        self.oscillators.len()
    }

    /// Get the number of filters
    pub fn filter_count(&self) -> usize {
        self.filters.len()
    }

    /// Enable or disable the instrument
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    /// Check if the instrument is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Trigger the instrument
    pub fn trigger(&mut self, time: f32) {
        self.current_time = time;
        self.envelope.trigger(time);
        
        // Trigger all oscillators
        for oscillator in &mut self.oscillators {
            oscillator.trigger(time);
        }
        
        // Reset all filters
        for filter in &mut self.filters {
            filter.reset();
        }
    }

    /// Release the instrument
    pub fn release(&mut self, time: f32) {
        self.envelope.release(time);
        
        // Release all oscillators
        for oscillator in &mut self.oscillators {
            oscillator.release(time);
        }
    }

    /// Check if the instrument is active
    pub fn is_active(&self) -> bool {
        self.enabled && self.envelope.is_active
    }

    /// Process audio for one tick
    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.enabled {
            return 0.0;
        }

        self.current_time = current_time;
        
        // Mix all oscillators
        let mut output = 0.0;
        for oscillator in &mut self.oscillators {
            output += oscillator.tick(current_time);
        }
        
        // Apply filters in series
        for filter in &mut self.filters {
            output = filter.process(output);
        }
        
        // Apply instrument envelope and volume
        let envelope_amplitude = self.envelope.get_amplitude(current_time);
        output * envelope_amplitude * self.volume
    }
}