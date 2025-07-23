import { KickConfig, validateKickConfig } from '../config';

export class WebAudioKickDrum {
  private audioContext: AudioContext;
  private config: KickConfig;
  private isActive: boolean = false;

  constructor(audioContext: AudioContext, config?: Partial<KickConfig>) {
    this.audioContext = audioContext;
    this.config = validateKickConfig(config || {});
  }

  public getConfig(): KickConfig {
    return { ...this.config };
  }

  public setConfig(config: Partial<KickConfig>): void {
    this.config = validateKickConfig({ ...this.config, ...config });
  }

  public setVolume(volume: number): void {
    this.config.volume = Math.max(0.0, Math.min(1.0, volume));
  }

  public setFrequency(frequency: number): void {
    this.config.kickFrequency = Math.max(20.0, Math.min(200.0, frequency));
  }

  public setDecay(decayTime: number): void {
    this.config.decayTime = Math.max(0.01, Math.min(5.0, decayTime));
  }

  public setPunch(punchAmount: number): void {
    this.config.punchAmount = Math.max(0.0, Math.min(1.0, punchAmount));
  }

  public setSub(subAmount: number): void {
    this.config.subAmount = Math.max(0.0, Math.min(1.0, subAmount));
  }

  public setClick(clickAmount: number): void {
    this.config.clickAmount = Math.max(0.0, Math.min(1.0, clickAmount));
  }

  public setPitchDrop(pitchDrop: number): void {
    this.config.pitchDrop = Math.max(0.0, Math.min(1.0, pitchDrop));
  }

  public trigger(time?: number): void {
    if (!this.audioContext) {
      console.warn('Audio context not available');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      console.warn('Audio context is suspended');
      return;
    }

    const ctx = this.audioContext;
    const now = time ?? ctx.currentTime;
    
    this.isActive = true;
    
    // Create master gain node
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = this.config.volume;

    // Calculate pitch envelope parameters
    const pitchStartMultiplier = 1.0 + this.config.pitchDrop * 2.0;
    
    // Sub oscillator: Deep sine wave
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(this.config.kickFrequency, now);
    
    // Apply pitch envelope to sub oscillator
    const subFreqEnd = this.config.kickFrequency;
    const subFreqStart = this.config.kickFrequency * pitchStartMultiplier;
    subOsc.frequency.setValueAtTime(subFreqStart, now);
    subOsc.frequency.exponentialRampToValueAtTime(subFreqEnd, now + this.config.decayTime);
    
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.setTargetAtTime(this.config.subAmount * this.config.volume, now + 0.001, 0.001);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + this.config.decayTime);
    
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    
    // Punch oscillator: Triangle wave for mid-range impact  
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    
    const punchFreqStart = this.config.kickFrequency * 2.5 * pitchStartMultiplier;
    const punchFreqEnd = this.config.kickFrequency * 2.5;
    punchOsc.frequency.setValueAtTime(punchFreqStart, now);
    punchOsc.frequency.exponentialRampToValueAtTime(punchFreqEnd, now + this.config.decayTime);
    
    punchGain.gain.setValueAtTime(0, now);
    punchGain.gain.setTargetAtTime(this.config.punchAmount * this.config.volume * 0.7, now + 0.001, 0.001);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + this.config.decayTime);
    
    punchOsc.connect(punchGain);
    punchGain.connect(masterGain);

    // Click oscillator: High-frequency filtered noise transient
    // Create noise buffer
    const bufferSize = ctx.sampleRate * (this.config.decayTime * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const clickSource = ctx.createBufferSource();
    const clickGain = ctx.createGain();
    const clickFilter = ctx.createBiquadFilter();
    
    clickSource.buffer = noiseBuffer;
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = 8000;
    clickFilter.Q.value = 4.0;
    
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.setTargetAtTime(this.config.clickAmount * this.config.volume * 0.3, now + 0.001, 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + this.config.decayTime * 0.2);
    
    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(masterGain);

    // FM snap for beater sound - simplified version
    const fmCarrier = ctx.createOscillator();
    const fmModulator = ctx.createOscillator();
    const fmModGain = ctx.createGain();
    const fmGain = ctx.createGain();
    
    fmCarrier.type = 'sine';
    fmCarrier.frequency.value = 100;
    fmModulator.type = 'sine';
    fmModulator.frequency.value = 300;
    
    fmModGain.gain.value = 50; // Modulation depth
    fmGain.gain.setValueAtTime(0, now);
    fmGain.gain.setTargetAtTime(0.1 * this.config.volume, now + 0.001, 0.001);
    fmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    fmModulator.connect(fmModGain);
    fmModGain.connect(fmCarrier.frequency);
    fmCarrier.connect(fmGain);
    fmGain.connect(masterGain);

    // Start and stop all oscillators
    const stopTime = now + Math.max(this.config.decayTime, 0.5);
    
    subOsc.start(now);
    subOsc.stop(stopTime);
    
    punchOsc.start(now);
    punchOsc.stop(stopTime);
    
    clickSource.start(now);
    
    fmCarrier.start(now);
    fmCarrier.stop(now + 0.1);
    fmModulator.start(now);
    fmModulator.stop(now + 0.1);

    // Set up completion callback
    setTimeout(() => {
      this.isActive = false;
    }, stopTime * 1000);
  }

  public release(time?: number): void {
    // For one-shot samples like kicks, release doesn't do much
    // but we keep the API consistent with the Rust implementation
    this.isActive = false;
  }

  public isActiveDrum(): boolean {
    return this.isActive;
  }
}