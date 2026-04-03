import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "ui/form/Input";
import { ToggleButtonGroup } from "ui/form/ToggleButtonGroup";
import { SortableItem } from "ui/lists/SortableItem";
import { MenuItem } from "ui/menu/Menu";
import {
  ScriptEventField,
  ScriptEventFields,
  ScriptEventHeader,
  ScriptEventWrapper,
} from "ui/scripting/ScriptEvents";
import { EffectCodeSelect } from "components/music/form/EffectCodeSelect";
import { EffectParamsForm } from "components/music/form/EffectParamsForm";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { useAppDispatch } from "store/hooks";
import { createSubPatternCell } from "shared/lib/uge/song";
import { SubPatternCell } from "shared/lib/uge/types";
import {
  applySubpatternCellChanges,
  getSubpatternFlowType,
  getSubpatternJumpTarget,
  getVisibleSubpatternRows,
  isSubpatternRowEmpty,
  isValidSubpatternEffectCode,
  moveSubpatternRow,
  subPatternRowLabel,
  toSubpatternJump,
  toSubpatternNote,
  validSubpatternEffectCodes,
} from "./helpers";
import { Label } from "ui/form/Label";
import { SliderField } from "ui/form/SliderField";
import useResizeObserver from "ui/hooks/use-resize-observer";
import { mergeRefs } from "ui/hooks/merge-refs";
import { NoiseMacroEditorForm } from "components/music/form/NoiseMacroEditorForm";
import { ToggleableFormField } from "ui/form/layout/FormLayout";
import {
  StyledInstrumentSubpatternJumpOverlay,
  StyledInstrumentSubpatternScriptList,
} from "components/music/form/subpattern/style";
import { StyledScriptEventFormWrapper } from "ui/scripting/style";
import l10n from "shared/lib/lang/l10n";

interface InstrumentSubpatternScriptProps {
  instrumentId: number;
  instrumentType: "duty" | "wave" | "noise";
  subpattern: SubPatternCell[];
}

export const InstrumentSubpatternScript = ({
  instrumentId,
  instrumentType,
  subpattern,
}: InstrumentSubpatternScriptProps) => {
  const dispatch = useAppDispatch();
  const rowsListRef = useRef<HTMLDivElement | null>(null);
  const rowHeaderRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visibleRows = useMemo(
    () => getVisibleSubpatternRows(subpattern),
    [subpattern],
  );

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jumpArrow, setJumpArrow] = useState<{
    height: number;
    path: string;
    width: number;
  } | null>(null);

  const activeRow = selectedRow ?? 0;
  const selectedCell = visibleRows[activeRow] ?? createSubPatternCell();
  const selectedJumpTarget = getSubpatternJumpTarget(selectedCell.jump) ?? 0;
  const selectedPitchOffset =
    selectedCell.note === null ? 0 : selectedCell.note - 36;
  const selectedFlowType = getSubpatternFlowType(selectedCell.jump, activeRow);
  const selectedEffectIsAdvancedOnly =
    selectedCell.effectcode !== null &&
    !isValidSubpatternEffectCode(selectedCell.effectcode);

  const updateRow = useCallback(
    (rowIndex: number, changes: Partial<SubPatternCell>) => {
      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: applySubpatternCellChanges(subpattern, rowIndex, changes),
        }),
      );
    },
    [dispatch, instrumentId, instrumentType, subpattern],
  );

  const moveRows = useCallback(
    (fromIndex: number, toIndex: number) => {
      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: moveSubpatternRow(subpattern, fromIndex, toIndex),
        }),
      );

      setSelectedRow((currentRow) => {
        if (currentRow === null) {
          return currentRow;
        }
        if (currentRow === fromIndex) {
          return toIndex;
        }
        if (
          fromIndex < toIndex &&
          currentRow > fromIndex &&
          currentRow <= toIndex
        ) {
          return currentRow - 1;
        }
        if (
          fromIndex > toIndex &&
          currentRow >= toIndex &&
          currentRow < fromIndex
        ) {
          return currentRow + 1;
        }
        return currentRow;
      });
    },
    [dispatch, instrumentId, instrumentType, subpattern],
  );

  const clearRow = useCallback(
    (rowIndex: number) => {
      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: applySubpatternCellChanges(subpattern, rowIndex, {
            ...createSubPatternCell(),
          }),
        }),
      );
    },
    [dispatch, instrumentId, instrumentType, subpattern],
  );

  const onChangePitch = useCallback(
    (e: number | undefined) => {
      if (selectedRow === null) {
        return;
      }
      const nextOffset = typeof e === "number" ? e : 0;
      updateRow(selectedRow, {
        note: toSubpatternNote(Number.isNaN(nextOffset) ? 0 : nextOffset),
      });
    },
    [selectedRow, updateRow],
  );

  const onChangeFlowType = useCallback(
    (nextFlow: "continue" | "jump") => {
      if (selectedRow === null) {
        return;
      }
      if (nextFlow === "continue") {
        updateRow(selectedRow, { jump: null });
        return;
      }
      updateRow(selectedRow, { jump: toSubpatternJump(0) });
    },
    [selectedRow, updateRow],
  );

  const onChangeJumpTarget = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedRow === null) {
        return;
      }
      const nextTarget =
        e.currentTarget.value.length > 0
          ? parseInt(e.currentTarget.value, 10)
          : 0;
      updateRow(selectedRow, {
        jump: toSubpatternJump(Number.isNaN(nextTarget) ? 0 : nextTarget),
      });
    },
    [selectedRow, updateRow],
  );

  const onChangeEffectCode = useCallback(
    (effectcode: number | null) => {
      if (selectedRow === null) {
        return;
      }
      updateRow(selectedRow, {
        effectcode,
        effectparam:
          effectcode === null ? null : (selectedCell.effectparam ?? 0),
      });
    },
    [selectedCell.effectparam, selectedRow, updateRow],
  );

  const onChangeEffectParam = useCallback(
    (effectparam: number | null) => {
      if (selectedRow === null) {
        return;
      }
      updateRow(selectedRow, { effectparam });
    },
    [selectedRow, updateRow],
  );

  const [wrapperEl, wrapperSize] = useResizeObserver<HTMLDivElement>();

  useLayoutEffect(() => {
    const renderJumpArrow = () => {
      if (selectedRow === null || selectedFlowType !== "jump") {
        setJumpArrow(null);
        return;
      }

      const container = rowsListRef.current;
      const startHeader = rowHeaderRefs.current[selectedRow];
      const targetHeader = rowHeaderRefs.current[selectedJumpTarget];

      if (!container || !startHeader || !targetHeader) {
        setJumpArrow(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const startRect = startHeader.getBoundingClientRect();
      const targetRect = targetHeader.getBoundingClientRect();

      const startX = startRect.left - containerRect.left + 8;
      const startY = startRect.top - containerRect.top + startRect.height / 2;
      const targetX = targetRect.left - containerRect.left + 15;
      const targetY =
        targetRect.top - containerRect.top + targetRect.height / 2;
      const width = container.scrollWidth;
      const height = container.scrollHeight;
      const halfHeaderHeight = startRect.height / 2;

      if (selectedJumpTarget === selectedRow) {
        const startX = startRect.left - containerRect.left + 14;
        const startY = startRect.top - containerRect.top + 2 + halfHeaderHeight;
        setJumpArrow({
          width,
          height,
          path: `M ${startX} ${startY}
            L ${startX} ${startY}
            Q ${startX} ${startY + 5}, ${startX - 5} ${startY + 5}
            Q ${startX - 10} ${startY + 5}, ${startX - 10} ${startY}
            L ${startX - 10} ${startY - 7}
            Q ${startX - 10} ${startY - 13}, ${startX - 5} ${startY - 13}
            Q ${startX} ${startY - 13}, ${startX} ${startY - 6}`,
        });
        return;
      }

      const laneX = 2;
      const direction = targetY > startY ? 1 : -1;
      const bendOffset = 12 * direction;

      setJumpArrow({
        width,
        height,
        path: `M ${startX} ${startY}
          C ${laneX} ${startY},
            ${laneX} ${startY},
            ${laneX} ${startY + bendOffset}
          L ${laneX} ${targetY - bendOffset}
          C ${laneX} ${targetY},
            ${laneX} ${targetY},
            ${targetX} ${targetY}`,
      });
    };

    const frame = window.requestAnimationFrame(renderJumpArrow);
    window.addEventListener("resize", renderJumpArrow);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", renderJumpArrow);
    };
  }, [
    activeRow,
    selectedCell,
    selectedFlowType,
    selectedJumpTarget,
    selectedRow,
    wrapperSize,
  ]);

  const macroValues = useMemo(() => {
    const lastEmptyRowlIndex = subpattern.findLastIndex(
      (row) => !isSubpatternRowEmpty(row),
    );
    return subpattern
      .slice(0, Math.max(6, lastEmptyRowlIndex + 1))
      .map((cell) => (cell.note ?? 36) - 36);
  }, [subpattern]);

  const onChangeMacroValue = useCallback(
    (values: number[]) => {
      const newSubpattern = subpattern.map((cell, i) => {
        const newValue = values[i];
        if (newValue === undefined) {
          return cell;
        }
        return {
          ...cell,
          note: newValue === 0 ? null : newValue + 36,
        };
      });
      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: newSubpattern,
        }),
      );
    },
    [dispatch, instrumentId, instrumentType, subpattern],
  );

  return (
    <>
      <NoiseMacroEditorForm
        macros={macroValues}
        onChange={onChangeMacroValue}
      />
      <StyledInstrumentSubpatternScriptList
        ref={mergeRefs(rowsListRef, wrapperEl)}
      >
        {jumpArrow && selectedRow !== undefined && (
          <StyledInstrumentSubpatternJumpOverlay
            viewBox={`0 0 ${jumpArrow.width} ${jumpArrow.height}`}
            aria-hidden="true"
          >
            <path d={jumpArrow.path} fill="none" strokeWidth="2" />
          </StyledInstrumentSubpatternJumpOverlay>
        )}

        {visibleRows.map((row, rowIndex) => (
          <SortableItem
            key={`subpattern-row-${rowIndex}`}
            itemType="subpattern-row"
            item={row}
            index={rowIndex}
            orientation="vertical"
            onSelect={() => {}}
            moveItems={moveRows}
            setDragging={setIsDragging}
            useDragHandle
            renderItem={(_, dragState) => (
              <ScriptEventWrapper
                style={{
                  opacity: dragState.isDragging ? 0.4 : 1,
                  boxShadow:
                    dragState.isOver && isDragging
                      ? "0 0 0 1px currentColor inset"
                      : undefined,
                }}
              >
                <ScriptEventHeader
                  ref={
                    dragState.dragHandleRef
                      ? mergeRefs((element: HTMLDivElement | null) => {
                          rowHeaderRefs.current[rowIndex] = element;
                        }, dragState.dragHandleRef)
                      : (element: HTMLDivElement | null) => {
                          rowHeaderRefs.current[rowIndex] = element;
                        }
                  }
                  scriptEventId={`subpattern-${rowIndex}`}
                  nestLevel={0}
                  altBg={rowIndex % 2 === 0}
                  isOpen={selectedRow === rowIndex}
                  isMoveable
                  menuItems={
                    !isSubpatternRowEmpty(row) ? (
                      <MenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRow(rowIndex);
                        }}
                      >
                        {l10n("FIELD_RESET_ROW")}
                      </MenuItem>
                    ) : undefined
                  }
                  onToggle={() =>
                    setSelectedRow((currentRow) =>
                      currentRow === rowIndex ? null : rowIndex,
                    )
                  }
                >
                  <div
                    style={{
                      opacity:
                        !(selectedRow === rowIndex || dragState.isDragging) &&
                        isSubpatternRowEmpty(row)
                          ? 0.4
                          : 1,
                    }}
                  >
                    {subPatternRowLabel(rowIndex, row)}
                  </div>
                </ScriptEventHeader>

                {selectedRow === rowIndex ? (
                  <StyledScriptEventFormWrapper>
                    <ScriptEventFields>
                      <ScriptEventField>
                        <SliderField
                          name="pitch"
                          label={`Pitch Shift`}
                          min={-36}
                          max={35}
                          value={selectedPitchOffset}
                          onChange={onChangePitch}
                        />
                      </ScriptEventField>

                      <ScriptEventField>
                        <Label>{l10n("EVENT_GROUP_CONTROL_FLOW")}</Label>
                        <ToggleButtonGroup<"continue" | "jump">
                          name="subpattern_flow"
                          value={selectedFlowType}
                          options={[
                            {
                              value: "continue",
                              label: l10n("FIELD_CONTINUE"),
                            },
                            { value: "jump", label: l10n("FIELD_JUMP") },
                          ]}
                          onChange={onChangeFlowType}
                        />
                      </ScriptEventField>

                      <ScriptEventField alignBottom>
                        {selectedFlowType === "jump" && (
                          <>
                            <Label>{l10n("FIELD_NEXT_TICK")}</Label>

                            <Input
                              type="number"
                              min={0}
                              max={31}
                              value={
                                selectedJumpTarget > 0 ? selectedJumpTarget : ""
                              }
                              placeholder="0"
                              onChange={onChangeJumpTarget}
                            />
                          </>
                        )}
                      </ScriptEventField>

                      <ScriptEventField flexBasis="100%">
                        <ToggleableFormField
                          name="subpattern_effect"
                          disabledLabel={l10n("FIELD_ADD_EFFECT_OVERRIDE")}
                          label={l10n("FIELD_EFFECT_OVERRIDE")}
                          enabled={selectedCell.effectparam !== null}
                        >
                          <EffectCodeSelect
                            name="subpattern_effect"
                            value={
                              selectedEffectIsAdvancedOnly
                                ? undefined
                                : selectedCell.effectcode
                            }
                            effectParam={selectedCell.effectparam ?? 0}
                            note={selectedCell.note ?? undefined}
                            instrumentId={instrumentId}
                            allowedEffectCodes={[...validSubpatternEffectCodes]}
                            onChange={onChangeEffectCode}
                            noneLabel={l10n("FIELD_NONE")}
                          />
                        </ToggleableFormField>
                      </ScriptEventField>
                    </ScriptEventFields>

                    {!selectedEffectIsAdvancedOnly &&
                      selectedCell.effectcode !== null && (
                        <EffectParamsForm
                          effectCode={selectedCell.effectcode}
                          value={selectedCell.effectparam}
                          note={selectedCell.note ?? undefined}
                          instrumentId={instrumentId}
                          onChange={onChangeEffectParam}
                        />
                      )}
                  </StyledScriptEventFormWrapper>
                ) : null}
              </ScriptEventWrapper>
            )}
          />
        ))}
      </StyledInstrumentSubpatternScriptList>
    </>
  );
};
