export class Oscillator {
  private ctx: AudioContext;
  private gain: GainNode;
  private osc: OscillatorNode;

  constructor(ctx: AudioContext, freq: number) {
    this.ctx = ctx;

    const now = this.ctx.currentTime;

    const osc = ctx.createOscillator();
    this.osc = osc;

    // TODO
    // find better enum enforcement
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();

    gain.gain.setValueAtTime(1, now);

    // +0.5 is controlling the decay basically,
    // but want to try to use custom curve interpolation?
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);

    this.gain = gain;
  }

  connect(gain: GainNode) {
    this.gain.connect(gain);
  }

  start() {
    this.osc.start();
  }

  stop(future: number) {
    this.osc.stop(future);
  }
}
