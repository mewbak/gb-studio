import { SubPatternCell } from "shared/lib/uge/types";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { renderEffect, renderEffectParam } from "shared/lib/uge/display";
import {
  NO_CHANGE_ON_PASTE,
  parseClipboardToSubPattern,
  parseSubPatternFieldsToClipboard,
} from "shared/lib/uge/clipboard";
import { getKeys } from "renderer/lib/keybindings/keyBindings";
import trackerActions from "store/features/tracker/trackerActions";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import mergeWith from "lodash/mergeWith";
import { Position, SelectionRect } from "components/music/tracker/helpers";
import API from "renderer/lib/api";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { createSubPatternCell } from "shared/lib/uge/song";
import { TRACKER_SUBPATTERN_VISIBLE_LENGTH } from "components/music/form/subpattern/helpers";
import {
  StyledTrackerEffectCodeField,
  StyledTrackerEffectParamField,
  StyledTrackerJumpField,
  StyledTrackerNoteField,
  StyledTrackerPattern,
  StyledTrackerPatternBody,
  StyledTrackerPatternChannel,
  StyledTrackerPatternChannelRow,
  StyledTrackerPatternRowIndexCell,
  StyledTrackerPatternRowIndexColumn,
  StyledTrackerRowIndexField,
} from "components/music/tracker/style";
import {
  TrackerKeyboard,
  VirtualTrackerKey,
} from "components/music/tracker/TrackerKeyboard";
import { Portal } from "ui/layout/Portal";
import { TRACKER_REDO, TRACKER_UNDO } from "consts";
import { useSelectAllShortcut } from "ui/hooks/use-select-all";

const CHANNEL_FIELDS = 4;
const ROW_SIZE = CHANNEL_FIELDS;
const EMPTY_OFFSET_DISPLAY = "...";
const EMPTY_JUMP_DISPLAY = "...";
const EMPTY_COUNTER_DISPLAY = "__";
const OFFSET_MIN = 0;
const OFFSET_MAX = 71;
const SUBPATTERN_TRACKER_WIDTH = 220;
const SUBPATTERN_CHANNEL_WIDTH = SUBPATTERN_TRACKER_WIDTH - 56;

const StyledSubpatternTrackerPattern = styled(StyledTrackerPattern)`
  min-width: ${SUBPATTERN_TRACKER_WIDTH}px;
  width: 100%;
`;

const StyledSubpatternTrackerChannel = styled(StyledTrackerPatternChannel)`
  flex: 1 0 ${SUBPATTERN_CHANNEL_WIDTH}px;
  min-width: ${SUBPATTERN_CHANNEL_WIDTH}px;
`;

const StyledSubpatternTrackerRow = styled(StyledTrackerPatternChannelRow)`
  justify-content: flex-start;
  padding: 0 5px;
  scroll-margin-top: 110px;
  scroll-margin-bottom: 320px;
`;

const getRowIndexFromField = (field: number) => Math.floor(field / ROW_SIZE);
const getColumnIndexFromField = (field: number) => field % ROW_SIZE;

const getFieldPosition = (field: number): Position => ({
  x: getColumnIndexFromField(field),
  y: getRowIndexFromField(field),
});

const getFieldIndex = (position: Position): number =>
  position.y * ROW_SIZE + position.x;

const makeSelectionRect = (origin: Position, field: number): SelectionRect => {
  const target = getFieldPosition(field);

  return {
    x: Math.min(origin.x, target.x),
    y: Math.min(origin.y, target.y),
    width: Math.abs(origin.x - target.x),
    height: Math.abs(origin.y - target.y),
  };
};

const getSelectedTrackerFields = (
  selectionRect: SelectionRect | undefined,
  selectionOrigin: Position | undefined,
): number[] => {
  if (selectionRect) {
    const selectedFields: number[] = [];
    for (
      let x = selectionRect.x;
      x <= selectionRect.x + selectionRect.width;
      x += 1
    ) {
      for (
        let y = selectionRect.y;
        y <= selectionRect.y + selectionRect.height;
        y += 1
      ) {
        selectedFields.push(getFieldIndex({ x, y }));
      }
    }
    return selectedFields;
  }

  if (selectionOrigin) {
    return [getFieldIndex(selectionOrigin)];
  }

  return [];
};

interface InstrumentSubpatternEditorProps {
  instrumentId: number;
  instrumentType: "duty" | "wave" | "noise";
  subpattern: SubPatternCell[];
}

const renderCounter = (n: number): string =>
  Number.isFinite(n) ? n.toString().padStart(2, "0") : EMPTY_COUNTER_DISPLAY;

const renderJump = (n: number | null): string => {
  if (n === null || n === 0) {
    return EMPTY_JUMP_DISPLAY;
  }
  return `J${n.toString().padStart(2, "0")}`;
};

const renderOffset = (
  n: number | null,
  zeroSignOverride?: 1 | -1 | null,
): string => {
  if (n === null) {
    return EMPTY_OFFSET_DISPLAY;
  }

  const offset = n - 36;

  if (offset === 0 && zeroSignOverride === -1) {
    return "-00";
  }

  if (offset >= 0) {
    return `+${offset.toString().padStart(2, "0")}`;
  }

  return `-${Math.abs(offset).toString().padStart(2, "0")}`;
};

const getEventFieldId = (target: EventTarget | null): number | undefined => {
  if (!(target instanceof HTMLElement)) {
    return undefined;
  }

  const fieldEl = target.closest<HTMLElement>("[data-subpattern_fieldid]");
  const rawFieldId = fieldEl?.dataset["subpattern_fieldid"];

  if (!rawFieldId) {
    return undefined;
  }

  const fieldId = parseInt(rawFieldId, 10);
  return Number.isNaN(fieldId) ? undefined : fieldId;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const InstrumentSubpatternTracker = ({
  instrumentId,
  instrumentType,
  subpattern,
}: InstrumentSubpatternEditorProps) => {
  const dispatch = useAppDispatch();

  const visibleRowCount = Math.min(
    subpattern.length,
    TRACKER_SUBPATTERN_VISIBLE_LENGTH,
  );
  const numFields = visibleRowCount * ROW_SIZE;
  const lastSubpatternRowIndex = Math.max(subpattern.length - 1, 0);

  const [selectionOrigin, setSelectionOrigin] = useState<
    Position | undefined
  >();
  const [selectionRect, setSelectionRect] = useState<
    SelectionRect | undefined
  >();
  const [activeField, setActiveField] = useState<number | undefined>();
  const [isMouseDown, setIsMouseDown] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);
  const activeFieldRef = useRef<HTMLSpanElement | null>(null);
  const offsetSignRef = useRef<1 | -1>(1);
  const offsetZeroSignOverrideRef = useRef<1 | -1 | null>(null);

  const activeFieldValueRef = useRef<number | undefined>(undefined);
  const selectionOriginRef = useRef<Position | undefined>(undefined);
  const selectionRectRef = useRef<SelectionRect | undefined>(undefined);
  const selectedTrackerFieldsRef = useRef<number[]>([]);
  const subpatternRef = useRef(subpattern);

  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );

  const showVirtualKeyboard = useAppSelector(
    (state) => state.tracker.showVirtualKeyboard,
  );

  const selectedTrackerFields = useMemo(
    () => getSelectedTrackerFields(selectionRect, selectionOrigin),
    [selectionOrigin, selectionRect],
  );

  const selectedTrackerFieldSet = useMemo(
    () => new Set(selectedTrackerFields),
    [selectedTrackerFields],
  );

  const activeRowIndex =
    activeField !== undefined ? getRowIndexFromField(activeField) : undefined;
  const activeCell =
    activeRowIndex !== undefined ? subpattern[activeRowIndex] : undefined;

  const getCurrentFocus = useCallback((field: number) => {
    switch (getColumnIndexFromField(field)) {
      case 0:
        return "offsetColumnFocus";
      case 1:
        return "jumpColumnFocus";
      case 2:
        return "effectCodeColumnFocus";
      case 3:
        return "effectParamColumnFocus";
      default:
        return "offsetColumnFocus";
    }
  }, []);

  const currentFocus = useMemo(
    () => (activeField !== undefined ? getCurrentFocus(activeField) : null),
    [activeField, getCurrentFocus],
  );

  useEffect(() => {
    activeFieldValueRef.current = activeField;
    selectionOriginRef.current = selectionOrigin;
    selectionRectRef.current = selectionRect;
    selectedTrackerFieldsRef.current = selectedTrackerFields;
    subpatternRef.current = subpattern;
  }, [
    activeField,
    selectionOrigin,
    selectionRect,
    selectedTrackerFields,
    subpattern,
  ]);

  useLayoutEffect(() => {
    const el = activeFieldRef.current?.parentElement;
    if (!el) {
      return;
    }
    el.scrollIntoView({
      block: "nearest",
    });
  }, [activeField]);

  useEffect(() => {
    if (activeField !== undefined) {
      offsetSignRef.current = 1;
      offsetZeroSignOverrideRef.current = null;
    }
  }, [activeField]);

  const focusTable = useCallback(() => {
    tableRef.current?.focus({ preventScroll: true });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionOrigin(undefined);
    setSelectionRect(undefined);
  }, []);

  const setSingleFieldSelection = useCallback((field: number) => {
    setSelectionOrigin(getFieldPosition(field));
    setSelectionRect(undefined);
  }, []);

  const editSubPatternCell = useCallback(
    (type: keyof SubPatternCell, value: number | null) => {
      const currentActiveField = activeFieldValueRef.current;

      if (currentActiveField === undefined) {
        return;
      }

      dispatch(
        trackerDocumentActions.editSubPatternCell({
          instrumentId,
          instrumentType,
          cell: [
            getRowIndexFromField(currentActiveField),
            getColumnIndexFromField(currentActiveField),
          ],
          changes: {
            [type]: value,
          },
        }),
      );
    },
    [dispatch, instrumentId, instrumentType],
  );

  const deleteSelectedTrackerFields = useCallback(() => {
    const currentSelectedTrackerFields = selectedTrackerFieldsRef.current;

    if (currentSelectedTrackerFields.length === 0) {
      return;
    }

    const nextSubpattern = [...subpatternRef.current];

    for (const field of currentSelectedTrackerFields) {
      const rowIndex = getRowIndexFromField(field);
      const columnIndex = getColumnIndexFromField(field);
      const currentRow = nextSubpattern[rowIndex];

      if (!currentRow) {
        continue;
      }

      const nextRow = { ...currentRow };

      switch (columnIndex) {
        case 0:
          nextRow.note = null;
          break;
        case 1:
          nextRow.jump = null;
          break;
        case 2:
          nextRow.effectCode = null;
          break;
        case 3:
          nextRow.effectParam = null;
          break;
      }

      nextSubpattern[rowIndex] = nextRow;
    }

    dispatch(
      trackerDocumentActions.editSubPattern({
        instrumentId,
        instrumentType,
        subpattern: nextSubpattern,
      }),
    );
  }, [dispatch, instrumentId, instrumentType]);

  const insertTrackerFields = useCallback(
    (uninsert: boolean) => {
      const currentActiveField = activeFieldValueRef.current;
      const currentSubpattern = subpatternRef.current;

      if (currentActiveField === undefined || currentSubpattern.length === 0) {
        return;
      }

      const startRow = getRowIndexFromField(currentActiveField);
      const nextSubpattern = [...currentSubpattern];

      if (uninsert) {
        for (
          let rowIndex = startRow;
          rowIndex < lastSubpatternRowIndex;
          rowIndex += 1
        ) {
          nextSubpattern[rowIndex] = nextSubpattern[rowIndex + 1];
        }
        nextSubpattern[lastSubpatternRowIndex] = createSubPatternCell();
      } else {
        for (
          let rowIndex = lastSubpatternRowIndex;
          rowIndex > startRow;
          rowIndex -= 1
        ) {
          nextSubpattern[rowIndex] = nextSubpattern[rowIndex - 1];
        }
        nextSubpattern[startRow] = createSubPatternCell();
      }

      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: nextSubpattern,
        }),
      );
    },
    [dispatch, instrumentId, instrumentType, lastSubpatternRowIndex],
  );

  const editOffsetField = useCallback(
    (value: "+" | "-" | number | null) => {
      const currentOffset =
        activeCell?.note === null || activeCell?.note === undefined
          ? 0
          : activeCell.note - 36;

      let nextOffset: number;

      switch (value) {
        case "+":
          offsetSignRef.current = 1;
          offsetZeroSignOverrideRef.current = 1;
          nextOffset = Math.abs(currentOffset);
          break;

        case "-":
          offsetSignRef.current = -1;
          offsetZeroSignOverrideRef.current = -1;
          nextOffset = -Math.abs(currentOffset);
          break;

        case null:
          offsetZeroSignOverrideRef.current = null;
          editSubPatternCell("note", null);
          return;

        default: {
          const sign =
            currentOffset !== 0
              ? currentOffset < 0
                ? -1
                : 1
              : offsetSignRef.current;

          const absValue = Math.abs(currentOffset);
          const nextAbsValue = (absValue % 10) * 10 + value;
          const maxAbsValue = sign < 0 ? 36 : 35;

          nextOffset = sign * Math.min(maxAbsValue, nextAbsValue);
          offsetSignRef.current = sign;
          offsetZeroSignOverrideRef.current = null;
          break;
        }
      }

      const clampedOffset = Math.max(-36, Math.min(35, nextOffset));

      if (clampedOffset !== 0) {
        offsetZeroSignOverrideRef.current = null;
      }

      editSubPatternCell("note", clampedOffset + 36);
    },
    [activeCell?.note, editSubPatternCell],
  );

  const editJumpField = useCallback(
    (value: number | null) => {
      if (value === null) {
        editSubPatternCell("jump", null);
        return;
      }

      const currentJump = activeCell?.jump;
      const nextValue =
        currentJump !== null && currentJump !== undefined
          ? Math.min((currentJump % 10) * 10 + value, visibleRowCount)
          : value;

      editSubPatternCell("jump", nextValue);
    },
    [activeCell?.jump, editSubPatternCell, visibleRowCount],
  );

  const editEffectCodeField = useCallback(
    (value: number | null) => {
      editSubPatternCell("effectCode", value);
    },
    [editSubPatternCell],
  );

  const editEffectParamField = useCallback(
    (value: number | null) => {
      if (value === null) {
        editSubPatternCell("effectParam", null);
        return;
      }

      const currentParam = activeCell?.effectParam;
      const nextValue =
        currentParam !== null && currentParam !== undefined
          ? Math.min(((currentParam & 0x0f) << 4) + value, 0xff)
          : value;

      editSubPatternCell("effectParam", nextValue);
    },
    [activeCell?.effectParam, editSubPatternCell],
  );

  const moveActiveField = useCallback(
    (direction: "up" | "down" | "left" | "right", extendSelection: boolean) => {
      const currentActiveField = activeFieldValueRef.current;

      if (currentActiveField === undefined || numFields <= 0) {
        return;
      }

      let nextField = currentActiveField;

      if (direction === "left") {
        nextField -= 1;
      } else if (direction === "right") {
        nextField += 1;
      } else if (direction === "up") {
        nextField -= ROW_SIZE;
      } else if (direction === "down") {
        nextField += ROW_SIZE;
      }

      const normalizedField = ((nextField % numFields) + numFields) % numFields;

      if (extendSelection) {
        const anchor =
          selectionOriginRef.current ?? getFieldPosition(currentActiveField);
        setSelectionOrigin(anchor);
        setSelectionRect(makeSelectionRect(anchor, normalizedField));
      } else {
        setSingleFieldSelection(normalizedField);
      }

      setActiveField(normalizedField);
    },
    [numFields, setSingleFieldSelection],
  );

  const applyVirtualInput = useCallback(
    (value: number | null) => {
      const currentActiveField = activeFieldValueRef.current;

      if (currentActiveField === undefined) {
        return false;
      }

      const focus = getCurrentFocus(currentActiveField);

      if (focus === "offsetColumnFocus") {
        editOffsetField(value);
        return true;
      }

      if (focus === "jumpColumnFocus") {
        editJumpField(value);
        return true;
      }

      if (focus === "effectCodeColumnFocus") {
        editEffectCodeField(value);
        return true;
      }

      if (focus === "effectParamColumnFocus") {
        editEffectParamField(value);
        return true;
      }

      return false;
    },
    [
      editEffectCodeField,
      editEffectParamField,
      editJumpField,
      editOffsetField,
      getCurrentFocus,
    ],
  );

  const applyVirtualSign = useCallback(
    (value: "+" | "-") => {
      const currentActiveField = activeFieldValueRef.current;

      if (currentActiveField === undefined) {
        return false;
      }

      const focus = getCurrentFocus(currentActiveField);

      if (focus !== "offsetColumnFocus") {
        return false;
      }

      editOffsetField(value);
      return true;
    },
    [editOffsetField, getCurrentFocus],
  );

  const transposeSelectedOffsets = useCallback(
    (delta: number) => {
      const currentSelectedTrackerFields = selectedTrackerFieldsRef.current;
      const currentSubpattern = subpatternRef.current;

      if (currentSelectedTrackerFields.length === 0) {
        return;
      }

      const nextSubpattern = [...currentSubpattern];
      let changed = false;

      for (const field of currentSelectedTrackerFields) {
        if (getColumnIndexFromField(field) !== 0) {
          continue;
        }

        const rowIndex = getRowIndexFromField(field);
        const currentRow = nextSubpattern[rowIndex];

        if (!currentRow || currentRow.note === null) {
          continue;
        }

        const nextNote = clamp(currentRow.note + delta, OFFSET_MIN, OFFSET_MAX);

        if (nextNote !== currentRow.note) {
          nextSubpattern[rowIndex] = {
            ...currentRow,
            note: nextNote,
          };
          changed = true;
        }
      }

      if (!changed) {
        return;
      }

      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: nextSubpattern,
        }),
      );
    },
    [dispatch, instrumentId, instrumentType],
  );

  const onSelectAll = useCallback(() => {
    if (numFields <= 0) {
      return;
    }

    setActiveField(0);
    setSelectionOrigin({ x: 0, y: 0 });
    setSelectionRect({
      x: 0,
      y: 0,
      width: ROW_SIZE - 1,
      height: Math.max(visibleRowCount - 1, 0),
    });
  }, [numFields, visibleRowCount]);

  useSelectAllShortcut({
    enabled: subpatternEditorFocus,
    onSelectAll,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if ((e.shiftKey || e.ctrlKey) && activeField !== undefined) {
          e.preventDefault();
          insertTrackerFields(true);
          return;
        }

        if (selectedTrackerFields.length > 0) {
          e.preventDefault();
          deleteSelectedTrackerFields();
          return;
        }
      }

      if (e.key === "Insert" || e.key === "Enter") {
        if (activeField !== undefined) {
          e.preventDefault();
          insertTrackerFields(false);
          return;
        }
      }

      if (activeField === undefined || numFields === 0) {
        return;
      }

      let nextActiveField = activeField;
      let didNavigate = false;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          nextActiveField -= 1;
          didNavigate = true;
          break;
        case "ArrowRight":
          e.preventDefault();
          nextActiveField += 1;
          didNavigate = true;
          break;
        case "ArrowDown":
          e.preventDefault();
          nextActiveField += ROW_SIZE;
          didNavigate = true;
          break;
        case "ArrowUp":
          e.preventDefault();
          nextActiveField -= ROW_SIZE;
          didNavigate = true;
          break;
        case "Tab":
          e.preventDefault();
          nextActiveField += e.shiftKey ? -ROW_SIZE : ROW_SIZE;
          didNavigate = true;
          break;
      }

      if (didNavigate) {
        const normalizedField =
          ((nextActiveField % numFields) + numFields) % numFields;

        if (e.shiftKey) {
          const anchor = selectionOrigin ?? getFieldPosition(activeField);
          setSelectionOrigin(anchor);
          setSelectionRect(makeSelectionRect(anchor, normalizedField));
        } else {
          clearSelection();
          setSingleFieldSelection(normalizedField);
        }

        setActiveField(normalizedField);
        return;
      }

      const focus = getCurrentFocus(activeField);

      if (focus && !e.metaKey && !e.ctrlKey && !e.altKey) {
        getKeys(e.code, focus, {
          editOffsetField,
          editJumpField,
          editEffectCodeField,
          editEffectParamField,
        });
      }
    },
    [
      activeField,
      clearSelection,
      deleteSelectedTrackerFields,
      editEffectCodeField,
      editEffectParamField,
      editJumpField,
      editOffsetField,
      getCurrentFocus,
      insertTrackerFields,
      numFields,
      selectedTrackerFields.length,
      selectionOrigin,
      setSingleFieldSelection,
    ],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const fieldId = getEventFieldId(e.target);

      if (fieldId === undefined) {
        setActiveField(undefined);
        clearSelection();
        return;
      }

      setIsMouseDown(true);

      if (e.shiftKey) {
        const anchor =
          selectionOrigin ??
          (activeField !== undefined
            ? getFieldPosition(activeField)
            : getFieldPosition(fieldId));

        setSelectionOrigin(anchor);
        setSelectionRect(makeSelectionRect(anchor, fieldId));
      } else {
        setSingleFieldSelection(fieldId);
      }

      setActiveField(fieldId);
      focusTable();
    },
    [
      activeField,
      clearSelection,
      focusTable,
      selectionOrigin,
      setSingleFieldSelection,
    ],
  );

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown) {
        return;
      }

      const fieldId = getEventFieldId(e.target);

      if (fieldId === undefined || !selectionOriginRef.current) {
        return;
      }

      setSelectionRect(makeSelectionRect(selectionOriginRef.current, fieldId));
      setActiveField(fieldId);
    },
    [isMouseDown],
  );

  const handleWindowMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  useEffect(() => {
    if (!isMouseDown) {
      return;
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [handleWindowMouseMove, handleWindowMouseUp, isMouseDown]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) {
      return;
    }

    e.preventDefault();
  }, []);

  const onFocus = useCallback(() => {
    if (activeField === undefined && numFields > 0) {
      setActiveField(0);
      setSingleFieldSelection(0);
    }
    dispatch(trackerActions.setSubpatternEditorFocus(true));
  }, [activeField, dispatch, numFields, setSingleFieldSelection]);

  const onBlur = useCallback(() => {
    setActiveField(undefined);
    offsetZeroSignOverrideRef.current = null;
    dispatch(trackerActions.setSubpatternEditorFocus(false));
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(trackerActions.setSubpatternEditorFocus(false));
    };
  }, [dispatch]);

  const handleVirtualKeyPressed = useCallback(
    (virtualKey: VirtualTrackerKey) => {
      if (activeFieldValueRef.current === undefined && numFields > 0) {
        setActiveField(0);
        setSingleFieldSelection(0);
      }

      if (virtualKey.type === "navigation") {
        moveActiveField(virtualKey.direction, virtualKey.shiftKey);
        focusTable();
        return;
      }

      if (virtualKey.type === "sign") {
        applyVirtualSign(virtualKey.value);
        focusTable();
        return;
      }

      if (virtualKey.type === "number" || virtualKey.type === "note") {
        applyVirtualInput(virtualKey.value);
        focusTable();
        return;
      }

      if (virtualKey.type === "insertRow") {
        insertTrackerFields(false);
        focusTable();
        return;
      }

      if (virtualKey.type === "removeRow") {
        insertTrackerFields(true);
        focusTable();
        return;
      }

      if (virtualKey.type === "clear") {
        deleteSelectedTrackerFields();
        focusTable();
        return;
      }

      if (virtualKey.type === "transpose") {
        transposeSelectedOffsets(
          virtualKey.direction === "up"
            ? virtualKey.size === "octave"
              ? 12
              : 1
            : virtualKey.size === "octave"
              ? -12
              : -1,
        );
        focusTable();
        return;
      }

      if (virtualKey.type === "transposeField") {
        transposeSelectedOffsets(virtualKey.direction === "up" ? 1 : -1);
        focusTable();
        return;
      }

      if (virtualKey.type === "undo") {
        dispatch({ type: TRACKER_UNDO });
        focusTable();
        return;
      }

      if (virtualKey.type === "redo") {
        dispatch({ type: TRACKER_REDO });
        focusTable();
        return;
      }

      if (virtualKey.type === "toggle") {
        dispatch(trackerActions.setShowVirtualKeyboard(!showVirtualKeyboard));
      }
    },
    [
      applyVirtualInput,
      applyVirtualSign,
      deleteSelectedTrackerFields,
      dispatch,
      focusTable,
      insertTrackerFields,
      moveActiveField,
      numFields,
      setSingleFieldSelection,
      showVirtualKeyboard,
      transposeSelectedOffsets,
    ],
  );

  const onCopy = useCallback(
    (e: ClipboardEvent) => {
      if (activeField === undefined || selectedTrackerFields.length === 0) {
        return;
      }

      const parsedSelectedPattern = parseSubPatternFieldsToClipboard(
        subpattern,
        selectedTrackerFields,
      );

      e.preventDefault();
      e.clipboardData?.setData("text/plain", parsedSelectedPattern);
      void API.clipboard.writeText(parsedSelectedPattern);
    },
    [activeField, selectedTrackerFields, subpattern],
  );

  const onCut = useCallback(
    (e: ClipboardEvent) => {
      if (activeField === undefined || selectedTrackerFields.length === 0) {
        return;
      }

      const parsedSelectedPattern = parseSubPatternFieldsToClipboard(
        subpattern,
        selectedTrackerFields,
      );

      e.preventDefault();
      e.clipboardData?.setData("text/plain", parsedSelectedPattern);
      void API.clipboard.writeText(parsedSelectedPattern);
      deleteSelectedTrackerFields();
    },
    [
      activeField,
      deleteSelectedTrackerFields,
      selectedTrackerFields,
      subpattern,
    ],
  );

  const onPaste = useCallback(
    async (e: ClipboardEvent) => {
      const tempActiveField =
        activeField !== undefined
          ? activeField
          : selectionOrigin
            ? getFieldIndex(selectionOrigin)
            : 0;

      if (activeField === undefined) {
        setActiveField(tempActiveField);
        setSingleFieldSelection(tempActiveField);
      }

      e.preventDefault();

      const clipboardText =
        e.clipboardData?.getData("text/plain") ||
        (await API.clipboard.readText());

      const pastedPattern = parseClipboardToSubPattern(clipboardText);

      if (!pastedPattern) {
        return;
      }

      const startRow = getRowIndexFromField(tempActiveField);
      const nextSubpattern = [...subpattern];

      for (
        let rowOffset = 0;
        rowOffset < pastedPattern.length;
        rowOffset += 1
      ) {
        const pastedPatternCellRow = pastedPattern[rowOffset];
        const targetRowIndex = startRow + rowOffset;
        const targetRow = nextSubpattern[targetRowIndex];

        if (!pastedPatternCellRow || !targetRow) {
          continue;
        }

        let nextRow = { ...targetRow };

        for (let columnIndex = 0; columnIndex < ROW_SIZE; columnIndex += 1) {
          const pastedCell = pastedPatternCellRow[columnIndex];

          if (!pastedCell) {
            continue;
          }

          nextRow = mergeWith(
            nextRow,
            pastedCell,
            (oldValue: unknown, sourceValue: unknown) =>
              sourceValue === NO_CHANGE_ON_PASTE ? oldValue : sourceValue,
          ) as SubPatternCell;
        }

        nextSubpattern[targetRowIndex] = nextRow;
      }

      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: nextSubpattern,
        }),
      );
    },
    [
      activeField,
      dispatch,
      instrumentId,
      instrumentType,
      selectionOrigin,
      setSingleFieldSelection,
      subpattern,
    ],
  );

  useEffect(() => {
    if (subpatternEditorFocus) {
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

  const portalRoot = document.getElementById(
    "PortalInstrumentEditorFooter",
  ) as HTMLElement;

  return (
    <>
      <StyledSubpatternTrackerPattern>
        <StyledTrackerPatternBody
          ref={tableRef}
          tabIndex={0}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          <StyledTrackerPatternRowIndexColumn>
            {subpattern.slice(0, visibleRowCount).map((_, rowIndex) => (
              <StyledTrackerPatternRowIndexCell
                key={rowIndex}
                $isDefaultPlayhead={false}
              >
                <StyledTrackerRowIndexField>
                  {renderCounter(rowIndex)}
                </StyledTrackerRowIndexField>
              </StyledTrackerPatternRowIndexCell>
            ))}
          </StyledTrackerPatternRowIndexColumn>

          <StyledSubpatternTrackerChannel>
            {subpattern.slice(0, visibleRowCount).map((row, rowIndex) => {
              const isStepMarker = rowIndex % 8 === 0;
              const fieldCount = rowIndex * ROW_SIZE;

              const isOffsetActive = activeField === fieldCount;
              const isJumpActive = activeField === fieldCount + 1;
              const isEffectCodeActive = activeField === fieldCount + 2;
              const isEffectParamActive = activeField === fieldCount + 3;

              return (
                <StyledSubpatternTrackerRow
                  key={rowIndex}
                  $isStepMarker={isStepMarker}
                >
                  <StyledTrackerNoteField
                    ref={isOffsetActive ? activeFieldRef : null}
                    $active={isOffsetActive}
                    data-subpattern_fieldid={fieldCount}
                    $selected={selectedTrackerFieldSet.has(fieldCount)}
                  >
                    {renderOffset(
                      row.note,
                      isOffsetActive ? offsetZeroSignOverrideRef.current : null,
                    )}
                  </StyledTrackerNoteField>

                  <StyledTrackerJumpField
                    ref={isJumpActive ? activeFieldRef : null}
                    $active={isJumpActive}
                    data-subpattern_fieldid={fieldCount + 1}
                    $selected={selectedTrackerFieldSet.has(fieldCount + 1)}
                  >
                    {renderJump(row.jump)}
                  </StyledTrackerJumpField>

                  <StyledTrackerEffectCodeField
                    ref={isEffectCodeActive ? activeFieldRef : null}
                    $active={isEffectCodeActive}
                    data-subpattern_fieldid={fieldCount + 2}
                    $selected={selectedTrackerFieldSet.has(fieldCount + 2)}
                  >
                    {renderEffect(row.effectCode)}
                  </StyledTrackerEffectCodeField>

                  <StyledTrackerEffectParamField
                    ref={isEffectParamActive ? activeFieldRef : null}
                    $active={isEffectParamActive}
                    data-subpattern_fieldid={fieldCount + 3}
                    $selected={selectedTrackerFieldSet.has(fieldCount + 3)}
                  >
                    {renderEffectParam(row.effectParam)}
                  </StyledTrackerEffectParamField>
                </StyledSubpatternTrackerRow>
              );
            })}
          </StyledSubpatternTrackerChannel>
        </StyledTrackerPatternBody>
      </StyledSubpatternTrackerPattern>

      <Portal root={portalRoot}>
        <TrackerKeyboard
          type="subpattern"
          fieldType={currentFocus ?? "offsetColumnFocus"}
          octaveOffset={0}
          open={showVirtualKeyboard}
          onKeyPressed={handleVirtualKeyPressed}
        />
      </Portal>
    </>
  );
};
