import {
  createPattern,
  createSong,
  createSubPattern,
} from "../../../../src/shared/lib/uge/song";
import {
  compactUGESong,
  loadUGESong,
  saveUGESong,
} from "../../../../src/shared/lib/uge/ugeHelper";

const makePattern = (note: number) => {
  const pattern = createPattern();
  pattern[0] = {
    note,
    instrument: null,
    effectCode: null,
    effectParam: null,
  };
  return pattern;
};

const addSaveReadyInstruments = (song: ReturnType<typeof createSong>) => {
  song.dutyInstruments = Array.from({ length: 15 }, (_, index) => ({
    index,
    name: "",
    length: null,
    dutyCycle: 2,
    initialVolume: 15,
    volumeSweepChange: 0,
    frequencySweepTime: 0,
    frequencySweepShift: 0,
    subpatternEnabled: false,
    subpattern: createSubPattern(),
  }));
  song.waveInstruments = Array.from({ length: 15 }, (_, index) => ({
    index,
    name: "",
    length: null,
    volume: 3,
    waveIndex: 0,
    subpatternEnabled: false,
    subpattern: createSubPattern(),
  }));
  song.noiseInstruments = Array.from({ length: 15 }, (_, index) => ({
    index,
    name: "",
    length: null,
    initialVolume: 15,
    volumeSweepChange: 0,
    bitCount: 15 as const,
    subpatternEnabled: false,
    subpattern: createSubPattern(),
  }));
};

describe("compactUGESong", () => {
  it("removes unused 4-pattern blocks and relinks sequence channels", () => {
    const song = createSong();
    song.patterns = [
      makePattern(1),
      makePattern(2),
      makePattern(3),
      makePattern(4),
      makePattern(5),
      makePattern(6),
      makePattern(7),
      makePattern(8),
      makePattern(9),
      makePattern(10),
      makePattern(11),
      makePattern(12),
    ];
    song.sequence = [
      { splitPattern: true, channels: [8, 9, 10, 11] },
      { splitPattern: false, channels: [0, 1, 2, 3] },
    ];

    const compacted = compactUGESong(song);

    expect(compacted.patterns).toHaveLength(8);
    expect(compacted.sequence).toEqual([
      { splitPattern: true, channels: [4, 5, 6, 7] },
      { splitPattern: false, channels: [0, 1, 2, 3] },
    ]);
    expect(compacted.patterns[0][0].note).toBe(1);
    expect(compacted.patterns[4][0].note).toBe(9);
  });

  it("does not merge identical used blocks", () => {
    const song = createSong();
    const blockA = [
      makePattern(1),
      makePattern(2),
      makePattern(3),
      makePattern(4),
    ];
    const blockB = [
      makePattern(1),
      makePattern(2),
      makePattern(3),
      makePattern(4),
    ];

    song.patterns = [...blockA, ...blockB];
    song.sequence = [
      { splitPattern: false, channels: [0, 1, 2, 3] },
      { splitPattern: false, channels: [4, 5, 6, 7] },
    ];

    const compacted = compactUGESong(song);

    expect(compacted.patterns).toHaveLength(8);
    expect(compacted.sequence[0].channels).toEqual([0, 1, 2, 3]);
    expect(compacted.sequence[1].channels).toEqual([4, 5, 6, 7]);
  });

  it("compacts unused pattern blocks before saving", () => {
    const song = createSong();
    addSaveReadyInstruments(song);
    song.patterns = [
      makePattern(1),
      makePattern(2),
      makePattern(3),
      makePattern(4),
      makePattern(5),
      makePattern(6),
      makePattern(7),
      makePattern(8),
    ];
    song.sequence = [{ splitPattern: false, channels: [4, 5, 6, 7] }];

    const reloaded = loadUGESong(saveUGESong(song));

    expect(reloaded.patterns).toHaveLength(4);
    expect(reloaded.sequence).toEqual([
      { splitPattern: false, channels: [0, 1, 2, 3] },
    ]);
    expect(reloaded.patterns[0][0].note).toBe(5);
  });
});
