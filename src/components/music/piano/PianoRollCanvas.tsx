import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { PatternCell, Song } from "shared/lib/uge/types";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { PianoRollPatternBlock } from "./PianoRollPatternBlock";
import {
  StyledPianoRollScrollBottomWrapper,
  StyledPianoRollScrollCanvas,
  StyledPianoRollScrollContentWrapper,
  StyledPianoRollScrollLeftWrapper,
  StyledPianoRollScrollHeaderFooterSpacer,
  StyledPianoRollScrollWrapper,
  StyledPianoRollPatternsWrapper,
  StyledPianoRollNote,
  StyledPianoRollScrollLeftFXSpacer,
  StyledAddPatternButton,
  StyledAddPatternWrapper,
} from "./style";
import { PianoKeyboard } from "./PianoKeyboard";
import {
  OCTAVE_SIZE,
  PIANO_ROLL_CELL_SIZE,
  PIANO_ROLL_PIANO_WIDTH,
  TOTAL_NOTES,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import { PianoRollEffectRow } from "./PianoRollEffectRow";
import clamp from "shared/lib/helpers/clamp";
import trackerActions from "store/features/tracker/trackerActions";
import API from "renderer/lib/api";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { NO_CHANGE_ON_PASTE } from "components/music/musicClipboardHelpers";
import {
  calculateDocumentWidth,
  calculatePlaybackTrackerPosition,
  interpolateGridLine,
  noteToRow,
  rowToNote,
  wrapNote,
} from "./helpers";
import { PianoRollSequenceBar } from "./PianoRollSequenceBar";
import { Selection } from "ui/document/Selection";
import { FXIcon, PlusIcon } from "ui/icons/Icons";
import useResizeObserver from "ui/hooks/use-resize-observer";
import l10n from "shared/lib/lang/l10n";
import { mergeRefs } from "ui/hooks/merge-refs";
import {
  resolveAbsRow,
  toAbsRow,
  fromAbsRow,
} from "store/features/trackerDocument/trackerDocumentHelpers";
import renderPianoContextMenu from "components/music/contextMenus/renderPianoContextMenu";
import { useContextMenu } from "ui/hooks/use-context-menu";
import {
  commitPastedAbsoluteCells,
  copyAbsoluteCells,
  cutAbsoluteCells,
  eraseAbsoluteCells,
  moveAbsoluteCells,
  paintAbsoluteCells,
  pasteInPlace,
} from "store/features/trackerDocument/trackerDocumentState";
import { pasteAbsoluteCells } from "store/features/tracker/trackerState";
import { PatternCellAddress } from "shared/lib/uge/editor/types";
import { useMusicNotePreview } from "components/music/hooks/useMusicNotePreview";

const GRID_MARGIN = 0;
const TWO_FINGER_TAP_MAX_DURATION = 300;
const TWO_FINGER_TAP_MAX_MOVEMENT = 24;

interface PianoRollCanvasProps {
  song: Song;
  sequenceId: number;
  playbackOrder: number;
  playbackRow: number;
}

interface Position {
  x: number;
  y: number;
}

interface DragDelta {
  rows: number;
  notes: number;
}

type BlurableDOMElement = {
  blur: () => void;
};

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type PointerModifiers = {
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

type TwoFingerTapState =
  | { type: "idle" }
  | {
      type: "tracking";
      startedAt: number;
      startMidpointX: number;
      startMidpointY: number;
      movedTooFar: boolean;
    };

type InteractionState =
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

type DragPreviewState =
  | { type: "idle" }
  | {
      type: "dragging";
      clone: boolean;
      delta: DragDelta;
    };

type PointerDownInput = {
  isTouch: boolean;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  modifiers: PointerModifiers;
  isPrimaryAction: boolean;
  isEraseAction: boolean;
};

type PointerMoveInput = {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  modifiers: PointerModifiers;
  updateHover: boolean;
  shouldPreventDefault: boolean;
};

export const PianoRollCanvas = ({
  song,
  sequenceId,
  playbackOrder,
  playbackRow,
}: PianoRollCanvasProps) => {
  const dispatch = useAppDispatch();

  const interactionRef = useRef<InteractionState>({
    type: "idle",
    modifiers: { addToSelection: false, clone: false },
  });

  const twoFingerTapRef = useRef<TwoFingerTapState>({ type: "idle" });

  const playPreview = useMusicNotePreview();

  const hoverNote = useAppSelector((state) => state.tracker.hoverNote);
  const hoverColumn = useAppSelector((state) => state.tracker.hoverColumn);
  const hoverSequenceId = useAppSelector(
    (state) => state.tracker.hoverSequence,
  );
  const selectedPatternCells = useAppSelector(
    (state) => state.tracker.selectedPatternCells,
  );
  const selectedPatternCellsRef = useRef(selectedPatternCells);
  useEffect(() => {
    selectedPatternCellsRef.current = selectedPatternCells;
  }, [selectedPatternCells]);

  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );
  const pastedPattern = useAppSelector((state) => state.tracker.pastedPattern);

  const [dragPreviewState, setDragPreviewState] = useState<DragPreviewState>({
    type: "idle",
  });

  const lastDragPreviewCellRef = useRef<string | null>(null);

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const visibleChannels = useAppSelector(
    (state) => state.tracker.visibleChannels,
  );

  const tool = useAppSelector((state) => state.tracker.tool);

  const [selectionRect, setSelectionRect] = useState<
    SelectionRect | undefined
  >();

  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  const TOUCH_TAP_MAX_MOVEMENT = 10;

  useEffect(() => {
    const channelSelectedPatternCells = selectedPatternCells.filter(
      (cell) => cell.channelId === selectedChannel,
    );

    if (channelSelectedPatternCells.length !== selectedPatternCells.length) {
      dispatch(
        trackerActions.setSelectedPatternCells(channelSelectedPatternCells),
      );
    }
  }, [dispatch, selectedPatternCells, selectedChannel]);

  const selectCellsInRange = useCallback(
    (
      selectedPatternCells: PatternCellAddress[],
      nextSelectionRect: SelectionRect,
    ) => {
      const totalAbsRows = song.sequence.length * TRACKER_PATTERN_LENGTH;
      const totalNoteRows = TOTAL_NOTES;

      const rangeStartAbsRow = clamp(
        Math.floor(nextSelectionRect.x / PIANO_ROLL_CELL_SIZE),
        0,
        totalAbsRows - 1,
      );
      const rangeEndAbsRow = clamp(
        Math.ceil(
          (nextSelectionRect.x + nextSelectionRect.width) /
            PIANO_ROLL_CELL_SIZE,
        ),
        rangeStartAbsRow + 1,
        totalAbsRows,
      );

      const fromNoteRow = clamp(
        Math.floor(nextSelectionRect.y / PIANO_ROLL_CELL_SIZE),
        0,
        totalNoteRows - 1,
      );
      const toNoteRow = clamp(
        Math.ceil(
          (nextSelectionRect.y + nextSelectionRect.height) /
            PIANO_ROLL_CELL_SIZE,
        ),
        fromNoteRow + 1,
        totalNoteRows,
      );

      const selectedPatternCellMap = new Map(
        selectedPatternCells.map((cell) => [
          `${cell.sequenceId}:${cell.rowId}:${cell.channelId}`,
          cell,
        ]),
      );

      for (let absRow = rangeStartAbsRow; absRow < rangeEndAbsRow; absRow++) {
        const resolved = resolveAbsRow(song.sequence, absRow);
        if (!resolved) {
          continue;
        }

        const cell =
          song.patterns[resolved.patternId]?.[resolved.rowId]?.[
            selectedChannel
          ];

        if (!cell || cell.note === null) {
          continue;
        }

        const noteRow = noteToRow(cell.note);
        if (noteRow >= fromNoteRow && noteRow < toNoteRow) {
          const address: PatternCellAddress = {
            sequenceId: resolved.sequenceId,
            rowId: resolved.rowId,
            channelId: selectedChannel,
          };
          selectedPatternCellMap.set(
            `${address.sequenceId}:${address.rowId}:${address.channelId}`,
            address,
          );
        }
      }

      return [...selectedPatternCellMap.values()].sort((a, b) =>
        a.sequenceId !== b.sequenceId
          ? a.sequenceId - b.sequenceId
          : a.rowId !== b.rowId
            ? a.rowId - b.rowId
            : a.channelId - b.channelId,
      );
    },
    [selectedChannel, song.patterns, song.sequence],
  );

  const lastSelectAllRef = useRef(0);

  const onSelectAll = useCallback(() => {
    window.getSelection()?.empty();

    if (lastSelectAllRef.current + 100 > Date.now()) {
      return;
    }
    lastSelectAllRef.current = Date.now();

    if (selectedPatternCells.length <= 1) {
      const selectSequenceId =
        selectedPatternCells.length === 1
          ? selectedPatternCells[0].sequenceId
          : sequenceId;
      const patternId = song.sequence[selectSequenceId];
      const patternPatternCells: PatternCellAddress[] = song.patterns[patternId]
        .map((patternRow, rowId) =>
          patternRow[selectedChannel].note !== null
            ? {
                sequenceId: selectSequenceId,
                rowId,
                channelId: selectedChannel,
              }
            : undefined,
        )
        .filter((addr) => addr !== undefined) as PatternCellAddress[];

      dispatch(trackerActions.setSelectedPatternCells(patternPatternCells));
    } else {
      const allPatternCells: PatternCellAddress[] = song.sequence
        .flatMap((patternId, sequenceId) =>
          song.patterns[patternId].map((patternRow, rowId) =>
            patternRow[selectedChannel].note !== null
              ? {
                  sequenceId,
                  rowId,
                  channelId: selectedChannel,
                }
              : undefined,
          ),
        )
        .filter((addr) => addr !== undefined) as PatternCellAddress[];

      dispatch(trackerActions.setSelectedPatternCells(allPatternCells));
    }

    const el = document.querySelector(":focus") as unknown as
      | BlurableDOMElement
      | undefined;
    if (el && el.blur) {
      el.blur();
    }
  }, [
    dispatch,
    selectedChannel,
    selectedPatternCells,
    sequenceId,
    song.patterns,
    song.sequence,
  ]);

  useEffect(() => {
    if (subpatternEditorFocus) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyA") {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable === true;

        if (isEditable) {
          return;
        }

        e.preventDefault();
        onSelectAll();
      }
    };

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.focusNode || selection.anchorOffset !== 0) {
        return;
      }
      onSelectAll();
    };

    if (API.env === "web") {
      document.addEventListener("keydown", onKeyDown);
    } else {
      document.addEventListener("selectionchange", onSelectionChange);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [onSelectAll, subpatternEditorFocus]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      interactionRef.current = {
        ...interactionRef.current,
        modifiers: {
          addToSelection: e.shiftKey,
          clone: e.altKey,
        },
      };

      if ((e.target as HTMLElement | null)?.nodeName !== "BODY") {
        return;
      }

      if (e.ctrlKey && e.shiftKey) {
        if (e.code === "KeyQ") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "up",
              size: "octave",
            }),
          );
          return;
        }

        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "down",
              size: "octave",
            }),
          );
          return;
        }
      } else if (e.altKey && e.shiftKey) {
        if (e.code === "KeyQ") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "up",
              size: "note",
            }),
          );
          return;
        }

        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "down",
              size: "note",
            }),
          );
          return;
        }
      } else if (e.ctrlKey) {
        if (e.code === "KeyI") {
          dispatch(
            trackerDocumentActions.changeInstrumentAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              instrumentId: selectedInstrumentId,
            }),
          );
          return;
        }

        if (e.code === "KeyK") {
          dispatch(
            trackerDocumentActions.interpolateAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
            }),
          );
          return;
        }

        return;
      } else if (e.metaKey) {
        return;
      }

      if (e.code === "Equal") {
        dispatch(
          trackerDocumentActions.transposeAbsoluteCells({
            patternCells: selectedPatternCellsRef.current,
            direction: "up",
            size: e.shiftKey ? "octave" : "note",
          }),
        );
        return;
      }

      if (e.code === "Minus") {
        dispatch(
          trackerDocumentActions.transposeAbsoluteCells({
            patternCells: selectedPatternCellsRef.current,
            direction: "down",
            size: e.shiftKey ? "octave" : "note",
          }),
        );
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedPatternCellsRef.current.length === 0) {
          return;
        }

        dispatch(
          trackerDocumentActions.clearAbsoluteCells({
            patternCells: selectedPatternCellsRef.current,
          }),
        );
        dispatch(trackerActions.setSelectedPatternCells([]));
        return;
      }

      if (e.key === "Escape") {
        interactionRef.current = {
          type: "idle",
          modifiers: {
            addToSelection: e.shiftKey,
            clone: e.altKey,
          },
        };

        lastDragPreviewCellRef.current = null;
        setSelectionRect(undefined);
        setDragPreviewState({ type: "idle" });
        dispatch(trackerActions.setSelectedPatternCells([]));
        dispatch(trackerActions.clearPastedPattern());
      }
    },
    [dispatch, selectedInstrumentId],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    interactionRef.current = {
      ...interactionRef.current,
      modifiers: {
        addToSelection: e.shiftKey,
        clone: e.altKey,
      },
    };
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const displayChannels = useMemo(
    () =>
      [
        selectedChannel,
        ...visibleChannels.filter((c) => c !== selectedChannel),
      ].reverse(),
    [selectedChannel, visibleChannels],
  );

  const documentWidth = song.sequence
    ? calculateDocumentWidth(song.sequence.length) + 100
    : 0;
  const totalAbsRows = song.sequence.length * TRACKER_PATTERN_LENGTH;
  const totalNoteRows = TOTAL_NOTES;

  const scrollRef = useRef<HTMLDivElement>(null);
  const playing = useAppSelector((state) => state.tracker.playing);

  const hoverNoteRef = useRef(hoverNote);
  const hoverColumnRef = useRef(hoverColumn);
  const hoverSequenceIdRef = useRef(hoverSequenceId);

  const songRef = useRef(song);
  useEffect(() => {
    songRef.current = song;
  }, [song]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const halfViewHeight = scrollRect.height * 0.5;
      const c5Y = PIANO_ROLL_CELL_SIZE * OCTAVE_SIZE * 4;
      scrollRef.current.scrollTo({
        top: c5Y - halfViewHeight + 40,
      });
    }
  }, []);

  useEffect(() => {
    hoverNoteRef.current = hoverNote;
    hoverColumnRef.current = hoverColumn;
    hoverSequenceIdRef.current = hoverSequenceId;
  }, [hoverNote, hoverColumn, hoverSequenceId]);

  useLayoutEffect(() => {
    if (scrollRef.current && playing) {
      const rect = scrollRef.current.getBoundingClientRect();
      const halfWidth = rect.width * 0.5;
      scrollRef.current.scrollLeft =
        calculatePlaybackTrackerPosition(playbackOrder, playbackRow) -
        halfWidth;
    }
  }, [playing, playbackOrder, playbackRow]);

  const documentRef = useRef<HTMLDivElement>(null);

  const calculatePositionFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!documentRef.current) {
        return {
          noteIndex: null,
          patternRow: null,
          sequenceId: null,
        };
      }

      const rect = documentRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const absRow = clamp(
        Math.floor(x / PIANO_ROLL_CELL_SIZE),
        0,
        totalAbsRows - 1,
      );
      const resolved = resolveAbsRow(song.sequence, absRow);

      if (!resolved) {
        return {
          noteIndex: null,
          patternRow: null,
          sequenceId: null,
        };
      }

      const newNoteRow = Math.floor(
        (clientY - rect.top) / PIANO_ROLL_CELL_SIZE,
      );
      const newNote = rowToNote(newNoteRow);

      return {
        noteIndex: newNote,
        patternRow: resolved.rowId,
        sequenceId: resolved.sequenceId,
      };
    },
    [song.sequence, totalAbsRows],
  );

  const resetPointerPreviewState = useCallback(() => {
    setSelectionRect(undefined);
    setDragPreviewState({ type: "idle" });
    lastDragPreviewCellRef.current = null;
  }, []);

  const selectClickedCell = useCallback(
    (
      clickedCellAddress: PatternCellAddress,
      isSelected: boolean,
      selectedPatternCells: PatternCellAddress[],
      addToSelection: boolean,
    ) => {
      if (isSelected) {
        return;
      }

      if (addToSelection) {
        const selectedPatternCellMap = new Map(
          selectedPatternCells.map((selectedCell) => [
            `${selectedCell.sequenceId}:${selectedCell.rowId}:${selectedCell.channelId}`,
            selectedCell,
          ]),
        );

        selectedPatternCellMap.set(
          `${clickedCellAddress.sequenceId}:${clickedCellAddress.rowId}:${clickedCellAddress.channelId}`,
          clickedCellAddress,
        );

        dispatch(
          trackerActions.setSelectedPatternCells([
            ...selectedPatternCellMap.values(),
          ]),
        );
        return;
      }

      dispatch(trackerActions.setSelectedPatternCells([clickedCellAddress]));
    },
    [dispatch],
  );

  const beginDragNoteInteraction = useCallback(
    (
      absRow: number,
      note: number,
      startedFromSelection: boolean,
      modifiers: PointerModifiers,
    ) => {
      interactionRef.current = {
        type: "drag_note",
        modifiers,
        origin: {
          absRow,
          note,
        },
        delta: {
          rows: 0,
          notes: 0,
        },
        startedFromSelection,
      };

      resetPointerPreviewState();
    },
    [resetPointerPreviewState],
  );

  const beginSelectionBoxInteraction = useCallback(
    (
      pageX: number,
      pageY: number,
      modifiers: PointerModifiers,
      selectedPatternCells: PatternCellAddress[],
    ) => {
      if (!documentRef.current) {
        return;
      }

      const bounds = documentRef.current.getBoundingClientRect();

      const x = clamp(
        Math.floor((pageX - bounds.left - GRID_MARGIN) / PIANO_ROLL_CELL_SIZE) *
          PIANO_ROLL_CELL_SIZE,
        0,
        totalAbsRows * PIANO_ROLL_CELL_SIZE - 1,
      );

      const y = clamp(
        Math.floor((pageY - bounds.top) / PIANO_ROLL_CELL_SIZE) *
          PIANO_ROLL_CELL_SIZE,
        0,
        totalNoteRows * PIANO_ROLL_CELL_SIZE - PIANO_ROLL_CELL_SIZE,
      );

      const newSelectionRect = {
        x,
        y,
        width: PIANO_ROLL_CELL_SIZE,
        height: PIANO_ROLL_CELL_SIZE,
      };

      const newSelectedPatterns = selectCellsInRange(
        modifiers.addToSelection ? selectedPatternCells : [],
        newSelectionRect,
      );

      interactionRef.current = {
        type: "selection_box",
        modifiers,
        box: {
          origin: { x, y },
          rect: newSelectionRect,
        },
      };

      setSelectionRect(newSelectionRect);
      setDragPreviewState({ type: "idle" });
      lastDragPreviewCellRef.current = null;

      dispatch(trackerActions.setSelectedPatternCells(newSelectedPatterns));
    },
    [dispatch, selectCellsInRange, totalAbsRows, totalNoteRows],
  );

  const commitPastedPatternAt = useCallback(
    (sequenceId: number, patternRow: number, noteIndex: number) => {
      if (!pastedPattern) {
        return;
      }

      dispatch(
        commitPastedAbsoluteCells({
          pastedPattern,
          channelId: selectedChannel,
          startSequenceId: sequenceId,
          startRowId: patternRow,
          anchorNote: noteIndex,
        }),
      );

      dispatch(trackerActions.clearPastedPattern());
    },
    [dispatch, pastedPattern, selectedChannel],
  );

  const resetPointerInteractionState = useCallback(() => {
    interactionRef.current = {
      type: "idle",
      modifiers: {
        addToSelection: false,
        clone: false,
      },
    };

    setSelectionRect(undefined);
    setDragPreviewState({ type: "idle" });
    lastDragPreviewCellRef.current = null;
  }, []);

  const completePointerInteraction = useCallback(() => {
    const interaction = interactionRef.current;
    const song = songRef.current;

    if (!song) {
      resetPointerInteractionState();
      return;
    }

    if (interaction.type === "drag_note") {
      const selectedPatternCells = selectedPatternCellsRef.current;

      const hasMoved =
        interaction.delta.rows !== 0 || interaction.delta.notes !== 0;

      if (hasMoved && selectedPatternCells.length > 0) {
        dispatch(
          moveAbsoluteCells({
            patternCells: selectedPatternCells,
            rowDelta: interaction.delta.rows,
            noteDelta: interaction.delta.notes,
            clone: interaction.modifiers.clone,
          }),
        );
      }
    }

    resetPointerInteractionState();
  }, [dispatch, resetPointerInteractionState]);

  const handlePointerDown = useCallback(
    (input: PointerDownInput): boolean => {
      suppressNextContextMenuRef.current = false;

      interactionRef.current = {
        ...interactionRef.current,
        modifiers: input.modifiers,
      };

      const song = songRef.current;
      if (!song) {
        return false;
      }

      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromClientPoint(input.clientX, input.clientY);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return false;
      }

      const patternId = song.sequence[sequenceId];
      const absRow = toAbsRow(sequenceId, patternRow);
      const cell = song.patterns[patternId][patternRow][selectedChannel];

      const clickedCellAddress: PatternCellAddress = {
        sequenceId,
        rowId: patternRow,
        channelId: selectedChannel,
      };

      const selectedPatternCells = selectedPatternCellsRef.current;
      const isSelected = selectedPatternCells.some(
        (selectedCell) =>
          selectedCell.sequenceId === sequenceId &&
          selectedCell.rowId === patternRow &&
          selectedCell.channelId === selectedChannel,
      );

      if (pastedPattern) {
        commitPastedPatternAt(sequenceId, patternRow, noteIndex);
        return input.isTouch;
      }

      if (tool === "pencil" && input.isPrimaryAction) {
        if (cell && cell.note === noteIndex) {
          if (!isSelected) {
            dispatch(
              trackerActions.setSelectedPatternCells([clickedCellAddress]),
            );
          }

          beginDragNoteInteraction(absRow, cell.note, false, input.modifiers);

          return input.isTouch;
        }

        if (
          cell &&
          cell.note !== noteIndex &&
          selectedPatternCells.length > 1
        ) {
          dispatch(trackerActions.setSelectedPatternCells([]));
          interactionRef.current = {
            type: "idle",
            modifiers: input.modifiers,
          };
          resetPointerPreviewState();
          return false;
        }

        if (input.isTouch) {
          interactionRef.current = {
            type: "pending_pencil",
            modifiers: input.modifiers,
            startPoint: {
              x: input.clientX,
              y: input.clientY,
            },
            pending: {
              patternId,
              patternRow,
              sequenceId,
              absRow,
              noteIndex,
              clickedCellAddress,
            },
          };

          resetPointerPreviewState();
          return false;
        }

        dispatch(
          trackerDocumentActions.editPatternCell({
            patternId,
            cell: [patternRow, selectedChannel],
            changes: {
              instrument: selectedInstrumentId,
              note: noteIndex,
            },
          }),
        );

        const currentPattern = songRef.current?.patterns[patternId];
        const currentCell = currentPattern?.[patternRow]?.[selectedChannel];

        playPreview({
          note: noteIndex,
          instrumentId: selectedInstrumentId,
          effectCode: currentCell?.effectcode ?? 0,
          effectParam: currentCell?.effectparam ?? 0,
        });

        if (!isSelected) {
          dispatch(
            trackerActions.setSelectedPatternCells([clickedCellAddress]),
          );
        }

        interactionRef.current = {
          type: "paint",
          modifiers: input.modifiers,
          lastPaintPosition: {
            absRow,
            note: noteIndex,
          },
        };

        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = `${absRow}:${noteIndex}`;
        return false;
      }

      if (input.isEraseAction) {
        if (cell && cell.note === noteIndex) {
          if (!input.isTouch) {
            suppressNextContextMenuRef.current = true;
          }

          dispatch(
            trackerDocumentActions.editPatternCell({
              patternId,
              cell: [patternRow, selectedChannel],
              changes: {
                instrument: null,
                note: null,
              },
            }),
          );

          dispatch(
            trackerActions.setSelectedPatternCells([clickedCellAddress]),
          );
        }

        interactionRef.current = {
          type: "erase",
          modifiers: input.modifiers,
          lastPaintPosition: {
            absRow,
            note: noteIndex,
          },
        };

        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = null;
        return false;
      }

      if (tool === "selection" && input.isPrimaryAction) {
        if (cell && cell.note === noteIndex) {
          selectClickedCell(
            clickedCellAddress,
            isSelected,
            selectedPatternCells,
            input.modifiers.addToSelection,
          );

          beginDragNoteInteraction(absRow, cell.note, true, input.modifiers);
          return input.isTouch;
        }

        beginSelectionBoxInteraction(
          input.pageX,
          input.pageY,
          input.modifiers,
          selectedPatternCells,
        );

        return input.isTouch;
      }

      return false;
    },
    [
      beginDragNoteInteraction,
      beginSelectionBoxInteraction,
      calculatePositionFromClientPoint,
      commitPastedPatternAt,
      dispatch,
      pastedPattern,
      playPreview,
      resetPointerPreviewState,
      selectClickedCell,
      selectedChannel,
      selectedInstrumentId,
      tool,
    ],
  );

  const handlePointerMove = useCallback(
    (input: PointerMoveInput) => {
      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromClientPoint(input.clientX, input.clientY);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return false;
      }

      if (
        input.updateHover &&
        (noteIndex !== hoverNoteRef.current ||
          patternRow !== hoverColumnRef.current ||
          sequenceId !== hoverSequenceIdRef.current)
      ) {
        dispatch(
          trackerActions.setHover({
            note: noteIndex,
            column: patternRow,
            sequenceId,
          }),
        );
      }

      if (pastedPattern) {
        return false;
      }

      const song = songRef.current;
      if (!song) {
        return false;
      }

      const interaction = interactionRef.current;

      if (interaction.type === "drag_note") {
        if (selectedPatternCellsRef.current.length === 0) {
          return input.shouldPreventDefault;
        }

        const absRow = toAbsRow(sequenceId, patternRow);
        const nextDragDelta = {
          rows: absRow - interaction.origin.absRow,
          notes: noteIndex - interaction.origin.note,
        };

        if (
          nextDragDelta.rows !== interaction.delta.rows ||
          nextDragDelta.notes !== interaction.delta.notes
        ) {
          interactionRef.current = {
            ...interaction,
            delta: nextDragDelta,
          };

          setDragPreviewState({
            type: "dragging",
            clone: input.modifiers.clone,
            delta: nextDragDelta,
          });

          const previewCellId = `${absRow}:${noteIndex}`;

          const { sequenceId: originSequenceId, rowId: originRowId } =
            fromAbsRow(interaction.origin.absRow);

          const originPatternIndex = song.sequence[originSequenceId];
          const originPattern = song.patterns[originPatternIndex];
          const selectedCell = originPattern?.[originRowId]?.[selectedChannel];
          const instrumentId = selectedCell?.instrument ?? 0;
          const effectCode = selectedCell?.effectcode ?? 0;
          const effectParam = selectedCell?.effectparam ?? 0;

          if (lastDragPreviewCellRef.current !== previewCellId) {
            playPreview({
              note: noteIndex,
              instrumentId,
              effectCode,
              effectParam,
            });
            lastDragPreviewCellRef.current = previewCellId;
          }
        }

        return input.shouldPreventDefault;
      }

      if (interaction.type === "paint") {
        const absRow = toAbsRow(sequenceId, patternRow);
        const currentCellId = `${absRow}:${noteIndex}`;

        if (lastDragPreviewCellRef.current !== currentCellId) {
          const prev = interaction.lastPaintPosition;
          lastDragPreviewCellRef.current = currentCellId;

          interactionRef.current = {
            ...interaction,
            lastPaintPosition: { absRow, note: noteIndex },
          };

          const cellsToPaint = interpolateGridLine(
            prev ? { absRow: prev.absRow, note: prev.note } : null,
            { absRow, note: noteIndex },
          );

          dispatch(
            paintAbsoluteCells({
              cells: cellsToPaint,
              channelId: selectedChannel,
              instrumentId: selectedInstrumentId,
            }),
          );

          const lastPainted = cellsToPaint[cellsToPaint.length - 1];
          if (lastPainted) {
            const resolved = resolveAbsRow(song.sequence, lastPainted.absRow);

            if (resolved) {
              dispatch(
                trackerActions.setSelectedPatternCells([
                  {
                    sequenceId: resolved.sequenceId,
                    rowId: resolved.rowId,
                    channelId: selectedChannel,
                  },
                ]),
              );

              const patternId = song.sequence[resolved.sequenceId];
              const pattern = song.patterns[patternId];
              const cell = pattern?.[resolved.rowId]?.[selectedChannel];

              playPreview({
                note: lastPainted.note,
                instrumentId: selectedInstrumentId,
                effectCode: cell?.effectcode ?? 0,
                effectParam: cell?.effectparam ?? 0,
              });
            }
          }
        }

        return input.shouldPreventDefault;
      }

      if (interaction.type === "erase") {
        const absRow = toAbsRow(sequenceId, patternRow);
        const currentCellId = `${absRow}:${noteIndex}`;

        if (lastDragPreviewCellRef.current !== currentCellId) {
          const prev = interaction.lastPaintPosition;
          lastDragPreviewCellRef.current = currentCellId;

          interactionRef.current = {
            ...interaction,
            lastPaintPosition: { absRow, note: noteIndex },
          };

          const cellsToErase = interpolateGridLine(
            prev ? { absRow: prev.absRow, note: prev.note } : null,
            { absRow, note: noteIndex },
          );

          dispatch(
            eraseAbsoluteCells({
              cells: cellsToErase,
              channelId: selectedChannel,
            }),
          );
        }

        return input.shouldPreventDefault;
      }

      if (interaction.type === "selection_box") {
        if (!documentRef.current) {
          return input.shouldPreventDefault;
        }

        const bounds = documentRef.current.getBoundingClientRect();
        const newAbsRow = Math.floor(
          (input.pageX - bounds.left - GRID_MARGIN) / PIANO_ROLL_CELL_SIZE,
        );
        const newRow = Math.floor(
          (input.pageY - bounds.top) / PIANO_ROLL_CELL_SIZE,
        );

        const x2 = clamp(
          newAbsRow * PIANO_ROLL_CELL_SIZE,
          0,
          totalAbsRows * PIANO_ROLL_CELL_SIZE,
        );
        const y2 = clamp(
          newRow * PIANO_ROLL_CELL_SIZE,
          0,
          totalNoteRows * PIANO_ROLL_CELL_SIZE,
        );

        const x = Math.min(interaction.box.origin.x, x2);
        const y = Math.min(interaction.box.origin.y, y2);
        const width = Math.max(
          PIANO_ROLL_CELL_SIZE,
          Math.abs(interaction.box.origin.x - x2),
        );
        const height = Math.max(
          PIANO_ROLL_CELL_SIZE,
          Math.abs(interaction.box.origin.y - y2),
        );

        const nextSelectionRect = { x, y, width, height };

        interactionRef.current = {
          ...interaction,
          box: {
            ...interaction.box,
            rect: nextSelectionRect,
          },
        };

        setSelectionRect(nextSelectionRect);

        const selectedCells = selectCellsInRange(
          interaction.modifiers.addToSelection
            ? selectedPatternCellsRef.current
            : [],
          nextSelectionRect,
        );

        dispatch(trackerActions.setSelectedPatternCells(selectedCells));

        return input.shouldPreventDefault;
      }

      return false;
    },
    [
      calculatePositionFromClientPoint,
      dispatch,
      pastedPattern,
      playPreview,
      selectCellsInRange,
      selectedChannel,
      selectedInstrumentId,
      totalAbsRows,
      totalNoteRows,
    ],
  );

  const handlePointerEnd = useCallback((): boolean => {
    const interaction = interactionRef.current;

    if (
      interaction.type === "drag_note" ||
      interaction.type === "selection_box" ||
      interaction.type === "paint" ||
      interaction.type === "erase"
    ) {
      completePointerInteraction();
      return true;
    }

    resetPointerInteractionState();
    return false;
  }, [completePointerInteraction, resetPointerInteractionState]);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const preventDefault = handlePointerDown({
        isTouch: false,
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        modifiers: {
          addToSelection: e.shiftKey,
          clone: e.altKey,
        },
        isPrimaryAction: e.button === 0,
        isEraseAction: e.button === 2 || (tool === "eraser" && e.button === 0),
      });

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [handlePointerDown, tool],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const modifiers: PointerModifiers = {
        addToSelection: e.shiftKey,
        clone: e.altKey,
      };

      interactionRef.current = {
        ...interactionRef.current,
        modifiers,
      };

      const preventDefault = handlePointerMove({
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        modifiers,
        updateHover: true,
        shouldPreventDefault: false,
      });

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [handlePointerMove],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const preventDefault = handlePointerEnd();

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [handlePointerEnd],
  );

  const previewNotes = useMemo(() => {
    if (dragPreviewState.type !== "dragging") {
      return [];
    }

    const song = songRef.current;
    if (!song) {
      return [];
    }

    return selectedPatternCells
      .map((sourceCellAddress) => {
        const sourcePatternId = song.sequence[sourceCellAddress.sequenceId];
        if (sourcePatternId === undefined) {
          return null;
        }

        const sourceCell =
          song.patterns[sourcePatternId]?.[sourceCellAddress.rowId]?.[
            sourceCellAddress.channelId
          ];

        if (!sourceCell || sourceCell.note === null) {
          return null;
        }

        const sourceAbsRow = toAbsRow(
          sourceCellAddress.sequenceId,
          sourceCellAddress.rowId,
        );
        const targetAbsRow = sourceAbsRow + dragPreviewState.delta.rows;

        if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
          return null;
        }

        const targetNote = wrapNote(
          sourceCell.note + dragPreviewState.delta.notes,
        );
        const targetRow = noteToRow(targetNote);

        return {
          key: `${sourceCellAddress.sequenceId}:${sourceCellAddress.rowId}:${sourceCellAddress.channelId}`,
          left: targetAbsRow * PIANO_ROLL_CELL_SIZE,
          top: targetRow * PIANO_ROLL_CELL_SIZE,
          instrument: sourceCell.instrument ?? 0,
        };
      })
      .filter(
        (
          note,
        ): note is {
          key: string;
          left: number;
          top: number;
          instrument: number;
        } => note !== null,
      );
  }, [selectedPatternCells, totalAbsRows, dragPreviewState]);

  const pastePreviewNotes = useMemo(() => {
    if (
      !pastedPattern ||
      hoverColumn === null ||
      hoverNote === null ||
      hoverSequenceId === null
    ) {
      return [];
    }
    const hoverAbsRow = hoverSequenceId * TRACKER_PATTERN_LENGTH + hoverColumn;
    let noteOffset: number | undefined = undefined;
    const notes: {
      key: string;
      left: number;
      top: number;
      instrument: number;
    }[] = [];
    for (let offset = 0; offset < pastedPattern.length; offset++) {
      const cell = pastedPattern[offset][0];
      if (cell.note === null || cell.note === NO_CHANGE_ON_PASTE) continue;
      if (noteOffset === undefined) noteOffset = hoverNote - cell.note;
      const targetAbsRow = hoverAbsRow + offset;
      if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) continue;
      const targetNote = wrapNote(cell.note + noteOffset);
      const targetRow = noteToRow(targetNote);
      notes.push({
        key: `${offset}`,
        left: targetAbsRow * PIANO_ROLL_CELL_SIZE,
        top: targetRow * PIANO_ROLL_CELL_SIZE,
        instrument: cell.instrument ?? 0,
      });
    }
    return notes;
  }, [pastedPattern, hoverColumn, hoverNote, hoverSequenceId, totalAbsRows]);

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      dispatch(
        copyAbsoluteCells({
          patternCells: selectedPatternCellsRef.current,
        }),
      );
    },
    [dispatch],
  );

  const onCut = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      dispatch(
        cutAbsoluteCells({
          patternCells: selectedPatternCellsRef.current,
        }),
      );
    },
    [dispatch],
  );

  const onPaste = useCallback(() => {
    dispatch(pasteAbsoluteCells());
  }, [dispatch]);

  const onPasteInPlace = useCallback(() => {
    void dispatch(
      pasteInPlace({
        channelId: selectedChannel,
      }),
    );
  }, [dispatch, selectedChannel]);

  const lastSequenceId = useRef(sequenceId);
  useEffect(() => {
    if (
      !playing &&
      sequenceId !== lastSequenceId.current &&
      scrollRef.current
    ) {
      const rect = scrollRef.current.getBoundingClientRect();
      const halfWidth = rect.width * 0.5;
      const patternWidth = TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE;
      const patternX = calculatePlaybackTrackerPosition(sequenceId, 0);
      const scrollLeft =
        rect.width < patternWidth
          ? patternX
          : patternX - halfWidth + patternWidth * 0.5;

      scrollRef.current.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
    lastSequenceId.current = sequenceId;
  }, [sequenceId, playing]);

  useEffect(() => {
    if (subpatternEditorFocus) {
      return;
    }

    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCut);
    window.addEventListener("paste", onPaste);

    const unsubscribePasteInPlace =
      API.events.menu.pasteInPlace.subscribe(onPasteInPlace);

    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCut);
      window.removeEventListener("paste", onPaste);
      unsubscribePasteInPlace();
    };
  }, [subpatternEditorFocus, onCopy, onCut, onPaste, onPasteInPlace]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const onPlayNote = useCallback(
    (noteIndex: number) => {
      playPreview({
        note: noteIndex,
        instrumentId: selectedInstrumentId,
      });
    },
    [playPreview, selectedInstrumentId],
  );

  const togglePencilEraserTool = useCallback(() => {
    dispatch(trackerActions.setTool(tool === "eraser" ? "pencil" : "eraser"));
  }, [dispatch, tool]);

  const resetTwoFingerTapGesture = useCallback(() => {
    twoFingerTapRef.current = { type: "idle" };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      suppressNextContextMenuRef.current = false;

      if (e.touches.length === 2) {
        const touchA = e.touches[0];
        const touchB = e.touches[1];
        const midpointX = (touchA.clientX + touchB.clientX) * 0.5;
        const midpointY = (touchA.clientY + touchB.clientY) * 0.5;

        twoFingerTapRef.current = {
          type: "tracking",
          startedAt: Date.now(),
          startMidpointX: midpointX,
          startMidpointY: midpointY,
          movedTooFar: false,
        };

        interactionRef.current = {
          type: "idle",
          modifiers: interactionRef.current.modifiers,
        };

        resetPointerPreviewState();

        e.preventDefault();
        return;
      }

      resetTwoFingerTapGesture();

      if (e.touches.length !== 1) {
        interactionRef.current = {
          type: "idle",
          modifiers: interactionRef.current.modifiers,
        };
        return;
      }

      const touch = e.touches[0];

      const preventDefault = handlePointerDown({
        isTouch: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        pageX: touch.pageX,
        pageY: touch.pageY,
        modifiers: interactionRef.current.modifiers,
        isPrimaryAction: true,
        isEraseAction: false,
      });

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [handlePointerDown, resetPointerPreviewState, resetTwoFingerTapGesture],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const gesture = twoFingerTapRef.current;

      if (gesture.type === "tracking") {
        if (e.touches.length !== 2) {
          twoFingerTapRef.current = {
            ...gesture,
            movedTooFar: true,
          };
          return;
        }

        const touchA = e.touches[0];
        const touchB = e.touches[1];
        const midpointX = (touchA.clientX + touchB.clientX) * 0.5;
        const midpointY = (touchA.clientY + touchB.clientY) * 0.5;

        const deltaX = midpointX - gesture.startMidpointX;
        const deltaY = midpointY - gesture.startMidpointY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > TWO_FINGER_TAP_MAX_MOVEMENT) {
          twoFingerTapRef.current = {
            ...gesture,
            movedTooFar: true,
          };
        }

        return;
      }

      if (e.touches.length !== 1) {
        return;
      }

      const touch = e.touches[0];
      const interaction = interactionRef.current;

      if (interaction.type === "pending_pencil") {
        const movedDistance = Math.hypot(
          touch.clientX - interaction.startPoint.x,
          touch.clientY - interaction.startPoint.y,
        );

        if (movedDistance > TOUCH_TAP_MAX_MOVEMENT) {
          interactionRef.current = {
            type: "idle",
            modifiers: interaction.modifiers,
          };
        }

        return;
      }

      const preventDefault = handlePointerMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        pageX: touch.pageX,
        pageY: touch.pageY,
        modifiers: interaction.modifiers,
        updateHover: false,
        shouldPreventDefault: true,
      });

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [handlePointerMove],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const gesture = twoFingerTapRef.current;

      if (gesture.type === "tracking") {
        const duration = Date.now() - gesture.startedAt;
        const isTwoFingerTap =
          !gesture.movedTooFar &&
          duration <= TWO_FINGER_TAP_MAX_DURATION &&
          e.touches.length < 2;

        resetTwoFingerTapGesture();

        if (isTwoFingerTap) {
          e.preventDefault();
          togglePencilEraserTool();
        }
        return;
      }

      const interaction = interactionRef.current;

      if (interaction.type === "pending_pencil") {
        const pending = interaction.pending;

        dispatch(
          trackerDocumentActions.editPatternCell({
            patternId: pending.patternId,
            cell: [pending.patternRow, selectedChannel],
            changes: {
              instrument: selectedInstrumentId,
              note: pending.noteIndex,
            },
          }),
        );

        const currentPattern = songRef.current?.patterns[pending.patternId];
        const currentCell =
          currentPattern?.[pending.patternRow]?.[selectedChannel];

        playPreview({
          note: pending.noteIndex,
          instrumentId: selectedInstrumentId,
          effectCode: currentCell?.effectcode ?? 0,
          effectParam: currentCell?.effectparam ?? 0,
        });

        dispatch(
          trackerActions.setSelectedPatternCells([pending.clickedCellAddress]),
        );

        lastDragPreviewCellRef.current = `${pending.absRow}:${pending.noteIndex}`;

        interactionRef.current = {
          type: "idle",
          modifiers: interaction.modifiers,
        };

        return;
      }

      const preventDefault = handlePointerEnd();

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [
      dispatch,
      handlePointerEnd,
      playPreview,
      resetTwoFingerTapGesture,
      selectedChannel,
      selectedInstrumentId,
      togglePencilEraserTool,
    ],
  );

  const handleTouchCancel = useCallback(() => {
    resetTwoFingerTapGesture();
    handlePointerEnd();
  }, [resetTwoFingerTapGesture, handlePointerEnd]);

  const [wrapperEl, wrapperSize] = useResizeObserver<HTMLDivElement>();

  const onAddSequence = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(trackerDocumentActions.addSequence());
    },
    [dispatch],
  );

  const getSelectionContextMenu = useCallback(
    () =>
      renderPianoContextMenu({
        dispatch,
        selectedPatternCells,
        channelId: selectedChannel,
        selectedInstrumentId,
      }),
    [dispatch, selectedPatternCells, selectedChannel, selectedInstrumentId],
  );

  const {
    onContextMenu: onSelectionContextMenu,
    contextMenuElement: selectionContextMenuElement,
  } = useContextMenu({
    getIsEnabled: () => {
      return !suppressNextContextMenuRef.current;
    },
    getMenu: getSelectionContextMenu,
  });

  const suppressNextContextMenuRef = useRef(false);

  return (
    <StyledPianoRollScrollWrapper ref={mergeRefs(scrollRef, wrapperEl)}>
      <StyledPianoRollScrollCanvas
        style={{ minWidth: PIANO_ROLL_PIANO_WIDTH + documentWidth }}
      >
        <PianoRollSequenceBar
          song={song}
          playbackOrder={playbackOrder}
          playbackRow={playbackRow}
        />
        <StyledPianoRollScrollLeftWrapper>
          <PianoKeyboard hoverNote={hoverNote} onPlayNote={onPlayNote} />
          <StyledPianoRollScrollLeftFXSpacer>
            <FXIcon />
          </StyledPianoRollScrollLeftFXSpacer>
        </StyledPianoRollScrollLeftWrapper>
        <StyledPianoRollScrollContentWrapper
          ref={documentRef}
          style={{
            width: documentWidth,
            cursor:
              dragPreviewState.type === "dragging"
                ? dragPreviewState.clone
                  ? "copy"
                  : "move"
                : "auto",
            touchAction: tool === "selection" ? "none" : "auto",
          }}
          onContextMenu={onSelectionContextMenu}
          onMouseDown={!playing ? handleMouseDown : undefined}
          onTouchStart={!playing ? handleTouchStart : undefined}
          onTouchMove={!playing ? handleTouchMove : undefined}
          onTouchEnd={!playing ? handleTouchEnd : undefined}
          onTouchCancel={!playing ? handleTouchCancel : undefined}
        >
          <StyledPianoRollPatternsWrapper>
            {song.sequence.map((p, i) => (
              <PianoRollPatternBlock
                key={`roll_pattern_${i}:${p}`}
                patternId={p}
                sequenceId={i}
                displayChannels={displayChannels}
                isDragging={dragPreviewState.type === "dragging"}
              />
            ))}
          </StyledPianoRollPatternsWrapper>
          <StyledAddPatternWrapper
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              height: (wrapperSize.height ?? 0) - 61,
            }}
          >
            <StyledAddPatternButton
              onClick={onAddSequence}
              title={l10n("FIELD_ADD_PATTERN")}
            >
              <PlusIcon />
            </StyledAddPatternButton>
          </StyledAddPatternWrapper>
          {dragPreviewState.type === "dragging" &&
            previewNotes.map((previewNote) => (
              <StyledPianoRollNote
                key={`preview_${previewNote.key}`}
                $isSelected
                $instrument={previewNote.instrument}
                style={{
                  left: previewNote.left,
                  top: previewNote.top,
                  zIndex: 2,
                }}
              />
            ))}
          {pastedPattern &&
            pastePreviewNotes.map((previewNote) => (
              <StyledPianoRollNote
                key={`paste_preview_${previewNote.key}`}
                $isSelected
                $instrument={previewNote.instrument}
                style={{
                  left: previewNote.left,
                  top: previewNote.top,
                  zIndex: 2,
                }}
              />
            ))}
          {selectionRect && (
            <Selection
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}
        </StyledPianoRollScrollContentWrapper>
        <StyledPianoRollScrollBottomWrapper
          style={{ minWidth: PIANO_ROLL_PIANO_WIDTH + documentWidth }}
        >
          <StyledPianoRollScrollHeaderFooterSpacer />
          {song.sequence.map((p, i) => (
            <PianoRollEffectRow
              key={`roll_pattern_effects_${i}:${p}`}
              patternId={p}
              sequenceId={i}
              channelId={selectedChannel}
            />
          ))}
        </StyledPianoRollScrollBottomWrapper>
      </StyledPianoRollScrollCanvas>
      {selectionContextMenuElement}
    </StyledPianoRollScrollWrapper>
  );
};
