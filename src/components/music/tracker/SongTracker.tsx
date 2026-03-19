import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Song, PatternCell } from "shared/lib/uge/types";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { SequenceEditor } from "components/music/SequenceEditor";
import { TrackerRow } from "./SongRow";
import scrollIntoView from "scroll-into-view-if-needed";
import { TrackerHeaderCell } from "./TrackerHeaderCell";
import {
  getInstrumentTypeByChannel,
  getInstrumentListByType,
  patternHue,
} from "components/music/helpers";
import {
  NO_CHANGE_ON_PASTE,
  parseClipboardToPattern,
  parsePatternFieldsToClipboard,
} from "components/music/musicClipboardHelpers";
import { getKeys, KeyWhen } from "renderer/lib/keybindings/keyBindings";
import trackerActions from "store/features/tracker/trackerActions";
import { clamp, cloneDeep, mergeWith } from "lodash";
import API from "renderer/lib/api";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { createPatternCell } from "shared/lib/uge/song";
import l10n from "shared/lib/lang/l10n";
import {
  StyledTrackerContentWrapper,
  StyledTrackerHeader,
  StyledTrackerHeaderSpacer,
  StyledTrackerOrderSidebar,
  StyledTrackerPattern,
  StyledTrackerWrapper,
} from "./style";
import { SplitPaneVerticalDivider } from "ui/splitpane/SplitPaneDivider";
import { SplitPaneHeader } from "ui/splitpane/SplitPaneHeader";

function getSelectedTrackerFields(
  selectionRect: SelectionRect | undefined,
  selectionOrigin: Position | undefined,
) {
  const selectedTrackerFields = [];
  if (selectionRect) {
    for (
      let i = selectionRect.x;
      i <= selectionRect.x + selectionRect.width;
      i++
    ) {
      for (
        let j = selectionRect.y;
        j <= selectionRect.y + selectionRect.height;
        j++
      ) {
        selectedTrackerFields.push(j * ROW_SIZE + i);
      }
    }
  } else if (selectionOrigin) {
    selectedTrackerFields.push(
      selectionOrigin.y * ROW_SIZE + selectionOrigin.x,
    );
  }
  return selectedTrackerFields;
}

interface SongTrackerProps {
  sequenceId: number;
  song: Song | null;
  height: number;
  channelStatus: boolean[];
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

const CHANNEL_FIELDS = 4;
const ROW_SIZE = CHANNEL_FIELDS * 4;
const NUM_FIELDS = ROW_SIZE * 64;

export const SongTracker = ({
  song,
  sequenceId,
  height,
  channelStatus,
}: SongTrackerProps) => {
  const dispatch = useAppDispatch();

  const playing = useAppSelector((state) => state.tracker.playing);
  const editStep = useAppSelector((state) => state.tracker.editStep);
  const defaultInstruments = useAppSelector(
    (state) => state.tracker.defaultInstruments,
  );
  const octaveOffset = useAppSelector((state) => state.tracker.octaveOffset);
  const startPlaybackPosition = useAppSelector(
    (state) => state.tracker.startPlaybackPosition,
  );
  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );

  const patternId = song?.sequence[sequenceId] || 0;
  const pattern = song?.patterns[patternId];

  const [selectionOrigin, setSelectionOrigin] = useState<
    Position | undefined
  >();
  const [selectionRect, setSelectionRect] = useState<
    SelectionRect | undefined
  >();
  const [isSelecting, setIsSelecting] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const selectedTrackerFields = useMemo(
    () => getSelectedTrackerFields(selectionRect, selectionOrigin),
    [selectionOrigin, selectionRect],
  );
  const selectedTrackerRows = selectedTrackerFields?.map((f) =>
    Math.floor(f / ROW_SIZE),
  );

  const [playbackState, setPlaybackState] = useState([0, 0]);

  const [patternsPanelOpen, setPatternsPanelOpen] = useState(true);
  const togglePatternsPanel = useCallback(() => {
    setPatternsPanelOpen(!patternsPanelOpen);
  }, [patternsPanelOpen, setPatternsPanelOpen]);

  useEffect(() => {
    setPlaybackState(startPlaybackPosition);
  }, [setPlaybackState, startPlaybackPosition]);
  useEffect(() => {
    const listener = (_event: unknown, d: MusicDataReceivePacket) => {
      if (d.action === "update") {
        setPlaybackState(d.update);
      }
    };
    const unsubscribeMusicData = API.events.music.response.subscribe(listener);

    return () => {
      unsubscribeMusicData();
    };
  }, [setPlaybackState]);

  const [activeField, setActiveField] = useState<number | undefined>();
  const channelId = useAppSelector((state) => state.tracker.selectedChannel);

  useEffect(() => {
    if (activeField !== undefined) {
      const newChannelId = Math.floor(
        (activeField % ROW_SIZE) / CHANNEL_FIELDS,
      );
      dispatch(trackerActions.setSelectedChannel(newChannelId));
      if (activeField % CHANNEL_FIELDS >= 2) {
        dispatch(
          trackerActions.setSelectedEffectCell(
            Math.floor(activeField / ROW_SIZE),
          ),
        );
      }
    }
  }, [activeField, dispatch]);

  const playingRowRef = useRef<HTMLSpanElement>(null);
  if (playingRowRef && playingRowRef.current) {
    if (playing) {
      playingRowRef.current.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "nearest",
      });
    }
  }

  const activeFieldRef = useRef<HTMLSpanElement>(null);

  const transposeSelectedTrackerFields = useCallback(
    (change: number, large: boolean) => {
      if (pattern && selectedTrackerFields) {
        const newPattern = cloneDeep(pattern);
        for (let i = 0; i < selectedTrackerFields.length; i++) {
          const field = selectedTrackerFields[i];
          const newPatternCell = {
            ...newPattern[Math.floor(field / 16)][Math.floor(field / 4) % 4],
          };

          if (field % 4 === 0 && newPatternCell.note !== null) {
            newPatternCell.note = clamp(
              newPatternCell.note + (large ? change * 12 : change),
              0,
              71,
            );
          }
          if (field % 4 === 1 && newPatternCell.instrument !== null) {
            newPatternCell.instrument = clamp(
              newPatternCell.instrument + (large ? change * 10 : change),
              0,
              14,
            );
          }
          if (field % 4 === 2 && newPatternCell.effectcode !== null) {
            newPatternCell.effectcode = clamp(
              newPatternCell.effectcode + change,
              0,
              15,
            );
          }
          if (field % 4 === 3 && newPatternCell.effectparam !== null) {
            newPatternCell.effectparam = clamp(
              newPatternCell.effectparam + (large ? change * 16 : change),
              0,
              255,
            );
          }

          newPattern[Math.floor(field / 16)][Math.floor(field / 4) % 4] =
            newPatternCell;
        }
        dispatch(
          trackerDocumentActions.editPattern({
            patternId: patternId,
            pattern: newPattern,
          }),
        );
      }
    },
    [dispatch, pattern, patternId, selectedTrackerFields],
  );

  const deleteSelectedTrackerFields = useCallback(() => {
    if (pattern && selectedTrackerFields) {
      const newPattern = cloneDeep(pattern);
      for (let i = 0; i < selectedTrackerFields.length; i++) {
        const field = selectedTrackerFields[i];
        const newPatternCell = {
          ...newPattern[Math.floor(field / 16)][Math.floor(field / 4) % 4],
        };

        switch (field % 4) {
          case 0:
            newPatternCell.note = null;
            break;
          case 1:
            newPatternCell.instrument = null;
            break;
          case 2:
            newPatternCell.effectcode = null;
            break;
          case 3:
            newPatternCell.effectparam = null;
            break;
        }

        newPattern[Math.floor(field / 16)][Math.floor(field / 4) % 4] =
          newPatternCell;
      }
      dispatch(
        trackerDocumentActions.editPattern({
          patternId: patternId,
          pattern: newPattern,
        }),
      );
    }
  }, [dispatch, pattern, patternId, selectedTrackerFields]);

  const insertTrackerFields = useCallback(
    (uninsert: boolean) => {
      if (pattern && activeField !== undefined) {
        const newChannelId = Math.floor(
          (activeField % ROW_SIZE) / CHANNEL_FIELDS,
        );
        const startRow = Math.floor(activeField / ROW_SIZE);
        const newPattern = cloneDeep(pattern);
        if (uninsert) {
          for (let i = startRow; i < 63; i++) {
            newPattern[i][newChannelId] = newPattern[i + 1][newChannelId];
          }
        } else {
          for (let i = 63; i > startRow; i--) {
            newPattern[i][newChannelId] = newPattern[i - 1][newChannelId];
          }
        }
        newPattern[uninsert ? 63 : startRow][newChannelId] =
          createPatternCell();
        dispatch(
          trackerDocumentActions.editPattern({
            patternId: patternId,
            pattern: newPattern,
          }),
        );
      }
    },
    [dispatch, pattern, patternId, activeField],
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!e.target || !(e.target instanceof HTMLElement)) {
        return;
      }

      const fieldId = e.target.dataset["fieldid"];
      const rowId = e.target.dataset["row"];

      if (!!fieldId) {
        setIsMouseDown(true);

        if (e.shiftKey) {
          setIsSelecting(true);

          const newActiveField =
            ((parseInt(fieldId) % NUM_FIELDS) + NUM_FIELDS) % NUM_FIELDS;

          if (selectionOrigin) {
            const x2 = newActiveField % ROW_SIZE;
            const y2 = Math.floor(newActiveField / ROW_SIZE);

            const x = Math.min(selectionOrigin.x, x2);
            const y = Math.min(selectionOrigin.y, y2);
            const width = Math.abs(selectionOrigin.x - x2);
            const height = Math.abs(selectionOrigin.y - y2);
            setSelectionRect({ x, y, width, height });
          }
          setActiveField(parseInt(fieldId));
        } else {
          setActiveField(parseInt(fieldId));
          const x = parseInt(fieldId) % ROW_SIZE;
          const y = Math.floor(parseInt(fieldId) / ROW_SIZE);
          setSelectionOrigin({ x, y });
          setSelectionRect(undefined);
        }
      } else if (rowId) {
        dispatch(
          trackerActions.setDefaultStartPlaybackPosition([
            sequenceId,
            parseInt(rowId),
          ]),
        );
        API.music.sendToMusicWindow({
          action: "position",
          position: [sequenceId, parseInt(rowId)],
        });
      } else {
        setActiveField(undefined);
      }
    },
    [dispatch, selectionOrigin, sequenceId],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!e.target || !(e.target instanceof HTMLElement)) {
        return;
      }
      if (isMouseDown) {
        setIsMouseDown(false);
      }
    },
    [isMouseDown],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!e.target || !(e.target instanceof HTMLElement)) {
        return;
      }
      if (isMouseDown) {
        const fieldId = e.target.dataset["fieldid"];

        if (!!fieldId) {
          const newActiveField =
            ((parseInt(fieldId) % NUM_FIELDS) + NUM_FIELDS) % NUM_FIELDS;

          if (selectionOrigin) {
            const x2 = newActiveField % ROW_SIZE;
            const y2 = Math.floor(newActiveField / ROW_SIZE);

            const x = Math.min(selectionOrigin.x, x2);
            const y = Math.min(selectionOrigin.y, y2);
            const width = Math.abs(selectionOrigin.x - x2);
            const height = Math.abs(selectionOrigin.y - y2);
            setSelectionRect({ x, y, width, height });
          }
        }
      }
    },
    [isMouseDown, selectionOrigin],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const editPatternCell =
        (type: keyof PatternCell) => (value: number | null) => {
          if (activeField === undefined) {
            return;
          }
          dispatch(
            trackerDocumentActions.editPatternCell({
              patternId: patternId,
              cell: [
                Math.floor(activeField / 16),
                Math.floor(activeField / 4) % 4,
              ],
              changes: {
                [type]: value,
              },
            }),
          );
        };

      const editNoteField = (value: number | null) => {
        if (activeField === undefined) {
          return;
        }

        const channel = Math.floor(activeField / 4) % 4;
        const defaultInstrument = defaultInstruments[channel];

        editPatternCell("note")(
          value === null ? null : value + octaveOffset * 12,
        );
        if (value !== null) {
          editPatternCell("instrument")(defaultInstrument);
          if (song) {
            const instrumentType =
              getInstrumentTypeByChannel(channel) || "duty";
            const instrumentList = getInstrumentListByType(
              song,
              instrumentType,
            );
            API.music.sendToMusicWindow({
              action: "preview",
              note: value + octaveOffset * 12,
              type: instrumentType,
              instrument: instrumentList[defaultInstrument],
              square2: channel === 1,
            });
          }
          setActiveField(activeField + ROW_SIZE * editStep);
        }
      };

      const editInstrumentField = (value: number | null) => {
        if (activeFieldRef && activeFieldRef.current) {
          const el = activeFieldRef.current;
          let newValue = value;
          if (
            value !== null &&
            el.innerText !== ".." &&
            el.innerText !== "15"
          ) {
            newValue = 10 * parseInt(el.innerText[1]) + value;
            if (newValue > 15) newValue = 15;
          }
          editPatternCell("instrument")(
            newValue === null ? null : newValue - 1,
          );
        }
      };

      const editEffectCodeField = (value: number | null) => {
        editPatternCell("effectcode")(value);
      };

      const editEffectParamField = (value: number | null) => {
        if (activeFieldRef && activeFieldRef.current) {
          const el = activeFieldRef.current;
          let newValue = value;
          if (value !== null && el.innerText !== "..") {
            newValue = 16 * parseInt(el.innerText[1], 16) + value;
          }
          editPatternCell("effectparam")(newValue);
        }
      };

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectionOrigin(undefined);
        setSelectionRect(undefined);
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if ((e.shiftKey || e.ctrlKey) && activeField !== undefined) {
          e.preventDefault();
          insertTrackerFields(true);
          return;
        }
        if (selectedTrackerFields && selectedTrackerFields.length > 0) {
          e.preventDefault();
          deleteSelectedTrackerFields();
          return;
        }
      }

      if (e.key === "Insert" || e.key === "Enter") {
        if (activeField !== undefined) {
          insertTrackerFields(false);
          return;
        }
      }

      if (activeField === undefined) {
        return;
      }

      let tmpActiveField = activeField;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        tmpActiveField -= 1;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        tmpActiveField += 1;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        tmpActiveField += ROW_SIZE;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        tmpActiveField -= ROW_SIZE;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          tmpActiveField -= 4;
        } else {
          tmpActiveField += 4;
        }
      }
      if (e.shiftKey && !isSelecting) {
        setIsSelecting(true);
        if (!selectionRect) {
          const x = activeField % ROW_SIZE;
          const y = Math.floor(activeField / ROW_SIZE);
          setSelectionOrigin({
            x,
            y,
          });
        }
      }
      if (activeField !== tmpActiveField) {
        const newActiveField =
          ((tmpActiveField % NUM_FIELDS) + NUM_FIELDS) % NUM_FIELDS;

        if (isSelecting && selectionOrigin) {
          const x2 = newActiveField % ROW_SIZE;
          const y2 = Math.floor(newActiveField / ROW_SIZE);

          const x = Math.min(selectionOrigin.x, x2);
          const y = Math.min(selectionOrigin.y, y2);
          const width = Math.abs(selectionOrigin.x - x2);
          const height = Math.abs(selectionOrigin.y - y2);

          setSelectionRect({ x, y, width, height });
        } else {
          setSelectionOrigin(undefined);
          setSelectionRect(undefined);
        }

        setActiveField(newActiveField);

        if (activeFieldRef && activeFieldRef.current) {
          if (!playing) {
            scrollIntoView(activeFieldRef.current.parentElement as Element, {
              scrollMode: "if-needed",
              block: "nearest",
            });
          }
        }
      }

      let currentFocus: KeyWhen = null;

      switch (activeField % 4) {
        case 0:
          currentFocus = "noteColumnFocus";
          break;
        case 1:
          currentFocus = "instrumentColumnFocus";
          break;
        case 2:
          currentFocus = "effectCodeColumnFocus";
          break;
        case 3:
          currentFocus = "effectParamColumnFocus";
          break;
      }

      if (e.ctrlKey) {
        if (e.shiftKey) {
          if (e.key === "Q" || e.key === "+" || e.key === "=")
            return transposeSelectedTrackerFields(1, true);
          if (e.key === "A" || e.key === "_")
            return transposeSelectedTrackerFields(-1, true);
        } else {
          if (e.key === "=") return transposeSelectedTrackerFields(1, false);
          if (e.key === "-") return transposeSelectedTrackerFields(-1, false);
        }
        return;
      } else if (e.metaKey) {
        return;
      }

      if (currentFocus && !e.metaKey && !e.ctrlKey && !e.altKey) {
        getKeys(e.code, currentFocus, {
          editNoteField,
          editInstrumentField,
          editEffectCodeField,
          editEffectParamField,
        });
      }
    },
    [
      activeField,
      isSelecting,
      dispatch,
      patternId,
      defaultInstruments,
      song,
      octaveOffset,
      editStep,
      selectedTrackerFields,
      insertTrackerFields,
      deleteSelectedTrackerFields,
      selectionRect,
      selectionOrigin,
      playing,
      transposeSelectedTrackerFields,
    ],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) {
      setIsSelecting(false);
    }
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY === 0 ? e.deltaX : e.deltaY;
        if (e.shiftKey) {
          if (delta < 0) return transposeSelectedTrackerFields(1, true);
          if (delta > 0) return transposeSelectedTrackerFields(-1, true);
        } else {
          if (delta < 0) return transposeSelectedTrackerFields(1, false);
          if (delta > 0) return transposeSelectedTrackerFields(-1, false);
        }
        return;
      }
    },
    [transposeSelectedTrackerFields],
  );

  const selectionRectRef = useRef(selectionRect);

  useEffect(() => {
    selectionRectRef.current = selectionRect;
  }, [selectionRect]);

  const onSelectAll = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.focusNode) {
      return;
    }

    const noSelection =
      !selectionRectRef.current ||
      selectionRectRef.current.width === 0 ||
      selectionRectRef.current.height === 0;

    if (noSelection) {
      // Select single channel
      const offset = CHANNEL_FIELDS * channelId;
      setSelectionOrigin({ x: offset, y: 0 });
      setSelectionRect({
        x: offset,
        y: 0,
        width: 3,
        height: 63,
      });
    } else {
      // Select all channels
      setSelectionOrigin({ x: 0, y: 0 });
      setSelectionRect({ x: 0, y: 0, width: 15, height: 63 });
    }
  }, [channelId]);

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

  useEffect(() => {
    if (subpatternEditorFocus) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyA") {
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

  const onFocus = useCallback(
    (_e: React.FocusEvent<HTMLDivElement>) => {
      if (activeField === undefined) {
        setActiveField(0);
      }
    },
    [activeField, setActiveField],
  );

  const onBlur = useCallback((_e: React.FocusEvent<HTMLDivElement>) => {
    setActiveField(undefined);
    setSelectionOrigin(undefined);
    setSelectionRect(undefined);
  }, []);

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.nodeName === "INPUT") {
        return;
      }
      if (pattern && selectedTrackerFields) {
        // const parsedSelectedPattern = parsePatternToClipboard(pattern);
        const parsedSelectedPattern = parsePatternFieldsToClipboard(
          pattern,
          selectedTrackerFields,
        );
        e.preventDefault();
        e.clipboardData?.setData("text/plain", parsedSelectedPattern);
        void API.clipboard.writeText(parsedSelectedPattern);
      }
    },
    [pattern, selectedTrackerFields],
  );

  const onCut = useCallback(
    (e?: ClipboardEvent) => {
      if (pattern && selectedTrackerFields) {
        const parsedSelectedPattern = parsePatternFieldsToClipboard(
          pattern,
          selectedTrackerFields,
        );
        e?.preventDefault();
        e?.clipboardData?.setData("text/plain", parsedSelectedPattern);
        void API.clipboard.writeText(parsedSelectedPattern);
        deleteSelectedTrackerFields();
      }
    },
    [deleteSelectedTrackerFields, pattern, selectedTrackerFields],
  );

  const onPaste = useCallback(async () => {
    if (pattern) {
      const tempActiveField =
        activeField !== undefined
          ? activeField
          : selectionOrigin
            ? selectionOrigin.y * ROW_SIZE + selectionOrigin.x
            : 0;
      if (activeField === undefined) {
        setActiveField(tempActiveField);
      }
      const newPastedPattern = parseClipboardToPattern(
        await API.clipboard.readText(),
      );
      if (newPastedPattern && channelId !== undefined) {
        const startRow = Math.floor(tempActiveField / ROW_SIZE);
        const newPattern = cloneDeep(pattern);
        for (let i = 0; i < newPastedPattern.length; i++) {
          const pastedPatternCellRow = newPastedPattern[i];
          for (let j = 0; j < 4 - channelId; j++) {
            if (pastedPatternCellRow[j] && newPattern[startRow + i]) {
              newPattern[startRow + i][channelId + j] = mergeWith(
                newPattern[startRow + i][channelId + j],
                pastedPatternCellRow[j],
                (o, s) => (s === NO_CHANGE_ON_PASTE ? o : s),
              );
            }
          }
        }
        dispatch(
          trackerDocumentActions.editPattern({
            patternId: patternId,
            pattern: newPattern,
          }),
        );
      }
    }
  }, [activeField, channelId, dispatch, pattern, patternId, selectionOrigin]);

  // Clipboard
  useEffect(() => {
    if (!subpatternEditorFocus) {
      window.addEventListener("copy", onCopy);
      window.addEventListener("cut", onCut);
      window.addEventListener("paste", onPaste);
      return () => {
        window.removeEventListener("copy", onCopy);
        window.removeEventListener("cut", onCut);
        window.removeEventListener("paste", onPaste);
      };
    }
  }, [onCopy, onCut, onPaste, subpatternEditorFocus]);

  const soloChannel = useMemo(() => {
    const firstUnmuted = channelStatus.findIndex((x) => !x);
    const lastUnmuted = channelStatus.findLastIndex((x) => !x);
    if (firstUnmuted !== -1 && firstUnmuted === lastUnmuted) {
      return firstUnmuted;
    }
    return -1;
  }, [channelStatus]);

  return (
    <StyledTrackerWrapper style={{ height }}>
      <StyledTrackerContentWrapper style={{ height: height - 30 }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur nec
        congue dui. Nullam placerat, dolor vitae porttitor lacinia, ipsum enim
        bibendum justo, eget placerat tellus ex vitae magna. Vestibulum faucibus
        felis nec dolor pellentesque sagittis. Pellentesque venenatis metus
        erat, nec consequat lacus tristique vel. Nulla ut tempus libero. In at
        nulla aliquet ipsum tempus consequat. Cras sollicitudin dolor a enim
        eleifend, vel porta sapien ultricies. Integer efficitur elit non pretium
        semper. Sed aliquam orci consectetur sagittis ullamcorper. Suspendisse
        congue nulla vitae interdum mattis. Sed molestie vel nibh sit amet
        dictum. Mauris aliquam vel lacus a ornare. Phasellus non lacinia erat.
        Nunc enim eros, dapibus sit amet nulla quis, congue maximus tellus.
        Suspendisse libero erat, tincidunt sit amet velit in, semper egestas
        nibh. Fusce sit amet euismod nibh, ut vestibulum leo. Pellentesque at
        libero lacinia, auctor elit id, pharetra sem. In sit amet auctor velit.
        Suspendisse in lectus vestibulum, volutpat massa et, euismod quam. Sed
        venenatis, felis non vehicula vulputate, dolor augue porta arcu, nec
        tristique felis quam et nulla. Aenean ut luctus mi. Aenean tincidunt
        aliquam erat at interdum. Nam luctus risus risus, sed congue elit
        porttitor non. Fusce tempus diam interdum, faucibus ligula eu, pharetra
        purus. Integer molestie mi urna. Cras non dolor eget est congue luctus.
        Morbi quam urna, interdum eget felis quis, accumsan maximus mi. Etiam
        nisl ligula, condimentum et orci tempor, hendrerit vulputate nibh.
        Vestibulum gravida ut nisl sit amet gravida. Phasellus vel dolor nec
        dolor pharetra porta. Vivamus convallis, neque at pharetra tincidunt,
        sem eros malesuada magna, quis tincidunt est ligula et nunc. Lorem ipsum
        dolor sit amet, consectetur adipiscing elit. Cras finibus pellentesque
        sagittis. Quisque dui nibh, lobortis sed interdum sit amet, vestibulum
        vitae dolor. Ut pretium, nisi euismod tristique feugiat, erat leo
        posuere turpis, ut egestas neque justo sed ligula. In magna nunc,
        tristique vitae pellentesque eu, vulputate eget est. Etiam tristique
        elit massa, sit amet vehicula lorem laoreet eget. Proin aliquam risus
        sapien, nec dignissim diam consequat eu. Donec ornare placerat libero
        eget pharetra. Duis et pellentesque urna. Cras mattis fermentum magna,
        eget accumsan est placerat et. Phasellus et congue leo. Vivamus congue
        enim mauris. Mauris laoreet risus sollicitudin varius viverra.
        Suspendisse at leo porta, semper neque porttitor, egestas ligula. Donec
        ullamcorper interdum massa, at fermentum nibh vestibulum eget. Donec
        placerat ut purus quis finibus. Vivamus blandit, dolor ut tincidunt
        fringilla, libero ante semper sem, sed ultrices ante mi ut sem. Fusce
        facilisis, lectus in bibendum pellentesque, odio nisi fermentum purus,
        in luctus massa turpis in lacus. In laoreet eu mi vel condimentum.
        Praesent at porta metus, sed efficitur sapien. Integer maximus eros
        ligula, ut congue ante sagittis eu. Vivamus egestas a diam a facilisis.
        In pharetra ex sollicitudin cursus vehicula. Pellentesque vitae
        ultricies tellus. Morbi non quam a neque eleifend tincidunt. Curabitur
        vel massa leo. Nulla sodales facilisis pharetra. Suspendisse id mattis
        erat, nec imperdiet metus. Mauris semper quis justo quis varius. Nullam
        nec turpis bibendum, faucibus mauris eu, fermentum lectus. In rhoncus
        enim sed nisl faucibus lobortis. Praesent facilisis velit sem, ut
        ullamcorper turpis elementum id. Interdum et malesuada fames ac ante
        ipsum primis in faucibus. Donec pulvinar rutrum condimentum. Etiam eget
        turpis enim. Suspendisse sed ornare dui. Duis dapibus libero ut lectus
        cursus tristique. Aenean dapibus venenatis sem, at lobortis sem
        ultricies quis. Aenean laoreet diam odio, id luctus felis efficitur ut.
        Duis augue lectus, tincidunt at lobortis in, facilisis a sapien.
        Curabitur faucibus risus ornare imperdiet suscipit. Nulla convallis
        libero ac felis malesuada congue. Pellentesque eget est rutrum, blandit
        lectus quis, porta mi. Suspendisse consectetur eros in pharetra
        lobortis. Nunc efficitur ultrices mauris eget facilisis. Proin rutrum
        tincidunt eros vitae tempus. Curabitur porttitor, massa a euismod
        ullamcorper, nunc urna sodales nibh, a consequat neque libero et tellus.
        Phasellus luctus, nulla sit amet iaculis vestibulum, metus dolor
        facilisis nulla, ac iaculis ipsum ipsum tristique urna. Aliquam luctus
        consectetur dui at malesuada. Praesent vitae metus quis nisi aliquam
        molestie. Phasellus nec tellus sed nisi tempus pretium in ac quam. Donec
        faucibus, orci in aliquet aliquet, orci leo blandit dui, non aliquet
        elit lacus eu dui. Donec eu semper felis. Duis sagittis ac elit nec
        ornare. Vivamus auctor lorem ac justo posuere, et ultricies orci
        egestas. In tincidunt sem nisl, quis congue turpis facilisis ut. Vivamus
        viverra sit amet est a tempus. Fusce nisl risus, facilisis sed velit et,
        porta porttitor tortor. Suspendisse semper scelerisque posuere. Nulla eu
        urna rhoncus, suscipit purus sit amet, sollicitudin erat. Mauris eu
        pharetra sapien. Cras maximus elementum magna sit amet porttitor.
        Curabitur erat neque, cursus vel dapibus quis, egestas ac quam.
        Pellentesque velit eros, tincidunt ut congue eget, faucibus non nibh.
        Phasellus sit amet imperdiet est, ut mollis enim. Pellentesque posuere
        lorem quis nisi fringilla scelerisque. Suspendisse sagittis eros
        fermentum quam gravida blandit. Nam in metus vehicula, maximus massa
        vel, finibus enim. Ut bibendum rhoncus urna, vel efficitur nibh
        dignissim at. Curabitur aliquam maximus eros, quis ultricies eros
        vestibulum sit amet. Duis ex augue, tincidunt vel facilisis id,
        elementum maximus sem. Aenean accumsan justo quis tristique porttitor.
        Mauris dapibus leo arcu, nec sodales felis porta id. Fusce pharetra,
        enim eget scelerisque semper, ante nisi iaculis lectus, a consectetur
        eros nunc in mauris. Sed nec erat massa. Ut ac magna egestas, eleifend
        libero in, auctor ex. Suspendisse congue pulvinar erat ac dictum. Sed
        dignissim vestibulum eros auctor malesuada. Integer sed congue ante, vel
        varius felis. In facilisis risus sed risus ultricies sagittis. Sed et
        ante id neque convallis faucibus. Pellentesque eu volutpat sem. Maecenas
        ullamcorper nibh orci, in iaculis tellus blandit ac. Ut dui dui, commodo
        sit amet libero ut, pharetra congue libero. Aenean feugiat, tortor vitae
        venenatis porttitor, lacus orci fermentum felis, non commodo sem augue
        ac est. Donec ornare, turpis at elementum semper, nibh sapien suscipit
        libero, a mattis ipsum dui sit amet ligula. Proin quam turpis, tincidunt
        a nisl quis, laoreet ullamcorper ligula. Suspendisse volutpat ultricies
        egestas. Duis sodales sapien non nisi imperdiet consectetur. Etiam
        luctus ac augue quis egestas. Morbi a facilisis leo. Proin lobortis
        dapibus sapien, eu vulputate nunc molestie aliquam. Ut nec purus nec
        tortor varius tempor. Etiam dolor turpis, tempus sit amet vehicula sit
        amet, tincidunt sed nulla. Fusce non sapien non metus facilisis rhoncus
        faucibus sit amet libero. Morbi a sapien eget felis congue faucibus.
        Morbi aliquam metus ut sollicitudin ornare.
        {/* <StyledTrackerHeader
        style={{
          background: `linear-gradient(0deg, hsl(${patternHue(patternId)}deg 100% 70%) 0%, hsl(${patternHue(patternId)}deg 100% 80%) 100%)`,
        }}
      >
        <TrackerHeaderCell type="order">
          {l10n("FIELD_ORDER")}
        </TrackerHeaderCell>
        <TrackerHeaderCell type="patternIndex">
          {String(patternId).padStart(2, "0")}
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
        <StyledTrackerHeaderSpacer />
      </StyledTrackerHeader>
        <StyledTrackerOrderSidebar>
          <SequenceEditor
            direction="vertical"
            sequence={song?.sequence}
            patterns={song?.patterns.length}
            playingSequence={playbackState[0]}
            height={height - 30}
          />
        </StyledTrackerOrderSidebar>
        <StyledTrackerPattern tabIndex={0} onFocus={onFocus} onBlur={onBlur}>
          {pattern?.map((row: PatternCell[], i: number) => {
            const isActiveRow =
              activeField !== undefined &&
              Math.floor(activeField / ROW_SIZE) === i;
            const isPlaying =
              playbackState[0] === sequenceId && playbackState[1] === i;
            const isSelected = selectedTrackerRows?.indexOf(i) !== -1;
            return (
              <span ref={isPlaying ? playingRowRef : null} key={`__${i}`}>
                <TrackerRow
                  id={`__${i}`}
                  n={i}
                  row={row}
                  fieldCount={i * ROW_SIZE}
                  activeField={isActiveRow ? activeField : undefined}
                  isActive={isActiveRow}
                  isPlaying={isPlaying}
                  ref={activeFieldRef}
                  channelStatus={channelStatus}
                  selectedTrackerFields={
                    !isPlaying && isSelected ? selectedTrackerFields || [] : []
                  }
                />
              </span>
            );
          })}
        </StyledTrackerPattern>
  */}
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
    </StyledTrackerWrapper>
  );
};
