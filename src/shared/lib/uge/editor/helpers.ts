import { Pattern, PatternCell, SequenceItem } from "shared/lib/uge/types";
import { PatternCellAddress } from "./types";
import clamp from "shared/lib/helpers/clamp";

type SharedSelectionValue<T> =
  | { type: "none"; value: null }
  | { type: "shared"; value: T }
  | { type: "multiple"; value: null };

/**
 * Extracts a single value from a set of selected PatternCells using `getValue`.
 * Returns `{type:"shared"}` if all cells agree, `{type:"multiple"}` if they
 * differ, or `{type:"none"}` if no cells have a value.
 */
export const getPatternCellSelectionValue = <T>(
  sequence: SequenceItem[],
  patterns: Pattern[],
  patternCells: PatternCellAddress[],
  getValue: (cell: PatternCell) => T | null | undefined,
): SharedSelectionValue<T> => {
  let hasValue = false;
  let sharedValue: T | null | undefined = undefined;

  for (const { sequenceId, rowId, channelId } of patternCells) {
    const patternId = sequence[sequenceId]?.channels[channelId];

    if (patternId === undefined) {
      continue;
    }

    const pattern = patterns?.[patternId];
    const cell = pattern?.[rowId];
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

/** Clamps `index` to the valid channel range 0–3. */
export const toValidChannelId = (index: number): 0 | 1 | 2 | 3 => {
  return clamp(index, 0, 3) as 0 | 1 | 2 | 3;
};

/** Check if sequence items are consecutive starting from a multiple of 4 to
 *  to determine if sequence is simple or if different patterns are set per channel
 */
export const isSplitPatternSequence = ([a, b, c, d]: [
  number,
  number,
  number,
  number,
]): boolean => {
  return a % 4 !== 0 || b !== a + 1 || c !== a + 2 || d !== a + 3;
};
