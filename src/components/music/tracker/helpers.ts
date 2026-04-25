import {
  TRACKER_CHANNEL_FIELDS,
  TRACKER_NUM_FIELDS,
  TRACKER_PATTERN_LENGTH,
  TRACKER_ROW_SIZE,
} from "consts";
import { PatternCellAddress } from "shared/lib/uge/editor/types";
import { resolveUniqueTrackerCells } from "store/features/trackerDocument/trackerDocumentHelpers";

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export const TRACKER_HEADER_HEIGHT = 40;
export const TRACKER_INDEX_WIDTH = 56;
export const TRACKER_CELL_HEIGHT = 28;
const PATTERN_FIELD_COUNT = TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE;

/** Wraps a field index into the valid range `[0, TRACKER_NUM_FIELDS)`. */
export const normalizeFieldIndex = (field: number) =>
  ((field % TRACKER_NUM_FIELDS) + TRACKER_NUM_FIELDS) % TRACKER_NUM_FIELDS;

/** Converts a flat field index to its (column, row) grid position. */
export const fieldToPosition = (field: number): Position => ({
  x: field % TRACKER_ROW_SIZE,
  y: Math.floor(field / TRACKER_ROW_SIZE),
});

const positionToField = (position: Position) =>
  position.y * TRACKER_ROW_SIZE + position.x;

/**
 * Builds a normalised SelectionRect from a fixed origin position and a target
 * field index. The rect always has non-negative width and height.
 */
export const buildSelectionRect = (
  origin: Position,
  targetField: number,
): SelectionRect => {
  const target = fieldToPosition(targetField);

  return {
    x: Math.min(origin.x, target.x),
    y: Math.min(origin.y, target.y),
    width: Math.abs(origin.x - target.x),
    height: Math.abs(origin.y - target.y),
  };
};

/**
 * Returns all field indices covered by `selectionRect`, or the single field at
 * `selectionOrigin` when no rect is active.
 */
export const getSelectedTrackerFields = (
  selectionRect: SelectionRect | undefined,
  selectionOrigin: Position | undefined,
) => {
  const selectedTrackerFields: number[] = [];

  if (selectionRect) {
    for (
      let x = selectionRect.x;
      x <= selectionRect.x + selectionRect.width;
      x++
    ) {
      for (
        let y = selectionRect.y;
        y <= selectionRect.y + selectionRect.height;
        y++
      ) {
        selectedTrackerFields.push(y * TRACKER_ROW_SIZE + x);
      }
    }
  } else if (selectionOrigin) {
    selectedTrackerFields.push(positionToField(selectionOrigin));
  }

  return selectedTrackerFields;
};

/** Returns which column-focus type (note / instrument / effect code / effect param) a field index maps to. */
export const getFieldColumnFocus = (
  field: number,
):
  | "noteColumnFocus"
  | "instrumentColumnFocus"
  | "effectCodeColumnFocus"
  | "effectParamColumnFocus" => {
  switch (field % 4) {
    case 0:
      return "noteColumnFocus";
    case 1:
      return "instrumentColumnFocus";
    case 2:
      return "effectCodeColumnFocus";
    case 3:
      return "effectParamColumnFocus";
    default:
      return "noteColumnFocus";
  }
};

/**
 * Converts a list of tracker field indices for a given sequence/pattern into
 * unique PatternCellAddress objects, deduplicating multi-field cells.
 */
export const trackerFieldsToPatternCells = (
  sequenceId: number,
  patternId: number,
  selectedTrackerFields: number[],
): PatternCellAddress[] => {
  const resolvedCells = resolveUniqueTrackerCells(
    patternId,
    selectedTrackerFields,
  );
  return resolvedCells.map(({ rowIndex, channelIndex }) => ({
    sequenceId,
    rowId: rowIndex,
    channelId: channelIndex,
  }));
};

const encodePatternChannelRowState = (
  activeFieldInCell: number,
  selectedMask: number,
): number => ((selectedMask & 0xf) << 3) | (activeFieldInCell + 1);

export interface DecodedPatternChannelRowState {
  rowActive: boolean;
  noteActive: boolean;
  noteSelected: boolean;
  instrumentActive: boolean;
  instrumentSelected: boolean;
  effectCodeActive: boolean;
  effectCodeSelected: boolean;
  effectParamActive: boolean;
  effectParamSelected: boolean;
}

export const decodePatternChannelRowState = (
  rowState: number,
): DecodedPatternChannelRowState => {
  const activeFieldInCell = (rowState & 0b111) - 1;
  const selectedMask = rowState >> 3;

  return {
    rowActive: activeFieldInCell !== -1,
    noteActive: activeFieldInCell === 0,
    noteSelected: (selectedMask & 0b0001) !== 0,
    instrumentActive: activeFieldInCell === 1,
    instrumentSelected: (selectedMask & 0b0010) !== 0,
    effectCodeActive: activeFieldInCell === 2,
    effectCodeSelected: (selectedMask & 0b0100) !== 0,
    effectParamActive: activeFieldInCell === 3,
    effectParamSelected: (selectedMask & 0b1000) !== 0,
  };
};

interface PatternChannelRowStateArgs {
  trackerActiveField: number | undefined;
  selectionSequenceId: number | undefined;
  selectedTrackerFields: number[];
  renderSequenceId: number;
  channelId: 0 | 1 | 2 | 3;
  rowIndex: number;
}

export const getPatternChannelRowState = ({
  trackerActiveField,
  selectionSequenceId,
  selectedTrackerFields,
  renderSequenceId,
  channelId,
  rowIndex,
}: PatternChannelRowStateArgs): number => {
  const channelFieldBase = channelId * TRACKER_CHANNEL_FIELDS;
  let activeFieldInCell = -1;

  if (
    trackerActiveField !== undefined &&
    Math.floor(trackerActiveField / PATTERN_FIELD_COUNT) === renderSequenceId
  ) {
    const activeLocalField = trackerActiveField % PATTERN_FIELD_COUNT;
    const activeRowIndex = Math.floor(activeLocalField / TRACKER_ROW_SIZE);
    const fieldInRow = activeLocalField % TRACKER_ROW_SIZE;

    if (
      activeRowIndex === rowIndex &&
      fieldInRow >= channelFieldBase &&
      fieldInRow < channelFieldBase + TRACKER_CHANNEL_FIELDS
    ) {
      activeFieldInCell = fieldInRow - channelFieldBase;
    }
  }

  let selectedMask = 0;

  if (selectionSequenceId === renderSequenceId) {
    for (const field of selectedTrackerFields) {
      const selectedRowIndex = Math.floor(field / TRACKER_ROW_SIZE);
      if (selectedRowIndex !== rowIndex) {
        continue;
      }

      const fieldInRow = field % TRACKER_ROW_SIZE;
      if (
        fieldInRow >= channelFieldBase &&
        fieldInRow < channelFieldBase + TRACKER_CHANNEL_FIELDS
      ) {
        selectedMask |= 1 << (fieldInRow - channelFieldBase);
      }
    }
  }

  return encodePatternChannelRowState(activeFieldInCell, selectedMask);
};
