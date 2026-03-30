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
import { TrackerHeaderCell } from "./TrackerHeaderCell";
import {
  patternHue,
  renderEffect,
  renderEffectParam,
  renderInstrument,
  renderNote,
} from "components/music/helpers";
import { getKeys } from "renderer/lib/keybindings/keyBindings";
import trackerActions from "store/features/tracker/trackerActions";
import API from "renderer/lib/api";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { useAppDispatch, useAppSelector } from "store/hooks";
import {
  StyledTrackerContentTable,
  StyledTrackerTableHeader,
  StyledTrackerTableHeaderRow,
  StyledTrackerWrapper,
  StyledTrackerTableBody,
  StyledTrackerScrollWrapper,
  StyledTrackerRow,
  StyledTrackerCell,
  StyledTrackerRowIndexField,
  StyledTrackerNoteField,
  StyledTrackerInstrumentField,
  StyledTrackerEffectCodeField,
  StyledTrackerEffectParamField,
  StyledTrackerScrollCanvas,
} from "./style";
import {
  buildSelectionRect,
  fieldToPosition,
  getFieldColumnFocus,
  getMovedField,
  getSelectedTrackerFields,
  normalizeFieldIndex,
  Position,
  SelectionRect,
  TRACKER_CELL_HEIGHT,
  TRACKER_HEADER_HEIGHT,
  TRACKER_INDEX_WIDTH,
  trackerFieldsToPatternCells,
} from "./helpers";
import renderPatternContextMenu from "components/music/contextMenus/renderPatternContextMenu";
import renderTrackerContextMenu from "components/music/contextMenus/renderTrackerContextMenu";
import { DropdownButton } from "ui/buttons/DropdownButton";
import {
  OCTAVE_SIZE,
  TRACKER_CHANNEL_FIELDS,
  TRACKER_ROW_SIZE,
  TRACKER_PATTERN_LENGTH,
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

interface SongTrackerProps {
  sequenceId: number;
  song: Song | null;
}

const renderCounter = (n: number): string => {
  return n?.toString().padStart(2, "0") || "__";
};

const PATTERN_FIELD_COUNT = TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE;

const getSequenceIdFromGlobalField = (field: number) =>
  Math.floor(field / PATTERN_FIELD_COUNT);

const getLocalFieldFromGlobalField = (field: number) =>
  field % PATTERN_FIELD_COUNT;

const getGlobalField = (sequenceId: number, localField: number) =>
  sequenceId * PATTERN_FIELD_COUNT + localField;

const getRowIndexFromLocalField = (field: number) =>
  Math.floor(field / TRACKER_ROW_SIZE);

const getPatternIdAtSequence = (song: Song | null, sequenceId: number) =>
  song?.sequence[sequenceId] ?? 0;

const getRowIndexFromField = (field: number) =>
  getRowIndexFromLocalField(getLocalFieldFromGlobalField(field));

type TrackerInput =
  | { type: "keyboard"; code: string }
  | { type: "hex"; value: number | null };

export const SongTracker = ({ song, sequenceId }: SongTrackerProps) => {
  const dispatch = useAppDispatch();
  const playPreview = useMusicNotePreview();

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

  const tableRef = useRef<HTMLTableSectionElement>(null);

  const [selectionOrigin, setSelectionOriginState] = useState<
    (Position & { sequenceId: number }) | undefined
  >();
  const [selectionRect, setSelectionRectState] = useState<
    SelectionRect | undefined
  >();

  const [activeField, setActiveFieldState] = useState<number | undefined>();
  const [playbackState, setPlaybackState] = useState<[number, number]>([0, 0]);

  const activeSequenceId =
    activeField !== undefined
      ? getSequenceIdFromGlobalField(activeField)
      : sequenceId;

  const patternId = getPatternIdAtSequence(song, activeSequenceId);
  const pattern = song?.patterns[patternId];

  const selectionOriginRef = useRef<
    (Position & { sequenceId: number }) | undefined
  >(undefined);
  const selectionRectRef = useRef<SelectionRect | undefined>(undefined);
  const activeFieldValueRef = useRef<number | undefined>(undefined);

  const selectedTrackerFieldsRef = useRef<number[]>([]);
  const patternRef = useRef(pattern);
  const patternIdRef = useRef(patternId);
  const songRef = useRef(song);

  const octaveOffsetRef = useRef(octaveOffset);
  const editStepRef = useRef(editStep);
  const channelIdRef = useRef(channelId);

  const isSelectingRef = useRef(false);
  const isMouseDownRef = useRef(false);

  const activeFieldRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentFocus = useMemo(
    () => getFieldColumnFocus(activeField ?? 0),
    [activeField],
  );

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    patternIdRef.current = patternId;
  }, [patternId]);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  const selectedInstrumentIdRef = useRef(selectedInstrumentId);

  useEffect(() => {
    selectedInstrumentIdRef.current = selectedInstrumentId;
  }, [selectedInstrumentId]);

  useEffect(() => {
    octaveOffsetRef.current = octaveOffset;
  }, [octaveOffset]);

  useEffect(() => {
    editStepRef.current = editStep;
  }, [editStep]);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  const setSelectionOrigin = useCallback(
    (value: (Position & { sequenceId: number }) | undefined) => {
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
    activeFieldValueRef.current = value;
    setActiveFieldState(value);
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

  useEffect(() => {
    dispatch(trackerActions.setSelectedPatternCells(selectedPatternCells));
  }, [dispatch, selectedPatternCells]);

  const selectedPatternCellsRef = useRef<PatternCellAddress[]>([]);

  useEffect(() => {
    selectedPatternCellsRef.current = selectedPatternCells;
  }, [selectedPatternCells]);

  useEffect(() => {
    selectedTrackerFieldsRef.current = selectedTrackerFields;
  }, [selectedTrackerFields]);

  useEffect(() => {
    setPlaybackState(startPlaybackPosition);
  }, [startPlaybackPosition]);

  useEffect(() => {
    const listener = (_event: unknown, d: MusicDataReceivePacket) => {
      if (d.action === "update") {
        setPlaybackState(d.update);
      } else if (d.action === "initialized") {
        setPlaybackState([0, 0]);
      }
    };

    const unsubscribeMusicData = API.events.music.response.subscribe(listener);
    return () => {
      unsubscribeMusicData();
    };
  }, []);

  useEffect(() => {
    if (activeField === undefined) {
      return;
    }

    const newChannelId = toValidChannelId(
      Math.floor((activeField % TRACKER_ROW_SIZE) / TRACKER_CHANNEL_FIELDS),
    );
    dispatch(trackerActions.setSelectedChannel(newChannelId));
  }, [activeField, dispatch, patternId, sequenceId]);

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
        } else {
          isSelectingRef.current = false;
          setActiveField(globalField);
          setSingleFieldSelection(globalField);
        }
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
        return;
      }
    },
    [dispatch, setActiveField, setSingleFieldSelection, updateSelectionToField],
  );

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button > 1) {
      return;
    }
    isMouseDownRef.current = false;
    isSelectingRef.current = false;
    selectionOriginRef.current = undefined;
  }, []);

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

  const editPatternCell = useCallback(
    (changes: Partial<PatternCell>) => {
      console.log("EDIT PATTERN CELL", changes);
      const editingField = activeFieldValueRef.current;
      const currentPatternId = patternIdRef.current;

      if (editingField === undefined) {
        return;
      }

      const localField = getLocalFieldFromGlobalField(editingField);
      const rowId = Math.floor(localField / TRACKER_ROW_SIZE);
      const channelId = Math.floor(localField / TRACKER_CHANNEL_FIELDS) % 4;

      dispatch(
        trackerDocumentActions.editPatternCell({
          patternId: currentPatternId,
          cell: [rowId, channelId],
          changes,
        }),
      );

      const currentCell = patternRef.current?.[rowId]?.[channelId];

      if (currentCell) {
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
      }
    },
    [dispatch, playPreview],
  );

  const editNoteField = useCallback(
    (value: number | null) => {
      const editingField = activeFieldValueRef.current;
      const currentOctaveOffset = octaveOffsetRef.current;
      const currentEditStep = editStepRef.current;

      if (editingField === undefined) {
        return;
      }

      const instrument = selectedInstrumentIdRef.current;

      const newNote =
        value === null ? null : value + currentOctaveOffset * OCTAVE_SIZE;

      if (value !== null) {
        editPatternCell({
          note: newNote,
          instrument: instrument,
        });
        const nextField = editingField + TRACKER_ROW_SIZE * currentEditStep;
        setActiveField(nextField);
        setSingleFieldSelection(nextField);
      } else {
        editPatternCell({
          note: newNote,
        });
      }
    },
    [editPatternCell, setActiveField, setSingleFieldSelection],
  );

  const editInstrumentField = useCallback(
    (value: number | null) => {
      if (!activeFieldRef.current) {
        return;
      }

      const el = activeFieldRef.current;
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
      console.log("EDIT EFFECT CODE", value);
      editPatternCell({ effectcode: value });
    },
    [editPatternCell],
  );

  const editEffectParamField = useCallback(
    (value: number | null) => {
      if (!activeFieldRef.current) {
        return;
      }

      const el = activeFieldRef.current;
      let newValue = value;

      if (value !== null && el.innerText !== "..") {
        newValue = 16 * parseInt(el.innerText[1], 16) + value;
      }

      editPatternCell({ effectparam: newValue });
    },
    [editPatternCell],
  );

  const moveActiveField = useCallback(
    (direction: "up" | "down" | "left" | "right", extendSelection: boolean) => {
      const currentActiveField = activeFieldValueRef.current;
      const currentSelectionRect = selectionRectRef.current;
      const sequenceLength = songRef.current?.sequence.length ?? 0;

      if (currentActiveField === undefined || sequenceLength <= 0) {
        return false;
      }

      const currentSequenceId =
        getSequenceIdFromGlobalField(currentActiveField);
      const currentLocalField =
        getLocalFieldFromGlobalField(currentActiveField);

      const key =
        direction === "left"
          ? "ArrowLeft"
          : direction === "right"
            ? "ArrowRight"
            : direction === "up"
              ? "ArrowUp"
              : "ArrowDown";

      let movedField = getMovedField(currentLocalField, key, false);

      let nextSequenceId = currentSequenceId;
      let nextLocalField: number | null = movedField;

      if (movedField === null) {
        const pos = fieldToPosition(currentLocalField);

        if (direction === "up" && currentSequenceId > 0) {
          nextSequenceId = currentSequenceId - 1;
          nextLocalField =
            (TRACKER_PATTERN_LENGTH - 1) * TRACKER_ROW_SIZE + pos.x;
        } else if (
          direction === "down" &&
          currentSequenceId < sequenceLength - 1
        ) {
          nextSequenceId = currentSequenceId + 1;
          nextLocalField = pos.x;
        } else if (direction === "left" && currentSequenceId > 0) {
          nextSequenceId = currentSequenceId - 1;
          nextLocalField =
            (TRACKER_PATTERN_LENGTH - 1) * TRACKER_ROW_SIZE +
            (TRACKER_ROW_SIZE - 1);
        } else if (
          direction === "right" &&
          currentSequenceId < sequenceLength - 1
        ) {
          nextSequenceId = currentSequenceId + 1;
          nextLocalField = 0;
        } else {
          return false;
        }
      }

      if (nextLocalField === null) {
        return false;
      }

      const newLocalField = normalizeFieldIndex(nextLocalField);
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
              ...fieldToPosition(currentLocalField),
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
            ...fieldToPosition(newLocalField),
            sequenceId: nextSequenceId,
          });
          setSelectionRect(undefined);
        }
      } else {
        setSelectionOrigin({
          ...fieldToPosition(newLocalField),
          sequenceId: nextSequenceId,
        });
        setSelectionRect(undefined);
      }

      setActiveField(newActiveField);
      return true;
    },
    [setActiveField, setSelectionOrigin, setSelectionRect],
  );

  const applyTrackerInput = useCallback(
    (input: TrackerInput) => {
      console.log("APPLY TRACKER INPUT", input);
      const currentActiveField = activeFieldValueRef.current;
      if (currentActiveField === undefined) {
        return false;
      }
      console.log("APPLY TRACKER INPUT A ", input);

      const currentFocus = getFieldColumnFocus(currentActiveField);
      if (!currentFocus) {
        return false;
      }

      console.log("APPLY TRACKER INPUT B", input);

      if (input.type === "keyboard") {
        getKeys(input.code, currentFocus, {
          editNoteField,
          editInstrumentField,
          editEffectCodeField,
          editEffectParamField,
        });
        return true;
      }

      console.log("APPLY TRACKER INPUT C ", input);

      console.log("APPLY TRACKER INPUT D", currentFocus);

      if (currentFocus === "noteColumnFocus") {
        editNoteField(input.value);
        return true;
      }

      if (currentFocus === "instrumentColumnFocus") {
        editInstrumentField(input.value);
        return true;
      }

      if (currentFocus === "effectCodeColumnFocus") {
        editEffectCodeField(input.value);
        return true;
      }

      if (currentFocus === "effectParamColumnFocus") {
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

  const handleStructureKey = useCallback(
    (e: KeyboardEvent) => {
      const currentActiveField = activeFieldValueRef.current;
      const currentSelectedTrackerFields = selectedTrackerFieldsRef.current;

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
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
              direction: "delete",
            }),
          );
          return true;
        }

        if (currentSelectedTrackerFields.length > 0) {
          e.preventDefault();
          dispatch(
            trackerDocumentActions.clearTrackerFields({
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
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
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
              direction: "insert",
            }),
          );
          return true;
        }
      }

      if (e.code === "Equal") {
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
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
              direction: "up",
            }),
          );
        }
      }

      if (e.code === "Minus") {
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
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
              direction: "down",
            }),
          );
        }
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
              instrumentId: selectedInstrumentId,
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
    [clearSelection, dispatch, patternId, selectedInstrumentId],
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
      const currentActiveField = activeFieldValueRef.current;
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
    const visibleLeft = scrollRect.left + TRACKER_INDEX_WIDTH;
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

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) {
      isSelectingRef.current = false;
    }
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }

      e.preventDefault();

      const delta = e.deltaY === 0 ? e.deltaX : e.deltaY;

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
      } else {
        if (delta < 0) {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
              direction: "up",
            }),
          );
          return;
        }
        if (delta > 0) {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields: selectedTrackerFieldsRef.current,
              direction: "down",
            }),
          );
          return;
        }
      }
    },
    [dispatch, patternId],
  );

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
      activeFieldValueRef.current !== undefined
        ? getSequenceIdFromGlobalField(activeFieldValueRef.current)
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
    } else {
      setSelectionOrigin({ x: 0, y: 0, sequenceId: currentSequenceId });
      setSelectionRect({
        x: 0,
        y: 0,
        width: TRACKER_ROW_SIZE - 1,
        height: TRACKER_PATTERN_LENGTH - 1,
      });
    }
  }, [sequenceId, setSelectionOrigin, setSelectionRect]);

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
    handleMouseUp,
    handleMouseMove,
    handleWheel,
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

  const onFocus = useCallback(() => {
    if (activeFieldValueRef.current === undefined) {
      setActiveField(0);
    }
  }, [setActiveField]);

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      const currentSelectedTrackerFields = selectedTrackerFieldsRef.current;

      dispatch(
        copyTrackerFields({
          patternId,
          selectedTrackerFields: currentSelectedTrackerFields,
        }),
      );
    },
    [dispatch, patternId],
  );

  const onCut = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      const currentSelectedTrackerFields = selectedTrackerFieldsRef.current;

      dispatch(
        cutTrackerFields({
          patternId,
          selectedTrackerFields: currentSelectedTrackerFields,
        }),
      );
    },
    [dispatch, patternId],
  );

  const onPaste = useCallback(async () => {
    const firstField = selectedTrackerFieldsRef.current?.[0];

    if (firstField !== undefined) {
      await dispatch(
        pasteTrackerFields({
          patternId,
          startField: firstField,
        }),
      );
    }
  }, [dispatch, patternId]);

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

  const soloChannel = useMemo(() => {
    const firstUnmuted = channelStatus.findIndex((x) => !x);
    const lastUnmuted = channelStatus.findLastIndex((x) => !x);

    if (firstUnmuted !== -1 && firstUnmuted === lastUnmuted) {
      return firstUnmuted;
    }

    return -1;
  }, [channelStatus]);

  const playbackRow = playbackState[1];

  useLayoutEffect(() => {
    if (scrollRef.current && playing) {
      const rect = scrollRef.current.getBoundingClientRect();
      const halfHeight = rect.height * 0.5;
      scrollRef.current.scrollTop =
        TRACKER_HEADER_HEIGHT + playbackRow * TRACKER_CELL_HEIGHT - halfHeight;
    }
  }, [playing, playbackRow]);

  const sequenceLength = song?.sequence.length ?? 0;
  const playbackOrder = playbackState[0];
  const patternIndex = patternId;
  const orderIndex = sequenceId;
  const orderLength = sequenceLength;

  useEffect(() => {
    if (playbackOrder >= sequenceLength) {
      // Playback has overflowed song
      // e.g. deleted a pattern when playback was inside that pattern
      API.music.sendToMusicWindow({
        action: "position",
        position: [0, 0],
      });
    }
  }, [playbackOrder, sequenceLength]);

  const patternContextMenu = useMemo(
    () =>
      renderPatternContextMenu({
        dispatch,
        patternIndex,
        orderIndex,
        orderLength,
      }),
    [dispatch, patternIndex, orderIndex, orderLength],
  );

  const getSelectionContextMenu = useCallback(
    () =>
      renderTrackerContextMenu({
        dispatch,
        patternId: patternIndex,
        selectedTrackerFields,
        selectedPatternCells,
        selectedInstrumentId,
      }),
    [
      dispatch,
      patternIndex,
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

  const handleVirtualKeyPressed = useCallback(
    (virtualKey: VirtualTrackerKey) => {
      if (activeFieldValueRef.current === undefined) {
        setActiveField(0);
        setSingleFieldSelection(0);
      }

      if (virtualKey.type === "navigation") {
        moveActiveField(virtualKey.direction, virtualKey.shiftKey);
        tableRef.current?.focus();
        return;
      }

      if (virtualKey.type === "number" || virtualKey.type === "note") {
        applyTrackerInput({
          type: "hex",
          value: virtualKey.value,
        });

        tableRef.current?.focus();
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

        tableRef.current?.focus();
        return;
      }

      if (virtualKey.type === "transposeField") {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
            direction: virtualKey.direction,
          }),
        );
        tableRef.current?.focus();
        return;
      }

      if (virtualKey.type === "insertRow" || virtualKey.type === "removeRow") {
        dispatch(
          trackerDocumentActions.shiftTrackerFields({
            patternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
            direction: virtualKey.type === "insertRow" ? "insert" : "delete",
          }),
        );
        tableRef.current?.focus();
        return;
      }

      if (virtualKey.type === "clear") {
        dispatch(
          trackerDocumentActions.clearTrackerFields({
            patternId,
            selectedTrackerFields: selectedTrackerFieldsRef.current,
          }),
        );
        tableRef.current?.focus();
        return;
      }
    },
    [
      applyTrackerInput,
      dispatch,
      moveActiveField,
      patternId,
      setActiveField,
      setSingleFieldSelection,
    ],
  );

  useLayoutEffect(() => {
    // If sequence id changes clear the current selection
    clearSelection();
  }, [sequenceId, clearSelection]);

  useLayoutEffect(() => {
    const firstField = getGlobalField(sequenceId, 0);
    setActiveField(firstField);
    setSingleFieldSelection(firstField);
    tableRef.current?.focus({ preventScroll: true });
  }, [sequenceId, setActiveField, setSingleFieldSelection]);

  return (
    <StyledTrackerWrapper>
      <StyledTrackerScrollWrapper ref={scrollRef}>
        <StyledTrackerScrollCanvas>
          {song?.sequence.map((sequencePatternId, renderSequenceId) => {
            const renderPattern = song.patterns[sequencePatternId];
            const isActivePattern = renderSequenceId === activeSequenceId;

            return (
              <StyledTrackerContentTable $type="pattern" key={renderSequenceId}>
                <StyledTrackerTableHeader
                  style={{
                    background: `linear-gradient(0deg, hsl(${patternHue(sequencePatternId)}deg 100% 70%) 0%, hsl(${patternHue(sequencePatternId)}deg 100% 80%) 100%)`,
                    borderColor: `hsl(${patternHue(sequencePatternId)}deg 80% 50% / 30%)`,
                  }}
                >
                  <StyledTrackerTableHeaderRow>
                    <TrackerHeaderCell type="patternIndex">
                      {orderLength > 1 ? (
                        <DropdownButton
                          variant="transparent"
                          label={String(sequencePatternId).padStart(2, "0")}
                        >
                          {renderPatternContextMenu({
                            dispatch,
                            patternIndex: sequencePatternId,
                            orderIndex: renderSequenceId,
                            orderLength,
                          })}
                        </DropdownButton>
                      ) : (
                        String(sequencePatternId).padStart(2, "0")
                      )}
                    </TrackerHeaderCell>
                    <TrackerHeaderCell
                      type="channel"
                      channel={0}
                      muted={channelStatus[0] && soloChannel === -1}
                      solo={soloChannel === 0}
                    >
                      Duty 1
                    </TrackerHeaderCell>
                    <TrackerHeaderCell
                      type="channel"
                      channel={1}
                      muted={channelStatus[1] && soloChannel === -1}
                      solo={soloChannel === 1}
                    >
                      Duty 2
                    </TrackerHeaderCell>
                    <TrackerHeaderCell
                      type="channel"
                      channel={2}
                      muted={channelStatus[2] && soloChannel === -1}
                      solo={soloChannel === 2}
                    >
                      Wave
                    </TrackerHeaderCell>
                    <TrackerHeaderCell
                      type="channel"
                      channel={3}
                      muted={channelStatus[3] && soloChannel === -1}
                      solo={soloChannel === 3}
                    >
                      Noise
                    </TrackerHeaderCell>
                  </StyledTrackerTableHeaderRow>
                </StyledTrackerTableHeader>

                <StyledTrackerTableBody
                  ref={isActivePattern ? tableRef : null}
                  tabIndex={isActivePattern ? 0 : -1}
                  onFocus={onFocus}
                  onContextMenu={onSelectionContextMenu}
                >
                  {renderPattern?.map(
                    (row: PatternCell[], rowIndex: number) => {
                      const rowFieldBase = rowIndex * TRACKER_ROW_SIZE;
                      const isPlaying =
                        playbackState[0] === renderSequenceId &&
                        playbackState[1] === rowIndex;
                      const isStepMarker = rowIndex % 8 === 0;

                      const activeLocalField =
                        activeField !== undefined &&
                        getSequenceIdFromGlobalField(activeField) ===
                          renderSequenceId
                          ? getLocalFieldFromGlobalField(activeField)
                          : undefined;

                      const isActive =
                        activeLocalField !== undefined &&
                        getRowIndexFromLocalField(activeLocalField) ===
                          rowIndex;

                      return (
                        <StyledTrackerRow
                          key={rowIndex}
                          $isStepMarker={isStepMarker}
                          $isActive={isActive}
                        >
                          <StyledTrackerCell
                            $isPlaying={isPlaying}
                            $isMuted={false}
                            data-row={rowIndex}
                            data-sequenceid={renderSequenceId}
                          >
                            <StyledTrackerRowIndexField
                              id={`cell_${renderSequenceId}_${rowIndex}`}
                            >
                              {renderCounter(rowIndex)}
                            </StyledTrackerRowIndexField>
                          </StyledTrackerCell>

                          {row.map((cell, rowChannelId) => {
                            const localField =
                              rowFieldBase +
                              rowChannelId * TRACKER_CHANNEL_FIELDS;

                            const isThisPatternSelected =
                              selectionOrigin?.sequenceId === renderSequenceId;

                            const isNoteActive =
                              activeLocalField === localField;
                            const isInstrumentActive =
                              activeLocalField === localField + 1;
                            const isEffectCodeActive =
                              activeLocalField === localField + 2;
                            const isEffectParamActive =
                              activeLocalField === localField + 3;

                            return (
                              <StyledTrackerCell
                                $isMuted={channelStatus[rowChannelId]}
                                key={rowChannelId}
                              >
                                <StyledTrackerNoteField
                                  id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_note`}
                                  $active={isNoteActive}
                                  ref={isNoteActive ? activeFieldRef : null}
                                  data-sequenceid={renderSequenceId}
                                  data-fieldid={localField}
                                  $selected={
                                    isThisPatternSelected &&
                                    selectedTrackerFieldSet.has(localField)
                                  }
                                >
                                  {renderNote(cell.note)}
                                </StyledTrackerNoteField>

                                <StyledTrackerInstrumentField
                                  id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_instrument`}
                                  $active={isInstrumentActive}
                                  ref={
                                    isInstrumentActive ? activeFieldRef : null
                                  }
                                  data-sequenceid={renderSequenceId}
                                  data-fieldid={localField + 1}
                                  $selected={
                                    isThisPatternSelected &&
                                    selectedTrackerFieldSet.has(localField + 1)
                                  }
                                >
                                  {renderInstrument(cell.instrument)}
                                </StyledTrackerInstrumentField>

                                <StyledTrackerEffectCodeField
                                  id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_effectcode`}
                                  $active={isEffectCodeActive}
                                  ref={
                                    isEffectCodeActive ? activeFieldRef : null
                                  }
                                  data-sequenceid={renderSequenceId}
                                  data-fieldid={localField + 2}
                                  $selected={
                                    isThisPatternSelected &&
                                    selectedTrackerFieldSet.has(localField + 2)
                                  }
                                >
                                  {renderEffect(cell.effectcode)}
                                </StyledTrackerEffectCodeField>

                                <StyledTrackerEffectParamField
                                  id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_effectparam`}
                                  $active={isEffectParamActive}
                                  ref={
                                    isEffectParamActive ? activeFieldRef : null
                                  }
                                  data-sequenceid={renderSequenceId}
                                  data-fieldid={localField + 3}
                                  $selected={
                                    isThisPatternSelected &&
                                    selectedTrackerFieldSet.has(localField + 3)
                                  }
                                >
                                  {renderEffectParam(cell.effectparam)}
                                </StyledTrackerEffectParamField>
                              </StyledTrackerCell>
                            );
                          })}
                        </StyledTrackerRow>
                      );
                    },
                  )}
                </StyledTrackerTableBody>
              </StyledTrackerContentTable>
            );
          })}

          {/* <StyledTrackerContentTable $type="pattern">
            <StyledTrackerTableHeader
              style={{
                background: `linear-gradient(0deg, hsl(${patternHue(patternId)}deg 100% 70%) 0%, hsl(${patternHue(patternId)}deg 100% 80%) 100%)`,
                borderColor: `hsl(${patternHue(patternId)}deg 80% 50% / 30%)`,
              }}
            >
              <StyledTrackerTableHeaderRow>
                <TrackerHeaderCell type="patternIndex">
                  {orderLength > 1 ? (
                    <DropdownButton
                      variant="transparent"
                      label={String(patternId).padStart(2, "0")}
                    >
                      {patternContextMenu}
                    </DropdownButton>
                  ) : (
                    String(patternId).padStart(2, "0")
                  )}
                </TrackerHeaderCell>
                <TrackerHeaderCell
                  type="channel"
                  channel={0}
                  muted={channelStatus[0] && soloChannel === -1}
                  solo={soloChannel === 0}
                >
                  Duty 1
                </TrackerHeaderCell>
                <TrackerHeaderCell
                  type="channel"
                  channel={1}
                  muted={channelStatus[1] && soloChannel === -1}
                  solo={soloChannel === 1}
                >
                  Duty 2
                </TrackerHeaderCell>
                <TrackerHeaderCell
                  type="channel"
                  channel={2}
                  muted={channelStatus[2] && soloChannel === -1}
                  solo={soloChannel === 2}
                >
                  Wave
                </TrackerHeaderCell>
                <TrackerHeaderCell
                  type="channel"
                  channel={3}
                  muted={channelStatus[3] && soloChannel === -1}
                  solo={soloChannel === 3}
                >
                  Noise
                </TrackerHeaderCell>
              </StyledTrackerTableHeaderRow>
            </StyledTrackerTableHeader>

            <StyledTrackerTableBody
              ref={tableRef}
              tabIndex={0}
              onFocus={onFocus}
              onContextMenu={onSelectionContextMenu}
            >
              {pattern?.map((row: PatternCell[], rowIndex: number) => {
                const isActive =
                  activeField !== undefined &&
                  getRowIndexFromField(activeField) === rowIndex;
                const isPlaying =
                  playbackState[0] === sequenceId &&
                  playbackState[1] === rowIndex;
                const isStepMarker = rowIndex % 8 === 0;
                const rowFieldBase = rowIndex * TRACKER_ROW_SIZE;

                return (
                  <StyledTrackerRow
                    key={rowIndex}
                    $isStepMarker={isStepMarker}
                    $isActive={isActive}
                  >
                    <StyledTrackerCell
                      $isPlaying={isPlaying}
                      $isMuted={false}
                      data-row={rowIndex}
                    >
                      <StyledTrackerRowIndexField id={`cell_${rowIndex}`}>
                        {renderCounter(rowIndex)}
                      </StyledTrackerRowIndexField>
                    </StyledTrackerCell>

                    {row.map((cell, rowChannelId) => {
                      const fieldCount =
                        rowFieldBase + rowChannelId * TRACKER_CHANNEL_FIELDS;

                      const isNoteActive = activeField === fieldCount;
                      const isInstrumentActive = activeField === fieldCount + 1;
                      const isEffectCodeActive = activeField === fieldCount + 2;
                      const isEffectParamActive =
                        activeField === fieldCount + 3;

                      return (
                        <StyledTrackerCell
                          $isMuted={channelStatus[rowChannelId]}
                          key={rowChannelId}
                        >
                          <StyledTrackerNoteField
                            id={`cell_${rowIndex}_${rowChannelId}_note`}
                            $active={isNoteActive}
                            ref={isNoteActive ? activeFieldRef : null}
                            data-fieldid={fieldCount}
                            $selected={selectedTrackerFieldSet.has(fieldCount)}
                          >
                            {renderNote(cell.note)}
                          </StyledTrackerNoteField>

                          <StyledTrackerInstrumentField
                            id={`cell_${rowIndex}_${rowChannelId}_instrument`}
                            $active={isInstrumentActive}
                            ref={isInstrumentActive ? activeFieldRef : null}
                            data-fieldid={fieldCount + 1}
                            $selected={selectedTrackerFieldSet.has(
                              fieldCount + 1,
                            )}
                          >
                            {renderInstrument(cell.instrument)}
                          </StyledTrackerInstrumentField>

                          <StyledTrackerEffectCodeField
                            id={`cell_${rowIndex}_${rowChannelId}_effectcode`}
                            $active={isEffectCodeActive}
                            ref={isEffectCodeActive ? activeFieldRef : null}
                            data-fieldid={fieldCount + 2}
                            $selected={selectedTrackerFieldSet.has(
                              fieldCount + 2,
                            )}
                          >
                            {renderEffect(cell.effectcode)}
                          </StyledTrackerEffectCodeField>

                          <StyledTrackerEffectParamField
                            id={`cell_${rowIndex}_${rowChannelId}_effectparam`}
                            $active={isEffectParamActive}
                            ref={isEffectParamActive ? activeFieldRef : null}
                            data-fieldid={fieldCount + 3}
                            $selected={selectedTrackerFieldSet.has(
                              fieldCount + 3,
                            )}
                          >
                            {renderEffectParam(cell.effectparam)}
                          </StyledTrackerEffectParamField>
                        </StyledTrackerCell>
                      );
                    })}
                  </StyledTrackerRow>
                );
              })}
            </StyledTrackerTableBody>
          </StyledTrackerContentTable> */}
        </StyledTrackerScrollCanvas>
      </StyledTrackerScrollWrapper>
      <TrackerKeyboard
        fieldType={currentFocus}
        octaveOffset={octaveOffset}
        open={showVirtualKeyboard}
        onKeyPressed={handleVirtualKeyPressed}
      />
      {selectionContextMenuElement}
    </StyledTrackerWrapper>
  );
};
