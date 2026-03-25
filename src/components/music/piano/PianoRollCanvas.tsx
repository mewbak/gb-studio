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

interface NoteDragOrigin {
  absRow: number;
  note: number;
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

export const PianoRollCanvas = ({
  song,
  sequenceId,
  playbackOrder,
  playbackRow,
}: PianoRollCanvasProps) => {
  const dispatch = useAppDispatch();
  const playPreview = useMusicNotePreview();

  const hoverNote = useAppSelector((state) => state.tracker.hoverNote);
  const hoverColumn = useAppSelector((state) => state.tracker.hoverColumn);
  const hoverSequenceId = useAppSelector(
    (state) => state.tracker.hoverSequence,
  );
  const selectedPatternCells = useAppSelector(
    (state) => state.tracker.selectedPatternCells,
  );
  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );
  const pastedPattern = useAppSelector((state) => state.tracker.pastedPattern);

  const addToSelection = useRef(false);
  const clonePatternCells = useRef(false);
  const [isCloneMode, setIsCloneMode] = useState(false);

  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [noteDragOrigin, setNoteDragOrigin] = useState<NoteDragOrigin | null>(
    null,
  );
  const lastDragPreviewCellRef = useRef<string | null>(null);
  const lastPaintPositionRef = useRef<{
    absRow: number;
    noteIndex: number;
  } | null>(null);
  const [dragDelta, setDragDelta] = useState<DragDelta>({
    rows: 0,
    notes: 0,
  });

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const visibleChannels = useAppSelector(
    (state) => state.tracker.visibleChannels,
  );

  const tool = useAppSelector((state) => state.tracker.tool);

  const [draggingSelection, setDraggingSelection] = useState(false);
  const [selectionOrigin, setSelectionOrigin] = useState<
    Position | undefined
  >();
  const [selectionRect, setSelectionRect] = useState<
    SelectionRect | undefined
  >();

  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  // Piano roll only supports selecting notes from a single channel.
  // The shared `selectedPatternCells` state can span multiple channels
  // (used by tracker view), so when the piano view is active we clamp the
  // selection to the currently visible channel to avoid cross-channel edits.
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
      // Select all will be called multiple times
      // added a required delay between calls to allow
      // Pattern then Song selection
      return;
    }
    lastSelectAllRef.current = Date.now();

    if (selectedPatternCells.length <= 1) {
      // Select all cells in pattern
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
      // Select all cells in song
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
      if ((e.target as HTMLElement)?.nodeName !== "BODY") {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedPatternCells.length === 0) return;
        dispatch(
          trackerDocumentActions.clearAbsoluteCells({
            patternCells: selectedPatternCells,
          }),
        );
        dispatch(trackerActions.setSelectedPatternCells([]));
      }

      if (e.key === "Escape") {
        dispatch(trackerActions.setSelectedPatternCells([]));
        setIsDraggingNotes(false);
        setDragDelta({ rows: 0, notes: 0 });
        setNoteDragOrigin(null);
        dispatch(trackerActions.clearPastedPattern());
      }
    },
    [dispatch, selectedPatternCells],
  );

  const changeInstrumentForSelectedIds = useCallback(() => {
    dispatch(
      trackerDocumentActions.changeInstrumentAbsoluteCells({
        patternCells: selectedPatternCells,
        instrumentId: selectedInstrumentId,
      }),
    );
  }, [dispatch, selectedInstrumentId, selectedPatternCells]);

  const handleKeyDownActionsRef = useRef(handleKeyDownActions);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        addToSelection.current = true;
      }
      if (e.altKey) {
        clonePatternCells.current = true;
        setIsCloneMode(true);
      }
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
          return true;
        }
        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCells,
              direction: "down",
              size: "octave",
            }),
          );
          return true;
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
          return true;
        }
        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCells,
              direction: "down",
              size: "note",
            }),
          );
          return true;
        }
      } else if (e.ctrlKey) {
        if (e.code === "KeyI") {
          dispatch(
            trackerDocumentActions.changeInstrumentAbsoluteCells({
              patternCells: selectedPatternCells,
              instrumentId: selectedInstrumentId,
            }),
          );
          return true;
        }
        if (e.code === "KeyK") {
          dispatch(
            trackerDocumentActions.interpolateAbsoluteCells({
              patternCells: selectedPatternCells,
            }),
          );
          return true;
        }
      }

      handleKeyDownActionsRef.current(e);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) {
        addToSelection.current = false;
      }
      if (!e.altKey) {
        clonePatternCells.current = false;
        setIsCloneMode(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    changeInstrumentForSelectedIds,
    dispatch,
    selectedChannel,
    selectedPatternCells,
    selectedInstrumentId,
  ]);

  const displayChannels = useMemo(
    () =>
      [
        selectedChannel,
        ...visibleChannels.filter((c) => c !== selectedChannel),
      ].reverse(),
    [selectedChannel, visibleChannels],
  );

  const c5Ref = useRef<HTMLDivElement>(null);

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
    if (scrollRef.current && c5Ref.current) {
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const targetRect = c5Ref.current.getBoundingClientRect();
      const offsetTop = targetRect.top - scrollRect.top;
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollTop + offsetTop,
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

  const calculatePositionFromMouse = useCallback(
    (e: MouseEvent) => {
      if (!documentRef.current) {
        return {
          noteIndex: null,
          patternRow: null,
          sequenceId: null,
        };
      }

      const rect = documentRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
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
        (e.pageY - rect.top) / PIANO_ROLL_CELL_SIZE,
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      addToSelection.current = e.shiftKey;
      clonePatternCells.current = e.altKey;
      setIsCloneMode(e.altKey);

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

      if (
        (tool === "selection" || tool === "pencil") &&
        isMouseDown &&
        song &&
        selectedPatternCells.length > 0 &&
        noteDragOrigin
      ) {
        const absRow = toAbsRow(sequenceId, patternRow);
        const nextDragDelta = {
          rows: absRow - noteDragOrigin.absRow,
          notes: noteIndex - noteDragOrigin.note,
        };

        if (
          nextDragDelta.rows !== dragDelta.rows ||
          nextDragDelta.notes !== dragDelta.notes
        ) {
          setDragDelta(nextDragDelta);
          setIsDraggingNotes(true);

          const previewCellId = `${absRow}:${noteIndex}`;

          const { sequenceId: originSequenceId, rowId: originRowId } =
            fromAbsRow(noteDragOrigin.absRow);

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
      } else if (
        tool === "pencil" &&
        isMouseDown &&
        !noteDragOrigin &&
        e.button === 0
      ) {
        const absRow = toAbsRow(sequenceId, patternRow);
        const currentCellId = `${absRow}:${noteIndex}`;
        if (lastDragPreviewCellRef.current !== currentCellId) {
          const prev = lastPaintPositionRef.current;
          lastDragPreviewCellRef.current = currentCellId;
          lastPaintPositionRef.current = { absRow, noteIndex };

          const cellsToPaint = interpolateGridLine(
            prev ? { absRow: prev.absRow, note: prev.noteIndex } : null,
            { absRow, note: noteIndex },
          );

          type PaintEdit = { rowId: number; note: number };
          const paintsByPattern = new Map<number, PaintEdit[]>();
          for (const paintCell of cellsToPaint) {
            const resolved = resolveAbsRow(song.sequence, paintCell.absRow);
            if (!resolved) continue;
            const existing =
              song.patterns[resolved.patternId][resolved.rowId][
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

              const patternId = songRef.current?.sequence[resolved.sequenceId];
              const pattern = songRef.current?.patterns[patternId];
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
      } else if (
        (tool === "eraser" || e.button === 2) &&
        isMouseDown &&
        !noteDragOrigin
      ) {
        const absRow = toAbsRow(sequenceId, patternRow);
        const currentCellId = `${absRow}:${noteIndex}`;
        if (lastDragPreviewCellRef.current !== currentCellId) {
          const prev = lastPaintPositionRef.current;
          lastDragPreviewCellRef.current = currentCellId;
          lastPaintPositionRef.current = { absRow, noteIndex };

          const cellsToErase = interpolateGridLine(
            prev ? { absRow: prev.absRow, note: prev.noteIndex } : null,
            { absRow, note: noteIndex },
          );

          type EraseEdit = { rowId: number };
          const erasesByPattern = new Map<number, EraseEdit[]>();
          for (const eraseCell of cellsToErase) {
            const resolved = resolveAbsRow(song.sequence, eraseCell.absRow);
            if (!resolved) continue;
            const existing =
              song.patterns[resolved.patternId][resolved.rowId][
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
      } else if (
        tool === "selection" &&
        draggingSelection &&
        selectionRect &&
        selectionOrigin
      ) {
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

        const x = Math.min(selectionOrigin.x, x2);
        const y = Math.min(selectionOrigin.y, y2);
        const width = Math.max(
          PIANO_ROLL_CELL_SIZE,
          Math.abs(selectionOrigin.x - x2),
        );
        const height = Math.max(
          PIANO_ROLL_CELL_SIZE,
          Math.abs(selectionOrigin.y - y2),
        );

        const nextSelectionRect = { x, y, width, height };
        setSelectionRect(nextSelectionRect);

        const selectedCells = selectCellsInRange(
          addToSelection.current ? selectedPatternCells : [],
          nextSelectionRect,
        );
        dispatch(trackerActions.setSelectedPatternCells(selectedCells));
      }
    },
    [
      calculatePositionFromMouse,
      pastedPattern,
      tool,
      isMouseDown,
      song,
      selectedPatternCells,
      noteDragOrigin,
      draggingSelection,
      selectionRect,
      selectionOrigin,
      dispatch,
      dragDelta.rows,
      dragDelta.notes,
      selectedChannel,
      playPreview,
      selectedInstrumentId,
      totalAbsRows,
      totalNoteRows,
      selectCellsInRange,
    ],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      suppressNextContextMenuRef.current = false;
      addToSelection.current = e.shiftKey;
      clonePatternCells.current = e.altKey;
      setIsCloneMode(e.altKey);

      const { noteIndex, patternRow, sequenceId } = calculatePositionFromMouse(
        e.nativeEvent,
      );
      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return;
      }

      // Commit any pending paste on click
      if (pastedPattern) {
        const absRow = toAbsRow(sequenceId, patternRow);
        const { clonedPatterns, changedPatternIds } =
          mutatePatternsAndCollectChanges(
            song.patterns,
            (patterns, changed) => {
              let noteOffset: number | undefined = undefined;
              for (let offset = 0; offset < pastedPattern.length; offset++) {
                const cell = pastedPattern[offset][0];
                if (cell.note === null || cell.note === NO_CHANGE_ON_PASTE)
                  continue;
                if (noteOffset === undefined)
                  noteOffset = noteIndex - cell.note;
                const targetAbsRow = absRow + offset;
                if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) continue;
                const resolved = resolveAbsRow(song.sequence, targetAbsRow);
                if (!resolved) continue;
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
      const isSelected = selectedPatternCells.some(
        (cell) =>
          cell.sequenceId === sequenceId &&
          cell.rowId === patternRow &&
          cell.channelId === selectedChannel,
      );
      const clickedCellAddress: PatternCellAddress = {
        sequenceId,
        rowId: patternRow,
        channelId: selectedChannel,
      };

      if (tool === "pencil" && e.button === 0) {
        // If there's a note in position
        if (cell && cell.note === noteIndex) {
          if (!isSelected) {
            dispatch(
              trackerActions.setSelectedPatternCells([clickedCellAddress]),
            );
          }
          setIsMouseDown(true);
          setIsDraggingNotes(false);
          setNoteDragOrigin({ absRow, note: cell.note });
          setDragDelta({ rows: 0, notes: 0 });
          lastDragPreviewCellRef.current = null;
          return;
        }
        if (
          cell &&
          cell.note !== noteIndex &&
          selectedPatternCells.length > 1
        ) {
          dispatch(trackerActions.setSelectedPatternCells([]));
        } else {
          const changes = {
            instrument: selectedInstrumentId,
            note: noteIndex,
          };
          dispatch(
            trackerDocumentActions.editPatternCell({
              patternId: patternId,
              cell: [patternRow, selectedChannel],
              changes: changes,
            }),
          );

          const pattern = songRef.current?.patterns[patternId];
          const cell = pattern?.[patternRow]?.[selectedChannel];
          playPreview({
            note: noteIndex,
            instrumentId: selectedInstrumentId,
            effectCode: cell?.effectcode ?? 0,
            effectParam: cell?.effectparam ?? 0,
          });

          if (!isSelected) {
            dispatch(
              trackerActions.setSelectedPatternCells([clickedCellAddress]),
            );
          }
          setIsMouseDown(true);
          lastDragPreviewCellRef.current = `${absRow}:${noteIndex}`;
          lastPaintPositionRef.current = { absRow: absRow, noteIndex };
        }
      } else if (e.button === 2 || (tool === "eraser" && e.button === 0)) {
        // Erase the note at click position if there is one
        if (cell && cell.note === noteIndex) {
          suppressNextContextMenuRef.current = true;
          dispatch(
            trackerDocumentActions.editPatternCell({
              patternId: patternId,
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
        setIsMouseDown(true);
        lastPaintPositionRef.current = { absRow: absRow, noteIndex };
      } else if (tool === "selection" && e.button === 0) {
        // If there's a note in position
        if (cell && cell.note === noteIndex) {
          if (!isSelected) {
            if (addToSelection.current) {
              const selectedPatternCellMap = new Map(
                selectedPatternCells.map((cell) => [
                  `${cell.sequenceId}:${cell.rowId}:${cell.channelId}`,
                  cell,
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
          setIsMouseDown(true);
          setIsDraggingNotes(false);
          setNoteDragOrigin({ absRow, note: cell.note });
          setDragDelta({ rows: 0, notes: 0 });
          lastDragPreviewCellRef.current = null;
        } else if (documentRef.current) {
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
            addToSelection.current ? selectedPatternCells : [],
            newSelectionRect,
          );

          setSelectionOrigin({ x, y });
          setSelectionRect(newSelectionRect);
          setDraggingSelection(true);
          dispatch(trackerActions.setSelectedPatternCells(newSelectedPatterns));
        }
      }
    },
    [
      calculatePositionFromMouse,
      pastedPattern,
      song.sequence,
      song.patterns,
      selectedChannel,
      selectedPatternCells,
      tool,
      dispatch,
      totalAbsRows,
      selectedInstrumentId,
      playPreview,
      totalNoteRows,
      selectCellsInRange,
    ],
  );

  const handleMouseUp = useCallback(
    (_e: MouseEvent) => {
      if (!isMouseDown && !isDraggingNotes && !draggingSelection) {
        return;
      }

      if (isDraggingNotes && selectedPatternCells.length > 0) {
        const selectedPatternCellKeys = new Set(
          selectedPatternCells.map(
            (cell) => `${cell.sequenceId}:${cell.rowId}:${cell.channelId}`,
          ),
        );

        const { clonedPatterns, changedPatternIds } =
          mutatePatternsAndCollectChanges(
            song.patterns,
            (patterns, changed) => {
              for (const sourceAddress of selectedPatternCells) {
                const sourcePatternId = song.sequence[sourceAddress.sequenceId];
                if (sourcePatternId === undefined) continue;

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
                const targetAbsRow = sourceAbsRow + dragDelta.rows;

                const previousSourcePositionKey = `${sourceAddress.sequenceId}:${
                  sourceAddress.rowId - dragDelta.rows
                }:${sourceAddress.channelId}`;

                if (
                  !clonePatternCells.current &&
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
                if (!targetResolved) continue;

                patterns[targetResolved.patternId][targetResolved.rowId][
                  sourceAddress.channelId
                ] = {
                  ...patterns[targetResolved.patternId][targetResolved.rowId][
                    sourceAddress.channelId
                  ],
                  ...sourceCell,
                  note: wrapNote(sourceCell.note + dragDelta.notes),
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
              .map((cell) => {
                const sourceAbsRow = toAbsRow(cell.sequenceId, cell.rowId);
                const targetAbsRow = sourceAbsRow + dragDelta.rows;

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
                  channelId: cell.channelId,
                };
              })
              .filter((cell) => cell !== null),
          ),
        );
      }

      setSelectionRect(undefined);
      setDraggingSelection(false);
      setIsDraggingNotes(false);
      setDragDelta({ rows: 0, notes: 0 });
      setNoteDragOrigin(null);
      lastDragPreviewCellRef.current = null;
      lastPaintPositionRef.current = null;
      setIsCloneMode(false);
      setIsMouseDown(false);
    },
    [
      isMouseDown,
      isDraggingNotes,
      draggingSelection,
      selectedPatternCells,
      song.patterns,
      song.sequence,
      dispatch,
      dragDelta.rows,
      dragDelta.notes,
      totalAbsRows,
    ],
  );

  const previewNotes = useMemo(() => {
    if (!isDraggingNotes) {
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
        const targetAbsRow = sourceAbsRow + dragDelta.rows;

        if (targetAbsRow < 0 || targetAbsRow >= totalAbsRows) {
          return null;
        }

        const targetNote = wrapNote(sourceCell.note + dragDelta.notes);
        const targetRow = noteToRow(targetNote);

        return {
          key: `${sourceCellAddress.sequenceId}:${sourceCellAddress.rowId}:${sourceCellAddress.channelId}`,
          left: targetAbsRow * PIANO_ROLL_CELL_SIZE,
          top: targetRow * PIANO_ROLL_CELL_SIZE,
          instrument: sourceCell.instrument ?? 0,
        };
      })
      .filter((note) => note !== null);
  }, [
    dragDelta.rows,
    dragDelta.notes,
    isDraggingNotes,
    selectedPatternCells,
    song.patterns,
    song.sequence,
    totalAbsRows,
  ]);

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

  // Clipboard callbacks

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
          <PianoKeyboard
            c5Ref={c5Ref}
            hoverNote={hoverNote}
            onPlayNote={onPlayNote}
          />
          <StyledPianoRollScrollLeftFXSpacer>
            <FXIcon />
          </StyledPianoRollScrollLeftFXSpacer>
        </StyledPianoRollScrollLeftWrapper>
        <StyledPianoRollScrollContentWrapper
          ref={documentRef}
          style={{
            width: documentWidth,
            cursor: isDraggingNotes ? (isCloneMode ? "copy" : "move") : "auto",
          }}
          onContextMenu={onSelectionContextMenu}
          onMouseDown={!playing ? handleMouseDown : undefined}
        >
          <StyledPianoRollPatternsWrapper>
            {song.sequence.map((p, i) => (
              <PianoRollPatternBlock
                key={`roll_pattern_${i}:${p}`}
                patternId={p}
                sequenceId={i}
                displayChannels={displayChannels}
                isDragging={isDraggingNotes}
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
          {isDraggingNotes &&
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
