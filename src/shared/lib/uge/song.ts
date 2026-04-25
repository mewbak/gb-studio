import {
  TRACKER_NUM_CHANNELS,
  TRACKER_PATTERN_LENGTH,
  TRACKER_SUBPATTERN_LENGTH,
} from "consts";
import {
  Song,
  Pattern,
  SequenceItem,
  PatternCell,
  SubPatternCell,
  DutyInstrument,
  WaveInstrument,
  NoiseInstrument,
} from "./types";

const LAST_VERSION = 6;

/** Creates a new empty PatternCell with all fields set to null. */
export const createPatternCell = (): PatternCell => {
  return {
    note: null,
    instrument: null,
    effectCode: null,
    effectParam: null,
  };
};

/** Creates a new empty Pattern with `TRACKER_PATTERN_LENGTH` rows. */
export const createPattern = (): Pattern => {
  return Array.from(
    { length: TRACKER_PATTERN_LENGTH },
    createPatternCell,
  ) as Pattern;
};

/** Maps a linked UI pattern index to four per-channel pattern indices. */
export const createSequenceItem = (patternId: number): SequenceItem => {
  const basePatternId = patternId * TRACKER_NUM_CHANNELS;
  return {
    splitPattern: false,
    channels: [
      basePatternId,
      basePatternId + 1,
      basePatternId + 2,
      basePatternId + 3,
    ],
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
