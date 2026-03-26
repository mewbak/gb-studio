import { SubPatternCell } from "shared/lib/uge/types";
import React, {
  useCallback,
  useEffect,
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
import { cloneDeep, mergeWith } from "lodash";
import { Position, SelectionRect } from "components/music/tracker/helpers";
import API from "renderer/lib/api";
import { useAppDispatch, useAppSelector } from "store/hooks";
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
const ROW_SIZE = CHANNEL_FIELDS * 1;
const NUM_FIELDS = ROW_SIZE * 32;

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
interface InstrumentSubpatternEditorProps {
  instrumentId: number;
  instrumentType: "duty" | "wave" | "noise";
  subpattern: SubPatternCell[];
}

const renderCounter = (n: number): string => {
  return n?.toString().padStart(2, "0") || "__";
};

const renderJump = (n: number | null): string => {
  if (n === 0 || n === null) return "...";
  return `J${n.toString().padStart(2, "0")}`;
};

const renderOffset = (n: number | null): string => {
  if (n === null) return "...";
  if (n - 36 >= 0) return `+${(n - 36).toString().padStart(2, "0")}`;
  return `-${Math.abs(n - 36)
    .toString()
    .padStart(2, "0")}`;
};

export const InstrumentSubpatternTracker = ({
  instrumentId,
  instrumentType,
  subpattern,
}: InstrumentSubpatternEditorProps) => {
  const dispatch = useAppDispatch();

  const [selectionOrigin, setSelectionOrigin] = useState<
    Position | undefined
  >();
  const [selectionRect, setSelectionRect] = useState<
    SelectionRect | undefined
  >();
  const [isSelecting, setIsSelecting] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const selectedTrackerFields: number[] = useMemo(
    () => getSelectedTrackerFields(selectionRect, selectionOrigin),
    [selectionOrigin, selectionRect],
  );

  const [activeField, setActiveField] = useState<number | undefined>();

  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );

  const activeFieldRef = useRef<HTMLSpanElement>(null);
  if (activeFieldRef && activeFieldRef.current) {
    scrollIntoView(activeFieldRef.current.parentElement as Element, {
      scrollMode: "if-needed",
      block: "nearest",
    });
  }

  const deleteSelectedTrackerFields = useCallback(() => {
    if (subpattern && selectedTrackerFields) {
      const newSubPattern = cloneDeep(subpattern);
      for (let i = 0; i < selectedTrackerFields.length; i++) {
        const field = selectedTrackerFields[i];
        const newPatternCell = {
          ...newSubPattern[Math.floor(field / 4)],
        };

        switch (field % 4) {
          case 0:
            newPatternCell.note = null;
            break;
          case 1:
            newPatternCell.jump = null;
            break;
          case 2:
            newPatternCell.effectcode = null;
            break;
          case 3:
            newPatternCell.effectparam = null;
            break;
        }

        newSubPattern[Math.floor(field / 4)] = newPatternCell;
      }
      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId: instrumentId,
          instrumentType: instrumentType,
          subpattern: newSubPattern,
        }),
      );
    }
  }, [
    dispatch,
    instrumentId,
    instrumentType,
    selectedTrackerFields,
    subpattern,
  ]);

  const insertTrackerFields = useCallback(
    (uninsert: boolean) => {
      if (subpattern && activeField) {
        const startRow = Math.floor(activeField / ROW_SIZE);
        const newSubPattern = cloneDeep(subpattern);
        if (uninsert) {
          for (let i = startRow; i < 63; i++) {
            newSubPattern[i] = newSubPattern[i + 1];
          }
        } else {
          for (let i = 63; i > startRow; i--) {
            newSubPattern[i] = newSubPattern[i - 1];
          }
        }
        newSubPattern[uninsert ? 63 : startRow] = createSubPatternCell();
        dispatch(
          trackerDocumentActions.editSubPattern({
            instrumentId: instrumentId,
            instrumentType: instrumentType,
            subpattern: newSubPattern,
          }),
        );
      }
    },
    [subpattern, activeField, dispatch, instrumentId, instrumentType],
  );

  const offsetSignRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (activeField) {
      offsetSignRef.current = 1;
    }
  }, [activeField]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const editSubPatternCell =
        (type: keyof SubPatternCell) => (value: number | null) => {
          if (activeField === undefined) {
            return;
          }
          dispatch(
            trackerDocumentActions.editSubPatternCell({
              instrumentId: instrumentId,
              instrumentType: instrumentType,
              cell: [
                Math.floor(activeField / 4),
                Math.floor(activeField / 4) % 4,
              ],
              changes: {
                [type]: value,
              },
            }),
          );
        };

      const editOffsetField = (value: "+" | "-" | number | null) => {
        if (!activeFieldRef?.current) {
          return;
        }

        const el = activeFieldRef.current;
        const text = el.innerText;

        const currentValue = text === "..." ? 0 : parseInt(text, 10);

        let newValue: number | null = null;

        switch (value) {
          case "+":
            offsetSignRef.current = 1;
            newValue = Math.abs(currentValue);
            break;

          case "-":
            offsetSignRef.current = -1;
            newValue = -Math.abs(currentValue);
            break;

          case null:
            editSubPatternCell("note")(null);
            return;

          default: {
            const sign =
              currentValue !== 0
                ? currentValue < 0
                  ? -1
                  : 1
                : offsetSignRef.current;

            const absValue = Math.abs(currentValue);
            const ones = absValue % 10;
            const nextAbsValue = ones * 10 + value;
            const maxAbsValue = sign < 0 ? 36 : 35;

            newValue = sign * Math.min(maxAbsValue, nextAbsValue);
            offsetSignRef.current = sign;
            break;
          }
        }

        const clamped = Math.max(-36, Math.min(35, newValue ?? 0));
        editSubPatternCell("note")(clamped + 36);
      };

      const editJumpField = (value: number | null) => {
        if (activeFieldRef && activeFieldRef.current) {
          if (activeFieldRef && activeFieldRef.current) {
            const el = activeFieldRef.current;
            let newValue = value;
            if (value !== null && el.innerText !== "...") {
              newValue = Math.min(
                10 * parseInt(el.innerText[2], 10) + value,
                32,
              );
            }
            editSubPatternCell("jump")(newValue);
          }
        }
      };

      const editEffectCodeField = (value: number | null) => {
        editSubPatternCell("effectcode")(value);
      };

      const editEffectParamField = (value: number | null) => {
        if (activeFieldRef && activeFieldRef.current) {
          const el = activeFieldRef.current;
          let newValue = value;
          if (value !== null && el.innerText !== "..") {
            newValue = 16 * parseInt(el.innerText[1], 16) + value;
          }
          editSubPatternCell("effectparam")(newValue);
        }
      };

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectionOrigin(undefined);
        setSelectionRect(undefined);
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if ((e.shiftKey || e.ctrlKey) && activeField) {
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
        if (activeField) {
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
      }

      let currentFocus: KeyWhen = null;

      switch (activeField % 4) {
        case 0:
          currentFocus = "offsetColumnFocus";
          break;
        case 1:
          currentFocus = "jumpColumnFocus";
          break;
        case 2:
          currentFocus = "effectCodeColumnFocus";
          break;
        case 3:
          currentFocus = "effectParamColumnFocus";
          break;
      }

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
      isSelecting,
      dispatch,
      instrumentId,
      instrumentType,
      selectedTrackerFields,
      insertTrackerFields,
      deleteSelectedTrackerFields,
      selectionRect,
      selectionOrigin,
    ],
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) {
      setIsSelecting(false);
    }
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const _delta = e.deltaY === 0 ? e.deltaX : e.deltaY;
      if (e.shiftKey) {
        // if (delta < 0) return transposeSelectedTrackerFields(1, true);
        // if (delta > 0) return transposeSelectedTrackerFields(-1, true);
      } else {
        // if (delta < 0) return transposeSelectedTrackerFields(1, false);
        // if (delta > 0) return transposeSelectedTrackerFields(-1, false);
      }
      return;
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!e.target || !(e.target instanceof HTMLElement)) {
        return;
      }

      const fieldId = e.target.dataset["subpattern_fieldid"];

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
      } else {
        setActiveField(undefined);
      }
    },
    [selectionOrigin],
  );

  const handleMouseUp = useCallback(
    (_e: MouseEvent) => {
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
        const fieldId = e.target.dataset["subpattern_fieldid"];

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

  const onSelectAll = useCallback(
    (e: Event) => {
      if (activeField === undefined) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      const selection = window.getSelection();
      if (!selection || selection.focusNode) {
        return;
      }
      window.getSelection()?.empty();

      // Select single channel
      setSelectionOrigin({ x: 0, y: 0 });
      setSelectionRect({
        x: 0,
        y: 0,
        width: 3,
        height: 32,
      });
    },
    [activeField],
  );

  useEffect(() => {
    document.addEventListener("selectionchange", onSelectAll);
    return () => {
      document.removeEventListener("selectionchange", onSelectAll);
    };
  }, [onSelectAll]);

  const onFocus = useCallback(
    (_e: React.FocusEvent<HTMLDivElement>) => {
      if (activeField === undefined) {
        setActiveField(0);
      }
      dispatch(trackerActions.setSubpatternEditorFocus(true));
    },
    [activeField, dispatch],
  );

  const onBlur = useCallback(
    (_e: React.FocusEvent<HTMLDivElement>) => {
      setActiveField(undefined);
      dispatch(trackerActions.setSubpatternEditorFocus(false));
    },
    [dispatch],
  );

  const onCopy = useCallback(
    (e?: ClipboardEvent) => {
      if (activeField === undefined) {
        return;
      }
      if (subpattern && selectedTrackerFields) {
        const parsedSelectedPattern = parseSubPatternFieldsToClipboard(
          subpattern,
          selectedTrackerFields,
        );
        e?.preventDefault();
        e?.clipboardData?.setData("text/plain", parsedSelectedPattern);
        void API.clipboard.writeText(parsedSelectedPattern);
      }
    },
    [activeField, selectedTrackerFields, subpattern],
  );

  const onCut = useCallback(
    (e?: ClipboardEvent) => {
      if (activeField === undefined) {
        return;
      }
      if (subpattern && selectedTrackerFields) {
        const parsedSelectedPattern = parseSubPatternFieldsToClipboard(
          subpattern,
          selectedTrackerFields,
        );
        e?.preventDefault();
        e?.clipboardData?.setData("text/plain", parsedSelectedPattern);
        void API.clipboard.writeText(parsedSelectedPattern);
        deleteSelectedTrackerFields();
      }
    },
    [
      activeField,
      deleteSelectedTrackerFields,
      selectedTrackerFields,
      subpattern,
    ],
  );

  const onPaste = useCallback(async () => {
    if (subpattern) {
      const tempActiveField =
        activeField !== undefined
          ? activeField
          : selectionOrigin
            ? selectionOrigin.y * ROW_SIZE + selectionOrigin.x
            : 0;
      if (activeField === undefined) {
        setActiveField(tempActiveField);
      }
      const newPastedPattern = parseClipboardToSubPattern(
        await API.clipboard.readText(),
      );
      if (newPastedPattern) {
        const startRow = Math.floor(tempActiveField / ROW_SIZE);
        const newPattern = cloneDeep(subpattern);
        for (let i = 0; i < newPastedPattern.length; i++) {
          const pastedPatternCellRow = newPastedPattern[i];
          for (let j = 0; j < 4; j++) {
            if (pastedPatternCellRow[j] && newPattern[startRow + i]) {
              newPattern[startRow + i] = mergeWith(
                newPattern[startRow + i],
                pastedPatternCellRow[j],
                (o, s) => (s === NO_CHANGE_ON_PASTE ? o : s),
              );
            }
          }
        }
        console.log(newPattern);
        dispatch(
          trackerDocumentActions.editSubPattern({
            instrumentId: instrumentId,
            instrumentType: instrumentType,
            subpattern: newPattern,
          }),
        );
      }
    }
  }, [
    activeField,
    dispatch,
    instrumentId,
    instrumentType,
    selectionOrigin,
    subpattern,
  ]);

  // Clipboard
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

  return (
    <StyledTrackerContentTable
      $type="subpattern"
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <StyledTrackerTableBody>
        {subpattern.map((row, rowIndex) => {
          if (rowIndex >= SUBPATTERN_ROW_COUNT) return null;
          const isStepMarker = rowIndex % 8 === 0;
          const fieldCount = rowIndex * ROW_SIZE;
          return (
            <StyledTrackerRow key={rowIndex} $isStepMarker={isStepMarker}>
              <StyledTrackerCell>{renderCounter(rowIndex)}</StyledTrackerCell>
              <StyledTrackerCell>
                <StyledTrackerNoteField
                  ref={activeField === fieldCount ? activeFieldRef : null}
                  $active={activeField === fieldCount}
                  data-subpattern_fieldid={fieldCount}
                  $selected={selectedTrackerFields.indexOf(fieldCount) > -1}
                >
                  {renderOffset(row.note)}
                </StyledTrackerNoteField>

                <StyledTrackerJumpField
                  ref={activeField === fieldCount + 1 ? activeFieldRef : null}
                  $active={activeField === fieldCount + 1}
                  data-subpattern_fieldid={fieldCount + 1}
                  $selected={selectedTrackerFields.indexOf(fieldCount + 1) > -1}
                >
                  {renderJump(row.jump)}
                </StyledTrackerJumpField>

                <StyledTrackerEffectCodeField
                  ref={activeField === fieldCount + 2 ? activeFieldRef : null}
                  $active={activeField === fieldCount + 2}
                  data-subpattern_fieldid={fieldCount + 2}
                  $selected={selectedTrackerFields.indexOf(fieldCount + 2) > -1}
                >
                  {renderEffect(row.effectcode)}
                </StyledTrackerEffectCodeField>
                <StyledTrackerEffectParamField
                  ref={activeField === fieldCount + 3 ? activeFieldRef : null}
                  $active={activeField === fieldCount + 3}
                  data-subpattern_fieldid={fieldCount + 3}
                  $selected={selectedTrackerFields.indexOf(fieldCount + 3) > -1}
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
