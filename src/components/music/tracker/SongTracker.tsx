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
import { SequenceEditor } from "components/music/sequence/SequenceEditor";
import { TrackerRow } from "./SongRow";
import scrollIntoView from "scroll-into-view-if-needed";
import { TrackerHeaderCell } from "./TrackerHeaderCell";
import { patternHue, playNotePreview } from "components/music/helpers";
import { getKeys } from "renderer/lib/keybindings/keyBindings";
import trackerActions from "store/features/tracker/trackerActions";
import API from "renderer/lib/api";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { useAppDispatch, useAppSelector } from "store/hooks";
import l10n from "shared/lib/lang/l10n";
import {
  StyledTrackerContentTable,
  StyledTrackerTableHeader,
  StyledTrackerTableHeaderRow,
  StyledTrackerWrapper,
  StyledTrackerTableBody,
  StyledTrackerContentWrapper,
} from "./style";
import { SplitPaneVerticalDivider } from "ui/splitpane/SplitPaneDivider";
import { SplitPaneHeader } from "ui/splitpane/SplitPaneHeader";
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
} from "./helpers";
import renderPatternContextMenu from "components/music/contentMenus/renderPatternContextMenu";
import renderTrackerContextMenu from "components/music/contentMenus/renderTrackerContextMenu";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { TRACKER_CHANNEL_FIELDS, TRACKER_ROW_SIZE } from "consts";
import { useContextMenu } from "ui/hooks/use-context-menu";
import {
  copyTrackerFields,
  cutTrackerFields,
  pasteTrackerFields,
} from "store/features/trackerDocument/trackerDocumentState";

interface SongTrackerProps {
  sequenceId: number;
  song: Song | null;
  height: number;
}

export const SongTracker = ({ song, sequenceId, height }: SongTrackerProps) => {
  const dispatch = useAppDispatch();

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

  const patternId = song?.sequence[sequenceId] ?? 0;
  const pattern = song?.patterns[patternId];

  const [selectionOrigin, setSelectionOriginState] = useState<
    Position | undefined
  >();
  const [selectionRect, setSelectionRectState] = useState<
    SelectionRect | undefined
  >();
  const [activeField, setActiveFieldState] = useState<number | undefined>();
  const [playbackState, setPlaybackState] = useState<[number, number]>([0, 0]);
  const [patternsPanelOpen, setPatternsPanelOpen] = useState(true);

  const selectionOriginRef = useRef<Position | undefined>(undefined);
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

  const setSelectionOrigin = useCallback((value: Position | undefined) => {
    selectionOriginRef.current = value;
    setSelectionOriginState(value);
  }, []);

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
  }, [setSelectionOrigin, setSelectionRect]);

  const setSingleFieldSelection = useCallback(
    (field: number) => {
      setSelectionOrigin(fieldToPosition(field));
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
      setSelectionRect(buildSelectionRect(origin, field));
    },
    [setSelectionRect],
  );

  const selectedTrackerFields = useMemo(
    () => getSelectedTrackerFields(selectionRect, selectionOrigin),
    [selectionOrigin, selectionRect],
  );

  useEffect(() => {
    selectedTrackerFieldsRef.current = selectedTrackerFields;
  }, [selectedTrackerFields]);

  const selectedTrackerRowSet = useMemo(() => {
    const rows = new Set<number>();
    for (const field of selectedTrackerFields) {
      rows.add(Math.floor(field / TRACKER_ROW_SIZE));
    }
    return rows;
  }, [selectedTrackerFields]);

  const togglePatternsPanel = useCallback(() => {
    setPatternsPanelOpen((value) => !value);
  }, []);

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

    const newChannelId = Math.floor(
      (activeField % TRACKER_ROW_SIZE) / TRACKER_CHANNEL_FIELDS,
    );
    dispatch(trackerActions.setSelectedChannel(newChannelId));

    if (activeField % TRACKER_CHANNEL_FIELDS >= 2) {
      dispatch(
        trackerActions.setSelectedEffectCell({
          sequenceId,
          patternId,
          rowId: Math.floor(activeField / TRACKER_ROW_SIZE),
          channelId: newChannelId,
        }),
      );
    }
  }, [activeField, dispatch, patternId, sequenceId]);

  const getCurrentSelectedTrackerFields = useCallback(() => {
    return selectedTrackerFieldsRef.current;
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!(e.target instanceof HTMLElement)) {
        return;
      }
      if (e.button > 1) {
        return;
      }

      const fieldId = e.target.dataset.fieldid;
      const rowId = e.target.dataset.row;

      if (fieldId !== undefined) {
        const parsedField = parseInt(fieldId, 10);
        const normalizedField = normalizeFieldIndex(parsedField);

        isMouseDownRef.current = true;

        if (e.shiftKey && selectionOriginRef.current) {
          isSelectingRef.current = true;
          setActiveField(normalizedField);
          updateSelectionToField(normalizedField);
        } else {
          isSelectingRef.current = false;
          setActiveField(normalizedField);
          setSingleFieldSelection(normalizedField);
        }
        return;
      }

      if (rowId !== undefined) {
        const row = parseInt(rowId, 10);

        dispatch(
          trackerActions.setDefaultStartPlaybackPosition([sequenceId, row]),
        );
        API.music.sendToMusicWindow({
          action: "position",
          position: [sequenceId, row],
        });
        return;
      }

      setActiveField(undefined);
    },
    [
      dispatch,
      sequenceId,
      setActiveField,
      setSingleFieldSelection,
      updateSelectionToField,
    ],
  );

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button > 1) {
      return;
    }
    isMouseDownRef.current = false;
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
      if (fieldId === undefined) {
        return;
      }

      const parsedField = parseInt(fieldId, 10);
      const normalizedField = normalizeFieldIndex(parsedField);

      updateSelectionToField(normalizedField);
    },
    [updateSelectionToField],
  );

  const editPatternCell = useCallback(
    (type: keyof PatternCell, value: number | null) => {
      const editingField = activeFieldValueRef.current;
      const currentPatternId = patternIdRef.current;

      if (editingField === undefined) {
        return;
      }

      dispatch(
        trackerDocumentActions.editPatternCell({
          patternId: currentPatternId,
          cell: [
            Math.floor(editingField / 16),
            Math.floor(editingField / 4) % 4,
          ],
          changes: {
            [type]: value,
          },
        }),
      );
    },
    [dispatch],
  );

  const editNoteField = useCallback(
    (value: number | null) => {
      const editingField = activeFieldValueRef.current;
      const currentOctaveOffset = octaveOffsetRef.current;
      const currentEditStep = editStepRef.current;
      const currentSong = songRef.current;

      if (editingField === undefined) {
        return;
      }

      const channel = Math.floor(editingField / 4) % 4;
      const instrument = selectedInstrumentIdRef.current;

      editPatternCell(
        "note",
        value === null ? null : value + currentOctaveOffset * 12,
      );

      if (value !== null) {
        editPatternCell("instrument", instrument);

        if (currentSong) {
          playNotePreview(
            currentSong,
            channel,
            value + currentOctaveOffset * 12,
            instrument,
          );
        }

        setActiveField(editingField + TRACKER_ROW_SIZE * currentEditStep);
      }
    },
    [editPatternCell, setActiveField],
  );

  const editInstrumentField = useCallback(
    (value: number | null) => {
      if (!activeFieldRef.current) {
        return;
      }

      const el = activeFieldRef.current;
      let newValue = value;

      if (value !== null && el.innerText !== ".." && el.innerText !== "15") {
        newValue = 10 * parseInt(el.innerText[1], 10) + value;
        if (newValue > 15) {
          newValue = 15;
        }
      }

      editPatternCell("instrument", newValue === null ? null : newValue - 1);
    },
    [editPatternCell],
  );

  const editEffectCodeField = useCallback(
    (value: number | null) => {
      editPatternCell("effectcode", value);
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

      editPatternCell("effectparam", newValue);
    },
    [editPatternCell],
  );

  const handleStructureKey = useCallback(
    (e: KeyboardEvent) => {
      const currentActiveField = activeFieldValueRef.current;
      const currentSelectedTrackerFields = getCurrentSelectedTrackerFields();

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
              selectedTrackerFields,
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
              selectedTrackerFields,
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
              selectedTrackerFields,
              direction: "insert",
            }),
          );
          return true;
        }
      }

      if (e.code === "Equal") {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "up",
            type: e.shiftKey ? "octave" : "all",
          }),
        );
      }

      if (e.code === "Minus") {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "down",
            type: e.shiftKey ? "octave" : "all",
          }),
        );
      }

      if (e.ctrlKey && e.shiftKey) {
        if (e.code === "KeyQ") {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "up",
              type: "octave",
            }),
          );
          return true;
        }
        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "down",
              type: "octave",
            }),
          );
          return true;
        }
      } else if (e.altKey && e.shiftKey) {
        if (e.code === "KeyQ") {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "up",
              type: "note",
            }),
          );
          return true;
        }
        if (e.code === "KeyA") {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "down",
              type: "note",
            }),
          );
          return true;
        }
      } else if (e.ctrlKey) {
        if (e.code === "KeyI") {
          dispatch(
            trackerDocumentActions.changeInstrumentTrackerFields({
              patternId,
              selectedTrackerFields,
              instrumentId: selectedInstrumentId,
            }),
          );
          return true;
        }
        if (e.code === "KeyK") {
          dispatch(
            trackerDocumentActions.interpolateTrackerFields({
              patternId,
              selectedTrackerFields,
            }),
          );
          return true;
        }
      }
      return false;
    },
    [
      clearSelection,
      dispatch,
      getCurrentSelectedTrackerFields,
      patternId,
      selectedInstrumentId,
      selectedTrackerFields,
    ],
  );

  const handleNavigationKey = useCallback(
    (e: KeyboardEvent) => {
      const currentActiveField = activeFieldValueRef.current;
      const currentSelectionRect = selectionRectRef.current;

      if (currentActiveField === undefined) {
        return false;
      }

      const movedField = getMovedField(currentActiveField, e.key, e.shiftKey);

      if (movedField === null) {
        return false;
      }

      e.preventDefault();

      const newActiveField = normalizeFieldIndex(movedField);

      const shouldExtendSelection =
        e.shiftKey &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown");

      if (shouldExtendSelection) {
        if (!isSelectingRef.current) {
          isSelectingRef.current = true;

          if (!currentSelectionRect) {
            setSelectionOrigin(fieldToPosition(currentActiveField));
          }
        }

        const origin =
          selectionOriginRef.current ?? fieldToPosition(currentActiveField);

        setSelectionRect(buildSelectionRect(origin, newActiveField));
      } else {
        const origin = fieldToPosition(newActiveField);
        setSelectionOrigin(origin);
        setSelectionRect(buildSelectionRect(origin, newActiveField));
      }

      setActiveField(newActiveField);
      return true;
    },
    [setActiveField, setSelectionOrigin, setSelectionRect],
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

      const currentFocus = getFieldColumnFocus(currentActiveField);
      if (!currentFocus) {
        return false;
      }

      getKeys(e.code, currentFocus, {
        editNoteField,
        editInstrumentField,
        editEffectCodeField,
        editEffectParamField,
      });

      return true;
    },
    [
      editEffectCodeField,
      editEffectParamField,
      editInstrumentField,
      editNoteField,
    ],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
    if (!playing && activeFieldRef.current) {
      const parentEl = activeFieldRef.current.parentElement;
      if (parentEl) {
        scrollIntoView(parentEl, {
          scrollMode: "if-needed",
          block: "end",
          inline: "end",
        });
      }
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
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "up",
              type: "octave",
            }),
          );
          return;
        }
        if (delta > 0) {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "down",
              type: "octave",
            }),
          );
          return;
        }
      } else {
        if (delta < 0) {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "up",
              type: "all",
            }),
          );
          return;
        }
        if (delta > 0) {
          dispatch(
            trackerDocumentActions.transposeTrackerFields({
              patternId,
              selectedTrackerFields,
              direction: "down",
              type: "all",
            }),
          );
          return;
        }
      }
    },
    [dispatch, patternId, selectedTrackerFields],
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

    if (noSelection) {
      const offset = TRACKER_CHANNEL_FIELDS * currentChannelId;
      setSelectionOrigin({ x: offset, y: 0 });
      setSelectionRect({
        x: offset,
        y: 0,
        width: 3,
        height: 63,
      });
    } else {
      setSelectionOrigin({ x: 0, y: 0 });
      setSelectionRect({ x: 0, y: 0, width: 15, height: 63 });
    }
  }, [setSelectionOrigin, setSelectionRect]);

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

      const currentSelectedTrackerFields = getCurrentSelectedTrackerFields();

      dispatch(
        copyTrackerFields({
          patternId,
          selectedTrackerFields: currentSelectedTrackerFields,
        }),
      );
    },
    [dispatch, getCurrentSelectedTrackerFields, patternId],
  );

  const onCut = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") return;

      const currentSelectedTrackerFields = getCurrentSelectedTrackerFields();

      dispatch(
        cutTrackerFields({
          patternId,
          selectedTrackerFields: currentSelectedTrackerFields,
        }),
      );
    },
    [dispatch, getCurrentSelectedTrackerFields, patternId],
  );

  const onPaste = useCallback(async () => {
    const firstField = getCurrentSelectedTrackerFields()?.[0];
    if (firstField) {
      await dispatch(
        pasteTrackerFields({
          patternId,
          startField: firstField,
        }),
      );
    }
  }, [dispatch, getCurrentSelectedTrackerFields, patternId]);

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
        selectedInstrumentId,
      }),
    [dispatch, patternIndex, selectedTrackerFields, selectedInstrumentId],
  );

  const {
    onContextMenu: onSelectionContextMenu,
    contextMenuElement: selectionContextMenuElement,
  } = useContextMenu({
    getMenu: getSelectionContextMenu,
  });

  useLayoutEffect(() => {
    // If sequence id changes clear the current selection
    clearSelection();
  }, [sequenceId, clearSelection]);

  return (
    <StyledTrackerWrapper style={{ height }}>
      <StyledTrackerContentWrapper ref={scrollRef}>
        <StyledTrackerContentTable>
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
            tabIndex={0}
            onFocus={onFocus}
            onContextMenu={onSelectionContextMenu}
          >
            {pattern?.map((row: PatternCell[], i: number) => {
              const isActiveRow =
                activeField !== undefined &&
                Math.floor(activeField / TRACKER_ROW_SIZE) === i;
              const isPlaying =
                playbackState[0] === sequenceId && playbackState[1] === i;
              const isSelected = selectedTrackerRowSet.has(i);

              return (
                <TrackerRow
                  key={`__${i}`}
                  id={`__${i}`}
                  n={i}
                  row={row}
                  fieldCount={i * TRACKER_ROW_SIZE}
                  activeField={isActiveRow ? activeField : undefined}
                  isActive={isActiveRow}
                  isPlaying={isPlaying}
                  ref={activeFieldRef}
                  channelStatus={channelStatus}
                  selectedTrackerFields={
                    isSelected ? selectedTrackerFields : []
                  }
                />
              );
            })}
          </StyledTrackerTableBody>
        </StyledTrackerContentTable>
      </StyledTrackerContentWrapper>

      <SplitPaneVerticalDivider />
      <SplitPaneHeader
        onToggle={togglePatternsPanel}
        collapsed={!patternsPanelOpen}
      >
        {l10n("FIELD_ORDER")}
      </SplitPaneHeader>
      {patternsPanelOpen && (
        <SequenceEditor
          direction="horizontal"
          sequence={song?.sequence}
          patterns={song?.patterns.length}
          playingSequence={playbackState[0]}
        />
      )}
      {selectionContextMenuElement}
    </StyledTrackerWrapper>
  );
};
