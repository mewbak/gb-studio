import { TRACKER_PATTERN_LENGTH } from "consts";
import { KeyWhen } from "renderer/lib/keybindings/keyBindings";

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

export const CHANNEL_FIELDS = 4;
export const ROW_SIZE = CHANNEL_FIELDS * 4;
export const NUM_FIELDS = ROW_SIZE * TRACKER_PATTERN_LENGTH;
export const TRACKER_HEADER_HEIGHT = 30;
export const TRACKER_CELL_HEIGHT = 25;

export const normalizeFieldIndex = (field: number) =>
  ((field % NUM_FIELDS) + NUM_FIELDS) % NUM_FIELDS;

export const fieldToPosition = (field: number): Position => ({
  x: field % ROW_SIZE,
  y: Math.floor(field / ROW_SIZE),
});

export const positionToField = (position: Position) =>
  position.y * ROW_SIZE + position.x;

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
        selectedTrackerFields.push(y * ROW_SIZE + x);
      }
    }
  } else if (selectionOrigin) {
    selectedTrackerFields.push(positionToField(selectionOrigin));
  }

  return selectedTrackerFields;
};

export const getFieldColumnFocus = (field: number): KeyWhen => {
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
      return null;
  }
};

export const getMovedField = (
  field: number,
  key: string,
  shiftKey: boolean,
): number | null => {
  switch (key) {
    case "ArrowLeft":
      return field - 1;
    case "ArrowRight":
      return field + 1;
    case "ArrowDown":
      return field + ROW_SIZE;
    case "ArrowUp":
      return field - ROW_SIZE;
    case "Tab":
      return field + (shiftKey ? -CHANNEL_FIELDS : CHANNEL_FIELDS);
    default:
      return null;
  }
};
