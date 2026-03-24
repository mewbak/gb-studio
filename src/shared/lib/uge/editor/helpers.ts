import { Song, PatternCell } from "shared/lib/uge/types";
import { PatternCellAddress } from "./types";

type SharedSelectionValue<T> =
  | { type: "none"; value: null }
  | { type: "shared"; value: T }
  | { type: "multiple"; value: null };

export const getPatternCellSelectionValue = <T>(
  song: Song,
  patternCells: PatternCellAddress[],
  getValue: (cell: PatternCell) => T | null | undefined,
): SharedSelectionValue<T> => {
  let hasValue = false;
  let sharedValue: T | null | undefined = undefined;

  for (const { sequenceId, rowId, channelId } of patternCells) {
    const patternId = song.sequence[sequenceId];

    if (patternId === undefined) {
      continue;
    }

    const cell = song.patterns?.[patternId]?.[rowId]?.[channelId];
    const value = cell ? getValue(cell) : null;

    if (!hasValue) {
      sharedValue = value;
      hasValue = true;
      continue;
    }

    if (sharedValue !== value) {
      return { type: "multiple", value: null };
    }
  }

  if (!hasValue || sharedValue == null) {
    return { type: "none", value: null };
  }

  return { type: "shared", value: sharedValue };
};
