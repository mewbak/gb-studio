import {
  OCTAVE_SIZE,
  TRACKER_CHANNEL_FIELDS,
  TRACKER_NUM_CHANNELS,
  TRACKER_PATTERN_LENGTH,
  TRACKER_ROW_SIZE,
} from "consts";
import { createPatternCell } from "shared/lib/uge/song";
import { Pattern, PatternCell, SequenceItem, Song } from "shared/lib/uge/types";
import { toValidChannelId } from "shared/lib/uge/editor/helpers";
import { transposeNoteValue } from "shared/lib/uge/display";

interface AbsRowPosition {
  sequenceId: number;
  rowId: number;
}

/** Converts a (sequenceId, rowId) pair to a single absolute row index. */
export const toAbsRow = (sequenceId: number, rowId: number) =>
  sequenceId * TRACKER_PATTERN_LENGTH + rowId;

/** Splits an absolute row index back into its (sequenceId, rowId) components. */
export const fromAbsRow = (absRow: number): AbsRowPosition => ({
  sequenceId: Math.floor(absRow / TRACKER_PATTERN_LENGTH),
  rowId: absRow % TRACKER_PATTERN_LENGTH,
});

interface ResolvedAbsRow extends AbsRowPosition {
  patternId: number;
}

/**
 * Resolves an absolute row index against the song sequence, returning the
 * sequenceId, rowId, and patternId. Returns null when the sequence slot is
 * out of bounds.
 */
export const resolveAbsRow = (
  sequence: SequenceItem[],
  absRow: number,
  channelId: number,
): ResolvedAbsRow | null => {
  const { sequenceId, rowId } = fromAbsRow(absRow);
  const patternId = sequence[sequenceId]?.channels[channelId];
  if (patternId === undefined) {
    return null;
  }
  return { sequenceId, rowId, patternId };
};

export const getPatternBlockCount = (patterns: Pattern[] | undefined): number =>
  Math.ceil((patterns?.length ?? 0) / TRACKER_NUM_CHANNELS);

export const getSequenceChannelPatternId = (
  song: Song,
  sequenceId: number,
  channelId: number,
): number | undefined => song.sequence[sequenceId]?.channels[channelId];

export const getSequenceChannelCell = (
  song: Song,
  sequenceId: number,
  channelId: number,
  rowId: number,
): { patternId: number; cell: PatternCell } | null => {
  const patternId = getSequenceChannelPatternId(song, sequenceId, channelId);
  if (patternId === undefined) {
    return null;
  }

  const cell = song.patterns[patternId]?.[rowId];
  if (!cell) {
    return null;
  }

  return { patternId, cell };
};

export const createPatternMatrix = (): PatternCell[][] =>
  Array.from({ length: TRACKER_PATTERN_LENGTH }, () => [
    createPatternCell(),
    createPatternCell(),
    createPatternCell(),
    createPatternCell(),
  ]);

export const buildSequencePattern = (
  song: Song,
  sequenceId: number,
): PatternCell[][] => {
  const pattern = createPatternMatrix();

  for (let rowId = 0; rowId < TRACKER_PATTERN_LENGTH; rowId++) {
    for (let channelId = 0; channelId < TRACKER_NUM_CHANNELS; channelId++) {
      const resolved = getSequenceChannelCell(
        song,
        sequenceId,
        channelId,
        rowId,
      );
      pattern[rowId][channelId] = resolved
        ? { ...resolved.cell }
        : createPatternCell();
    }
  }

  return pattern;
};

interface ResolvedTrackerPosition {
  rowIndex: number;
  channelIndex: 0 | 1 | 2 | 3;
}

interface ResolvedTrackerPositionField extends ResolvedTrackerPosition {
  fieldIndex: number;
}

export const resolveUniqueTrackerPositions = (
  selectedTrackerFields: number[],
): ResolvedTrackerPosition[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerPosition[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex = toValidChannelId(
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS,
    );
    const key = `${rowIndex}:${channelIndex}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    resolvedCells.push({
      rowIndex,
      channelIndex,
    });
  }

  return resolvedCells;
};

export const resolveTrackerFieldPositions = (
  selectedTrackerFields: number[],
): ResolvedTrackerPositionField[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerPositionField[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex = toValidChannelId(
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS,
    );
    const fieldIndex = field % TRACKER_CHANNEL_FIELDS;
    const key = `${rowIndex}:${channelIndex}:${fieldIndex}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    resolvedCells.push({
      rowIndex,
      channelIndex,
      fieldIndex,
    });
  }

  return resolvedCells;
};

/**
 * Mutates a PatternCell's note in-place by transposing it by `noteDelta`
 * semitones. No-ops when the cell is undefined or its note is null.
 */
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

  cell.note = transposeNoteValue(cell.note, noteDelta);
};

/**
 * Returns the semitone delta for a transpose operation.
 * "octave" uses ±12 semitones; "note" uses ±1.
 */
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
  channelIndex: 0 | 1 | 2 | 3;
}

/**
 * Converts a list of tracker field indices into unique (patternId, rowIndex,
 * channelIndex) tuples, deduplicating fields that map to the same cell.
 */
export const resolveUniqueTrackerCells = (
  patternId: number,
  selectedTrackerFields: number[],
): ResolvedTrackerCell[] => {
  const seen = new Set<string>();
  const resolvedCells: ResolvedTrackerCell[] = [];

  for (const field of selectedTrackerFields) {
    const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
    const channelIndex = toValidChannelId(
      Math.floor(field / TRACKER_CHANNEL_FIELDS) % TRACKER_NUM_CHANNELS,
    );
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

/**
 * Converts a list of tracker field indices into unique (patternId, rowIndex,
 * channelIndex, fieldIndex) tuples, preserving individual cell field granularity
 * and deduplicating exact field positions.
 */
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
