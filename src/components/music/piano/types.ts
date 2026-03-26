import { PatternCellAddress } from "shared/lib/uge/editor/types";

export type Position = {
  x: number;
  y: number;
};

export type DragDelta = {
  rows: number;
  notes: number;
};

export type BlurableDOMElement = {
  blur: () => void;
};

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PointerModifiers = {
  addToSelection: boolean;
  clone: boolean;
};

export type GridPoint = {
  absRow: number;
  note: number;
};

export type SelectionBox = {
  origin: Position;
  rect: SelectionRect;
};

export type PendingPencilNote = {
  patternId: number;
  patternRow: number;
  sequenceId: number;
  absRow: number;
  noteIndex: number;
  clickedCellAddress: PatternCellAddress;
};

export type TwoFingerTapState =
  | { type: "idle" }
  | {
      type: "tracking";
      startedAt: number;
      startMidpointX: number;
      startMidpointY: number;
      movedTooFar: boolean;
    };

export type InteractionState =
  | {
      type: "idle";
      modifiers: PointerModifiers;
    }
  | {
      type: "pending_pencil";
      modifiers: PointerModifiers;
      startPoint: Position;
      pending: PendingPencilNote;
    }
  | {
      type: "drag_note";
      modifiers: PointerModifiers;
      origin: GridPoint;
      delta: DragDelta;
      startedFromSelection: boolean;
    }
  | {
      type: "paint";
      modifiers: PointerModifiers;
      lastPaintPosition: GridPoint | null;
    }
  | {
      type: "erase";
      modifiers: PointerModifiers;
      lastPaintPosition: GridPoint | null;
    }
  | {
      type: "selection_box";
      modifiers: PointerModifiers;
      box: SelectionBox;
    };

export type DragPreviewState =
  | { type: "idle" }
  | {
      type: "dragging";
      clone: boolean;
      delta: DragDelta;
    };

export type PointerDownInput = {
  isTouch: boolean;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  modifiers: PointerModifiers;
  isPrimaryAction: boolean;
  isEraseAction: boolean;
};

export type PointerMoveInput = {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  modifiers: PointerModifiers;
  updateHover: boolean;
  shouldPreventDefault: boolean;
};
