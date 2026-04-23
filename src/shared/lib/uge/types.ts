import { Type, Static } from "@sinclair/typebox";

export const PatternCell = Type.Object({
  note: Type.Union([Type.Number(), Type.Null()]),
  instrument: Type.Union([Type.Number(), Type.Null()]),
  effectCode: Type.Union([Type.Number(), Type.Null()]),
  effectParam: Type.Union([Type.Number(), Type.Null()]),
});

export type PatternCell = Static<typeof PatternCell>;

export const SubPatternCell = Type.Object({
  note: Type.Union([Type.Number(), Type.Null()]),
  jump: Type.Union([Type.Number(), Type.Null()]),
  effectCode: Type.Union([Type.Number(), Type.Null()]),
  effectParam: Type.Union([Type.Number(), Type.Null()]),
});

export type SubPatternCell = Static<typeof SubPatternCell>;

export const DutyInstrument = Type.Object({
  index: Type.Number(),
  name: Type.String(),
  length: Type.Union([Type.Number(), Type.Null()]),
  dutyCycle: Type.Number(),
  initialVolume: Type.Number(),
  volumeSweepChange: Type.Number(),
  frequencySweepTime: Type.Number(),
  frequencySweepShift: Type.Number(),
  subpatternEnabled: Type.Boolean(),
  subpattern: Type.Array(SubPatternCell),
});

export type DutyInstrument = Static<typeof DutyInstrument>;

export const WaveInstrument = Type.Object({
  index: Type.Number(),
  name: Type.String(),
  length: Type.Union([Type.Number(), Type.Null()]),
  volume: Type.Number(),
  waveIndex: Type.Number(),
  subpatternEnabled: Type.Boolean(),
  subpattern: Type.Array(SubPatternCell),
});

export type WaveInstrument = Static<typeof WaveInstrument>;

export const NoiseInstrument = Type.Object({
  index: Type.Number(),
  name: Type.String(),
  length: Type.Union([Type.Number(), Type.Null()]),
  initialVolume: Type.Number(),
  volumeSweepChange: Type.Number(),
  dividingRatio: Type.Number(),
  bitCount: Type.Union([Type.Literal(7), Type.Literal(15)]),
  subpatternEnabled: Type.Boolean(),
  subpattern: Type.Array(SubPatternCell),
});

export type NoiseInstrument = Static<typeof NoiseInstrument>;

export const Song = Type.Object({
  version: Type.Number(),
  name: Type.String(),
  artist: Type.String(),
  comment: Type.String(),
  filename: Type.String(),
  dutyInstruments: Type.Array(DutyInstrument),
  waveInstruments: Type.Array(WaveInstrument),
  noiseInstruments: Type.Array(NoiseInstrument),
  waves: Type.Array(Type.Uint8Array()),
  ticksPerRow: Type.Number(),
  timerEnabled: Type.Boolean(),
  timerDivider: Type.Number(),
  patterns: Type.Array(Type.Array(Type.Array(PatternCell))),
  sequence: Type.Array(Type.Number()),
});

export type Song = Static<typeof Song>;
