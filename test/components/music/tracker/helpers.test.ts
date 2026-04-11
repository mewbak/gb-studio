import {
  normalizeFieldIndex,
  fieldToPosition,
  buildSelectionRect,
  getSelectedTrackerFields,
  getFieldColumnFocus,
  trackerFieldsToPatternCells,
} from "../../../../src/components/music/tracker/helpers";

// TRACKER_NUM_FIELDS = TRACKER_NUM_CHANNELS(4) * TRACKER_CHANNEL_FIELDS(4) * TRACKER_PATTERN_LENGTH(64) = 1024
// TRACKER_ROW_SIZE = TRACKER_NUM_CHANNELS(4) * TRACKER_CHANNEL_FIELDS(4) = 16
const TRACKER_NUM_FIELDS = 1024;
const TRACKER_ROW_SIZE = 16;

describe("normalizeFieldIndex", () => {
  it("keeps a valid field index unchanged", () => {
    expect(normalizeFieldIndex(0)).toBe(0);
    expect(normalizeFieldIndex(100)).toBe(100);
  });

  it("wraps a negative field index into valid range", () => {
    expect(normalizeFieldIndex(-1)).toBe(TRACKER_NUM_FIELDS - 1);
  });

  it("wraps an out-of-range index back to 0", () => {
    expect(normalizeFieldIndex(TRACKER_NUM_FIELDS)).toBe(0);
  });
});

describe("fieldToPosition", () => {
  it("maps field 0 to position (0, 0)", () => {
    expect(fieldToPosition(0)).toEqual({ x: 0, y: 0 });
  });

  it("maps field 1 to position (1, 0)", () => {
    expect(fieldToPosition(1)).toEqual({ x: 1, y: 0 });
  });

  it("maps field TRACKER_ROW_SIZE to position (0, 1)", () => {
    expect(fieldToPosition(TRACKER_ROW_SIZE)).toEqual({ x: 0, y: 1 });
  });

  it("maps field 17 to position (1, 1)", () => {
    expect(fieldToPosition(TRACKER_ROW_SIZE + 1)).toEqual({ x: 1, y: 1 });
  });
});

describe("buildSelectionRect", () => {
  it("builds a zero-size rect when origin equals target", () => {
    const rect = buildSelectionRect({ x: 2, y: 3 }, 3 * TRACKER_ROW_SIZE + 2);
    expect(rect).toEqual({ x: 2, y: 3, width: 0, height: 0 });
  });

  it("normalises rect so x/y are the top-left corner", () => {
    const rect = buildSelectionRect({ x: 5, y: 3 }, 1 * TRACKER_ROW_SIZE + 2);
    expect(rect.x).toBeLessThanOrEqual(rect.x + rect.width);
    expect(rect.y).toBeLessThanOrEqual(rect.y + rect.height);
  });

  it("builds the correct rect for a 2x2 selection", () => {
    // origin (0,0), target field at column 1 row 1 = field 17
    const rect = buildSelectionRect({ x: 0, y: 0 }, TRACKER_ROW_SIZE + 1);
    expect(rect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});

describe("getSelectedTrackerFields", () => {
  it("returns all fields in a rect", () => {
    const rect = { x: 0, y: 0, width: 1, height: 1 };
    const fields = getSelectedTrackerFields(rect, undefined);
    // 2 columns × 2 rows = 4 fields
    expect(fields).toHaveLength(4);
  });

  it("returns a single field when only selectionOrigin is set", () => {
    const fields = getSelectedTrackerFields(undefined, { x: 3, y: 2 });
    expect(fields).toHaveLength(1);
    expect(fields[0]).toBe(2 * TRACKER_ROW_SIZE + 3);
  });

  it("returns empty array when both rect and origin are undefined", () => {
    const fields = getSelectedTrackerFields(undefined, undefined);
    expect(fields).toHaveLength(0);
  });
});

describe("getFieldColumnFocus", () => {
  it("returns noteColumnFocus for column 0 (field % 4 === 0)", () => {
    expect(getFieldColumnFocus(0)).toBe("noteColumnFocus");
    expect(getFieldColumnFocus(4)).toBe("noteColumnFocus");
  });

  it("returns instrumentColumnFocus for column 1 (field % 4 === 1)", () => {
    expect(getFieldColumnFocus(1)).toBe("instrumentColumnFocus");
  });

  it("returns effectCodeColumnFocus for column 2 (field % 4 === 2)", () => {
    expect(getFieldColumnFocus(2)).toBe("effectCodeColumnFocus");
  });

  it("returns effectParamColumnFocus for column 3 (field % 4 === 3)", () => {
    expect(getFieldColumnFocus(3)).toBe("effectParamColumnFocus");
  });
});

describe("trackerFieldsToPatternCells", () => {
  it("returns unique PatternCellAddresses for a set of fields", () => {
    // Fields 0 and 1 are both in row 0 / channel 0 — should collapse to one cell
    const cells = trackerFieldsToPatternCells(0, 0, [0, 1, 2, 3]);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual({ sequenceId: 0, rowId: 0, channelId: 0 });
  });

  it("returns cells for multiple rows", () => {
    // Row 0 ch 0 (fields 0-3) and row 1 ch 0 (fields 16-19)
    const cells = trackerFieldsToPatternCells(0, 0, [0, TRACKER_ROW_SIZE]);
    expect(cells).toHaveLength(2);
    expect(cells[0].rowId).toBe(0);
    expect(cells[1].rowId).toBe(1);
  });
});
