export type DutyInstrument = {
  index: number;
  name: string;
  length: number | null;
  dutyCycle: number;
  initialVolume: number;
  volumeSweepChange: number;
  frequencySweepTime: number;
  frequencySweepShift: number;
  subpatternEnabled: boolean;
  subpattern: SubPatternCell[];
};

export type WaveInstrument = {
  index: number;
  name: string;
  length: number | null;
  volume: number;
  waveIndex: number;
  subpatternEnabled: boolean;
  subpattern: SubPatternCell[];
};

export type NoiseInstrument = {
  index: number;
  name: string;
  length: number | null;
  initialVolume: number;
  volumeSweepChange: number;
  dividingRatio: number;
  bitCount: 7 | 15;
  /**
   * @deprecated noise macros aren't used starting uge v6
   */
  noiseMacro?: number[];
  subpatternEnabled: boolean;
  subpattern: SubPatternCell[];
};

export type PatternCell = {
  note: number | null;
  instrument: number | null;
  effectcode: number | null;
  effectparam: number | null;
};

export type SubPatternCell = {
  note: number | null;
  jump: number | null;
  effectcode: number | null;
  effectparam: number | null;
};

export type Song = {
  version: number;
  name: string;
  artist: string;
  comment: string;
  filename: string;
  dutyInstruments: DutyInstrument[];
  waveInstruments: WaveInstrument[];
  noiseInstruments: NoiseInstrument[];
  waves: Uint8Array[];
  ticksPerRow: number;
  timerEnabled: boolean;
  timerDivider: number;
  patterns: PatternCell[][][];
  sequence: number[];
};
