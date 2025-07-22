import { Instrument } from "@/src/instrument";

type InstrumentChannel = {
  instrument: Instrument;
  gain: GainNode;
};

// a collection of active instruments
// also provides mixing
// and "2bus processing"
export class Stage {
  private ctx: AudioContext;
  private mainOut: GainNode;
  private instruments: Record<string, InstrumentChannel>;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
    this.instruments = {};
    this.mainOut = this.ctx.createGain();
  }

  addInstrument(name: string, instrument: Instrument) {
    // TODO
    // enforce name is not already taken

    const gain = this.ctx.createGain();

    //
    gain.gain.setValueAtTime(1, this.ctx.currentTime);

    // link gain to ctx
    gain.connect(this.ctx.destination);

    // link incomming instrument
    // to its _own_ gain channel
    // so stage can do mix down
    instrument.connect(gain);

    this.instruments[name] = {
      instrument,
      gain,
    };
  }

  // TODO
  // check that name exists
  trigger(name: string) {
    const instChannel = this.instruments[name];

    instChannel.instrument.trigger();
  }

  // TODO
  // need to pass stage level gain into the instrument itself
  // to use for sub-staging, unless sub-gain works
  setVolume(name: string, amt: number) {
    this.instruments[name].gain.gain.setValueAtTime(amt, this.ctx.currentTime);
  }
}
