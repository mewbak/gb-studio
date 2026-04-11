import clamp from "shared/lib/helpers/clamp";
import { createSubPatternCell } from "shared/lib/uge/song";
import { SubPatternCell } from "shared/lib/uge/types";
import l10n from "shared/lib/lang/l10n";
import { TRACKER_SUBPATTERN_LENGTH } from "consts";

export const TRACKER_SUBPATTERN_VISIBLE_LENGTH = 32;

const SUBPATTERN_BASE_NOTE = 36;
const SUBPATTERN_MIN_OFFSET = -36;
const SUBPATTERN_MAX_OFFSET = 35;

export const validSubpatternEffectCodes = [
  0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 15,
] as const;

/** Returns true if the SubPatternCell has no meaningful content (all fields are null or default). */
export const isSubpatternRowEmpty = (cell: SubPatternCell) => {
  return (
    (cell.note === null || cell.note === 36) &&
    (cell.jump === null || cell.jump === 0) &&
    (cell.effectcode === null || cell.effectcode === 0) &&
    (cell.effectparam === null || cell.effectparam === 0)
  );
};

const getSubpatternPitchOffset = (note: number | null) =>
  note === null ? null : note - SUBPATTERN_BASE_NOTE;

const clampSubpatternPitchOffset = (offset: number) =>
  clamp(offset, SUBPATTERN_MIN_OFFSET, SUBPATTERN_MAX_OFFSET);

/** Converts a pitch offset (semitones from base) to a stored note value. */
export const toSubpatternNote = (offset: number | null) =>
  offset === null
    ? null
    : clampSubpatternPitchOffset(offset) + SUBPATTERN_BASE_NOTE;

/** Formats a subpattern note as a human-readable pitch offset string (e.g. "+2 st" or "Base"). */
export const formatSubpatternPitch = (note: number | null) => {
  const offset = getSubpatternPitchOffset(note);
  if (offset === null || offset === 0) {
    return "Base";
  }
  return `${offset > 0 ? "+" : ""}${offset} st`;
};

/** Returns the 0-based target row for a jump cell, or null if not a jump. */
export const getSubpatternJumpTarget = (jump: number | null) =>
  jump === null || jump === 0 ? null : jump - 1;

/** Converts a 0-based jump target row to the stored 1-based jump value. */
export const toSubpatternJump = (targetRow: number | null) =>
  targetRow === null
    ? null
    : clamp(targetRow, 0, TRACKER_SUBPATTERN_LENGTH - 1) + 1;

/** Returns whether the row continues to the next tick or jumps to a specific row. */
export const getSubpatternFlowType = (
  jump: number | null,
  _rowIndex: number,
): "continue" | "jump" => {
  const targetRow = getSubpatternJumpTarget(jump);
  if (targetRow === null) {
    return "continue";
  }
  return "jump";
};

/** Formats the flow action of a subpattern row as a human-readable string. */
export const formatSubpatternFlow = (jump: number | null, rowIndex: number) => {
  const flowType = getSubpatternFlowType(jump, rowIndex);
  if (flowType === "jump") {
    return `Jump to ${String(getSubpatternJumpTarget(jump) ?? 0).padStart(2, "0")}`;
  }
  return "Continue";
};

/** Returns true if `effectCode` is in the list of supported subpattern effect codes. */
export const isValidSubpatternEffectCode = (
  effectCode: number | null | undefined,
): effectCode is (typeof validSubpatternEffectCodes)[number] =>
  effectCode !== null &&
  effectCode !== undefined &&
  validSubpatternEffectCodes.includes(
    effectCode as (typeof validSubpatternEffectCodes)[number],
  );

/**
 * Returns the first `TRACKER_SUBPATTERN_VISIBLE_LENGTH` rows of the subpattern,
 * padding with empty cells if the subpattern is shorter.
 */
export const getVisibleSubpatternRows = (subpattern: SubPatternCell[]) =>
  Array.from({ length: TRACKER_SUBPATTERN_VISIBLE_LENGTH }, (_, index) => {
    return subpattern[index] ?? createSubPatternCell();
  });

/**
 * Applies partial changes to a single subpattern row, returning an updated
 * copy of the full subpattern array. Automatically sets effectparam to 0 when
 * an effectcode is set and effectparam was previously null.
 */
export const applySubpatternCellChanges = (
  subpattern: SubPatternCell[],
  rowIndex: number,
  changes: Partial<SubPatternCell>,
) => {
  const nextSubpattern = [...subpattern];
  const currentCell = nextSubpattern[rowIndex] ?? createSubPatternCell();
  const nextCell = { ...currentCell, ...changes };

  if (
    changes.effectcode !== undefined &&
    changes.effectcode !== null &&
    nextCell.effectparam === null
  ) {
    nextCell.effectparam = 0;
  }

  nextSubpattern[rowIndex] = nextCell;
  return nextSubpattern;
};

/**
 * Moves a subpattern row from `fromIndex` to `toIndex`, shifting intermediate
 * rows to fill the gap.
 */
export const moveSubpatternRow = (
  subpattern: SubPatternCell[],
  fromIndex: number,
  toIndex: number,
) => {
  if (fromIndex === toIndex) {
    return subpattern;
  }

  const nextSubpattern = [...subpattern];
  const visibleRows = getVisibleSubpatternRows(subpattern);
  const [movedRow] = visibleRows.splice(fromIndex, 1);
  visibleRows.splice(toIndex, 0, movedRow);

  for (let index = 0; index < TRACKER_SUBPATTERN_LENGTH; index++) {
    nextSubpattern[index] = visibleRows[index] ?? createSubPatternCell();
  }

  return nextSubpattern;
};

/** Generates a human-readable label for a subpattern row summarising its pitch, jump, and effect. */
export const subPatternRowLabel = (
  tick: number,
  cell: SubPatternCell,
): string => {
  const labelParts: string[] = [];
  if (cell.note !== null && cell.note !== 36) {
    labelParts.push(
      `${l10n("FIELD_PITCH")}: ${pitchOffsetLabel(cell.note - 36)}`,
    );
  }
  if (cell.jump !== null && cell.jump !== 0) {
    if (cell.jump - 1 === tick) {
      labelParts.push(l10n("EVENT_LOOP"));
    } else {
      labelParts.push(
        `${l10n("FIELD_JUMP")}: ${String(cell.jump - 1).padStart(2, "0")}`,
      );
    }
  }
  if (
    cell.effectcode !== null &&
    isValidSubpatternEffectCode(cell.effectcode)
  ) {
    labelParts.push(
      `${l10n("FIELD_EFFECT")}: ${(cell.effectcode ?? 0).toString(16).toUpperCase()}${(cell.effectparam ?? 0).toString(16).padStart(2, "0").toUpperCase()}`,
    );
  }
  return `${l10n("FIELD_TICK")} ${String(tick).padStart(2, "0")}${labelParts.length > 0 ? ":" : ""} ${labelParts.join(", ")}`;
};

const pitchOffsetLabel = (offset: number): string => {
  if (offset === 0) {
    return "";
  }
  const sign = offset < 0 ? -1 : 1;
  const abs = Math.abs(offset);
  return `${sign * abs > 0 ? "+" : ""}${sign * abs}`;
};

/** Converts a pitch offset in semitones relative to base to an absolute stored note value. */
export const offsetToStoredPitch = (offset: number): number => {
  return offset + SUBPATTERN_BASE_NOTE;
};

const cloneSubPatternCell = (cell: SubPatternCell): SubPatternCell => ({
  note: cell.note,
  jump: cell.jump,
  effectcode: cell.effectcode,
  effectparam: cell.effectparam,
});

/**
 * Returns a new subpattern where every other source row is spread across two
 * output rows (halving the playback speed). Jump targets are adjusted to
 * preserve relative positions.
 */
export const doubleSubpattern = (input: SubPatternCell[]): SubPatternCell[] => {
  const output: SubPatternCell[] = Array.from(
    { length: TRACKER_SUBPATTERN_LENGTH },
    () => createSubPatternCell(),
  );

  const sourceLength = Math.min(input.length, TRACKER_SUBPATTERN_LENGTH);

  for (let i = 0; i < sourceLength; i += 1) {
    const targetIndex = i * 2;

    if (targetIndex >= TRACKER_SUBPATTERN_LENGTH) {
      break;
    }

    const cell = input[i];
    output[targetIndex] = {
      ...cloneSubPatternCell(cell),
      jump:
        cell.jump !== null && cell.jump !== 0 ? (cell.jump - 1) * 2 + 1 : null,
    };
  }

  return output;
};

/**
 * Returns a new subpattern using only the even-indexed source rows, compressing
 * to half the length (doubling playback speed). Jump targets are adjusted where
 * possible; odd-target jumps become null.
 */
export const halfSubpattern = (input: SubPatternCell[]): SubPatternCell[] => {
  const output: SubPatternCell[] = Array.from(
    { length: TRACKER_SUBPATTERN_LENGTH },
    () => createSubPatternCell(),
  );

  const sourceLength = Math.min(input.length, TRACKER_SUBPATTERN_LENGTH);
  const halfLength = Math.ceil(sourceLength / 2);

  for (let i = 0; i < halfLength; i += 1) {
    const sourceIndex = i * 2;

    if (sourceIndex >= sourceLength || i >= TRACKER_SUBPATTERN_LENGTH) {
      break;
    }

    const cell = input[sourceIndex];
    output[i] = {
      ...cloneSubPatternCell(cell),
      jump:
        cell.jump !== null && cell.jump !== 0 && (cell.jump - 1) % 2 === 0
          ? Math.floor((cell.jump - 1) / 2) + 1
          : null,
    };
  }

  return output;
};
