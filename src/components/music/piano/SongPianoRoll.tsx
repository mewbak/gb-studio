import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";
import { PatternCell } from "shared/lib/uge/types";
import { useAppDispatch, useAppSelector, useAppStore } from "store/hooks";
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
  StyledPianoRollScrollLeftHeaderSpacer,
  StyledPianoRollWrapper,
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
import { NO_CHANGE_ON_PASTE } from "shared/lib/uge/clipboard";
import {
  calculateDocumentWidth,
  calculatePlaybackTrackerPosition,
  interpolateGridLine,
  noteToRow,
  pageToSnappedGridPoint,
  pixelRangeToGridRange,
  pixelToGridIndex,
  rowToNote,
} from "./helpers";
import { PianoRollSequenceBar } from "./PianoRollSequenceBar";
import { Selection } from "ui/document/Selection";
import { CaretRightIcon, FXIcon, PlusIcon } from "ui/icons/Icons";
import useResizeObserver from "ui/hooks/use-resize-observer";
import l10n from "shared/lib/lang/l10n";
import {
  resolveAbsRow,
  toAbsRow,
  fromAbsRow,
} from "store/features/trackerDocument/trackerDocumentHelpers";
import renderPianoContextMenu from "components/music/contextMenus/renderPianoContextMenu";
import { useContextMenu } from "ui/hooks/use-context-menu";
import { PianoRollToolType } from "store/features/tracker/trackerState";
import { PatternCellAddress } from "shared/lib/uge/editor/types";
import { useMusicNotePreview } from "components/music/hooks/useMusicNotePreview";
import {
  BlurableDOMElement,
  DragPreviewState,
  InteractionState,
  PointerModifiers,
  SelectionRect,
  TwoFingerTapState,
} from "components/music/piano/types";
import { FixedSpacer } from "ui/spacing/Spacing";
import { wrapNote } from "shared/lib/uge/display";
import { PianoRollPlaybackController } from "./PianoRollPlaybackController";
import {
  useMusicMidiNoteSubscription,
  useMusicMidiState,
} from "components/music/midi/useMusicMidi";

const TAP_MAX_MOVEMENT = 20;
const TWO_FINGER_TAP_MAX_DURATION = 300;
const NOTE_DRAG_MARGIN_PX = 20;
const DRAG_COMMIT_TAP_MAX_MOVEMENT = 5;

const EMPTY_SELECTED_ROWS_BY_CHANNEL = new Map<number, ReadonlySet<number>>();

export const SongPianoRoll = () => {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const playPreview = useMusicNotePreview();
  const midiState = useMusicMidiState();

  // Component Interaction State

  const interactionRef = useRef<InteractionState>({
    type: "idle",
    modifiers: { addToSelection: false, clone: false },
  });

  const twoFingerTapRef = useRef<TwoFingerTapState>({ type: "idle" });

  const [dragPreviewState, setDragPreviewState] = useState<DragPreviewState>({
    type: "idle",
  });

  const [selectionRect, setSelectionRect] = useState<
    SelectionRect | undefined
  >();

  const suppressNextContextMenuRef = useRef(false);
  const lastDragPreviewCellRef = useRef<string | null>(null);
  const lastSelectAllTimeRef = useRef(0);

  const activePointersRef = useRef<
    Map<
      number,
      {
        clientX: number;
        clientY: number;
        pointerType: string;
      }
    >
  >(new Map());

  const primaryPointerIdRef = useRef<number | null>(null);

  // DOM Refs

  const documentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [wrapperEl, wrapperSize] = useResizeObserver<HTMLDivElement>();

  // Redux State

  const song = useAppSelector((state) => state.trackerDocument.present.song);
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

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const visibleChannels = useAppSelector(
    (state) => state.tracker.visibleChannels,
  );

  const tool = useAppSelector((state) => state.tracker.tool);

  const toolRef = useRef(tool);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  const documentWidth = song?.sequence
    ? calculateDocumentWidth(song.sequence.length) + 100
    : 0;
  const totalAbsRows = (song?.sequence.length ?? 0) * TRACKER_PATTERN_LENGTH;

  const playing = useAppSelector((state) => state.tracker.playing);

  const selectedSequenceId = useAppSelector((state) =>
    !playing ? state.tracker.selectedSequence : -1,
  );

  // Stable refs to access latest data within callbacks
  // without causing them to be regenerated on data changes
  const songRef = useRef(song);
  const hoverNoteRef = useRef(hoverNote);
  const hoverColumnRef = useRef(hoverColumn);
  const hoverSequenceIdRef = useRef(hoverSequenceId);
  const selectedPatternCellsRef = useRef(selectedPatternCells);
  const lastSelectedSequenceId = useRef(selectedSequenceId);
  const playingRef = useRef(playing);

  // Sync refs to contain latest data on changes
  useEffect(() => {
    songRef.current = song;
    hoverNoteRef.current = hoverNote;
    hoverColumnRef.current = hoverColumn;
    hoverSequenceIdRef.current = hoverSequenceId;
    selectedPatternCellsRef.current = selectedPatternCells;
    playingRef.current = playing;
  }, [
    song,
    hoverNote,
    hoverColumn,
    hoverSequenceId,
    selectedPatternCells,
    playing,
  ]);

  // Cached State

  const displayChannels = useMemo(
    () =>
      [
        selectedChannel,
        ...visibleChannels.filter((c) => c !== selectedChannel),
      ].reverse(),
    [selectedChannel, visibleChannels],
  );

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

  const selectedRowsBySequence = useMemo(() => {
    const next = new Map<number, Map<number, Set<number>>>();

    for (const cell of selectedPatternCells) {
      let rowsByChannel = next.get(cell.sequenceId);
      if (!rowsByChannel) {
        rowsByChannel = new Map<number, Set<number>>();
        next.set(cell.sequenceId, rowsByChannel);
      }

      let selectedRows = rowsByChannel.get(cell.channelId);
      if (!selectedRows) {
        selectedRows = new Set<number>();
        rowsByChannel.set(cell.channelId, selectedRows);
      }

      selectedRows.add(cell.rowId);
    }

    return next;
  }, [selectedPatternCells]);

  // If selected pattern cells contains any cells outside of currently
  // selected channel, filter the selection to only include channel cells
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

  // #region Helpers

  const updateActivePointer = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      activePointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      });
    },
    [],
  );

  const removeActivePointer = useCallback((pointerId: number) => {
    activePointersRef.current.delete(pointerId);

    if (primaryPointerIdRef.current === pointerId) {
      primaryPointerIdRef.current = null;
    }
  }, []);

  const getTouchPointers = useCallback(() => {
    return [...activePointersRef.current.entries()].filter(
      ([, pointer]) => pointer.pointerType === "touch",
    );
  }, []);

  const selectCellsInRange = useCallback(
    (
      selectedPatternCells: PatternCellAddress[],
      nextSelectionRect: SelectionRect,
    ) => {
      const song = songRef.current;
      if (!song) {
        return [];
      }
      const totalAbsRows = song.sequence.length * TRACKER_PATTERN_LENGTH;
      const totalNoteRows = TOTAL_NOTES;

      const { from: rangeStartAbsRow, to: rangeEndAbsRow } =
        pixelRangeToGridRange(
          nextSelectionRect.x,
          nextSelectionRect.width,
          totalAbsRows,
        );

      const { from: fromNoteRow, to: toNoteRow } = pixelRangeToGridRange(
        nextSelectionRect.y,
        nextSelectionRect.height,
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
    [selectedChannel],
  );

  const findNearbySelectedCell = useCallback(
    (clientX: number, clientY: number): PatternCellAddress | undefined => {
      if (!documentRef.current) {
        return undefined;
      }

      const rect = documentRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      const song = songRef.current;
      if (!song) {
        return undefined;
      }

      const selectedCells = selectedPatternCellsRef.current;

      for (const selectedCell of selectedCells) {
        if (selectedCell.channelId !== selectedChannel) {
          continue;
        }

        const patternId = song.sequence[selectedCell.sequenceId];
        const cell =
          song.patterns[patternId]?.[selectedCell.rowId]?.[
            selectedCell.channelId
          ];

        if (!cell || cell.note === null) {
          continue;
        }

        const absRow = toAbsRow(selectedCell.sequenceId, selectedCell.rowId);
        const left = absRow * PIANO_ROLL_CELL_SIZE;
        const top = noteToRow(cell.note) * PIANO_ROLL_CELL_SIZE;

        if (
          localX >= left - NOTE_DRAG_MARGIN_PX &&
          localX < left + PIANO_ROLL_CELL_SIZE + NOTE_DRAG_MARGIN_PX &&
          localY >= top - NOTE_DRAG_MARGIN_PX &&
          localY < top + PIANO_ROLL_CELL_SIZE + NOTE_DRAG_MARGIN_PX
        ) {
          return selectedCell;
        }
      }

      return undefined;
    },
    [selectedChannel],
  );

  const calculatePositionFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const song = songRef.current;

      if (!documentRef.current || !song) {
        return {
          noteIndex: null,
          patternRow: null,
          sequenceId: null,
        };
      }

      const rect = documentRef.current.getBoundingClientRect();
      const absRow = clamp(
        pixelToGridIndex(clientX - rect.left),
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

      const newNoteRow = pixelToGridIndex(clientY - rect.top);
      const newNote = rowToNote(newNoteRow);

      return {
        noteIndex: newNote,
        patternRow: resolved.rowId,
        sequenceId: resolved.sequenceId,
      };
    },
    [totalAbsRows],
  );

  const resetPointerPreviewState = useCallback(() => {
    setSelectionRect(undefined);
    setDragPreviewState({ type: "idle" });
    lastDragPreviewCellRef.current = null;
  }, []);

  const selectClickedCell = useCallback(
    (clickedCellAddress: PatternCellAddress, addToSelection: boolean) => {
      const selectedPatternCells = selectedPatternCellsRef.current;

      const isSelected = selectedPatternCells.some(
        (selectedCell) =>
          selectedCell.sequenceId === clickedCellAddress.sequenceId &&
          selectedCell.rowId === clickedCellAddress.rowId &&
          selectedCell.channelId === clickedCellAddress.channelId,
      );

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
      modifiers: PointerModifiers,
      pointer: {
        clientX: number;
        clientY: number;
      },
      clickPlacement?: {
        cellAddress: PatternCellAddress;
        noteIndex: number;
      },
    ) => {
      interactionRef.current = {
        type: "dragNote",
        modifiers,
        origin: {
          absRow,
          note,
        },
        startPointer: pointer,
        delta: {
          rows: 0,
          notes: 0,
        },
        clickPlacement,
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

      const song = songRef.current;
      if (!song) {
        return;
      }

      const bounds = documentRef.current.getBoundingClientRect();

      const { x, y } = pageToSnappedGridPoint(
        pageX,
        pageY,
        bounds,
        song.sequence.length,
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
        type: "selectionBox",
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
    [dispatch, selectCellsInRange],
  );

  const tryBeginNearbySelectedDrag = useCallback(
    (
      clickedCellAddress: PatternCellAddress,
      noteIndex: number,
      modifiers: PointerModifiers,
      clientX: number,
      clientY: number,
    ) => {
      const nearbySelectedCell = findNearbySelectedCell(clientX, clientY);

      if (!nearbySelectedCell) {
        return false;
      }

      const song = songRef.current;
      if (!song) {
        return false;
      }

      const nearbyPatternId = song.sequence[nearbySelectedCell.sequenceId];
      const nearbyCell =
        song.patterns[nearbyPatternId]?.[nearbySelectedCell.rowId]?.[
          nearbySelectedCell.channelId
        ];

      if (nearbyCell?.note === null || nearbyCell?.note === undefined) {
        return false;
      }

      beginDragNoteInteraction(
        toAbsRow(nearbySelectedCell.sequenceId, nearbySelectedCell.rowId),
        nearbyCell.note,
        modifiers,
        { clientX, clientY },
        {
          cellAddress: clickedCellAddress,
          noteIndex,
        },
      );

      return true;
    },
    [beginDragNoteInteraction, findNearbySelectedCell],
  );

  const commitPastedPatternAt = useCallback(
    (sequenceId: number, patternRow: number, noteIndex: number) => {
      if (!pastedPattern) {
        return;
      }

      dispatch(
        trackerDocumentActions.commitPastedAbsoluteCells({
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

  const commitPlacedNote = useCallback(
    (
      args: {
        cellAddress: PatternCellAddress;
        noteIndex: number;
      },
      options?: {
        preview: boolean;
        select: boolean;
      },
    ) => {
      const { cellAddress, noteIndex } = args;
      const { sequenceId, rowId, channelId } = cellAddress;
      const shouldPreview = options?.preview ?? true;
      const shouldSelect = options?.select ?? true;

      const patternId = songRef.current?.sequence[sequenceId];

      if (patternId === undefined) {
        return;
      }

      dispatch(
        trackerDocumentActions.editPatternCell({
          patternId,
          cell: [rowId, channelId],
          changes: {
            instrument: selectedInstrumentId,
            note: noteIndex,
          },
        }),
      );

      const currentPattern = songRef.current?.patterns[patternId];
      const currentCell = currentPattern?.[rowId]?.[channelId];

      if (shouldPreview) {
        playPreview({
          note: noteIndex,
          instrumentId: selectedInstrumentId,
          effectCode: currentCell?.effectcode ?? 0,
          effectParam: currentCell?.effectparam ?? 0,
        });
      }

      if (shouldSelect) {
        dispatch(trackerActions.setSelectedPatternCells([cellAddress]));
      }
    },
    [dispatch, playPreview, selectedInstrumentId],
  );

  const tryBeginExistingOrNearbyNoteDrag = useCallback(
    (args: {
      cell: PatternCell;
      noteIndex: number;
      sequenceId: number;
      patternRow: number;
      modifiers: PointerModifiers;
      clientX: number;
      clientY: number;
      addToSelection: boolean;
    }) => {
      const {
        cell,
        noteIndex,
        sequenceId,
        patternRow,
        modifiers,
        clientX,
        clientY,
        addToSelection,
      } = args;

      const absRow = toAbsRow(sequenceId, patternRow);

      const clickedCellAddress: PatternCellAddress = {
        sequenceId,
        rowId: patternRow,
        channelId: selectedChannel,
      };

      if (cell.note === noteIndex) {
        selectClickedCell(clickedCellAddress, addToSelection);

        beginDragNoteInteraction(absRow, cell.note, modifiers, {
          clientX,
          clientY,
        });

        return true;
      }

      const startedNearbyDrag = tryBeginNearbySelectedDrag(
        clickedCellAddress,
        noteIndex,
        modifiers,
        clientX,
        clientY,
      );

      return startedNearbyDrag;
    },
    [
      beginDragNoteInteraction,
      selectClickedCell,
      selectedChannel,
      tryBeginNearbySelectedDrag,
    ],
  );

  const stopTouch = useCallback(
    (e: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
      const isTouch = e.pointerType === "touch";
      if (isTouch) {
        e.preventDefault();
      }
    },
    [],
  );

  // #endregion Helpers

  // #region Action Handlers

  const updatePianoHover = useCallback(
    (
      noteIndex: number,
      location?: {
        rowId: number | null;
        sequenceId: number | null;
      },
    ) => {
      dispatch(
        trackerActions.setHover({
          note: noteIndex,
          column: location?.rowId ?? hoverColumnRef.current,
          sequenceId: location?.sequenceId ?? hoverSequenceIdRef.current,
        }),
      );
    },
    [dispatch],
  );

  const recordMidiNoteAtPlayhead = useCallback(
    (noteIndex: number) => {
      const currentSong = songRef.current;
      if (!currentSong) {
        return false;
      }

      const state = store.getState();
      const playbackPosition = state.tracker.playbackPosition;

      const targetPosition = {
        sequenceId: playbackPosition[0],
        rowId: playbackPosition[1],
      };

      const cellAddress: PatternCellAddress = {
        sequenceId: playbackPosition[0],
        rowId: playbackPosition[1],
        channelId: selectedChannel,
      };

      commitPlacedNote(
        {
          cellAddress,
          noteIndex,
        },
        {
          preview: true,
          select: false,
        },
      );
      updatePianoHover(noteIndex, targetPosition);
      return true;
    },
    [commitPlacedNote, selectedChannel, store, updatePianoHover],
  );

  const transposeSelectedPianoNote = useCallback(
    (noteIndex: number) => {
      if (selectedPatternCellsRef.current.length !== 1) {
        return;
      }

      dispatch(
        trackerDocumentActions.editPatternCells({
          patternCells: selectedPatternCellsRef.current,
          changes: {
            note: noteIndex,
          },
        }),
      );
    },
    [dispatch],
  );

  const onPianoNote = useCallback(
    (noteIndex: number) => {
      playPreview({
        note: noteIndex,
        instrumentId: selectedInstrumentId,
      });
      if (!playingRef.current) {
        transposeSelectedPianoNote(noteIndex);
      }
      updatePianoHover(noteIndex);
    },
    [
      playPreview,
      selectedInstrumentId,
      transposeSelectedPianoNote,
      updatePianoHover,
    ],
  );

  const onMidiPianoNote = useCallback(
    (noteIndex: number) => {
      playPreview({
        note: noteIndex,
        instrumentId: selectedInstrumentId,
      });

      if (playingRef.current) {
        if (midiState.recordingEnabled) {
          recordMidiNoteAtPlayhead(noteIndex);
        }
        updatePianoHover(noteIndex);
        return;
      }
      if (midiState.recordingEnabled) {
        transposeSelectedPianoNote(noteIndex);
      }
      updatePianoHover(noteIndex);
    },
    [
      midiState.recordingEnabled,
      playPreview,
      recordMidiNoteAtPlayhead,
      selectedInstrumentId,
      transposeSelectedPianoNote,
      updatePianoHover,
    ],
  );

  useMusicMidiNoteSubscription(onMidiPianoNote);

  const cycleSelectedTool = useCallback(() => {
    let nextTool: PianoRollToolType = "pencil";
    if (toolRef.current === "pencil") {
      nextTool = "eraser";
    } else if (toolRef.current === "eraser") {
      nextTool = "selection";
    }
    dispatch(trackerActions.setTool(nextTool));
  }, [dispatch]);

  const onAddSequence = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(
        trackerDocumentActions.insertSequence({
          sequenceIndex: songRef.current?.sequence.length ?? 0,
          position: "after",
        }),
      );
    },
    [dispatch],
  );

  const onJumpToSongStart = useCallback(() => {
    dispatch(trackerActions.setDefaultStartPlaybackPosition([0, 0]));
    API.music.sendToMusicWindow({
      action: "position",
      position: [0, 0],
    });
  }, [dispatch]);

  // #endregion Action Handlers

  // #region SelectAll Event Handlers

  const onSelectAll = useCallback(() => {
    window.getSelection()?.empty();

    if (lastSelectAllTimeRef.current + 100 > Date.now()) {
      return;
    }
    lastSelectAllTimeRef.current = Date.now();

    const song = songRef.current;
    if (!song) {
      return;
    }

    const sequenceId = lastSelectedSequenceId.current;
    const selectedPatternCells = selectedPatternCellsRef.current;

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
  }, [dispatch, selectedChannel]);

  // Attach selectAll listeners
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

  // #endregion SelectAll Event Handlers

  // #region Keyboard Event Handlers

  // Keyboard listeners
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (playingRef.current) {
        return;
      }

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

  // Attach keyboard listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // #endregion Keyboard Event Handlers

  // #region Clipboard Event Handlers

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      dispatch(
        trackerDocumentActions.copyAbsoluteCells({
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
        trackerDocumentActions.cutAbsoluteCells({
          patternCells: selectedPatternCellsRef.current,
        }),
      );
    },
    [dispatch],
  );

  const onPaste = useCallback(() => {
    dispatch(trackerActions.pasteAbsoluteCells());
  }, [dispatch]);

  const onPasteInPlace = useCallback(() => {
    void dispatch(
      trackerDocumentActions.pasteInPlace({
        channelId: selectedChannel,
      }),
    );
  }, [dispatch, selectedChannel]);

  // Attach clipboard listeners
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

  // #endregion Clipboard Event Handlers

  // #region Tap Gestures

  const resetTwoFingerTapGesture = useCallback(() => {
    twoFingerTapRef.current = { type: "idle" };
  }, []);

  const handleTwoFingerGestureStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): boolean => {
      if (e.pointerType !== "touch") {
        return false;
      }

      const touchPointers = getTouchPointers();

      if (touchPointers.length === 2) {
        const [, touchA] = touchPointers[0];
        const [, touchB] = touchPointers[1];

        const midpointX = (touchA.clientX + touchB.clientX) * 0.5;
        const midpointY = (touchA.clientY + touchB.clientY) * 0.5;

        const previousGesture = twoFingerTapRef.current;
        const firstTouchMovedTooFar =
          previousGesture.type === "init"
            ? previousGesture.movedTooFar ||
              Math.hypot(
                touchA.clientX - previousGesture.startX,
                touchA.clientY - previousGesture.startY,
              ) > TAP_MAX_MOVEMENT
            : true;

        twoFingerTapRef.current = {
          type: "tracking",
          startedAt:
            previousGesture.type === "init"
              ? previousGesture.startedAt
              : Date.now(),
          startMidpointX: midpointX,
          startMidpointY: midpointY,
          movedTooFar: firstTouchMovedTooFar,
        };

        if (!firstTouchMovedTooFar) {
          primaryPointerIdRef.current = null;
          interactionRef.current = {
            type: "idle",
            modifiers: interactionRef.current.modifiers,
          };

          resetPointerPreviewState();
        }

        e.preventDefault();
        return true;
      }

      if (touchPointers.length === 1) {
        if (twoFingerTapRef.current.type === "idle") {
          const [, touchA] = touchPointers[0];

          twoFingerTapRef.current = {
            type: "init",
            startedAt: Date.now(),
            startX: touchA.clientX,
            startY: touchA.clientY,
            movedTooFar: false,
          };
        }

        return false;
      }

      resetTwoFingerTapGesture();
      return false;
    },
    [getTouchPointers, resetPointerPreviewState, resetTwoFingerTapGesture],
  );

  const handleTwoFingerGestureMove = useCallback(
    (e: PointerEvent): boolean => {
      if (e.pointerType !== "touch") {
        return false;
      }

      const gesture = twoFingerTapRef.current;

      if (gesture.type === "init") {
        const distance = Math.hypot(
          e.clientX - gesture.startX,
          e.clientY - gesture.startY,
        );

        if (distance > TAP_MAX_MOVEMENT) {
          twoFingerTapRef.current = {
            ...gesture,
            movedTooFar: true,
          };
        }

        return false;
      }

      if (gesture.type === "tracking") {
        const touchPointers = getTouchPointers();

        if (touchPointers.length !== 2) {
          twoFingerTapRef.current = {
            ...gesture,
            movedTooFar: true,
          };
          return true;
        }

        const [, touchA] = touchPointers[0];
        const [, touchB] = touchPointers[1];

        const midpointX = (touchA.clientX + touchB.clientX) * 0.5;
        const midpointY = (touchA.clientY + touchB.clientY) * 0.5;

        const deltaX = midpointX - gesture.startMidpointX;
        const deltaY = midpointY - gesture.startMidpointY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > TAP_MAX_MOVEMENT) {
          twoFingerTapRef.current = {
            ...gesture,
            movedTooFar: true,
          };
        }

        return true;
      }

      return false;
    },
    [getTouchPointers],
  );

  const handleTwoFingerGestureEnd = useCallback(
    (e: PointerEvent): boolean => {
      const gesture = twoFingerTapRef.current;

      if (gesture.type !== "tracking") {
        return false;
      }

      const remainingTouchCount = getTouchPointers().filter(
        ([pointerId]) => pointerId !== e.pointerId,
      ).length;

      const duration = Date.now() - gesture.startedAt;
      const isTwoFingerTap =
        !gesture.movedTooFar &&
        duration <= TWO_FINGER_TAP_MAX_DURATION &&
        remainingTouchCount < 2;

      resetTwoFingerTapGesture();
      removeActivePointer(e.pointerId);

      if (isTwoFingerTap) {
        cycleSelectedTool();
      }

      return true;
    },
    [
      cycleSelectedTool,
      getTouchPointers,
      removeActivePointer,
      resetTwoFingerTapGesture,
    ],
  );

  // #endregion Tap Gestures

  // #region Pointer Event Handlers

  const handlePencilStart = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      ctx: {
        cell: PatternCell;
        noteIndex: number;
        patternRow: number;
        patternId: number;
        sequenceId: number;
        modifiers: PointerModifiers;
      },
    ) => {
      const { cell, noteIndex, patternId, patternRow, sequenceId, modifiers } =
        ctx;

      const isTouch = e.pointerType === "touch";
      const selectedPatternCells = selectedPatternCellsRef.current;
      const absRow = toAbsRow(sequenceId, patternRow);

      const clickedCellAddress: PatternCellAddress = {
        sequenceId,
        rowId: patternRow,
        channelId: selectedChannel,
      };

      const startedDrag = tryBeginExistingOrNearbyNoteDrag({
        cell,
        noteIndex,
        sequenceId,
        patternRow,
        modifiers,
        clientX: e.clientX,
        clientY: e.clientY,
        addToSelection: false,
      });

      if (startedDrag) {
        stopTouch(e);
        return;
      }

      if (cell.note !== noteIndex && selectedPatternCells.length > 1) {
        dispatch(trackerActions.setSelectedPatternCells([]));
        interactionRef.current = {
          type: "idle",
          modifiers,
        };
        resetPointerPreviewState();
        return;
      }

      if (isTouch) {
        interactionRef.current = {
          type: "pendingNote",
          modifiers,
          startPoint: {
            x: e.clientX,
            y: e.clientY,
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
        stopTouch(e);
        return;
      }

      commitPlacedNote({
        cellAddress: clickedCellAddress,
        noteIndex,
      });

      interactionRef.current = {
        type: "paint",
        modifiers,
        lastPaintPosition: {
          absRow,
          note: noteIndex,
        },
      };

      setDragPreviewState({ type: "idle" });
      lastDragPreviewCellRef.current = `${absRow}:${noteIndex}`;
    },
    [
      dispatch,
      selectedChannel,
      tryBeginExistingOrNearbyNoteDrag,
      commitPlacedNote,
      stopTouch,
      resetPointerPreviewState,
    ],
  );

  const handleEraserStart = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      ctx: {
        cell: PatternCell;
        noteIndex: number;
        patternRow: number;
        patternId: number;
        sequenceId: number;
        modifiers: PointerModifiers;
      },
    ) => {
      const { cell, noteIndex, patternId, sequenceId, patternRow, modifiers } =
        ctx;
      const isTouch = e.pointerType === "touch";

      const absRow = toAbsRow(sequenceId, patternRow);

      const clickedCellAddress: PatternCellAddress = {
        sequenceId,
        rowId: patternRow,
        channelId: selectedChannel,
      };

      if (cell.note === noteIndex) {
        if (!isTouch) {
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

        dispatch(trackerActions.setSelectedPatternCells([clickedCellAddress]));
      }

      interactionRef.current = {
        type: "erase",
        modifiers,
        lastPaintPosition: {
          absRow,
          note: noteIndex,
        },
      };

      setDragPreviewState({ type: "idle" });
      lastDragPreviewCellRef.current = null;
      stopTouch(e);
      return;
    },
    [dispatch, selectedChannel, stopTouch],
  );

  const handleSelectionStart = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      ctx: {
        cell: PatternCell;
        noteIndex: number;
        patternRow: number;
        sequenceId: number;
        modifiers: PointerModifiers;
      },
    ) => {
      const { cell, noteIndex, patternRow, sequenceId, modifiers } = ctx;
      const selectedPatternCells = selectedPatternCellsRef.current;

      const startedDrag = tryBeginExistingOrNearbyNoteDrag({
        cell,
        noteIndex,
        sequenceId,
        patternRow,
        modifiers,
        clientX: e.clientX,
        clientY: e.clientY,
        addToSelection: modifiers.addToSelection,
      });

      if (startedDrag) {
        stopTouch(e);
        return;
      }

      beginSelectionBoxInteraction(
        e.pageX,
        e.pageY,
        modifiers,
        selectedPatternCells,
      );

      stopTouch(e);
    },
    [beginSelectionBoxInteraction, stopTouch, tryBeginExistingOrNearbyNoteDrag],
  );

  const handlePendingNoteMove = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "pendingNote" }>,
    ) => {
      const movedDistance = Math.hypot(
        e.clientX - interaction.startPoint.x,
        e.clientY - interaction.startPoint.y,
      );

      if (movedDistance > TAP_MAX_MOVEMENT) {
        interactionRef.current = {
          type: "idle",
          modifiers: interaction.modifiers,
        };
      }

      e.preventDefault();
    },
    [],
  );

  const handleDragNoteMove = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "dragNote" }>,
      ctx: {
        noteIndex: number;
        patternRow: number;
        sequenceId: number;
        modifiers: PointerModifiers;
      },
    ) => {
      if (selectedPatternCellsRef.current.length === 0) {
        stopTouch(e);
        return;
      }

      const { noteIndex, sequenceId, patternRow, modifiers } = ctx;

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
          clone: modifiers.clone,
          delta: nextDragDelta,
        });

        const previewCellId = `${absRow}:${noteIndex}`;

        const { sequenceId: originSequenceId, rowId: originRowId } = fromAbsRow(
          interaction.origin.absRow,
        );

        dispatch(
          trackerActions.setHover({
            note: noteIndex,
            column: patternRow,
            sequenceId,
          }),
        );

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

      stopTouch(e);
    },
    [dispatch, playPreview, selectedChannel, stopTouch],
  );

  const handlePaintNoteMove = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "paint" }>,
      ctx: {
        noteIndex: number;
        patternRow: number;
        sequenceId: number;
      },
    ) => {
      const { noteIndex, sequenceId, patternRow } = ctx;

      const song = songRef.current;
      if (!song) {
        return;
      }

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
          trackerDocumentActions.paintAbsoluteCells({
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

      stopTouch(e);
    },
    [dispatch, playPreview, selectedChannel, selectedInstrumentId, stopTouch],
  );

  const handleEraserMove = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "erase" }>,
      ctx: {
        noteIndex: number;
        patternRow: number;
        sequenceId: number;
      },
    ) => {
      const { noteIndex, sequenceId, patternRow } = ctx;

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
          trackerDocumentActions.eraseAbsoluteCells({
            cells: cellsToErase,
            channelId: selectedChannel,
          }),
        );
      }

      stopTouch(e);
    },
    [dispatch, selectedChannel, stopTouch],
  );

  const handleSelectionMove = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "selectionBox" }>,
    ) => {
      if (!documentRef.current) {
        stopTouch(e);
        return;
      }

      const song = songRef.current;
      if (!song) {
        return;
      }

      const bounds = documentRef.current.getBoundingClientRect();
      const { x: x2, y: y2 } = pageToSnappedGridPoint(
        e.pageX,
        e.pageY,
        bounds,
        song.sequence.length,
      );

      const x = Math.min(interaction.box.origin.x, x2);
      const y = Math.min(interaction.box.origin.y, y2);
      const width = Math.max(
        PIANO_ROLL_CELL_SIZE,
        Math.abs(interaction.box.origin.x - x2) + PIANO_ROLL_CELL_SIZE,
      );
      const height = Math.max(
        PIANO_ROLL_CELL_SIZE,
        Math.abs(interaction.box.origin.y - y2) + PIANO_ROLL_CELL_SIZE,
      );

      const nextSelectionRect = { x, y, width, height };

      // Selection box has changed from previous call
      // so update selected cells
      if (
        nextSelectionRect.x !== interaction.box.rect.x ||
        nextSelectionRect.y !== interaction.box.rect.y ||
        nextSelectionRect.width !== interaction.box.rect.width ||
        nextSelectionRect.height !== interaction.box.rect.height
      ) {
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

      stopTouch(e);
    },
    [dispatch, selectCellsInRange, stopTouch],
  );

  const handleDragNoteEnd = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "dragNote" }>,
    ) => {
      const selectedPatternCells = selectedPatternCellsRef.current;

      const hasGridMoved =
        interaction.delta.rows !== 0 || interaction.delta.notes !== 0;

      const hasPointerMoved =
        Math.hypot(
          e.clientX - interaction.startPointer.clientX,
          e.clientY - interaction.startPointer.clientY,
        ) > DRAG_COMMIT_TAP_MAX_MOVEMENT;

      const startedFromNearbyHit = interaction.clickPlacement !== undefined;

      const shouldMove = startedFromNearbyHit
        ? hasGridMoved && hasPointerMoved
        : hasGridMoved;

      const shouldPlaceFallbackNote =
        interaction.clickPlacement !== undefined &&
        toolRef.current !== "selection" &&
        !hasPointerMoved;

      if (shouldMove && selectedPatternCells.length > 0) {
        dispatch(
          trackerDocumentActions.moveAbsoluteCells({
            patternCells: selectedPatternCells,
            rowDelta: interaction.delta.rows,
            noteDelta: interaction.delta.notes,
            clone: interaction.modifiers.clone,
          }),
        );
      } else if (shouldPlaceFallbackNote && interaction.clickPlacement) {
        commitPlacedNote(interaction.clickPlacement);
      }
    },
    [commitPlacedNote, dispatch],
  );

  const handlePendingNoteEnd = useCallback(
    (
      e: PointerEvent,
      interaction: Extract<InteractionState, { type: "pendingNote" }>,
    ) => {
      const pending = interaction.pending;

      commitPlacedNote({
        cellAddress: pending.clickedCellAddress,
        noteIndex: pending.noteIndex,
      });

      lastDragPreviewCellRef.current = `${pending.absRow}:${pending.noteIndex}`;

      interactionRef.current = {
        type: "idle",
        modifiers: interaction.modifiers,
      };

      removeActivePointer(e.pointerId);
    },
    [commitPlacedNote, removeActivePointer],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      suppressNextContextMenuRef.current = false;
      updateActivePointer(e);

      const isMouse = e.pointerType === "mouse";
      const tool = toolRef.current;

      if (handleTwoFingerGestureStart(e)) {
        return;
      }

      if (primaryPointerIdRef.current !== null) {
        return;
      }

      primaryPointerIdRef.current = e.pointerId;

      if (e.currentTarget.hasPointerCapture?.(e.pointerId) === false) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      const modifiers: PointerModifiers = {
        addToSelection: e.shiftKey,
        clone: e.altKey,
      };

      const isPrimaryAction = e.button === 0 || !isMouse;

      interactionRef.current = {
        ...interactionRef.current,
        modifiers,
      };

      const song = songRef.current;
      if (!song) {
        stopTouch(e);
        return;
      }

      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromClientPoint(e.clientX, e.clientY);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        stopTouch(e);
        return;
      }

      dispatch(
        trackerActions.setHover({
          note: noteIndex,
          column: patternRow,
          sequenceId,
        }),
      );

      const patternId = song.sequence[sequenceId];
      const cell = song.patterns[patternId][patternRow][selectedChannel];

      if (!cell) {
        return;
      }

      if (pastedPattern) {
        commitPastedPatternAt(sequenceId, patternRow, noteIndex);
        stopTouch(e);
        return;
      }

      if (tool === "pencil" && isPrimaryAction) {
        handlePencilStart(e, {
          cell,
          noteIndex,
          patternRow,
          patternId,
          sequenceId,
          modifiers,
        });
        return;
      }

      if ((toolRef.current === "eraser" && isPrimaryAction) || e.button === 2) {
        handleEraserStart(e, {
          cell,
          noteIndex,
          patternRow,
          patternId,
          sequenceId,
          modifiers,
        });
        return;
      }

      if (tool === "selection" && isPrimaryAction) {
        handleSelectionStart(e, {
          cell,
          noteIndex,
          patternRow,
          sequenceId,
          modifiers,
        });
        return;
      }
    },
    [
      calculatePositionFromClientPoint,
      commitPastedPatternAt,
      dispatch,
      handleEraserStart,
      handlePencilStart,
      handleSelectionStart,
      handleTwoFingerGestureStart,
      pastedPattern,
      selectedChannel,
      stopTouch,
      updateActivePointer,
    ],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (playingRef.current) {
        return;
      }

      updateActivePointer(e);

      if (handleTwoFingerGestureMove(e)) {
        return;
      }

      const isTouch = e.pointerType === "touch";
      const interaction = interactionRef.current;

      if (
        primaryPointerIdRef.current !== e.pointerId &&
        !(e.pointerType === "mouse" && interaction.type === "idle")
      ) {
        return;
      }

      if (interaction.type === "pendingNote") {
        handlePendingNoteMove(e, interaction);
        return;
      }

      const modifiers: PointerModifiers = {
        addToSelection: e.shiftKey,
        clone: e.altKey,
      };

      interactionRef.current = {
        ...interactionRef.current,
        modifiers,
      };

      const { noteIndex, patternRow, sequenceId } =
        calculatePositionFromClientPoint(e.clientX, e.clientY);

      if (noteIndex === null || patternRow === null || sequenceId === null) {
        return;
      }

      if (
        !isTouch &&
        (noteIndex !== hoverNoteRef.current ||
          patternRow !== hoverColumnRef.current ||
          sequenceId !== hoverSequenceIdRef.current)
      ) {
        if (scrollRef.current) {
          const rect = scrollRef.current.getBoundingClientRect();
          if (
            e.clientX > rect.left &&
            e.clientX < rect.right &&
            e.clientY > rect.top &&
            e.clientY < rect.bottom
          ) {
            dispatch(
              trackerActions.setHover({
                note: noteIndex,
                column: patternRow,
                sequenceId,
              }),
            );
          }
        }
      }

      if (pastedPattern) {
        stopTouch(e);
        return;
      }

      const song = songRef.current;
      if (!song) {
        return;
      }

      if (interaction.type === "dragNote") {
        handleDragNoteMove(e, interaction, {
          noteIndex,
          sequenceId,
          patternRow,
          modifiers,
        });
      } else if (interaction.type === "paint") {
        handlePaintNoteMove(e, interaction, {
          noteIndex,
          sequenceId,
          patternRow,
        });
      } else if (interaction.type === "erase") {
        handleEraserMove(e, interaction, {
          noteIndex,
          sequenceId,
          patternRow,
        });
      } else if (interaction.type === "selectionBox") {
        handleSelectionMove(e, interaction);
      }
    },
    [
      updateActivePointer,
      handleTwoFingerGestureMove,
      calculatePositionFromClientPoint,
      pastedPattern,
      handlePendingNoteMove,
      dispatch,
      stopTouch,
      handleDragNoteMove,
      handlePaintNoteMove,
      handleEraserMove,
      handleSelectionMove,
    ],
  );

  const onPointerEnd = useCallback(
    (e: PointerEvent) => {
      const interaction = interactionRef.current;
      const song = songRef.current;

      try {
        if (!song) {
          return;
        }

        if (interaction.type === "dragNote") {
          handleDragNoteEnd(e, interaction);
          return;
        }

        if (
          interaction.type === "selectionBox" ||
          interaction.type === "paint" ||
          interaction.type === "erase"
        ) {
          return;
        }
      } finally {
        // Reset pointer interaction state
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
      }
    },
    [handleDragNoteEnd],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (handleTwoFingerGestureEnd(e)) {
        return;
      }

      if (primaryPointerIdRef.current !== e.pointerId) {
        removeActivePointer(e.pointerId);
        return;
      }

      const interaction = interactionRef.current;

      if (interaction.type === "pendingNote") {
        handlePendingNoteEnd(e, interaction);
        return;
      }

      onPointerEnd(e);
      removeActivePointer(e.pointerId);
    },
    [
      handlePendingNoteEnd,
      handleTwoFingerGestureEnd,
      onPointerEnd,
      removeActivePointer,
    ],
  );

  const onPointerCancel = useCallback(
    (e: PointerEvent) => {
      resetTwoFingerTapGesture();

      if (primaryPointerIdRef.current === e.pointerId) {
        onPointerEnd(e);
      }

      removeActivePointer(e.pointerId);
    },
    [onPointerEnd, removeActivePointer, resetTwoFingerTapGesture],
  );

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onPointerUp, {
      passive: false,
    });
    window.addEventListener("pointercancel", onPointerCancel, {
      passive: false,
    });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [onPointerMove, onPointerUp, onPointerCancel]);

  // #endregion Pointer Events

  // #region Context Menu

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

  // #endregion Context Menu

  // #region Scroll Handling Effects

  // Scroll to center view on C5 on document load
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

  // Scroll to playhead while song is playing
  // On sequenceId change, smoothly scroll
  // to newly selected pattern
  useEffect(() => {
    if (
      !playing &&
      lastSelectedSequenceId.current !== -1 &&
      selectedSequenceId !== lastSelectedSequenceId.current &&
      scrollRef.current
    ) {
      const rect = scrollRef.current.getBoundingClientRect();
      const halfWidth = rect.width * 0.5;
      const patternWidth = TRACKER_PATTERN_LENGTH * PIANO_ROLL_CELL_SIZE;
      const patternX = calculatePlaybackTrackerPosition(selectedSequenceId, 0);
      const scrollLeft =
        rect.width < patternWidth
          ? patternX
          : patternX - halfWidth + patternWidth * 0.5;

      scrollRef.current.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
    lastSelectedSequenceId.current = selectedSequenceId;
  }, [selectedSequenceId, playing]);

  // #endregion Scroll Handling Effects

  const onScrollWrapperRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      setScrollElement(node);
      wrapperEl.current = node;
    },
    [wrapperEl],
  );

  return (
    <StyledPianoRollWrapper>
      <StyledPianoRollScrollWrapper ref={onScrollWrapperRef}>
        <StyledPianoRollScrollCanvas>
          <div style={{ minWidth: PIANO_ROLL_PIANO_WIDTH + documentWidth }}>
            <PianoRollSequenceBar>
              <PianoRollPlaybackController
                scrollElement={scrollElement}
                sequenceLength={song?.sequence.length ?? 0}
              />
            </PianoRollSequenceBar>
            <StyledPianoRollScrollLeftWrapper>
              <StyledPianoRollScrollLeftHeaderSpacer
                onClick={onJumpToSongStart}
              />
              <PianoKeyboard hoverNote={hoverNote} onPlayNote={onPianoNote} />
              <StyledPianoRollScrollLeftFXSpacer>
                <FXIcon />
                <FixedSpacer width={5} />
                <CaretRightIcon />
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
              onPointerDown={!playing ? onPointerDown : undefined}
            >
              <StyledPianoRollPatternsWrapper>
                {song?.sequence.map((p, i) => (
                  <PianoRollPatternBlock
                    key={`roll_pattern_${i}:${p}`}
                    pattern={song.patterns[p] ?? []}
                    sequenceId={i}
                    displayChannels={displayChannels}
                    isDragging={dragPreviewState.type === "dragging"}
                    playing={playing}
                    selectedChannel={selectedChannel}
                    hoverColumn={hoverColumn}
                    hoverNote={hoverNote}
                    hoverSequence={hoverSequenceId}
                    selectedRowsByChannel={
                      selectedRowsBySequence.get(i) ??
                      EMPTY_SELECTED_ROWS_BY_CHANNEL
                    }
                  />
                ))}
              </StyledPianoRollPatternsWrapper>
              <StyledAddPatternWrapper
                onPointerDown={(e) => {
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
              {song?.sequence.map((p, i) => (
                <PianoRollEffectRow
                  key={`roll_pattern_effects_${i}:${p}`}
                  patternId={p}
                  sequenceId={i}
                  channelId={selectedChannel}
                />
              ))}
            </StyledPianoRollScrollBottomWrapper>
          </div>
        </StyledPianoRollScrollCanvas>
        {selectionContextMenuElement}
      </StyledPianoRollScrollWrapper>
    </StyledPianoRollWrapper>
  );
};
