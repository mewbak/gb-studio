import {
  calculatePlaybackTrackerPosition,
  calculateDocumentWidth,
  getPatternListStartTicksPerRow,
  getPatternListTicksPerRow,
  getPatternNoteSustain,
  noteToRow,
  rowToNote,
  interpolateGridLine,
  pixelToGridIndex,
  pixelRangeToGridRange,
  pageToSnappedGridPoint,
} from "../../../../src/components/music/piano/helpers";
import type {
  DutyInstrument,
  PatternCell,
} from "../../../../src/shared/lib/uge/types";

// These must match the consts used by the helpers
const PIANO_ROLL_CELL_SIZE = 18; // consts.PIANO_ROLL_CELL_SIZE
const TOTAL_NOTES = 72; // consts.TOTAL_NOTES (6 octaves × 12)
const TRACKER_PATTERN_LENGTH = 64; // consts.TRACKER_PATTERN_LENGTH

const makePatternCell = (
  overrides: Partial<PatternCell> = {},
): PatternCell => ({
  note: null,
  instrument: null,
  effectCode: null,
  effectParam: null,
  ...overrides,
});

const makeDutyInstrument = (
  overrides: Partial<DutyInstrument> = {},
): DutyInstrument => ({
  index: 0,
  name: "Duty",
  length: null,
  dutyCycle: 2,
  initialVolume: 15,
  volumeSweepChange: 0,
  frequencySweepTime: 0,
  frequencySweepShift: 0,
  subpatternEnabled: false,
  subpattern: [],
  ...overrides,
});

describe("noteToRow / rowToNote", () => {
  it("are inverses of each other", () => {
    for (let note = 0; note < TOTAL_NOTES; note++) {
      expect(rowToNote(noteToRow(note))).toBe(note);
    }
  });

  it("maps the highest note (71) to row 0 (top of roll)", () => {
    expect(noteToRow(TOTAL_NOTES - 1)).toBe(0);
  });

  it("maps note 0 to the last row (bottom of roll)", () => {
    expect(noteToRow(0)).toBe(TOTAL_NOTES - 1);
  });
});

describe("calculatePlaybackTrackerPosition", () => {
  it("returns 0 for order=0, row=0", () => {
    expect(calculatePlaybackTrackerPosition(0, 0)).toBe(0);
  });

  it("advances by PIANO_ROLL_CELL_SIZE for each row", () => {
    const a = calculatePlaybackTrackerPosition(0, 0);
    const b = calculatePlaybackTrackerPosition(0, 1);
    expect(b - a).toBe(PIANO_ROLL_CELL_SIZE);
  });

  it("advances by TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE for each order step", () => {
    const a = calculatePlaybackTrackerPosition(0, 0);
    const b = calculatePlaybackTrackerPosition(1, 0);
    expect(b - a).toBe(TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE);
  });

  it("supports fractional playback progress within a row", () => {
    expect(calculatePlaybackTrackerPosition(0, 4, 2, 8)).toBe(
      (4 + 0.25) * PIANO_ROLL_CELL_SIZE,
    );
  });
});

describe("calculateDocumentWidth", () => {
  it("returns 0 for an empty sequence", () => {
    expect(calculateDocumentWidth(0)).toBe(0);
  });

  it("is proportional to sequence length", () => {
    const w1 = calculateDocumentWidth(1);
    const w2 = calculateDocumentWidth(2);
    expect(w2).toBe(w1 * 2);
  });
});

describe("pixelToGridIndex", () => {
  it("returns 0 for pixel 0", () => {
    expect(pixelToGridIndex(0)).toBe(0);
  });

  it("returns 0 for pixel PIANO_ROLL_CELL_SIZE - 1", () => {
    expect(pixelToGridIndex(PIANO_ROLL_CELL_SIZE - 1)).toBe(0);
  });

  it("returns 1 for pixel PIANO_ROLL_CELL_SIZE", () => {
    expect(pixelToGridIndex(PIANO_ROLL_CELL_SIZE)).toBe(1);
  });
});

describe("pixelRangeToGridRange", () => {
  it("covers at least one cell for a point range", () => {
    const { from, to } = pixelRangeToGridRange(0, 1, 100);
    expect(to).toBeGreaterThan(from);
  });

  it("clamps from to 0", () => {
    const { from } = pixelRangeToGridRange(0, 1, 100);
    expect(from).toBe(0);
  });

  it("clamps to to max", () => {
    const { to } = pixelRangeToGridRange(0, 10000, 5);
    expect(to).toBe(5);
  });

  it("covers the correct number of cells for a two-cell range", () => {
    const start = 0;
    const size = 2 * PIANO_ROLL_CELL_SIZE;
    const { from, to } = pixelRangeToGridRange(start, size, 100);
    expect(to - from).toBe(2);
  });
});

describe("interpolateGridLine", () => {
  it("returns just the destination point when from is null", () => {
    const result = interpolateGridLine(null, { absRow: 5, note: 10 });
    expect(result).toEqual([{ absRow: 5, note: 10 }]);
  });

  it("returns points along a horizontal line", () => {
    const points = interpolateGridLine(
      { absRow: 0, note: 5 },
      { absRow: 3, note: 5 },
    );
    // All points should have note=5, absRow should increase
    expect(points.every((p) => p.note === 5)).toBe(true);
    expect(points).toHaveLength(3);
  });

  it("returns points along a vertical line", () => {
    const points = interpolateGridLine(
      { absRow: 0, note: 0 },
      { absRow: 0, note: 3 },
    );
    expect(points.every((p) => p.absRow === 0)).toBe(true);
    expect(points).toHaveLength(3);
  });

  it("terminates at the destination", () => {
    const to = { absRow: 2, note: 2 };
    const points = interpolateGridLine({ absRow: 0, note: 0 }, to);
    const last = points[points.length - 1];
    expect(last).toEqual(to);
  });
});

describe("pageToSnappedGridPoint", () => {
  const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 } as DOMRect;
  const sequenceLength = 4;

  it("snaps to grid boundaries", () => {
    const result = pageToSnappedGridPoint(
      PIANO_ROLL_CELL_SIZE + 3,
      PIANO_ROLL_CELL_SIZE + 3,
      bounds,
      sequenceLength,
    );
    // Should snap to grid (multiples of PIANO_ROLL_CELL_SIZE)
    expect(result.x % PIANO_ROLL_CELL_SIZE).toBe(0);
    expect(result.y % PIANO_ROLL_CELL_SIZE).toBe(0);
  });

  it("clamps x at 0 for negative page coordinates", () => {
    const result = pageToSnappedGridPoint(-100, 0, bounds, sequenceLength);
    expect(result.x).toBe(0);
  });

  it("clamps y at 0 for negative page coordinates", () => {
    const result = pageToSnappedGridPoint(0, -100, bounds, sequenceLength);
    expect(result.y).toBe(0);
  });
});

describe("pattern sustain helpers", () => {
  it("tracks ticks-per-row changes across a pattern list", () => {
    const patterns = [
      [makePatternCell(), makePatternCell({ effectCode: 15, effectParam: 3 })],
      [makePatternCell(), makePatternCell()],
    ];

    expect(getPatternListStartTicksPerRow(patterns, 6)).toEqual([6, 3]);
    expect(getPatternListTicksPerRow(patterns, 6)).toEqual([6, 3, 3, 3]);
  });

  it("ends sustain on the next note", () => {
    const sustain = getPatternNoteSustain({
      instruments: [makeDutyInstrument()],
      channelCells: [
        makePatternCell({ note: 24, instrument: 0 }),
        makePatternCell(),
        makePatternCell({ note: 26 }),
      ],
      ticksPerRowByRow: [6, 6, 6],
      rowIndex: 0,
      instrumentId: 0,
    });

    expect(sustain).toEqual(2);
  });

  it("ends sustain on a note cut effect before the next note", () => {
    const sustain = getPatternNoteSustain({
      instruments: [makeDutyInstrument()],
      channelCells: [
        makePatternCell({ note: 24, instrument: 0 }),
        makePatternCell({ effectCode: 14, effectParam: 0 }),
        makePatternCell(),
      ],
      ticksPerRowByRow: [6, 6, 6],
      rowIndex: 0,
      instrumentId: 0,
    });

    expect(sustain).toEqual(1);
  });

  it("treats zero initial volume with positive sweep as sustaining", () => {
    const sustain = getPatternNoteSustain({
      instruments: [
        makeDutyInstrument({ initialVolume: 0, volumeSweepChange: 1 }),
      ],
      channelCells: [
        makePatternCell({ note: 24, instrument: 0 }),
        makePatternCell(),
        makePatternCell({ note: 26 }),
      ],
      ticksPerRowByRow: [6, 6, 6],
      rowIndex: 0,
      instrumentId: 0,
    });

    expect(sustain).toEqual(2);
  });
});
