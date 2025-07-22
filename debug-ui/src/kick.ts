import { Instrument } from "./instrument";
import { Oscillator } from "./oscillator";

export const makeKick = (ctx: AudioContext) => {
  const inst = new Instrument(ctx);

  const osc1 = new Oscillator(ctx, 500);

  const osc2 = new Oscillator(ctx, 800);

  inst.addOsc("sub", osc1);
  inst.addOsc("main", osc2);

  return inst;
};
