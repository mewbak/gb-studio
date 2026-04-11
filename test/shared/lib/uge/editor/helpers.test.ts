import {
  getPatternCellSelectionValue,
  toValidChannelId,
} from "../../../../../src/shared/lib/uge/editor/helpers";
import { createSong, createPattern } from "../../../../../src/shared/lib/uge/song";
import type { Song } from "../../../../../src/shared/lib/uge/types";

const makeSongWithNote = (note: number | null): Song => {
  const song = createSong();
  const pattern = createPattern();
  pattern[0][0].note = note;
  song.patterns.push(pattern);
  song.sequence.push(0);
  return song;
};

describe("toValidChannelId", () => {
  it("returns 0 for 0", () => {
    expect(toValidChannelId(0)).toBe(0);
  });

  it("returns 3 for 3", () => {
    expect(toValidChannelId(3)).toBe(3);
  });

  it("clamps negative values to 0", () => {
    expect(toValidChannelId(-1)).toBe(0);
  });

  it("clamps values above 3 to 3", () => {
    expect(toValidChannelId(99)).toBe(3);
  });
});

describe("getPatternCellSelectionValue", () => {
  it("returns type:'none' for an empty selection", () => {
    const song = makeSongWithNote(12);
    const result = getPatternCellSelectionValue(song, [], (c) => c.note);
    expect(result.type).toBe("none");
  });

  it("returns type:'shared' with the common value when all cells agree", () => {
    const song = makeSongWithNote(12);
    const address = { sequenceId: 0, rowId: 0, channelId: 0 as const };
    const result = getPatternCellSelectionValue(song, [address], (c) => c.note);
    expect(result.type).toBe("shared");
    if (result.type === "shared") {
      expect(result.value).toBe(12);
    }
  });

  it("returns type:'none' when the cell value is null", () => {
    const song = makeSongWithNote(null);
    const address = { sequenceId: 0, rowId: 0, channelId: 0 as const };
    const result = getPatternCellSelectionValue(song, [address], (c) => c.note);
    expect(result.type).toBe("none");
  });

  it("returns type:'multiple' when cells disagree", () => {
    const song = createSong();
    const pattern = createPattern();
    pattern[0][0].note = 0;
    pattern[0][1].note = 12;
    song.patterns.push(pattern);
    song.sequence.push(0);

    const addresses = [
      { sequenceId: 0, rowId: 0, channelId: 0 as const },
      { sequenceId: 0, rowId: 0, channelId: 1 as const },
    ];
    const result = getPatternCellSelectionValue(song, addresses, (c) => c.note);
    expect(result.type).toBe("multiple");
  });
});
