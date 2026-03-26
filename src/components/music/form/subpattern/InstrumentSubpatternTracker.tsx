import { SubPatternCell } from "shared/lib/uge/types";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { renderEffect, renderEffectParam } from "components/music/helpers";
import {
  NO_CHANGE_ON_PASTE,
  parseClipboardToSubPattern,
  parseSubPatternFieldsToClipboard,
} from "components/music/musicClipboardHelpers";
import { KeyWhen, getKeys } from "renderer/lib/keybindings/keyBindings";
import trackerActions from "store/features/tracker/trackerActions";
import scrollIntoView from "scroll-into-view-if-needed";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { mergeWith } from "lodash";
import { Position, SelectionRect } from "components/music/tracker/helpers";
import API from "renderer/lib/api";
import { useAppDispatch } from "store/hooks";
import { createSubPatternCell } from "shared/lib/uge/song";
import { SUBPATTERN_ROW_COUNT } from "components/music/form/subpattern/helpers";
import {
  StyledTrackerCell,
  StyledTrackerContentTable,
  StyledTrackerEffectCodeField,
  StyledTrackerEffectParamField,
  StyledTrackerJumpField,
  StyledTrackerNoteField,
  StyledTrackerRow,
  StyledTrackerTableBody,
} from "components/music/tracker/style";

const CHANNEL_FIELDS = 4;
const ROW_SIZE = CHANNEL_FIELDS;
const EMPTY_OFFSET_DISPLAY = "...";
const EMPTY_JUMP_DISPLAY = "...";
const EMPTY_COUNTER_DISPLAY = "__";

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

const renderOffset = (n: number | null): string => {
  if (n === null) {
    return EMPTY_OFFSET_DISPLAY;
  }

  const offset = n - 36;

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

export const InstrumentSubpatternTracker = ({
  instrumentId,
  instrumentType,
  subpattern,
}: InstrumentSubpatternEditorProps) => {
  const dispatch = useAppDispatch();

  const visibleRowCount = Math.min(subpattern.length, SUBPATTERN_ROW_COUNT);
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

  const activeFieldRef = useRef<HTMLSpanElement | null>(null);
  const offsetSignRef = useRef<1 | -1>(1);

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

  useLayoutEffect(() => {
    const el = activeFieldRef.current?.parentElement;
    if (!el) {
      return;
    }

    scrollIntoView(el, {
      scrollMode: "if-needed",
      block: "nearest",
    });
  }, [activeField]);

  useEffect(() => {
    if (activeField !== undefined) {
      offsetSignRef.current = 1;
    }
  }, [activeField]);

  const editSubPatternCell = useCallback(
    (type: keyof SubPatternCell, value: number | null) => {
      if (activeField === undefined) {
        return;
      }

      dispatch(
        trackerDocumentActions.editSubPatternCell({
          instrumentId,
          instrumentType,
          cell: [
            getRowIndexFromField(activeField),
            getColumnIndexFromField(activeField),
          ],
          changes: {
            [type]: value,
          },
        }),
      );
    },
    [activeField, dispatch, instrumentId, instrumentType],
  );

  const deleteSelectedTrackerFields = useCallback(() => {
    if (selectedTrackerFields.length === 0) {
      return;
    }

    const nextSubpattern = [...subpattern];

    for (const field of selectedTrackerFields) {
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
          nextRow.effectcode = null;
          break;
        case 3:
          nextRow.effectparam = null;
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
  }, [
    dispatch,
    instrumentId,
    instrumentType,
    selectedTrackerFields,
    subpattern,
  ]);

  const insertTrackerFields = useCallback(
    (uninsert: boolean) => {
      if (activeField === undefined || subpattern.length === 0) {
        return;
      }

      const startRow = getRowIndexFromField(activeField);
      const nextSubpattern = [...subpattern];

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
    [
      activeField,
      dispatch,
      instrumentId,
      instrumentType,
      lastSubpatternRowIndex,
      subpattern,
    ],
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
          nextOffset = Math.abs(currentOffset);
          break;
        case "-":
          offsetSignRef.current = -1;
          nextOffset = -Math.abs(currentOffset);
          break;
        case null:
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
          break;
        }
      }

      const clampedOffset = Math.max(-36, Math.min(35, nextOffset));
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
      editSubPatternCell("effectcode", value);
    },
    [editSubPatternCell],
  );

  const editEffectParamField = useCallback(
    (value: number | null) => {
      if (value === null) {
        editSubPatternCell("effectparam", null);
        return;
      }

      const currentParam = activeCell?.effectparam;
      const nextValue =
        currentParam !== null && currentParam !== undefined
          ? Math.min(((currentParam & 0x0f) << 4) + value, 0xff)
          : value;

      editSubPatternCell("effectparam", nextValue);
    },
    [activeCell?.effectparam, editSubPatternCell],
  );

  const getCurrentFocus = useCallback((field: number): KeyWhen => {
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
        return null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        if (activeField === undefined) {
          return;
        }

        e.preventDefault();
        setSelectionOrigin({ x: 0, y: 0 });
        setSelectionRect({
          x: 0,
          y: 0,
          width: ROW_SIZE - 1,
          height: Math.max(visibleRowCount - 1, 0),
        });
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectionOrigin(undefined);
        setSelectionRect(undefined);
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
          setSelectionOrigin(undefined);
          setSelectionRect(undefined);
        }

        setActiveField(normalizedField);
        return;
      }

      const currentFocus = getCurrentFocus(activeField);

      if (currentFocus && !e.metaKey && !e.ctrlKey && !e.altKey) {
        getKeys(e.code, currentFocus, {
          editOffsetField,
          editJumpField,
          editEffectCodeField,
          editEffectParamField,
        });
      }
    },
    [
      activeField,
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
      visibleRowCount,
    ],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLTableElement>) => {
      const fieldId = getEventFieldId(e.target);

      if (fieldId === undefined) {
        setActiveField(undefined);
        setSelectionOrigin(undefined);
        setSelectionRect(undefined);
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
        const position = getFieldPosition(fieldId);
        setSelectionOrigin(position);
        setSelectionRect(undefined);
      }

      setActiveField(fieldId);
    },
    [activeField, selectionOrigin],
  );

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown) {
        return;
      }

      const fieldId = getEventFieldId(e.target);

      if (fieldId === undefined || !selectionOrigin) {
        return;
      }

      setSelectionRect(makeSelectionRect(selectionOrigin, fieldId));
      setActiveField(fieldId);
    },
    [isMouseDown, selectionOrigin],
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

  const handleWheel = useCallback((e: React.WheelEvent<HTMLTableElement>) => {
    if (!e.ctrlKey) {
      return;
    }

    e.preventDefault();
  }, []);

  const onFocus = useCallback(() => {
    if (activeField === undefined && numFields > 0) {
      setActiveField(0);
    }
    dispatch(trackerActions.setSubpatternEditorFocus(true));
  }, [activeField, dispatch, numFields]);

  const onBlur = useCallback(() => {
    setActiveField(undefined);
    dispatch(trackerActions.setSubpatternEditorFocus(false));
  }, [dispatch]);

  const onCopy = useCallback(
    (e: React.ClipboardEvent<HTMLTableElement>) => {
      if (activeField === undefined || selectedTrackerFields.length === 0) {
        return;
      }

      const parsedSelectedPattern = parseSubPatternFieldsToClipboard(
        subpattern,
        selectedTrackerFields,
      );

      e.preventDefault();
      e.clipboardData.setData("text/plain", parsedSelectedPattern);
      void API.clipboard.writeText(parsedSelectedPattern);
    },
    [activeField, selectedTrackerFields, subpattern],
  );

  const onCut = useCallback(
    (e: React.ClipboardEvent<HTMLTableElement>) => {
      if (activeField === undefined || selectedTrackerFields.length === 0) {
        return;
      }

      const parsedSelectedPattern = parseSubPatternFieldsToClipboard(
        subpattern,
        selectedTrackerFields,
      );

      e.preventDefault();
      e.clipboardData.setData("text/plain", parsedSelectedPattern);
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
    async (e: React.ClipboardEvent<HTMLTableElement>) => {
      const tempActiveField =
        activeField !== undefined
          ? activeField
          : selectionOrigin
            ? getFieldIndex(selectionOrigin)
            : 0;

      if (activeField === undefined) {
        setActiveField(tempActiveField);
      }

      e.preventDefault();

      const clipboardText =
        e.clipboardData.getData("text/plain") ||
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
      subpattern,
    ],
  );

  return (
    <StyledTrackerContentTable
      $type="subpattern"
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onCopy={onCopy}
      onCut={onCut}
      onPaste={onPaste}
    >
      <StyledTrackerTableBody>
        {subpattern.slice(0, visibleRowCount).map((row, rowIndex) => {
          const isStepMarker = rowIndex % 8 === 0;
          const fieldCount = rowIndex * ROW_SIZE;

          const isOffsetActive = activeField === fieldCount;
          const isJumpActive = activeField === fieldCount + 1;
          const isEffectCodeActive = activeField === fieldCount + 2;
          const isEffectParamActive = activeField === fieldCount + 3;

          return (
            <StyledTrackerRow key={rowIndex} $isStepMarker={isStepMarker}>
              <StyledTrackerCell>{renderCounter(rowIndex)}</StyledTrackerCell>
              <StyledTrackerCell>
                <StyledTrackerNoteField
                  ref={isOffsetActive ? activeFieldRef : null}
                  $active={isOffsetActive}
                  data-subpattern_fieldid={fieldCount}
                  $selected={selectedTrackerFieldSet.has(fieldCount)}
                >
                  {renderOffset(row.note)}
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
                  {renderEffect(row.effectcode)}
                </StyledTrackerEffectCodeField>

                <StyledTrackerEffectParamField
                  ref={isEffectParamActive ? activeFieldRef : null}
                  $active={isEffectParamActive}
                  data-subpattern_fieldid={fieldCount + 3}
                  $selected={selectedTrackerFieldSet.has(fieldCount + 3)}
                >
                  {renderEffectParam(row.effectparam)}
                </StyledTrackerEffectParamField>
              </StyledTrackerCell>
            </StyledTrackerRow>
          );
        })}
      </StyledTrackerTableBody>
    </StyledTrackerContentTable>
  );
};
