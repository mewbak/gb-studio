import { PatternCellAddress } from "shared/lib/uge/editor/types";

type Position = {
  x: number;
  y: number;
};

type DragDelta = {
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

type GridPoint = {
  absRow: number;
  note: number;
};

type SelectionBox = {
  origin: Position;
  rect: SelectionRect;
};

type PendingPencilNote = {
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
      type: "init";
      startedAt: number;
      startX: number;
      startY: number;
      movedTooFar: boolean;
    }
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
      type: "pendingNote";
      modifiers: PointerModifiers;
      startPoint: Position;
      pending: PendingPencilNote;
    }
  | {
      type: "dragNote";
      modifiers: PointerModifiers;
      origin: GridPoint;
      delta: DragDelta;
      startPointer: {
        clientX: number;
        clientY: number;
      };
      clickPlacement?: {
        cellAddress: PatternCellAddress;
        noteIndex: number;
      };
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
      type: "selectionBox";
      modifiers: PointerModifiers;
      box: SelectionBox;
    };
