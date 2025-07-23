import { Oscillator } from "./oscillator";

type InstOscillator = {
  osc: Oscillator;
};

// an instrument is a collection of oscillators
export class Instrument {
  private ctx: AudioContext;
  private oscialltors: Record<string, InstOscillator>;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
    this.oscialltors = {};
  }

  addOsc(name: string, osc: Oscillator) {
    this.oscialltors[name] = {
      osc,
    };
  }

  // link this oscialltors of this instrument
  // to the stage
  // could otherwise be down via prop access
  connect(gain: GainNode) {
    for (const key in this.oscialltors) {
      if (this.oscialltors.hasOwnProperty(key)) {
        const osc = this.oscialltors[key].osc;
        osc.connect(gain);
      }
    }
  }

  trigger() {
    for (const key in this.oscialltors) {
      if (this.oscialltors.hasOwnProperty(key)) {
        const osc = this.oscialltors[key].osc;
        osc.start();

        // the stop time should really be controlled by
        // the osciallators own envelop choice
        osc.stop(this.ctx.currentTime + 0.5);
      }
    }
  }

  // we'll manage per instrument volume
  // in the stage for summing
  // setVolume() {

  // }
}

// class Oneshot extends Instrument {
//   private ctx: AudioContext;

//   constructor(audioContext: AudioContext) {
//     super(ctx);
//   }
// }
