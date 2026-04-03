import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { Song, PatternCell } from "shared/lib/uge/types";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { getKeys } from "renderer/lib/keybindings/keyBindings";
import trackerActions from "store/features/tracker/trackerActions";
import API from "renderer/lib/api";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { useAppDispatch, useAppSelector } from "store/hooks";
import {
  StyledTrackerWrapper,
  StyledTrackerScrollWrapper,
  StyledTrackerScrollCanvas,
  StyledAddPatternWrapper,
  StyledAddPatternButton,
} from "./style";
import {
  buildSelectionRect,
  fieldToPosition,
  getFieldColumnFocus,
  getSelectedTrackerFields,
  normalizeFieldIndex,
  Position,
  SelectionRect,
  TRACKER_CELL_HEIGHT,
  TRACKER_HEADER_HEIGHT,
  TRACKER_INDEX_WIDTH,
  trackerFieldsToPatternCells,
} from "./helpers";
import renderTrackerContextMenu from "components/music/contextMenus/renderTrackerContextMenu";
import {
  OCTAVE_SIZE,
  TRACKER_CHANNEL_FIELDS,
  TRACKER_ROW_SIZE,
  TRACKER_PATTERN_LENGTH,
  TRACKER_UNDO,
  TRACKER_REDO,
} from "consts";
import { useContextMenu } from "ui/hooks/use-context-menu";
import {
  copyTrackerFields,
  cutTrackerFields,
  pasteTrackerFields,
} from "store/features/trackerDocument/trackerDocumentState";
import { PatternCellAddress } from "shared/lib/uge/editor/types";
import { toValidChannelId } from "shared/lib/uge/editor/helpers";
import { useMusicNotePreview } from "components/music/hooks/useMusicNotePreview";
import {
  TrackerKeyboard,
  VirtualTrackerKey,
} from "components/music/tracker/TrackerKeyboard";
import { SongTrackerPattern } from "components/music/tracker/SongTrackerPattern";
import l10n from "shared/lib/lang/l10n";
import { PlusIcon } from "ui/icons/Icons";

interface SongTrackerProps {
  sequenceId: number;
  song: Song | null;
}

type TrackerInput =
  | { type: "keyboard"; code: string }
  | { type: "hex"; value: number | null };

type TrackerSelectionOrigin = Position & { sequenceId: number };

const PATTERN_FIELD_COUNT = TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE;

const getSequenceIdFromGlobalField = (field: number) =>
  Math.floor(field / PATTERN_FIELD_COUNT);

const getLocalFieldFromGlobalField = (field: number) =>
  field % PATTERN_FIELD_COUNT;

const getGlobalField = (sequenceId: number, localField: number) =>
  sequenceId * PATTERN_FIELD_COUNT + localField;

const getPatternIdAtSequence = (song: Song | null, sequenceId: number) =>
  song?.sequence[sequenceId] ?? 0;

export const SongTracker = ({ song, sequenceId }: SongTrackerProps) => {
  const dispatch = useAppDispatch();
  const playPreview = useMusicNotePreview();

  // #region Redux State

  const playing = useAppSelector((state) => state.tracker.playing);
  const editStep = useAppSelector((state) => state.tracker.editStep);
  const channelStatus = useAppSelector((state) => state.tracker.channelStatus);
  const octaveOffset = useAppSelector((state) => state.tracker.octaveOffset);
  const startPlaybackPosition = useAppSelector(
    (state) => state.tracker.startPlaybackPosition,
  );
  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );
  const channelId = useAppSelector((state) => state.tracker.selectedChannel);
  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );
  const showVirtualKeyboard = useAppSelector(
    (state) => state.tracker.showVirtualKeyboard,
  );
  const defaultStartPlaybackPosition = useAppSelector(
    (state) => state.tracker.defaultStartPlaybackPosition,
  );

  // #endregion Redux State

  // #region DOM Refs

  const tableRef = useRef<HTMLTableSectionElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeFieldRef = useRef<HTMLSpanElement>(null);

  // #endregion DOM Refs

  // #region Component State

  const [selectionOrigin, setSelectionOriginState] = useState<
    TrackerSelectionOrigin | undefined
  >();
  const [selectionRect, setSelectionRectState] = useState<
    SelectionRect | undefined
  >();

  const [activeField, setActiveFieldState] = useState<number | undefined>();
  const [playbackState, setPlaybackState] = useState<[number, number]>([0, 0]);

  // #endregion Component State

  // #region Derived State

  const activeSequenceId =
    activeField !== undefined
      ? getSequenceIdFromGlobalField(activeField)
      : sequenceId;

  const patternId = getPatternIdAtSequence(song, activeSequenceId);
  const pattern = song?.patterns[patternId];

  const currentFocus = useMemo(
    () =>
      getFieldColumnFocus(
        activeField !== undefined
          ? getLocalFieldFromGlobalField(activeField)
          : 0,
      ),
    [activeField],
  );

  const selectedTrackerFields = useMemo(() => {
    if (!selectionOrigin) {
      return [];
    }

    return getSelectedTrackerFields(selectionRect, {
      x: selectionOrigin.x,
      y: selectionOrigin.y,
    });
  }, [selectionOrigin, selectionRect]);

  const selectedTrackerFieldSet = useMemo(
    () => new Set(selectedTrackerFields),
    [selectedTrackerFields],
  );

  const selectedPatternCells = useMemo(
    () =>
      trackerFieldsToPatternCells(
        selectionOrigin?.sequenceId ?? activeSequenceId,
        patternId,
        selectedTrackerFields,
      ),
    [activeSequenceId, patternId, selectedTrackerFields, selectionOrigin],
  );

  const soloChannel = useMemo(() => {
    const firstUnmuted = channelStatus.findIndex((x) => !x);
    const lastUnmuted = channelStatus.findLastIndex((x) => !x);

    if (firstUnmuted !== -1 && firstUnmuted === lastUnmuted) {
      return firstUnmuted;
    }

    return -1;
  }, [channelStatus]);

  const playbackSequence = playbackState[0];
  const playbackRow = playbackState[1];
  const sequenceLength = song?.sequence.length ?? 0;
  const numPatterns = song?.patterns.length ?? 0;
  const selectedSequenceId = selectionOrigin?.sequenceId;

  // #endregion Derived State

  // #region Stable Refs

  const songRef = useRef(song);
  const patternRef = useRef(pattern);
  const patternIdRef = useRef(patternId);

  const octaveOffsetRef = useRef(octaveOffset);
  const editStepRef = useRef(editStep);
  const channelIdRef = useRef(channelId);
  const selectedInstrumentIdRef = useRef(selectedInstrumentId);

  const selectionOriginRef = useRef<TrackerSelectionOrigin | undefined>(
    undefined,
  );
  const selectionRectRef = useRef<SelectionRect | undefined>(undefined);
  const activeFieldRefValue = useRef<number | undefined>(undefined);

  const selectedTrackerFieldsRef = useRef<number[]>([]);
  const selectedPatternCellsRef = useRef<PatternCellAddress[]>([]);

  const isSelectingRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const hasHadFocusRef = useRef(false);

  // #endregion Stable Refs

  // #region Ref Synchronization

  useEffect(() => {
    songRef.current = song;
    patternRef.current = pattern;
    patternIdRef.current = patternId;
    octaveOffsetRef.current = octaveOffset;
    editStepRef.current = editStep;
    channelIdRef.current = channelId;
    selectedInstrumentIdRef.current = selectedInstrumentId;
    selectedTrackerFieldsRef.current = selectedTrackerFields;
    selectedPatternCellsRef.current = selectedPatternCells;
  }, [
    song,
    pattern,
    patternId,
    octaveOffset,
    editStep,
    channelId,
    selectedInstrumentId,
    selectedTrackerFields,
    selectedPatternCells,
  ]);

  // #endregion Ref Synchronization

  // #region Helpers

  const setSelectionOrigin = useCallback(
    (value: TrackerSelectionOrigin | undefined) => {
      selectionOriginRef.current = value;
      setSelectionOriginState(value);
    },
    [],
  );

  const setSelectionRect = useCallback((value: SelectionRect | undefined) => {
    selectionRectRef.current = value;
    setSelectionRectState(value);
  }, []);

  const setActiveField = useCallback((value: number | undefined) => {
    activeFieldRefValue.current = value;
    setActiveFieldState(value);
  }, []);

  const getMaxField = useCallback(() => {
    const currentSequenceLength = songRef.current?.sequence.length ?? 0;
    return (
      currentSequenceLength * TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE - 1
    );
  }, []);

  const clearSelection = useCallback(() => {
    isSelectingRef.current = false;
    setSelectionOrigin(undefined);
    setSelectionRect(undefined);
    dispatch(trackerActions.setSelectedPatternCells([]));
  }, [dispatch, setSelectionOrigin, setSelectionRect]);

  const setSingleFieldSelection = useCallback(
    (field: number) => {
      const localField = getLocalFieldFromGlobalField(field);
      const fieldSequenceId = getSequenceIdFromGlobalField(field);

      setSelectionOrigin({
        ...fieldToPosition(localField),
        sequenceId: fieldSequenceId,
      });
      setSelectionRect(undefined);
    },
    [setSelectionOrigin, setSelectionRect],
  );

  const updateSelectionToField = useCallback(
    (field: number) => {
      const origin = selectionOriginRef.current;
      if (!origin) {
        return;
      }

      const fieldSequenceId = getSequenceIdFromGlobalField(field);
      if (fieldSequenceId !== origin.sequenceId) {
        return;
      }

      const localField = getLocalFieldFromGlobalField(field);
      setSelectionRect(
        buildSelectionRect({ x: origin.x, y: origin.y }, localField),
      );
    },
    [setSelectionRect],
  );

  const focusTable = useCallback(() => {
    tableRef.current?.focus({ preventScroll: true });
  }, []);

  const getCurrentPatternCellLocation = useCallback((field: number) => {
    const localField = getLocalFieldFromGlobalField(field);
    const rowId = Math.floor(localField / TRACKER_ROW_SIZE);
    const targetChannelId = Math.floor(localField / TRACKER_CHANNEL_FIELDS) % 4;

    return { localField, rowId, channelId: targetChannelId };
  }, []);

  // #endregion Helpers

  // #region Pattern Editing Helpers

  const editPatternCell = useCallback(
    (changes: Partial<PatternCell>) => {
      const editingField = activeFieldRefValue.current;
      const currentPatternId = patternIdRef.current;
      const maxField = getMaxField();

      if (editingField === undefined || editingField > maxField) {
        return;
      }

      const { rowId, channelId: targetChannelId } =
        getCurrentPatternCellLocation(editingField);

      dispatch(
        trackerDocumentActions.editPatternCell({
          patternId: currentPatternId,
          cell: [rowId, targetChannelId],
          changes,
        }),
      );

      const currentCell = patternRef.current?.[rowId]?.[targetChannelId];
      if (!currentCell) {
        return;
      }

      const newCell: PatternCell = {
        ...currentCell,
        ...changes,
      };

      if (newCell.note === null) {
        return;
      }

      playPreview({
        note: newCell.note,
        instrumentId: newCell.instrument ?? 0,
        effectCode: newCell.effectcode ?? 0,
        effectParam: newCell.effectparam ?? 0,
      });
    },
    [dispatch, getCurrentPatternCellLocation, getMaxField, playPreview],
  );

  const editNoteField = useCallback(
    (value: number | null) => {
      const editingField = activeFieldRefValue.current;
      const currentOctaveOffset = octaveOffsetRef.current;
      const currentEditStep = editStepRef.current;
      const maxField = getMaxField();

      if (editingField === undefined || editingField > maxField) {
        return;
      }

      const fieldOffset = editingField % TRACKER_ROW_SIZE;
      const maxChannelField = maxField - TRACKER_ROW_SIZE + 1 + fieldOffset;

      const newNote =
        value === null ? null : value + currentOctaveOffset * OCTAVE_SIZE;

      if (value === null) {
        editPatternCell({ note: null });
        return;
      }

      editPatternCell({
        note: newNote,
        instrument: selectedInstrumentIdRef.current,
      });

      const nextField = Math.min(
        editingField + TRACKER_ROW_SIZE * currentEditStep,
        maxChannelField,
      );

      setActiveField(nextField);
      setSingleFieldSelection(nextField);
    },
    [editPatternCell, getMaxField, setActiveField, setSingleFieldSelection],
  );

  const editInstrumentField = useCallback(
    (value: number | null) => {
      const el = activeFieldRef.current;
      if (!el) {
        return;
      }

      let newValue = value;

      if (
        value !== null &&
        value <= 9 &&
        el.innerText !== ".." &&
        el.innerText !== "15"
      ) {
        newValue = 10 * parseInt(el.innerText[1], 10) + value;
        if (newValue > 15) {
          newValue = 15;
        }
      }

      editPatternCell({
        instrument: newValue === null ? null : newValue - 1,
      });
    },
    [editPatternCell],
  );

  const editEffectCodeField = useCallback(
    (value: number | null) => {
      editPatternCell({ effectcode: value });
    },
    [editPatternCell],
  );

  const editEffectParamField = useCallback(
    (value: number | null) => {
      const el = activeFieldRef.current;
      if (!el) {
        return;
      }

      let newValue = value;

      if (value !== null && el.innerText !== "..") {
        newValue = 16 * parseInt(el.innerText[1], 16) + value;
      }

      editPatternCell({ effectparam: newValue });
    },
    [editPatternCell],
  );

  const applyTrackerInput = useCallback(
    (input: TrackerInput) => {
      const currentActiveField = activeFieldRefValue.current;
      if (currentActiveField === undefined) {
        return false;
      }

      const focus = getFieldColumnFocus(
        getLocalFieldFromGlobalField(currentActiveField),
      );

      if (!focus) {
        return false;
      }

      if (input.type === "keyboard") {
        getKeys(input.code, focus, {
          editNoteField,
          editInstrumentField,
          editEffectCodeField,
          editEffectParamField,
        });
        return true;
      }

      if (focus === "noteColumnFocus") {
        editNoteField(input.value);
        return true;
      }

      if (focus === "instrumentColumnFocus") {
        editInstrumentField(input.value);
        return true;
      }

      if (focus === "effectCodeColumnFocus") {
        editEffectCodeField(input.value);
        return true;
      }

      if (focus === "effectParamColumnFocus") {
        editEffectParamField(input.value);
        return true;
      }

      return false;
    },
    [
      editEffectCodeField,
      editEffectParamField,
      editInstrumentField,
      editNoteField,
    ],
  );

  // #endregion Pattern Editing Helpers

  // #region Navigation Helpers

  const moveActiveField = useCallback(
    (direction: "up" | "down" | "left" | "right", extendSelection: boolean) => {
      const currentActiveField = activeFieldRefValue.current;
      const currentSelectionRect = selectionRectRef.current;
      const currentSequenceLength = songRef.current?.sequence.length ?? 0;

      if (currentActiveField === undefined || currentSequenceLength <= 0) {
        return false;
      }

      const currentSequenceId =
        getSequenceIdFromGlobalField(currentActiveField);
      const currentLocalField =
        getLocalFieldFromGlobalField(currentActiveField);
      const currentPos = fieldToPosition(currentLocalField);

      let nextSequenceId = currentSequenceId;
      let nextX = currentPos.x;
      let nextY = currentPos.y;

      if (direction === "left") {
        if (currentPos.x > 0) {
          nextX -= 1;
        } else if (currentPos.y > 0) {
          nextX = TRACKER_ROW_SIZE - 1;
          nextY -= 1;
        } else if (currentSequenceId > 0) {
          nextSequenceId -= 1;
          nextX = TRACKER_ROW_SIZE - 1;
          nextY = TRACKER_PATTERN_LENGTH - 1;
        } else {
          nextSequenceId = currentSequenceLength - 1;
          nextX = TRACKER_ROW_SIZE - 1;
          nextY = TRACKER_PATTERN_LENGTH - 1;
        }
      } else if (direction === "right") {
        if (currentPos.x < TRACKER_ROW_SIZE - 1) {
          nextX += 1;
        } else if (currentPos.y < TRACKER_PATTERN_LENGTH - 1) {
          nextX = 0;
          nextY += 1;
        } else if (currentSequenceId < currentSequenceLength - 1) {
          nextSequenceId += 1;
          nextX = 0;
          nextY = 0;
        } else {
          nextSequenceId = 0;
          nextX = 0;
          nextY = 0;
        }
      } else if (direction === "up") {
        if (currentPos.y > 0) {
          nextY -= 1;
        } else if (currentSequenceId > 0) {
          nextSequenceId -= 1;
          nextY = TRACKER_PATTERN_LENGTH - 1;
        } else {
          nextSequenceId = currentSequenceLength - 1;
          nextY = TRACKER_PATTERN_LENGTH - 1;
        }
      } else if (direction === "down") {
        if (currentPos.y < TRACKER_PATTERN_LENGTH - 1) {
          nextY += 1;
        } else if (currentSequenceId < currentSequenceLength - 1) {
          nextSequenceId += 1;
          nextY = 0;
        } else {
          nextSequenceId = 0;
          nextY = 0;
        }
      }

      const newLocalField = normalizeFieldIndex(
        nextY * TRACKER_ROW_SIZE + nextX,
      );
      const newActiveField = getGlobalField(nextSequenceId, newLocalField);

      if (
        extendSelection &&
        selectionOriginRef.current &&
        selectionOriginRef.current.sequenceId === nextSequenceId
      ) {
        if (!isSelectingRef.current) {
          isSelectingRef.current = true;

          if (!currentSelectionRect) {
            setSelectionOrigin({
              ...currentPos,
              sequenceId: currentSequenceId,
            });
          }
        }

        const origin = selectionOriginRef.current;

        if (origin && origin.sequenceId === nextSequenceId) {
          setSelectionRect(
            buildSelectionRect({ x: origin.x, y: origin.y }, newLocalField),
          );
        } else {
          setSelectionOrigin({
            x: nextX,
            y: nextY,
            sequenceId: nextSequenceId,
          });
          setSelectionRect(undefined);
        }
      } else {
        setSelectionOrigin({
          x: nextX,
          y: nextY,
          sequenceId: nextSequenceId,
        });
        setSelectionRect(undefined);
      }

      setActiveField(newActiveField);
      return true;
    },
    [setActiveField, setSelectionOrigin, setSelectionRect],
  );

  // #endregion Navigation Helpers

  // #region Action Handlers

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

  const onFocus = useCallback(() => {
    if (activeFieldRefValue.current === undefined) {
      const firstField = getGlobalField(sequenceId, 0);
      setActiveField(firstField);
    }

    hasHadFocusRef.current = true;
  }, [sequenceId, setActiveField]);

  const onSelectAll = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.focusNode) {
      return;
    }

    const noSelection =
      !selectionRectRef.current ||
      selectionRectRef.current.width === 0 ||
      selectionRectRef.current.height === 0;

    const currentChannelId = channelIdRef.current;
    const currentSequenceId =
      activeFieldRefValue.current !== undefined
        ? getSequenceIdFromGlobalField(activeFieldRefValue.current)
        : sequenceId;

    if (noSelection) {
      const offset = TRACKER_CHANNEL_FIELDS * currentChannelId;
      setSelectionOrigin({ x: offset, y: 0, sequenceId: currentSequenceId });
      setSelectionRect({
        x: offset,
        y: 0,
        width: 3,
        height: TRACKER_PATTERN_LENGTH - 1,
      });
      return;
    }

    setSelectionOrigin({ x: 0, y: 0, sequenceId: currentSequenceId });
    setSelectionRect({
      x: 0,
      y: 0,
      width: TRACKER_ROW_SIZE - 1,
      height: TRACKER_PATTERN_LENGTH - 1,
    });
  }, [sequenceId, setSelectionOrigin, setSelectionRect]);

  // #endregion Action Handlers

  // #region Mouse Event Handlers

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!(e.target instanceof HTMLElement)) {
        return;
      }

      if (e.button > 1) {
        return;
      }

      const fieldId = e.target.dataset.fieldid;
      const fieldSequenceId = e.target.dataset.sequenceid;
      const rowId = e.target.dataset.row;
      const rowSequenceId = e.target.dataset.sequenceid;

      if (fieldId !== undefined && fieldSequenceId !== undefined) {
        const parsedField = parseInt(fieldId, 10);
        const parsedSequenceId = parseInt(fieldSequenceId, 10);
        const normalizedField = normalizeFieldIndex(parsedField);
        const globalField = getGlobalField(parsedSequenceId, normalizedField);

        isMouseDownRef.current = true;

        if (
          e.shiftKey &&
          selectionOriginRef.current &&
          selectionOriginRef.current.sequenceId === parsedSequenceId
        ) {
          isSelectingRef.current = true;
          setActiveField(globalField);
          updateSelectionToField(globalField);
          return;
        }

        isSelectingRef.current = false;
        setActiveField(globalField);
        setSingleFieldSelection(globalField);
        return;
      }

      if (rowId !== undefined && rowSequenceId !== undefined) {
        const row = parseInt(rowId, 10);
        const parsedSequenceId = parseInt(rowSequenceId, 10);

        dispatch(
          trackerActions.setDefaultStartPlaybackPosition([
            parsedSequenceId,
            row,
          ]),
        );

        API.music.sendToMusicWindow({
          action: "position",
          position: [parsedSequenceId, row],
        });
      }
    },
    [dispatch, setActiveField, setSingleFieldSelection, updateSelectionToField],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDownRef.current) {
        return;
      }

      if (!(e.target instanceof HTMLElement)) {
        return;
      }

      const fieldId = e.target.dataset.fieldid;
      const fieldSequenceId = e.target.dataset.sequenceid;

      if (fieldId === undefined || fieldSequenceId === undefined) {
        return;
      }

      const parsedField = parseInt(fieldId, 10);
      const parsedSequenceId = parseInt(fieldSequenceId, 10);
      const normalizedField = normalizeFieldIndex(parsedField);
      const globalField = getGlobalField(parsedSequenceId, normalizedField);

      updateSelectionToField(globalField);
    },
    [updateSelectionToField],
  );

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button > 1) {
      return;
    }

    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      isSelectingRef.current = false;
      selectionOriginRef.current = undefined;
    }
  }, []);

  // #endregion Mouse Event Handlers

  // #region Keyboard Event Handlers

  const handleStructureKey = useCallback(
    (e: KeyboardEvent) => {
      const currentActiveField = activeFieldRefValue.current;
      const currentSelectedTrackerFields = selectedTrackerFieldsRef.current;
      const currentPatternId = patternIdRef.current;

      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return true;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if ((e.shiftKey || e.ctrlKey) && currentActiveField !== undefined) {
          e.preventDefault();
          dispatch(
            trackerDocumentActions.shiftTrackerFields({
              patternId: currentPatternId,
              selectedTrackerFields: currentSelectedTrackerFields,
              direction: "delete",
            }),
          );
          return true;
        }

        if (currentSelectedTrackerFields.length > 0) {
          e.preventDefault();
          dispatch(
            trackerDocumentActions.clearTrackerFields({
              patternId: currentPatternId,
              selectedTrackerFields: currentSelectedTrackerFields,
            }),
          );
          return true;
        }
      }

      if (e.key === "Insert" || e.key === "Enter") {
        if (currentActiveField !== undefined) {
          e.preventDefault();
          dispatch(
            trackerDocumentActions.shiftTrackerFields({
              patternId: currentPatternId,
              selectedTrackerFields: currentSelectedTrackerFields,
              direction: "insert",
            }),
          );
          return true;
        }
      }

      if (e.code === "Equal") {
        e.preventDefault();

        if (e.shiftKey) {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "up",
              size: "octave",
            }),
          );
        } else {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId: currentPatternId,
              selectedTrackerFields: currentSelectedTrackerFields,
              direction: "up",
            }),
          );
        }

        return true;
      }

      if (e.code === "Minus") {
        e.preventDefault();

        if (e.shiftKey) {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "down",
              size: "octave",
            }),
          );
        } else {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId: currentPatternId,
              selectedTrackerFields: currentSelectedTrackerFields,
              direction: "down",
            }),
          );
        }

        return true;
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
          return true;
        }

        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
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
              patternCells: selectedPatternCellsRef.current,
              direction: "up",
              size: "note",
            }),
          );
          return true;
        }

        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
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
              patternCells: selectedPatternCellsRef.current,
              instrumentId: selectedInstrumentIdRef.current,
            }),
          );
          return true;
        }

        if (e.code === "KeyK") {
          dispatch(
            trackerDocumentActions.interpolateAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
            }),
          );
          return true;
        }
      }

      return false;
    },
    [clearSelection, dispatch],
  );

  const handleNavigationKey = useCallback(
    (e: KeyboardEvent) => {
      const direction =
        e.key === "ArrowLeft"
          ? "left"
          : e.key === "ArrowRight"
            ? "right"
            : e.key === "ArrowUp"
              ? "up"
              : e.key === "ArrowDown"
                ? "down"
                : null;

      if (!direction) {
        return false;
      }

      const handled = moveActiveField(direction, e.shiftKey);

      if (handled) {
        e.preventDefault();
      }

      return handled;
    },
    [moveActiveField],
  );

  const handleEditKey = useCallback(
    (e: KeyboardEvent) => {
      const currentActiveField = activeFieldRefValue.current;
      if (currentActiveField === undefined) {
        return false;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) {
        return false;
      }

      return applyTrackerInput({
        type: "keyboard",
        code: e.code,
      });
    },
    [applyTrackerInput],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target !== tableRef.current) {
        return;
      }

      if (handleStructureKey(e)) {
        return;
      }

      if (handleNavigationKey(e)) {
        return;
      }

      handleEditKey(e);
    },
    [handleEditKey, handleNavigationKey, handleStructureKey],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) {
      isSelectingRef.current = false;
    }
  }, []);

  // #endregion Keyboard Event Handlers

  // #region Wheel Event Handlers

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }

      e.preventDefault();

      const delta = e.deltaY === 0 ? e.deltaX : e.deltaY;
      const currentPatternId = patternIdRef.current;

      if (e.shiftKey) {
        if (delta < 0) {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "up",
              size: "octave",
            }),
          );
          return;
        }

        if (delta > 0) {
          dispatch(
            trackerDocumentActions.transposeAbsoluteCells({
              patternCells: selectedPatternCellsRef.current,
              direction: "down",
              size: "octave",
            }),
          );
          return;
        }

        return;
      }

      if (delta < 0) {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId: currentPatternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
            direction: "up",
          }),
        );
        return;
      }

      if (delta > 0) {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId: currentPatternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
            direction: "down",
          }),
        );
      }
    },
    [dispatch],
  );

  // #endregion Wheel Event Handlers

  // #region Clipboard Event Handlers

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      dispatch(
        copyTrackerFields({
          patternId: patternIdRef.current,
          selectedTrackerFields: selectedTrackerFieldsRef.current,
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
        cutTrackerFields({
          patternId: patternIdRef.current,
          selectedTrackerFields: selectedTrackerFieldsRef.current,
        }),
      );
    },
    [dispatch],
  );

  const onPaste = useCallback(async () => {
    const firstField = selectedTrackerFieldsRef.current[0];

    if (firstField === undefined) {
      return;
    }

    await dispatch(
      pasteTrackerFields({
        patternId: patternIdRef.current,
        startField: firstField,
      }),
    );
  }, [dispatch]);

  // #endregion Clipboard Event Handlers

  // #region Virtual Keyboard Handlers

  const handleVirtualKeyPressed = useCallback(
    (virtualKey: VirtualTrackerKey) => {
      if (activeFieldRefValue.current === undefined) {
        const firstField = getGlobalField(sequenceId, 0);
        setActiveField(firstField);
        setSingleFieldSelection(firstField);
      }

      const currentPatternId = patternIdRef.current;

      if (virtualKey.type === "navigation") {
        moveActiveField(virtualKey.direction, virtualKey.shiftKey);
        focusTable();
        return;
      }

      if (virtualKey.type === "number" || virtualKey.type === "note") {
        applyTrackerInput({
          type: "hex",
          value: virtualKey.value,
        });
        focusTable();
        return;
      }

      if (virtualKey.type === "transpose") {
        dispatch(
          trackerDocumentActions.transposeAbsoluteCells({
            patternCells: selectedPatternCellsRef.current,
            direction: virtualKey.direction,
            size: virtualKey.size,
          }),
        );
        focusTable();
        return;
      }

      if (virtualKey.type === "transposeField") {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId: currentPatternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
            direction: virtualKey.direction,
          }),
        );
        focusTable();
        return;
      }

      if (virtualKey.type === "insertRow" || virtualKey.type === "removeRow") {
        dispatch(
          trackerDocumentActions.shiftTrackerFields({
            patternId: currentPatternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
            direction: virtualKey.type === "insertRow" ? "insert" : "delete",
          }),
        );
        focusTable();
        return;
      }

      if (virtualKey.type === "clear") {
        dispatch(
          trackerDocumentActions.clearTrackerFields({
            patternId: currentPatternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
          }),
        );
        focusTable();
        return;
      }

      if (virtualKey.type === "undo") {
        dispatch({ type: TRACKER_UNDO });
        return;
      }

      if (virtualKey.type === "redo") {
        dispatch({ type: TRACKER_REDO });
      }

      if (virtualKey.type === "settings") {
        dispatch(trackerActions.setMobileOverlayView("settings"));
      }

      if (virtualKey.type === "editEffects") {
        dispatch(trackerActions.setMobileOverlayView("notes"));
      }

      if (virtualKey.type === "toggle") {
        dispatch(trackerActions.setShowVirtualKeyboard(!showVirtualKeyboard));
      }
    },
    [
      applyTrackerInput,
      dispatch,
      focusTable,
      moveActiveField,
      sequenceId,
      setActiveField,
      setSingleFieldSelection,
      showVirtualKeyboard,
    ],
  );

  // #endregion Virtual Keyboard Handlers

  // #region Context Menu

  const getSelectionContextMenu = useCallback(
    () =>
      renderTrackerContextMenu({
        dispatch,
        patternId,
        selectedTrackerFields,
        selectedPatternCells,
        selectedInstrumentId,
      }),
    [
      dispatch,
      patternId,
      selectedTrackerFields,
      selectedPatternCells,
      selectedInstrumentId,
    ],
  );

  const {
    onContextMenu: onSelectionContextMenu,
    contextMenuElement: selectionContextMenuElement,
  } = useContextMenu({
    getMenu: getSelectionContextMenu,
  });

  // #endregion Context Menu

  // #region Selection Effects

  useEffect(() => {
    dispatch(trackerActions.setSelectedPatternCells(selectedPatternCells));
  }, [dispatch, selectedPatternCells]);

  useLayoutEffect(() => {
    clearSelection();
  }, [sequenceId, clearSelection]);

  useLayoutEffect(() => {
    const firstField = getGlobalField(sequenceId, 0);
    setActiveField(firstField);
    setSingleFieldSelection(firstField);
  }, [sequenceId, setActiveField, setSingleFieldSelection]);

  useLayoutEffect(() => {
    if (hasHadFocusRef.current) {
      requestAnimationFrame(() => {
        focusTable();
      });
      focusTable();
    }
  }, [activeSequenceId, focusTable]);

  // #endregion Selection Effects

  // #region Playback Effects

  useEffect(() => {
    setPlaybackState(startPlaybackPosition);
  }, [startPlaybackPosition]);

  useEffect(() => {
    const listener = (_event: unknown, data: MusicDataReceivePacket) => {
      if (data.action === "update") {
        setPlaybackState(data.update);
      } else if (data.action === "initialized") {
        setPlaybackState([0, 0]);
      }
    };

    const unsubscribeMusicData = API.events.music.response.subscribe(listener);

    return () => {
      unsubscribeMusicData();
    };
  }, []);

  useEffect(() => {
    if (playbackSequence >= sequenceLength) {
      API.music.sendToMusicWindow({
        action: "position",
        position: [0, 0],
      });
    }
  }, [playbackSequence, sequenceLength]);

  // #endregion Playback Effects

  // #region Scroll Effects

  useLayoutEffect(() => {
    if (
      playing ||
      activeField === undefined ||
      !scrollRef.current ||
      !activeFieldRef.current
    ) {
      return;
    }

    const scrollEl = scrollRef.current;
    const fieldEl = activeFieldRef.current;

    const scrollRect = scrollEl.getBoundingClientRect();
    const fieldRect = fieldEl.getBoundingClientRect();

    const visibleTop = scrollRect.top + TRACKER_HEADER_HEIGHT;
    const visibleBottom = scrollRect.bottom - 30;
    const visibleLeft = scrollRect.left + TRACKER_INDEX_WIDTH + 30;
    const visibleRight = scrollRect.right - 30;

    if (fieldRect.top < visibleTop) {
      scrollEl.scrollTop -= visibleTop - fieldRect.top;
    } else if (fieldRect.bottom > visibleBottom) {
      scrollEl.scrollTop += fieldRect.bottom - visibleBottom;
    }

    if (fieldRect.left < visibleLeft) {
      scrollEl.scrollLeft -= visibleLeft - fieldRect.left;
    } else if (fieldRect.right > visibleRight) {
      scrollEl.scrollLeft += fieldRect.right - visibleRight;
    }
  }, [playing, activeField]);

  useLayoutEffect(() => {
    if (!scrollRef.current || !playing) {
      return;
    }

    const rect = scrollRef.current.getBoundingClientRect();
    const halfHeight = rect.height * 0.5;

    scrollRef.current.scrollTop =
      playbackSequence *
        (TRACKER_HEADER_HEIGHT + TRACKER_CELL_HEIGHT * TRACKER_PATTERN_LENGTH) +
      TRACKER_HEADER_HEIGHT +
      playbackRow * TRACKER_CELL_HEIGHT -
      halfHeight;
  }, [playing, playbackRow, playbackSequence]);

  // #endregion Scroll Effects

  // #region Channel Sync Effects

  useEffect(() => {
    if (activeField === undefined) {
      return;
    }

    const localField = getLocalFieldFromGlobalField(activeField);
    const newChannelId = toValidChannelId(
      Math.floor((localField % TRACKER_ROW_SIZE) / TRACKER_CHANNEL_FIELDS),
    );

    dispatch(trackerActions.setSelectedChannel(newChannelId));
  }, [activeField, dispatch]);

  // #endregion Channel Sync Effects

  // #region Global Event Effects

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  ]);

  // #endregion Global Event Effects

  // #region Select All Effects

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

    let lastSelectionChange = 0;

    const onSelectionChange = (e: Event) => {
      if (Date.now() < lastSelectionChange + 100) {
        return;
      }

      lastSelectionChange = Date.now();

      const selection = window.getSelection();
      if (!selection || selection.focusNode) {
        return;
      }

      window.getSelection()?.empty();
      e.preventDefault();
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

  // #endregion Select All Effects

  // #region Clipboard Effects

  useEffect(() => {
    if (subpatternEditorFocus) {
      return;
    }

    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCut);
    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCut);
      window.removeEventListener("paste", onPaste);
    };
  }, [onCopy, onCut, onPaste, subpatternEditorFocus]);

  // #endregion Clipboard Effects

  return (
    <StyledTrackerWrapper>
      <StyledTrackerScrollWrapper ref={scrollRef}>
        <StyledTrackerScrollCanvas>
          {song?.sequence.map((sequencePatternId, renderSequenceId) => {
            const selectedTrackerFieldSetForPattern =
              selectedSequenceId === renderSequenceId
                ? selectedTrackerFieldSet
                : undefined;

            const activeLocalFieldForPattern =
              activeField !== undefined &&
              getSequenceIdFromGlobalField(activeField) === renderSequenceId
                ? getLocalFieldFromGlobalField(activeField)
                : undefined;

            return (
              <SongTrackerPattern
                key={renderSequenceId}
                song={song}
                sequencePatternId={sequencePatternId}
                renderSequenceId={renderSequenceId}
                activeSequenceId={activeSequenceId}
                activeLocalField={activeLocalFieldForPattern}
                selectedTrackerFieldSet={selectedTrackerFieldSetForPattern}
                playbackState={playbackState}
                defaultStartPlaybackPosition={defaultStartPlaybackPosition}
                channelStatus={channelStatus}
                soloChannel={soloChannel}
                orderLength={sequenceLength}
                numPatterns={numPatterns}
                dispatch={dispatch}
                tableRef={tableRef}
                activeFieldRef={activeFieldRef}
                onFocus={onFocus}
                onSelectionContextMenu={onSelectionContextMenu}
              />
            );
          })}
        </StyledTrackerScrollCanvas>

        <StyledAddPatternWrapper
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <StyledAddPatternButton
            onClick={onAddSequence}
            title={l10n("FIELD_ADD_PATTERN")}
          >
            <PlusIcon />
          </StyledAddPatternButton>
        </StyledAddPatternWrapper>
      </StyledTrackerScrollWrapper>

      <TrackerKeyboard
        type="pattern"
        fieldType={currentFocus}
        octaveOffset={octaveOffset}
        open={showVirtualKeyboard}
        onKeyPressed={handleVirtualKeyPressed}
      />

      {selectionContextMenuElement}
    </StyledTrackerWrapper>
  );
};
