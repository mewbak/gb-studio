import { TRACKER_PATTERN_LENGTH, TRACKER_SUBPATTERN_LENGTH } from "consts";
import {
  Song,
  PatternCell,
  SubPatternCell,
  DutyInstrument,
  WaveInstrument,
  NoiseInstrument,
} from "./types";

const LAST_VERSION = 6;

/** Creates a new empty pattern with `TRACKER_PATTERN_LENGTH` rows, each with 4 empty cells. */
export const createPattern = (): PatternCell[][] => {
  return Array.from({ length: TRACKER_PATTERN_LENGTH }).map(() => [
    createPatternCell(),
    createPatternCell(),
    createPatternCell(),
    createPatternCell(),
  ]);
};

/** Creates a new empty PatternCell with all fields set to null. */
export const createPatternCell = (): PatternCell => {
  return {
    note: null,
    instrument: null,
    effectCode: null,
    effectParam: null,
  };
};

/** Creates a new empty SubPatternCell with all fields set to null. */
export const createSubPatternCell = (): SubPatternCell => {
  return {
    note: null,
    jump: null,
    effectCode: null,
    effectParam: null,
  };
};

/** Creates a new empty subpattern with `TRACKER_SUBPATTERN_LENGTH` empty cells. */
export const createSubPattern = (): SubPatternCell[] => {
  return Array.from({ length: TRACKER_SUBPATTERN_LENGTH }).map(
    createSubPatternCell,
  );
};

/** Creates a new blank Song with default values and empty instrument/pattern lists. */
export const createSong = (): Song => {
  return {
    version: LAST_VERSION,
    name: "",
    artist: "",
    comment: "",
    filename: "song",

    dutyInstruments: [],
    waveInstruments: [],
    noiseInstruments: [],
    waves: [],
    ticksPerRow: 6,

    timerEnabled: false,
    timerDivider: 0,

    patterns: [],
    sequence: [],
  };
};

/** Appends a DutyInstrument to the song, setting its index to the current list length. */
export const addDutyInstrument = (song: Song, instrument: DutyInstrument) => {
  const list = song.dutyInstruments;
  instrument.index = list.length;
  list.push(instrument);
};

/** Appends a WaveInstrument to the song, setting its index to the current list length. */
export const addWaveInstrument = (song: Song, instrument: WaveInstrument) => {
  const list = song.waveInstruments;
  instrument.index = list.length;
  list.push(instrument);
};

/** Appends a NoiseInstrument to the song, setting its index to the current list length. */
export const addNoiseInstrument = (song: Song, instrument: NoiseInstrument) => {
  const list = song.noiseInstruments;
  instrument.index = list.length;
  list.push(instrument);
};
