use crate::envelope::{ADSRConfig, Envelope};
use crate::filters::{ResonantHighpassFilter, ResonantLowpassFilter};
use crate::fm_snap::FMSnapSynthesizer;
use crate::oscillator::Oscillator;
use crate::waveform::Waveform;

// Utility function to convert MIDI note to frequency
fn midi_to_hz(midi_note: f32) -> f32 {
    440.0 * 2.0_f32.powf((midi_note - 69.0) / 12.0)
}

// Utility function to map range as in Max MSP zmap
fn zmap(value: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32 {
    let normalized = (value - in_min) / (in_max - in_min);
    out_min + normalized * (out_max - out_min)
}

#[derive(Clone, Copy, Debug)]
pub struct KickConfig {
    pub kick_frequency: f32, // Base frequency (40-80Hz typical)
    pub punch_amount: f32,   // Mid-frequency presence (0.0-1.0)
    pub sub_amount: f32,     // Sub-bass presence (0.0-1.0)
    pub click_amount: f32,   // High-frequency click (0.0-1.0)
    pub decay_time: f32,     // Overall decay length in seconds
    pub pitch_drop: f32,     // Frequency sweep amount (0.0-1.0)
    pub volume: f32,         // Overall volume (0.0-1.0)
    // Max MSP inspired enhancements
    pub base_note: f32,              // MIDI note (0-127)
    pub pitch_env_amount: f32,       // Pitch envelope amount (0.0-1.0) -> +30 to +200 Hz
    pub attack_ms: f32,              // Attack time in ms (1-100) -> 0.5 to 400 ms
    pub noise_freq_scale: f32,       // Noise LP cutoff (0.0-1.0) -> 10 to 2400 Hz
    pub noise_env_depth: f32,        // Noise envelope depth (0.0-1.0) -> 40 to 90 scale
    pub overdrive: f32,              // Overdrive gain (1-100) -> 1 to 10 gain
    pub phase_reset: bool,           // Phase reset on trigger
    pub filter_sweep_amt: f32,       // Filter sweep amount (1-100) -> 4 to 700 units
}

impl KickConfig {
    pub fn new(
        kick_frequency: f32,
        punch_amount: f32,
        sub_amount: f32,
        click_amount: f32,
        decay_time: f32,
        pitch_drop: f32,
        volume: f32,
        base_note: f32,
        pitch_env_amount: f32,
        attack_ms: f32,
        noise_freq_scale: f32,
        noise_env_depth: f32,
        overdrive: f32,
        phase_reset: bool,
        filter_sweep_amt: f32,
    ) -> Self {
        Self {
            kick_frequency: kick_frequency.max(20.0).min(200.0), // Reasonable kick range
            punch_amount: punch_amount.clamp(0.0, 1.0),
            sub_amount: sub_amount.clamp(0.0, 1.0),
            click_amount: click_amount.clamp(0.0, 1.0),
            decay_time: decay_time.max(0.01).min(5.0), // Reasonable decay range
            pitch_drop: pitch_drop.clamp(0.0, 1.0),
            volume: volume.clamp(0.0, 1.0),
            base_note: base_note.clamp(0.0, 127.0),
            pitch_env_amount: pitch_env_amount.clamp(0.0, 1.0),
            attack_ms: attack_ms.clamp(1.0, 100.0),
            noise_freq_scale: noise_freq_scale.clamp(0.0, 1.0),
            noise_env_depth: noise_env_depth.clamp(0.0, 1.0),
            overdrive: overdrive.clamp(1.0, 100.0),
            phase_reset,
            filter_sweep_amt: filter_sweep_amt.clamp(1.0, 100.0),
        }
    }

    pub fn default() -> Self {
        Self::new(
            30.0, 0.80, 0.80, 0.20, 0.28, 0.20, 0.80,
            36.0, 0.5, 10.0, 0.5, 0.5, 20.0, false, 50.0
        )
    }

    pub fn punchy() -> Self {
        Self::new(
            60.0, 0.9, 0.6, 0.4, 0.6, 0.7, 0.85,
            40.0, 0.8, 5.0, 0.6, 0.7, 40.0, true, 70.0
        )
    }

    pub fn deep() -> Self {
        Self::new(
            45.0, 0.5, 1.0, 0.2, 1.2, 0.5, 0.9,
            32.0, 0.3, 20.0, 0.8, 0.8, 10.0, false, 30.0
        )
    }

    pub fn tight() -> Self {
        Self::new(
            70.0, 0.8, 0.7, 0.5, 0.4, 0.8, 0.8,
            44.0, 0.9, 3.0, 0.3, 0.4, 50.0, true, 80.0
        )
    }
}

pub struct KickDrum {
    pub sample_rate: f32,
    pub config: KickConfig,

    // Three oscillators for different frequency ranges
    pub sub_oscillator: Oscillator,   // Sub-bass (fundamental)
    pub punch_oscillator: Oscillator, // Mid-range punch
    pub click_oscillator: Oscillator, // High-frequency click

    // Pitch envelope for frequency sweeping
    pub pitch_envelope: Envelope,
    pub base_frequency: f32,
    pub pitch_start_multiplier: f32,

    // High-pass filter for click oscillator
    pub click_filter: ResonantHighpassFilter,

    // FM snap synthesizer for beater sound
    pub fm_snap: FMSnapSynthesizer,

    // Max MSP inspired enhancements
    pub noise_lp_filter: ResonantLowpassFilter,  // Low-pass filter for noise
    pub output_lp_filter: ResonantLowpassFilter, // Output low-pass filter with sweep
    pub noise_envelope: Envelope,                // Separate envelope for noise
    pub click_envelope: Envelope,                // Separate envelope for click
    
    pub is_active: bool,
}

impl KickDrum {
    pub fn new(sample_rate: f32) -> Self {
        let config = KickConfig::default();
        Self::with_config(sample_rate, config)
    }

    pub fn with_config(sample_rate: f32, config: KickConfig) -> Self {
        let mut kick = Self {
            sample_rate,
            config,
            sub_oscillator: Oscillator::new(sample_rate, config.kick_frequency),
            punch_oscillator: Oscillator::new(sample_rate, config.kick_frequency * 2.5),
            click_oscillator: Oscillator::new(sample_rate, config.kick_frequency * 40.0),
            pitch_envelope: Envelope::new(),
            base_frequency: config.kick_frequency,
            pitch_start_multiplier: 1.0 + config.pitch_drop * 2.0, // Start 1-3x higher
            click_filter: ResonantHighpassFilter::new(sample_rate, 8000.0, 4.0),
            fm_snap: FMSnapSynthesizer::new(sample_rate),
            // Max MSP inspired enhancements
            noise_lp_filter: ResonantLowpassFilter::new(sample_rate, 1000.0, 1.0),
            output_lp_filter: ResonantLowpassFilter::new(sample_rate, 2000.0, 1.0),
            noise_envelope: Envelope::new(),
            click_envelope: Envelope::new(),
            is_active: false,
        };

        kick.configure_oscillators();
        kick
    }

    fn configure_oscillators(&mut self) {
        let config = self.config;
        
        // Convert MIDI note to base frequency if base_note is set
        let base_freq = if config.base_note > 0.0 {
            midi_to_hz(config.base_note)
        } else {
            config.kick_frequency
        };
        
        // Map attack time from UI range to DSP range (1-100 -> 0.5-400ms)
        let attack_time_sec = zmap(config.attack_ms, 1.0, 100.0, 0.0005, 0.4);
        
        // Map decay time from UI range to DSP range (1-100 -> 0.5-4000ms)
        let decay_time_sec = zmap(config.decay_time, 1.0, 100.0, 0.0005, 4.0);

        // Sub oscillator: Deep sine wave with synchronized timing
        self.sub_oscillator.waveform = Waveform::Sine;
        self.sub_oscillator.frequency_hz = base_freq;
        self.sub_oscillator
            .set_volume(config.sub_amount * config.volume);
        self.sub_oscillator.set_adsr(ADSRConfig::new(
            attack_time_sec,         // Max MSP inspired attack time
            decay_time_sec,          // Max MSP inspired decay time
            0.0,                     // No sustain
            decay_time_sec * 0.2,    // Synchronized release
        ));

        // Punch oscillator: Sine or triangle for mid-range impact
        self.punch_oscillator.waveform = Waveform::Triangle;
        self.punch_oscillator.frequency_hz = base_freq * 2.5;
        self.punch_oscillator
            .set_volume(config.punch_amount * config.volume * 0.7);
        self.punch_oscillator.set_adsr(ADSRConfig::new(
            attack_time_sec,         // Max MSP inspired attack time
            decay_time_sec,          // Max MSP inspired decay time
            0.0,                     // No sustain
            decay_time_sec * 0.2,    // Synchronized release
        ));

        // Click oscillator: High-frequency filtered noise transient
        self.click_oscillator.waveform = Waveform::Noise;
        self.click_oscillator.frequency_hz = base_freq * 40.0;
        self.click_oscillator
            .set_volume(config.click_amount * config.volume * 0.3);
        self.click_oscillator.set_adsr(ADSRConfig::new(
            attack_time_sec,          // Max MSP inspired attack time
            decay_time_sec * 0.2,     // Much shorter decay time for click
            0.0,                      // No sustain
            decay_time_sec * 0.02,    // Extremely short release for click
        ));

        // Pitch envelope: Fast attack, synchronized decay for frequency sweeping
        self.pitch_envelope.set_config(ADSRConfig::new(
            0.001,                   // Instant attack
            decay_time_sec,          // Max MSP inspired decay time
            0.0,                     // Drop to base frequency
            decay_time_sec * 0.2,    // Synchronized release
        ));
        
        // Max MSP inspired noise envelope
        self.noise_envelope.set_config(ADSRConfig::new(
            attack_time_sec,         // Max MSP inspired attack time
            decay_time_sec * 0.5,    // Shorter decay for noise
            0.0,                     // No sustain
            decay_time_sec * 0.1,    // Short release for noise
        ));
        
        // Max MSP inspired click envelope
        self.click_envelope.set_config(ADSRConfig::new(
            0.001,                   // Very fast attack for click
            decay_time_sec * 0.1,    // Very short decay for click
            0.0,                     // No sustain
            decay_time_sec * 0.02,   // Extremely short release for click
        ));
        
        // Configure noise low-pass filter (10-2400 Hz)
        let noise_lp_freq = zmap(config.noise_freq_scale, 0.0, 1.0, 10.0, 2400.0);
        self.noise_lp_filter.set_cutoff_freq(noise_lp_freq);
        
        // Configure output low-pass filter with sweep (4-700 units)
        let output_lp_freq = zmap(config.filter_sweep_amt, 1.0, 100.0, 4.0, 700.0);
        self.output_lp_filter.set_cutoff_freq(output_lp_freq);
        
        // Update base frequency
        self.base_frequency = base_freq;
    }

    pub fn set_config(&mut self, config: KickConfig) {
        self.config = config;
        self.base_frequency = config.kick_frequency;
        self.pitch_start_multiplier = 1.0 + config.pitch_drop * 2.0;
        self.configure_oscillators();
    }

    pub fn trigger(&mut self, time: f32) {
        self.is_active = true;

        // Phase reset functionality (Max MSP inspired)
        if self.config.phase_reset {
            self.sub_oscillator.current_sample_index = 0.0;
            self.punch_oscillator.current_sample_index = 0.0;
            self.click_oscillator.current_sample_index = 0.0;
        }

        // Trigger all oscillators
        self.sub_oscillator.trigger(time);
        self.punch_oscillator.trigger(time);
        self.click_oscillator.trigger(time);

        // Trigger pitch envelope
        self.pitch_envelope.trigger(time);

        // Trigger Max MSP inspired envelopes
        self.noise_envelope.trigger(time);
        self.click_envelope.trigger(time);

        // Trigger FM snap for beater sound
        self.fm_snap.trigger(time);

        // Reset filter state for clean click transients
        self.click_filter.reset();
        self.noise_lp_filter.reset();
        self.output_lp_filter.reset();
    }

    pub fn release(&mut self, time: f32) {
        if self.is_active {
            self.sub_oscillator.release(time);
            self.punch_oscillator.release(time);
            self.click_oscillator.release(time);
            self.pitch_envelope.release(time);
            self.noise_envelope.release(time);
            self.click_envelope.release(time);
        }
    }

    pub fn tick(&mut self, current_time: f32) -> f32 {
        if !self.is_active {
            return 0.0;
        }

        // Max MSP inspired pitch envelope - additive instead of multiplicative
        let pitch_envelope_value = self.pitch_envelope.get_amplitude(current_time);
        let pitch_env_hz = zmap(self.config.pitch_env_amount, 0.0, 1.0, 30.0, 200.0);
        let pitch_offset = pitch_env_hz * pitch_envelope_value;

        // Apply additive pitch envelope to oscillators
        self.sub_oscillator.frequency_hz = self.base_frequency + pitch_offset;
        self.punch_oscillator.frequency_hz = (self.base_frequency * 2.5) + pitch_offset;

        // Click oscillator gets less pitch modulation to maintain transient character
        self.click_oscillator.frequency_hz = (self.base_frequency * 40.0) + (pitch_offset * 0.3);

        // Get envelope values for different components
        let _amp_env = self.sub_oscillator.envelope.get_amplitude(current_time);
        let noise_env = self.noise_envelope.get_amplitude(current_time);
        let click_env = self.click_envelope.get_amplitude(current_time);

        // Generate oscillator outputs
        let sub_output = self.sub_oscillator.tick(current_time);
        let punch_output = self.punch_oscillator.tick(current_time);
        let raw_click_output = self.click_oscillator.tick(current_time);

        // Apply resonant high-pass filtering to click for more realistic sound
        let filtered_click_output = self.click_filter.process(raw_click_output);

        // Max MSP inspired noise component with low-pass filtering
        let noise_scale = zmap(self.config.noise_env_depth, 0.0, 1.0, 40.0, 90.0);
        let noise_component = self.noise_lp_filter.process(raw_click_output) * noise_env * (noise_scale / 100.0) * 0.3;

        // Add FM snap for beater sound
        let fm_snap_output = self.fm_snap.tick(current_time);

        // Mix all components
        let body_mix = sub_output + punch_output;
        let click_mix = filtered_click_output * click_env * 0.2;
        let mut total_mix = body_mix + click_mix + noise_component + (fm_snap_output * self.config.volume);

        // Max MSP inspired overdrive/saturation
        let overdrive_gain = zmap(self.config.overdrive, 1.0, 100.0, 1.0, 10.0);
        total_mix = (total_mix * overdrive_gain).tanh();

        // Apply output low-pass filter
        let filtered_output = self.output_lp_filter.process(total_mix);

        // Final output scaling
        let final_output = filtered_output * 0.5;

        // Check if kick is still active
        if !self.sub_oscillator.envelope.is_active
            && !self.punch_oscillator.envelope.is_active
            && !self.click_oscillator.envelope.is_active
            && !self.fm_snap.is_active()
            && !self.noise_envelope.is_active
            && !self.click_envelope.is_active
        {
            self.is_active = false;
        }

        final_output
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.config.volume = volume.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_frequency(&mut self, frequency: f32) {
        self.config.kick_frequency = frequency.max(20.0).min(200.0);
        self.base_frequency = self.config.kick_frequency;
        self.configure_oscillators();
    }

    pub fn set_decay(&mut self, decay_time: f32) {
        self.config.decay_time = decay_time.max(0.01).min(5.0);
        self.configure_oscillators();
    }

    pub fn set_punch(&mut self, punch_amount: f32) {
        self.config.punch_amount = punch_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_sub(&mut self, sub_amount: f32) {
        self.config.sub_amount = sub_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_click(&mut self, click_amount: f32) {
        self.config.click_amount = click_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_pitch_drop(&mut self, pitch_drop: f32) {
        self.config.pitch_drop = pitch_drop.clamp(0.0, 1.0);
        self.pitch_start_multiplier = 1.0 + self.config.pitch_drop * 2.0;
    }

    // Max MSP inspired setters
    pub fn set_base_note(&mut self, base_note: f32) {
        self.config.base_note = base_note.clamp(0.0, 127.0);
        self.configure_oscillators();
    }

    pub fn set_pitch_env_amount(&mut self, pitch_env_amount: f32) {
        self.config.pitch_env_amount = pitch_env_amount.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_attack_ms(&mut self, attack_ms: f32) {
        self.config.attack_ms = attack_ms.clamp(1.0, 100.0);
        self.configure_oscillators();
    }

    pub fn set_noise_freq_scale(&mut self, noise_freq_scale: f32) {
        self.config.noise_freq_scale = noise_freq_scale.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_noise_env_depth(&mut self, noise_env_depth: f32) {
        self.config.noise_env_depth = noise_env_depth.clamp(0.0, 1.0);
        self.configure_oscillators();
    }

    pub fn set_overdrive(&mut self, overdrive: f32) {
        self.config.overdrive = overdrive.clamp(1.0, 100.0);
        self.configure_oscillators();
    }

    pub fn set_phase_reset(&mut self, phase_reset: bool) {
        self.config.phase_reset = phase_reset;
    }

    pub fn set_filter_sweep_amt(&mut self, filter_sweep_amt: f32) {
        self.config.filter_sweep_amt = filter_sweep_amt.clamp(1.0, 100.0);
        self.configure_oscillators();
    }
}
