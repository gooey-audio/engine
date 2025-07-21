// Configuration interfaces matching Rust lib patterns

export interface KickConfig {
  kickFrequency: number;     // Base frequency (40-80Hz typical)
  punchAmount: number;       // Mid-frequency presence (0.0-1.0)
  subAmount: number;         // Sub-bass presence (0.0-1.0)
  clickAmount: number;       // High-frequency click (0.0-1.0)
  decayTime: number;         // Overall decay length in seconds
  pitchDrop: number;         // Frequency sweep amount (0.0-1.0)
  volume: number;            // Overall volume (0.0-1.0)
}

export const KickConfigDefaults = {
  default: (): KickConfig => ({
    kickFrequency: 60.0,
    punchAmount: 0.80,
    subAmount: 0.80,
    clickAmount: 0.20,
    decayTime: 0.28,
    pitchDrop: 0.20,
    volume: 0.80
  }),
  
  punchy: (): KickConfig => ({
    kickFrequency: 60.0,
    punchAmount: 0.9,
    subAmount: 0.6,
    clickAmount: 0.4,
    decayTime: 0.6,
    pitchDrop: 0.7,
    volume: 0.85
  }),
  
  deep: (): KickConfig => ({
    kickFrequency: 45.0,
    punchAmount: 0.5,
    subAmount: 1.0,
    clickAmount: 0.2,
    decayTime: 1.2,
    pitchDrop: 0.5,
    volume: 0.9
  }),
  
  tight: (): KickConfig => ({
    kickFrequency: 70.0,
    punchAmount: 0.8,
    subAmount: 0.7,
    clickAmount: 0.5,
    decayTime: 0.4,
    pitchDrop: 0.8,
    volume: 0.8
  })
};

// Utility functions to validate and clamp config values
export const validateKickConfig = (config: Partial<KickConfig>): KickConfig => {
  const defaults = KickConfigDefaults.default();
  
  return {
    kickFrequency: Math.max(20.0, Math.min(200.0, config.kickFrequency ?? defaults.kickFrequency)),
    punchAmount: Math.max(0.0, Math.min(1.0, config.punchAmount ?? defaults.punchAmount)),
    subAmount: Math.max(0.0, Math.min(1.0, config.subAmount ?? defaults.subAmount)),
    clickAmount: Math.max(0.0, Math.min(1.0, config.clickAmount ?? defaults.clickAmount)),
    decayTime: Math.max(0.01, Math.min(5.0, config.decayTime ?? defaults.decayTime)),
    pitchDrop: Math.max(0.0, Math.min(1.0, config.pitchDrop ?? defaults.pitchDrop)),
    volume: Math.max(0.0, Math.min(1.0, config.volume ?? defaults.volume))
  };
};