import {
  noteName,
  renderNote,
  renderInstrument,
  renderEffect,
  renderEffectParam,
  getBPM,
  wrapNote,
  channelIdToInstrumentType,
  transposeNoteValue,
  patternHue,
  renderPatternCell,
} from "../../../../src/shared/lib/uge/display";
import { createPatternCell } from "../../../../src/shared/lib/uge/song";

describe("noteName", () => {
  it("contains 12 entries covering one chromatic octave", () => {
    expect(noteName).toHaveLength(12);
    expect(noteName[0]).toBe("C-");
    expect(noteName[11]).toBe("B-");
  });
});

describe("renderNote", () => {
  it("returns '...' for null", () => {
    expect(renderNote(null)).toBe("...");
  });

  it("renders note 0 as C-3", () => {
    expect(renderNote(0)).toBe("C-3");
  });

  it("renders note 12 as C-4 (octave boundary)", () => {
    expect(renderNote(12)).toBe("C-4");
  });

  it("renders note 11 as B-3", () => {
    expect(renderNote(11)).toBe("B-3");
  });

  it("renders note 60 as C-8 (top of range)", () => {
    expect(renderNote(60)).toBe("C-8");
  });
});

describe("renderInstrument", () => {
  it("returns '..' for null", () => {
    expect(renderInstrument(null)).toBe("..");
  });

  it("renders instrument 0 as '01'", () => {
    expect(renderInstrument(0)).toBe("01");
  });

  it("renders instrument 14 as '15'", () => {
    expect(renderInstrument(14)).toBe("15");
  });
});

describe("renderEffect", () => {
  it("returns '.' for null", () => {
    expect(renderEffect(null)).toBe(".");
  });

  it("renders effectCode 0 as '0' (zero is not null)", () => {
    expect(renderEffect(0)).toBe("0");
  });

  it("renders effectCode 10 as 'A'", () => {
    expect(renderEffect(10)).toBe("A");
  });

  it("renders effectCode 15 as 'F'", () => {
    expect(renderEffect(15)).toBe("F");
  });
});

describe("renderEffectParam", () => {
  it("returns '..' for null", () => {
    expect(renderEffectParam(null)).toBe("..");
  });

  it("renders 0 as '00' (zero is not null)", () => {
    expect(renderEffectParam(0)).toBe("00");
  });

  it("renders 255 as 'FF'", () => {
    expect(renderEffectParam(255)).toBe("FF");
  });

  it("renders 16 as '10'", () => {
    expect(renderEffectParam(16)).toBe("10");
  });
});

describe("getBPM", () => {
  it("returns a positive number for typical tick values", () => {
    expect(getBPM(6)).toBeGreaterThan(0);
  });

  it("returns a higher BPM for fewer ticks per row", () => {
    expect(getBPM(3)).toBeGreaterThan(getBPM(6));
  });
});

describe("wrapNote", () => {
  it("keeps note 0 as 0", () => {
    expect(wrapNote(0)).toBe(0);
  });

  it("wraps negative note back into range", () => {
    const result = wrapNote(-1);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("wraps a note that exceeds TOTAL_NOTES back into range", () => {
    const bigNote = 200;
    const result = wrapNote(bigNote);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(72); // TOTAL_NOTES = 72
  });
});

describe("channelIdToInstrumentType", () => {
  it("maps channel 0, 1 to 'duty'", () => {
    expect(channelIdToInstrumentType(0)).toBe("duty");
    expect(channelIdToInstrumentType(1)).toBe("duty");
  });

  it("maps channel 2 to 'wave'", () => {
    expect(channelIdToInstrumentType(2)).toBe("wave");
  });

  it("maps channel 3 to 'noise'", () => {
    expect(channelIdToInstrumentType(3)).toBe("noise");
  });
});

describe("transposeNoteValue", () => {
  it("returns null for a null note", () => {
    expect(transposeNoteValue(null, 1)).toBeNull();
  });

  it("transposes up by 1 semitone", () => {
    expect(transposeNoteValue(0, 1)).toBe(1);
  });

  it("transposes down by 1 semitone", () => {
    expect(transposeNoteValue(12, -1)).toBe(11);
  });

  it("clamps at the lower bound (0)", () => {
    expect(transposeNoteValue(0, -5)).toBe(0);
  });

  it("clamps at the upper bound (71)", () => {
    expect(transposeNoteValue(71, 5)).toBe(71);
  });

  it("transposes up by one octave (12) within the same note class", () => {
    const result = transposeNoteValue(0, 12);
    expect(result).toBe(12);
  });

  it("clamps octave transpose at upper note class boundary", () => {
    // note 60 (C-8) is the highest C; jumping another octave should stay at 60
    const result = transposeNoteValue(60, 12);
    expect(result).toBe(60);
  });
});

describe("patternHue", () => {
  it("returns a number", () => {
    expect(typeof patternHue(0)).toBe("number");
  });

  it("returns distinct hues for different pattern ids", () => {
    expect(patternHue(0)).not.toBe(patternHue(1));
  });
});

describe("renderPatternCell", () => {
  it("renders an empty cell with '...' for the note field", () => {
    const cell = createPatternCell();
    const result = renderPatternCell(cell);
    expect(result.note).toBe("...");
    expect(result.instrument).toBe("..");
    expect(result.effect).toBe(".");
    expect(result.param).toBe("..");
  });

  it("renders a cell with all fields set", () => {
    const cell = { note: 0, instrument: 0, effectCode: 10, effectParam: 255 };
    const result = renderPatternCell(cell);
    expect(result.note).toBe("C-3");
    expect(result.instrument).toBe("01");
    expect(result.effect).toBe("A");
    expect(result.param).toBe("FF");
  });
});
