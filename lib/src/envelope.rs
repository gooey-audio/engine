pub struct Envelope {
    pub attack_time: f32,   // seconds
    pub decay_time: f32,    // seconds
    pub sustain_level: f32, // 0.0 to 1.0
    pub release_time: f32,  // seconds
    pub current_time: f32,  // current time in the envelope
    pub is_active: bool,
    pub trigger_time: f32,  // when the envelope was triggered
}

impl Envelope {
    pub fn new() -> Self {
        Self {
            attack_time: 0.01,
            decay_time: 0.3,
            sustain_level: 0.0,
            release_time: 0.5,
            current_time: 0.0,
            is_active: false,
            trigger_time: 0.0,
        }
    }

    pub fn trigger(&mut self, time: f32) {
        self.is_active = true;
        self.trigger_time = time;
        self.current_time = 0.0;
    }

    pub fn get_amplitude(&mut self, current_time: f32) -> f32 {
        if !self.is_active {
            return 0.0;
        }
        let elapsed = current_time - self.trigger_time;
        self.current_time = elapsed;
        if elapsed < self.attack_time {
            elapsed / self.attack_time
        } else if elapsed < self.attack_time + self.decay_time {
            let decay_elapsed = elapsed - self.attack_time;
            let decay_progress = decay_elapsed / self.decay_time;
            1.0 - (1.0 - self.sustain_level) * decay_progress
        } else if elapsed < self.attack_time + self.decay_time + self.release_time {
            let release_elapsed = elapsed - self.attack_time - self.decay_time;
            let release_progress = release_elapsed / self.release_time;
            self.sustain_level * (1.0 - release_progress)
        } else {
            self.is_active = false;
            0.0
        }
    }
} 