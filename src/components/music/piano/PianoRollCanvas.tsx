import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import { Song } from "shared/lib/uge/types";
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
  clonePattern,
  commitChangedPatterns,
  interpolateGridLine,
  mutatePatternsAndCollectChanges,
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
  copyAbsoluteCells,
  cutAbsoluteCells,
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
  const lastPaintPositionRef = useRef<{
    absRow: number;
    noteIndex: number;
  } | null>(null);

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

  type TouchInteractionMode =
    | "idle"
    | "pencil_pending"
    | "pencil_drag_note"
    | "selection_drag_note"
    | "selection_box";

  const touchModeRef = useRef<TouchInteractionMode>("idle");
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPencilNoteRef = useRef<{
    patternId: number;
    patternRow: number;
    sequenceId: number;
    absRow: number;
    noteIndex: number;
    clickedCellAddress: PatternCellAddress;
  } | null>(null);

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
      _selectedPatternCells: PatternCellAddress[],
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
        _selectedPatternCells.map((cell) => [
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

  const handleKeyDownActions = useCallback(
    (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.nodeName !== "BODY") {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
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
        lastPaintPositionRef.current = null;

        setSelectionRect(undefined);
        dispatch(trackerActions.setSelectedPatternCells([]));
        dispatch(trackerActions.clearPastedPattern());
      }
    },
    [dispatch],
  );

  const handleKeyDownActionsRef = useRef(handleKeyDownActions);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      interactionRef.current = {
        ...interactionRef.current,
        modifiers: {
          addToSelection: e.shiftKey,
          clone: e.altKey,
        },
      };

      if (e.code === "Equal") {
        dispatch(
          trackerDocumentActions.transposeAbsoluteCells({
            patternCells: selectedPatternCells,
            direction: "up",
            size: e.shiftKey ? "octave" : "note",
          }),
        );
      }

      if (e.code === "Minus") {
        dispatch(
          trackerDocumentActions.transposeAbsoluteCells({
            patternCells: selectedPatternCells,
            direction: "down",
            size: e.shiftKey ? "octave" : "note",
          }),
        );
      }

      if (e.ctrlKey && e.shiftKey) {
        if (e.code === "KeyQ") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCells,
              direction: "up",
              size: "octave",
            }),
          );
          return;
        }

        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCells,
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
              patternCells: selectedPatternCells,
              direction: "up",
              size: "note",
            }),
          );
          return;
        }

        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCells,
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
              patternCells: selectedPatternCells,
              instrumentId: selectedInstrumentId,
            }),
          );
          return;
        }

        if (e.code === "KeyK") {
          dispatch(
            trackerDocumentActions.interpolateAbsoluteCells({
              patternCells: selectedPatternCells,
            }),
          );
          return;
        }
      }

      handleKeyDownActionsRef.current(e);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      interactionRef.current = {
        ...interactionRef.current,
        modifiers: {
          addToSelection: e.shiftKey,
          clone: e.altKey,
        },
      };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dispatch, selectedPatternCells, selectedInstrumentId]);

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

  const calculatePositionFromMouse = useCallback(
    (e: MouseEvent) => {
      return calculatePositionFromClientPoint(e.clientX, e.clientY);
    },
    [calculatePositionFromClientPoint],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      interactionRef.current = {
        ...interactionRef.current,
        modifiers: {
          addToSelection: e.shiftKey,
          clone: e.altKey,
        },
      };

      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromMouse(e);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return;
      }

      if (
        noteIndex !== hoverNoteRef.current ||
        patternRow !== hoverColumnRef.current ||
        sequenceId !== hoverSequenceIdRef.current
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
        return;
      }

      const song = songRef.current;
      if (!song) {
        return;
      }

      const interaction = interactionRef.current;

      if (interaction.type === "drag_note") {
        if (selectedPatternCellsRef.current.length === 0) {
          return;
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
            clone: e.altKey,
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

        return;
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

          type PaintEdit = { rowId: number; note: number };
          const paintsByPattern = new Map<number, PaintEdit[]>();

          for (const paintCell of cellsToPaint) {
            const resolved = resolveAbsRow(song.sequence, paintCell.absRow);
            if (!resolved) continue;

            const existing =
              song.patterns[resolved.patternId]?.[resolved.rowId]?.[
                selectedChannel
              ];

            if (existing?.note === paintCell.note) continue;

            const edits = paintsByPattern.get(resolved.patternId) ?? [];
            edits.push({ rowId: resolved.rowId, note: paintCell.note });
            paintsByPattern.set(resolved.patternId, edits);
          }

          for (const [patternId, edits] of paintsByPattern) {
            const pattern = clonePattern(song.patterns[patternId]);

            for (const { rowId, note } of edits) {
              pattern[rowId][selectedChannel] = {
                ...pattern[rowId][selectedChannel],
                instrument: selectedInstrumentId,
                note,
              };
            }

            dispatch(
              trackerDocumentActions.editPattern({
                patternId: Number(patternId),
                pattern,
              }),
            );
          }

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

        return;
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

          type EraseEdit = { rowId: number };
          const erasesByPattern = new Map<number, EraseEdit[]>();

          for (const eraseCell of cellsToErase) {
            const resolved = resolveAbsRow(song.sequence, eraseCell.absRow);
            if (!resolved) continue;

            const existing =
              song.patterns[resolved.patternId]?.[resolved.rowId]?.[
                selectedChannel
              ];

            if (
              existing?.note !== null &&
              existing?.note !== undefined &&
              existing.note === eraseCell.note
            ) {
              const edits = erasesByPattern.get(resolved.patternId) ?? [];
              edits.push({ rowId: resolved.rowId });
              erasesByPattern.set(resolved.patternId, edits);
            }
          }

          for (const [patternId, edits] of erasesByPattern) {
            const pattern = clonePattern(song.patterns[patternId]);

            for (const { rowId } of edits) {
              pattern[rowId][selectedChannel] = {
                ...pattern[rowId][selectedChannel],
                instrument: null,
                note: null,
              };
            }

            dispatch(
              trackerDocumentActions.editPattern({
                patternId: Number(patternId),
                pattern,
              }),
            );
          }
        }

        return;
      }

      if (interaction.type === "selection_box") {
        if (!documentRef.current) {
          return;
        }

        const bounds = documentRef.current.getBoundingClientRect();
        const newAbsRow = Math.floor(
          (e.pageX - bounds.left - GRID_MARGIN) / PIANO_ROLL_CELL_SIZE,
        );
        const newRow = Math.floor(
          (e.pageY - bounds.top) / PIANO_ROLL_CELL_SIZE,
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
      }
    },
    [
      calculatePositionFromMouse,
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      suppressNextContextMenuRef.current = false;

      interactionRef.current = {
        ...interactionRef.current,
        modifiers: {
          addToSelection: e.shiftKey,
          clone: e.altKey,
        },
      };

      const { noteIndex, patternRow, sequenceId } = calculatePositionFromMouse(
        e.nativeEvent,
      );

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return;
      }

      const song = songRef.current;
      if (!song) {
        return;
      }

      if (pastedPattern) {
        const absRow = toAbsRow(sequenceId, patternRow);

        const { clonedPatterns, changedPatternIds } =
          mutatePatternsAndCollectChanges(
            song.patterns,
            (patterns, changed) => {
              let noteOffset: number | undefined;

              for (let offset = 0; offset < pastedPattern.length; offset++) {
                const cell = pastedPattern[offset][0];

                if (cell.note === null || cell.note === NO_CHANGE_ON_PASTE) {
                  continue;
                }

                if (noteOffset === undefined) {
                  noteOffset = noteIndex - cell.note;
                }

                const targetAbsRow = absRow + offset;
                if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
                  continue;
                }

                const resolved = resolveAbsRow(song.sequence, targetAbsRow);
                if (!resolved) {
                  continue;
                }

                patterns[resolved.patternId][resolved.rowId][selectedChannel] =
                  {
                    ...patterns[resolved.patternId][resolved.rowId][
                      selectedChannel
                    ],
                    ...cell,
                    note: wrapNote(cell.note + noteOffset),
                  };
                changed.add(resolved.patternId);
              }
            },
          );

        commitChangedPatterns(
          changedPatternIds,
          clonedPatterns,
          (patternId, pattern) => {
            dispatch(
              trackerDocumentActions.editPattern({
                patternId,
                pattern,
              }),
            );
          },
        );

        dispatch(trackerActions.clearPastedPattern());
        return;
      }

      const patternId = song.sequence[sequenceId];
      const absRow = toAbsRow(sequenceId, patternRow);
      const pattern = song.patterns[patternId];
      const cell = pattern[patternRow][selectedChannel];

      const selectedCellKey = `${sequenceId}:${patternRow}:${selectedChannel}`;
      const selectedPatternCells = selectedPatternCellsRef.current;

      const isSelected = selectedPatternCells.some(
        (selectedCell) =>
          selectedCell.sequenceId === sequenceId &&
          selectedCell.rowId === patternRow &&
          selectedCell.channelId === selectedChannel,
      );

      const clickedCellAddress: PatternCellAddress = {
        sequenceId,
        rowId: patternRow,
        channelId: selectedChannel,
      };

      if (tool === "pencil" && e.button === 0) {
        if (cell && cell.note === noteIndex) {
          if (!isSelected) {
            dispatch(
              trackerActions.setSelectedPatternCells([clickedCellAddress]),
            );
          }

          interactionRef.current = {
            type: "drag_note",
            modifiers: {
              addToSelection: e.shiftKey,
              clone: e.altKey,
            },
            origin: {
              absRow,
              note: cell.note,
            },
            delta: {
              rows: 0,
              notes: 0,
            },
            startedFromSelection: false,
          };

          setDragPreviewState({ type: "idle" });
          lastDragPreviewCellRef.current = null;
          lastPaintPositionRef.current = null;
          return;
        }

        if (
          cell &&
          cell.note !== noteIndex &&
          selectedPatternCells.length > 1
        ) {
          dispatch(trackerActions.setSelectedPatternCells([]));
          interactionRef.current = {
            type: "idle",
            modifiers: {
              addToSelection: e.shiftKey,
              clone: e.altKey,
            },
          };
          setDragPreviewState({ type: "idle" });
          lastDragPreviewCellRef.current = null;
          lastPaintPositionRef.current = null;
          return;
        }

        const changes = {
          instrument: selectedInstrumentId,
          note: noteIndex,
        };

        dispatch(
          trackerDocumentActions.editPatternCell({
            patternId,
            cell: [patternRow, selectedChannel],
            changes,
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
          modifiers: {
            addToSelection: e.shiftKey,
            clone: e.altKey,
          },
          lastPaintPosition: {
            absRow,
            note: noteIndex,
          },
        };

        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = `${absRow}:${noteIndex}`;
        lastPaintPositionRef.current = { absRow, noteIndex };
        return;
      }

      if (e.button === 2 || (tool === "eraser" && e.button === 0)) {
        if (cell && cell.note === noteIndex) {
          suppressNextContextMenuRef.current = true;

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
          modifiers: {
            addToSelection: e.shiftKey,
            clone: e.altKey,
          },
          lastPaintPosition: {
            absRow,
            note: noteIndex,
          },
        };

        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = null;
        lastPaintPositionRef.current = { absRow, noteIndex };
        return;
      }

      if (tool === "selection" && e.button === 0) {
        if (cell && cell.note === noteIndex) {
          if (!isSelected) {
            if (interactionRef.current.modifiers.addToSelection) {
              const selectedPatternCellMap = new Map(
                selectedPatternCells.map((selectedCell) => [
                  `${selectedCell.sequenceId}:${selectedCell.rowId}:${selectedCell.channelId}`,
                  selectedCell,
                ]),
              );

              selectedPatternCellMap.set(selectedCellKey, clickedCellAddress);

              dispatch(
                trackerActions.setSelectedPatternCells([
                  ...selectedPatternCellMap.values(),
                ]),
              );
            } else {
              dispatch(
                trackerActions.setSelectedPatternCells([clickedCellAddress]),
              );
            }
          }

          interactionRef.current = {
            type: "drag_note",
            modifiers: {
              addToSelection: e.shiftKey,
              clone: e.altKey,
            },
            origin: {
              absRow,
              note: cell.note,
            },
            delta: {
              rows: 0,
              notes: 0,
            },
            startedFromSelection: true,
          };

          setDragPreviewState({ type: "idle" });
          lastDragPreviewCellRef.current = null;
          lastPaintPositionRef.current = null;
          return;
        }

        if (documentRef.current) {
          const bounds = documentRef.current.getBoundingClientRect();

          const x = clamp(
            Math.floor(
              (e.pageX - bounds.left - GRID_MARGIN) / PIANO_ROLL_CELL_SIZE,
            ) * PIANO_ROLL_CELL_SIZE,
            0,
            totalAbsRows * PIANO_ROLL_CELL_SIZE - 1,
          );

          const y = clamp(
            Math.floor((e.pageY - bounds.top) / PIANO_ROLL_CELL_SIZE) *
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
            interactionRef.current.modifiers.addToSelection
              ? selectedPatternCells
              : [],
            newSelectionRect,
          );

          interactionRef.current = {
            type: "selection_box",
            modifiers: {
              addToSelection: e.shiftKey,
              clone: e.altKey,
            },
            box: {
              origin: { x, y },
              rect: newSelectionRect,
            },
          };

          setSelectionRect(newSelectionRect);
          setDragPreviewState({ type: "idle" });
          lastDragPreviewCellRef.current = null;
          lastPaintPositionRef.current = null;

          dispatch(trackerActions.setSelectedPatternCells(newSelectedPatterns));
        }
      }
    },
    [
      calculatePositionFromMouse,
      dispatch,
      pastedPattern,
      playPreview,
      selectCellsInRange,
      selectedChannel,
      selectedInstrumentId,
      tool,
      totalAbsRows,
      totalNoteRows,
    ],
  );

  const finishPointerInteraction = useCallback(() => {
    const interaction = interactionRef.current;
    const song = songRef.current;

    if (!song) {
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
      lastPaintPositionRef.current = null;
      return;
    }

    if (interaction.type === "drag_note") {
      const selectedPatternCells = selectedPatternCellsRef.current;

      const hasMoved =
        interaction.delta.rows !== 0 || interaction.delta.notes !== 0;

      if (hasMoved && selectedPatternCells.length > 0) {
        const selectedPatternCellKeys = new Set(
          selectedPatternCells.map(
            (selectedCell) =>
              `${selectedCell.sequenceId}:${selectedCell.rowId}:${selectedCell.channelId}`,
          ),
        );

        const { clonedPatterns, changedPatternIds } =
          mutatePatternsAndCollectChanges(
            song.patterns,
            (patterns, changed) => {
              for (const sourceAddress of selectedPatternCells) {
                const sourcePatternId = song.sequence[sourceAddress.sequenceId];
                if (sourcePatternId === undefined) {
                  continue;
                }

                const sourceCell =
                  song.patterns[sourcePatternId]?.[sourceAddress.rowId]?.[
                    sourceAddress.channelId
                  ];

                if (!sourceCell || sourceCell.note === null) {
                  continue;
                }

                const sourceAbsRow = toAbsRow(
                  sourceAddress.sequenceId,
                  sourceAddress.rowId,
                );
                const targetAbsRow = sourceAbsRow + interaction.delta.rows;

                const previousSourcePositionKey = `${sourceAddress.sequenceId}:${
                  sourceAddress.rowId - interaction.delta.rows
                }:${sourceAddress.channelId}`;

                if (
                  !interaction.modifiers.clone &&
                  !selectedPatternCellKeys.has(previousSourcePositionKey)
                ) {
                  patterns[sourcePatternId][sourceAddress.rowId][
                    sourceAddress.channelId
                  ] = {
                    ...patterns[sourcePatternId][sourceAddress.rowId][
                      sourceAddress.channelId
                    ],
                    instrument: null,
                    note: null,
                    effectcode: null,
                    effectparam: null,
                  };
                  changed.add(sourcePatternId);
                }

                if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
                  continue;
                }

                const targetResolved = resolveAbsRow(
                  song.sequence,
                  targetAbsRow,
                );
                if (!targetResolved) {
                  continue;
                }

                patterns[targetResolved.patternId][targetResolved.rowId][
                  sourceAddress.channelId
                ] = {
                  ...patterns[targetResolved.patternId][targetResolved.rowId][
                    sourceAddress.channelId
                  ],
                  ...sourceCell,
                  note: wrapNote(sourceCell.note + interaction.delta.notes),
                };
                changed.add(targetResolved.patternId);
              }
            },
          );

        commitChangedPatterns(
          changedPatternIds,
          clonedPatterns,
          (patternId, pattern) => {
            dispatch(
              trackerDocumentActions.editPattern({
                patternId,
                pattern,
              }),
            );
          },
        );

        dispatch(
          trackerActions.setSelectedPatternCells(
            selectedPatternCells
              .map((selectedCell) => {
                const sourceAbsRow = toAbsRow(
                  selectedCell.sequenceId,
                  selectedCell.rowId,
                );
                const targetAbsRow = sourceAbsRow + interaction.delta.rows;

                if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
                  return null;
                }

                const resolved = resolveAbsRow(song.sequence, targetAbsRow);
                if (!resolved) {
                  return null;
                }

                return {
                  sequenceId: resolved.sequenceId,
                  rowId: resolved.rowId,
                  channelId: selectedCell.channelId,
                };
              })
              .filter(
                (selectedCell): selectedCell is PatternCellAddress =>
                  selectedCell !== null,
              ),
          ),
        );
      }
    }

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
    lastPaintPositionRef.current = null;
  }, [dispatch, totalAbsRows]);

  const handleMouseUp = useCallback(
    (_e: MouseEvent) => {
      finishPointerInteraction();
    },
    [finishPointerInteraction],
  );

  const updateTouchSelection = useCallback(
    (clientX: number, clientY: number) => {
      if (!documentRef.current) {
        return;
      }

      const interaction = interactionRef.current;
      if (interaction.type !== "selection_box") {
        return;
      }

      const bounds = documentRef.current.getBoundingClientRect();
      const newAbsRow = Math.floor(
        (clientX - bounds.left - GRID_MARGIN) / PIANO_ROLL_CELL_SIZE,
      );
      const newRow = Math.floor((clientY - bounds.top) / PIANO_ROLL_CELL_SIZE);

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
    },
    [dispatch, selectCellsInRange, totalAbsRows, totalNoteRows],
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

  const handleMouseMoveRef = useRef(handleMouseMove);
  const handleMouseUpRef = useRef(handleMouseUp);

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;
      dispatch(
        copyAbsoluteCells({
          patternCells: selectedPatternCells,
        }),
      );
    },
    [dispatch, selectedPatternCells],
  );

  const onCut = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;
      dispatch(
        cutAbsoluteCells({
          patternCells: selectedPatternCells,
        }),
      );
    },
    [dispatch, selectedPatternCells],
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

  const onCopyRef = useRef(onCopy);
  const onCutRef = useRef(onCut);
  const onPasteRef = useRef(onPaste);
  const onPasteInPlaceRef = useRef(onPasteInPlace);

  useEffect(() => {
    handleMouseMoveRef.current = handleMouseMove;
    handleMouseUpRef.current = handleMouseUp;
    handleKeyDownActionsRef.current = handleKeyDownActions;
    onCopyRef.current = onCopy;
    onCutRef.current = onCut;
    onPasteRef.current = onPaste;
    onPasteInPlaceRef.current = onPasteInPlace;
  });

  useEffect(() => {
    if (subpatternEditorFocus) return;
    const handleCopy = (e: ClipboardEvent) => onCopyRef.current(e);
    const handleCut = (e: ClipboardEvent) => onCutRef.current(e);
    const handlePaste = () => onPasteRef.current();
    const handlePasteInPlace = () => {
      onPasteInPlaceRef.current();
    };
    window.addEventListener("copy", handleCopy);
    window.addEventListener("cut", handleCut);
    window.addEventListener("paste", handlePaste);
    const unsubscribePasteInPlace =
      API.events.menu.pasteInPlace.subscribe(handlePasteInPlace);
    return () => {
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("paste", handlePaste);
      unsubscribePasteInPlace();
    };
  }, [subpatternEditorFocus]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleMouseMoveRef.current(e);
    };

    const onMouseUp = (e: MouseEvent) => {
      handleMouseUpRef.current(e);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
      if (playing) {
        return;
      }

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

        touchStartPointRef.current = null;
        setSelectionRect(undefined);
        setDragPreviewState({ type: "idle" });

        e.preventDefault();
        return;
      }

      resetTwoFingerTapGesture();

      if (e.touches.length !== 1) {
        interactionRef.current = {
          type: "idle",
          modifiers: interactionRef.current.modifiers,
        };
        touchStartPointRef.current = null;
        return;
      }

      const touch = e.touches[0];
      touchStartPointRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };

      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromClientPoint(touch.clientX, touch.clientY);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        interactionRef.current = {
          type: "idle",
          modifiers: interactionRef.current.modifiers,
        };
        return;
      }

      const song = songRef.current;
      if (!song) {
        interactionRef.current = {
          type: "idle",
          modifiers: interactionRef.current.modifiers,
        };
        return;
      }

      const patternId = song.sequence[sequenceId];
      const absRow = toAbsRow(sequenceId, patternRow);
      const pattern = song.patterns[patternId];
      const cell = pattern[patternRow][selectedChannel];

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

      if (tool === "pencil") {
        if (cell && cell.note === noteIndex) {
          if (!isSelected) {
            dispatch(
              trackerActions.setSelectedPatternCells([clickedCellAddress]),
            );
          }

          interactionRef.current = {
            type: "drag_note",
            modifiers: interactionRef.current.modifiers,
            origin: {
              absRow,
              note: cell.note,
            },
            delta: {
              rows: 0,
              notes: 0,
            },
            startedFromSelection: false,
          };

          setSelectionRect(undefined);
          setDragPreviewState({ type: "idle" });
          lastDragPreviewCellRef.current = null;
          lastPaintPositionRef.current = null;

          e.preventDefault();
          return;
        }

        if (selectedPatternCells.length > 1) {
          interactionRef.current = {
            type: "idle",
            modifiers: interactionRef.current.modifiers,
          };

          dispatch(trackerActions.setSelectedPatternCells([]));
          setSelectionRect(undefined);
          setDragPreviewState({ type: "idle" });
          lastDragPreviewCellRef.current = null;
          lastPaintPositionRef.current = null;
          return;
        }

        interactionRef.current = {
          type: "pending_pencil",
          modifiers: interactionRef.current.modifiers,
          startPoint: {
            x: touch.clientX,
            y: touch.clientY,
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

        setSelectionRect(undefined);
        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = null;
        lastPaintPositionRef.current = null;
        return;
      }

      if (tool !== "selection") {
        interactionRef.current = {
          type: "idle",
          modifiers: interactionRef.current.modifiers,
        };
        return;
      }

      if (cell && cell.note === noteIndex) {
        if (!isSelected) {
          if (interactionRef.current.modifiers.addToSelection) {
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
          } else {
            dispatch(
              trackerActions.setSelectedPatternCells([clickedCellAddress]),
            );
          }
        }

        interactionRef.current = {
          type: "drag_note",
          modifiers: interactionRef.current.modifiers,
          origin: {
            absRow,
            note: cell.note,
          },
          delta: {
            rows: 0,
            notes: 0,
          },
          startedFromSelection: true,
        };

        setSelectionRect(undefined);
        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = null;
        lastPaintPositionRef.current = null;

        e.preventDefault();
        return;
      }

      if (documentRef.current) {
        const bounds = documentRef.current.getBoundingClientRect();
        const x = clamp(
          Math.floor(
            (touch.clientX - bounds.left - GRID_MARGIN) / PIANO_ROLL_CELL_SIZE,
          ) * PIANO_ROLL_CELL_SIZE,
          0,
          totalAbsRows * PIANO_ROLL_CELL_SIZE - 1,
        );
        const y = clamp(
          Math.floor((touch.clientY - bounds.top) / PIANO_ROLL_CELL_SIZE) *
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
          interactionRef.current.modifiers.addToSelection
            ? selectedPatternCells
            : [],
          newSelectionRect,
        );

        interactionRef.current = {
          type: "selection_box",
          modifiers: interactionRef.current.modifiers,
          box: {
            origin: { x, y },
            rect: newSelectionRect,
          },
        };

        setSelectionRect(newSelectionRect);
        setDragPreviewState({ type: "idle" });
        lastDragPreviewCellRef.current = null;
        lastPaintPositionRef.current = null;

        dispatch(trackerActions.setSelectedPatternCells(newSelectedPatterns));

        e.preventDefault();
      }
    },
    [
      playing,
      resetTwoFingerTapGesture,
      calculatePositionFromClientPoint,
      selectedChannel,
      dispatch,
      totalAbsRows,
      totalNoteRows,
      selectCellsInRange,
      tool,
    ],
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

      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromClientPoint(touch.clientX, touch.clientY);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return;
      }

      if (interaction.type === "drag_note") {
        e.preventDefault();

        const selectedPatternCells = selectedPatternCellsRef.current;
        if (selectedPatternCells.length === 0) {
          return;
        }

        const song = songRef.current;
        if (!song) {
          return;
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
            clone: e.altKey,
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

        return;
      }

      if (interaction.type === "selection_box") {
        e.preventDefault();
        updateTouchSelection(touch.clientX, touch.clientY);
      }
    },
    [
      calculatePositionFromClientPoint,
      playPreview,
      selectedChannel,
      updateTouchSelection,
    ],
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
        lastPaintPositionRef.current = {
          absRow: pending.absRow,
          noteIndex: pending.noteIndex,
        };

        interactionRef.current = {
          type: "idle",
          modifiers: interaction.modifiers,
        };

        return;
      }

      if (
        interaction.type === "drag_note" ||
        interaction.type === "selection_box" ||
        interaction.type === "paint" ||
        interaction.type === "erase"
      ) {
        e.preventDefault();
        finishPointerInteraction();
        return;
      }

      interactionRef.current = {
        type: "idle",
        modifiers: interaction.modifiers,
      };

      setDragPreviewState({ type: "idle" });
    },
    [
      resetTwoFingerTapGesture,
      togglePencilEraserTool,
      dispatch,
      selectedChannel,
      selectedInstrumentId,
      playPreview,
      finishPointerInteraction,
    ],
  );

  const handleTouchCancel = useCallback(() => {
    resetTwoFingerTapGesture();
    touchModeRef.current = "idle";
    pendingPencilNoteRef.current = null;
    touchStartPointRef.current = null;
    finishPointerInteraction();
  }, [resetTwoFingerTapGesture, finishPointerInteraction]);

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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
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
