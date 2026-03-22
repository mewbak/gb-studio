import {
  OCTAVE_SIZE,
  TRACKER_CHANNEL_FIELDS,
  TRACKER_NUM_CHANNELS,
  TRACKER_PATTERN_LENGTH,
  TRACKER_ROW_SIZE,
} from "consts";
import clamp from "shared/lib/helpers/clamp";
import { PatternCell } from "shared/lib/uge/types";

export interface AbsRowPosition {
  sequenceId: number;
  rowId: number;
}

export const toAbsRow = (sequenceId: number, rowId: number) =>
  sequenceId * TRACKER_PATTERN_LENGTH + rowId;

export const fromAbsRow = (absRow: number): AbsRowPosition => ({
  sequenceId: Math.floor(absRow / TRACKER_PATTERN_LENGTH),
  rowId: absRow % TRACKER_PATTERN_LENGTH,
});

export interface ResolvedAbsRow extends AbsRowPosition {
  patternId: number;
}

export const resolveAbsRow = (
  sequence: number[],
  absRow: number,
): ResolvedAbsRow | null => {
  const { sequenceId, rowId } = fromAbsRow(absRow);
  const patternId = sequence[sequenceId];
  if (patternId === undefined) {
    return null;
  }
  return { sequenceId, rowId, patternId };
};

export const transposePatternCellNote = (
  cell: PatternCell | undefined,
  noteDelta: number,
) => {
  if (!cell) {
    return;
  }

  if (cell.note === null) {
    return;
  }

  cell.note = clamp(cell.note + noteDelta, 0, 71);
};

export const getTransposeNoteDelta = (
  direction: "up" | "down",
  size: "note" | "octave",
) => {
  const deltaBase = direction === "up" ? 1 : -1;
  return size === "octave" ? deltaBase * OCTAVE_SIZE : deltaBase;
};

interface ResolvedTrackerCell {
  patternId: number;
  rowIndex: number;
  channelIndex: number;
}

export const resolveUniqueTrackerCells = (
  patternId: number,
  selectedTrackerFields: number[],
): ResolvedTrackerCell[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerCell[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex =
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS;
    const key = `${patternId}:${rowIndex}:${channelIndex}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    resolvedCells.push({
      patternId,
      rowIndex,
      channelIndex,
    });
  }

  return resolvedCells;
};

interface ResolvedTrackerCellField {
  patternId: number;
  rowIndex: number;
  channelIndex: number;
  fieldIndex: number;
}

export const resolveTrackerCellFields = (
  patternId: number,
  selectedTrackerFields: number[],
): ResolvedTrackerCellField[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerCellField[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex =
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS;
    const fieldIndex = field % TRACKER_CHANNEL_FIELDS;
    const key = `${patternId}:${rowIndex}:${channelIndex}:${fieldIndex}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    resolvedCells.push({
      patternId,
      rowIndex,
      channelIndex,
      fieldIndex,
    });
  }

  return resolvedCells;
};
