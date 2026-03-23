import { Song, PatternCell } from "shared/lib/uge/types";
import { PatternCellAddress } from "./types";

export const getSharedPatternCellValue = <T>(
  song: Song,
  selectedPatternCells: PatternCellAddress[],
  getValue: (cell: PatternCell) => T,
): T | null => {
  let sharedValue: T | undefined = undefined;

  for (const cellAddress of selectedPatternCells) {
    const patternId = song.sequence[cellAddress.sequenceId];
    if (patternId === undefined) {
      continue;
    }

    const cell =
      song.patterns[patternId]?.[cellAddress.rowId]?.[cellAddress.channelId];

    if (!cell) {
      continue;
    }

    const value = getValue(cell);

    if (sharedValue === undefined) {
      sharedValue = value;
    } else if (sharedValue !== value) {
      return null;
    }
  }

  return sharedValue ?? null;
};
