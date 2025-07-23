import { WebAudioKickDrum } from './instruments/webAudioKickDrum';
import { KickConfig, KickConfigDefaults } from './config';

export class WebAudioStage {
  private audioContext: AudioContext | null = null;
  private isInitialized: boolean = false;
  
  // Instruments
  private kickDrum: WebAudioKickDrum | null = null;
  
  // Audio context management
  public get sampleRate(): number {
    return this.audioContext?.sampleRate ?? 44100;
  }

  public get isAudioSupported(): boolean {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  public get isActive(): boolean {
    return this.isInitialized && this.audioContext !== null && this.audioContext.state !== 'closed';
  }

  public get context(): AudioContext | null {
    return this.audioContext;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
      }
    }
  }

  public async initialize(): Promise<boolean> {
    if (!this.audioContext) {
      console.error('Audio context not available');
      return false;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Initialize instruments with default configs
      this.kickDrum = new WebAudioKickDrum(this.audioContext, KickConfigDefaults.default());
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio stage:', error);
      return false;
    }
  }

  public async dispose(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }
    
    this.audioContext = null;
    this.kickDrum = null;
    this.isInitialized = false;
  }

  // Kick drum control methods (matching Rust Stage API)
  public triggerKick(time?: number): void {
    if (!this.kickDrum) {
      console.warn('Kick drum not initialized');
      return;
    }
    this.kickDrum.trigger(time);
  }

  public getKickConfig(): KickConfig | null {
    return this.kickDrum ? this.kickDrum.getConfig() : null;
  }

  public setKickConfig(config: Partial<KickConfig>): void {
    if (this.kickDrum) {
      this.kickDrum.setConfig(config);
    }
  }

  // Individual parameter setters for kick
  public setKickVolume(volume: number): void {
    if (this.kickDrum) {
      this.kickDrum.setVolume(volume);
    }
  }

  public setKickFrequency(frequency: number): void {
    if (this.kickDrum) {
      this.kickDrum.setFrequency(frequency);
    }
  }

  public setKickDecay(decayTime: number): void {
    if (this.kickDrum) {
      this.kickDrum.setDecay(decayTime);
    }
  }

  public setKickPunch(punchAmount: number): void {
    if (this.kickDrum) {
      this.kickDrum.setPunch(punchAmount);
    }
  }

  public setKickSub(subAmount: number): void {
    if (this.kickDrum) {
      this.kickDrum.setSub(subAmount);
    }
  }

  public setKickClick(clickAmount: number): void {
    if (this.kickDrum) {
      this.kickDrum.setClick(clickAmount);
    }
  }

  public setKickPitchDrop(pitchDrop: number): void {
    if (this.kickDrum) {
      this.kickDrum.setPitchDrop(pitchDrop);
    }
  }

  // Preset management
  public setKickPreset(presetName: 'default' | 'punchy' | 'deep' | 'tight'): void {
    const config = KickConfigDefaults[presetName]();
    this.setKickConfig(config);
  }

  // Status methods
  public isKickActive(): boolean {
    return this.kickDrum ? this.kickDrum.isActiveDrum() : false;
  }

  // Audio context control
  public async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public async suspendContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
    }
  }

  // Future: Methods for other instruments would go here
  // public triggerSnare(time?: number): void { ... }
  // public triggerHiHat(time?: number): void { ... }
  // public triggerTom(time?: number): void { ... }
  
  // Future: Sequencer methods would go here
  // public sequencerPlay(): void { ... }
  // public sequencerStop(): void { ... }
  // public sequencerSetStep(instrument: number, step: number, enabled: boolean): void { ... }
}