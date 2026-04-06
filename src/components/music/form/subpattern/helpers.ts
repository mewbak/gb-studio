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

export const toSubpatternNote = (offset: number | null) =>
  offset === null
    ? null
    : clampSubpatternPitchOffset(offset) + SUBPATTERN_BASE_NOTE;

export const formatSubpatternPitch = (note: number | null) => {
  const offset = getSubpatternPitchOffset(note);
  if (offset === null || offset === 0) {
    return "Base";
  }
  return `${offset > 0 ? "+" : ""}${offset} st`;
};

export const getSubpatternJumpTarget = (jump: number | null) =>
  jump === null || jump === 0 ? null : jump - 1;

export const toSubpatternJump = (targetRow: number | null) =>
  targetRow === null
    ? null
    : clamp(targetRow, 0, TRACKER_SUBPATTERN_LENGTH - 1) + 1;

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

export const formatSubpatternFlow = (jump: number | null, rowIndex: number) => {
  const flowType = getSubpatternFlowType(jump, rowIndex);
  if (flowType === "jump") {
    return `Jump to ${String(getSubpatternJumpTarget(jump) ?? 0).padStart(2, "0")}`;
  }
  return "Continue";
};

export const isValidSubpatternEffectCode = (
  effectCode: number | null | undefined,
): effectCode is (typeof validSubpatternEffectCodes)[number] =>
  effectCode !== null &&
  effectCode !== undefined &&
  validSubpatternEffectCodes.includes(
    effectCode as (typeof validSubpatternEffectCodes)[number],
  );

export const getVisibleSubpatternRows = (subpattern: SubPatternCell[]) =>
  Array.from({ length: TRACKER_SUBPATTERN_VISIBLE_LENGTH }, (_, index) => {
    return subpattern[index] ?? createSubPatternCell();
  });

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

export const offsetToStoredPitch = (offset: number): number => {
  return offset + SUBPATTERN_BASE_NOTE;
};

const cloneSubPatternCell = (cell: SubPatternCell): SubPatternCell => ({
  note: cell.note,
  jump: cell.jump,
  effectcode: cell.effectcode,
  effectparam: cell.effectparam,
});

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
