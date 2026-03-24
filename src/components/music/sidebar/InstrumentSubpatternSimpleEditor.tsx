import React, { useCallback, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { Button } from "ui/buttons/Button";
import { Input } from "ui/form/Input";
import { ToggleButtonGroup } from "ui/form/ToggleButtonGroup";
import { EffectCodeSelect } from "components/music/form/EffectCodeSelect";
import { EffectParamsForm } from "components/music/form/EffectParamsForm";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { useAppDispatch } from "store/hooks";
import { createSubPatternCell } from "shared/lib/uge/song";
import { SubPatternCell } from "shared/lib/uge/types";
import {
  applySubpatternCellChanges,
  formatSubpatternEffect,
  formatSubpatternFlow,
  formatSubpatternPitch,
  getSubpatternFlowType,
  getSubpatternJumpTarget,
  getVisibleSubpatternRows,
  isSubpatternRowEmpty,
  isValidSubpatternEffectCode,
  toSubpatternJump,
  toSubpatternNote,
  validSubpatternEffectCodes,
} from "./subpatternHelpers";

const Wrapper = styled.div`
  padding: 0 10px 10px;
`;

const Intro = styled.div`
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 4px;
  background: ${(props) => props.theme.colors.card.background};
  border: 1px solid ${(props) => props.theme.colors.card.border};
  color: ${(props) => props.theme.colors.card.text};
  font-size: 12px;
  line-height: 1.5;
`;

const IntroTitle = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
`;

const DisabledNote = styled.div`
  margin-top: 6px;
  opacity: 0.8;
`;

const RowHeader = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 8px;
  padding: 0 12px 6px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.8;
`;

const RowItem = styled.div`
  margin-bottom: 6px;
`;

const RowButton = styled.button<{ $active: boolean; $empty: boolean }>`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.colors.card.border};
  background: ${(props) => props.theme.colors.card.background};
  color: ${(props) => props.theme.colors.card.text};
  text-align: left;

  &:hover {
    background: ${(props) => props.theme.colors.input.hoverBackground};
  }

  ${(props) =>
    props.$active
      ? css`
          border-color: ${props.theme.colors.highlight};
          box-shadow: 0 0 0 1px ${props.theme.colors.highlight};
        `
      : ""}

  ${(props) =>
    props.$empty
      ? css`
          opacity: 0.55;
        `
      : ""}
`;

const RowTick = styled.span`
  font-family: monospace;
  font-weight: bold;
`;

const RowCell = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EditorPanel = styled.div`
  margin-top: 0;
  margin-left: 20px;
  margin-right: 8px;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.colors.card.border};
  background: ${(props) => props.theme.colors.card.background};
  color: ${(props) => props.theme.colors.card.text};
`;

const EditorHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const EditorTitle = styled.div`
  font-weight: bold;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const FieldBlock = styled.div`
  min-width: 0;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
`;

const HelpText = styled.div`
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.8;
`;

const AdvancedOnlyNotice = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.colors.highlight};
  background: ${(props) => props.theme.colors.card.background};
  color: ${(props) => props.theme.colors.card.text};
`;

interface InstrumentSubpatternSimpleEditorProps {
  enabled: boolean;
  instrumentId: number;
  instrumentType: "duty" | "wave" | "noise";
  subpattern: SubPatternCell[];
}

export const InstrumentSubpatternSimpleEditor = ({
  enabled,
  instrumentId,
  instrumentType,
  subpattern,
}: InstrumentSubpatternSimpleEditorProps) => {
  const dispatch = useAppDispatch();
  const visibleRows = useMemo(() => getVisibleSubpatternRows(subpattern), [subpattern]);

  const [selectedRow, setSelectedRow] = useState(() => {
    const firstConfiguredRow = visibleRows.findIndex(
      (row) => !isSubpatternRowEmpty(row),
    );
    return firstConfiguredRow >= 0 ? firstConfiguredRow : 0;
  });

  const selectedCell = visibleRows[selectedRow] ?? createSubPatternCell();
  const selectedJumpTarget = getSubpatternJumpTarget(selectedCell.jump) ?? 0;
  const selectedPitchOffset =
    selectedCell.note === null ? 0 : selectedCell.note - 36;
  const selectedFlowType = getSubpatternFlowType(selectedCell.jump, selectedRow);
  const selectedEffectIsAdvancedOnly =
    selectedCell.effectcode !== null &&
    !isValidSubpatternEffectCode(selectedCell.effectcode);

  const updateSelectedRow = useCallback(
    (changes: Partial<SubPatternCell>) => {
      dispatch(
        trackerDocumentActions.editSubPattern({
          instrumentId,
          instrumentType,
          subpattern: applySubpatternCellChanges(subpattern, selectedRow, changes),
        }),
      );
    },
    [dispatch, instrumentId, instrumentType, selectedRow, subpattern],
  );

  const onChangePitch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextOffset =
        e.currentTarget.value.length > 0 ? parseInt(e.currentTarget.value, 10) : 0;
      updateSelectedRow({
        note: toSubpatternNote(Number.isNaN(nextOffset) ? 0 : nextOffset),
      });
    },
    [updateSelectedRow],
  );

  const onChangeFlowType = useCallback(
    (nextFlow: "continue" | "jump") => {
      if (nextFlow === "continue") {
        updateSelectedRow({ jump: null });
        return;
      }
      updateSelectedRow({ jump: toSubpatternJump(selectedJumpTarget) });
    },
    [selectedJumpTarget, updateSelectedRow],
  );

  const onChangeJumpTarget = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextTarget =
        e.currentTarget.value.length > 0 ? parseInt(e.currentTarget.value, 10) : 0;
      updateSelectedRow({
        jump: toSubpatternJump(Number.isNaN(nextTarget) ? 0 : nextTarget),
      });
    },
    [updateSelectedRow],
  );

  const onChangeEffectCode = useCallback(
    (effectcode: number | null) => {
      updateSelectedRow({
        effectcode,
        effectparam: effectcode === null ? null : selectedCell.effectparam ?? 0,
      });
    },
    [selectedCell.effectparam, updateSelectedRow],
  );

  const onChangeEffectParam = useCallback(
    (effectparam: number | null) => {
      updateSelectedRow({ effectparam });
    },
    [updateSelectedRow],
  );

  const onClearRow = useCallback(() => {
    dispatch(
      trackerDocumentActions.editSubPattern({
        instrumentId,
        instrumentType,
        subpattern: applySubpatternCellChanges(subpattern, selectedRow, {
          ...createSubPatternCell(),
        }),
      }),
    );
  }, [dispatch, instrumentId, instrumentType, selectedRow, subpattern]);

  return (
    <Wrapper>
      <Intro>
        <IntroTitle>Subpattern</IntroTitle>
        Runs once per tick while this instrument plays. Rows loop back to 00
        unless a jump changes the flow, and subpattern effects override tracker
        effects on the same tick.
        {!enabled ? (
          <DisabledNote>
            This instrument&apos;s subpattern is currently disabled, but you can
            still edit it here.
          </DisabledNote>
        ) : null}
      </Intro>

      <RowHeader>
        <span>Tick</span>
        <span>Pitch</span>
        <span>Flow</span>
        <span>Effect</span>
      </RowHeader>

      {visibleRows.map((row, rowIndex) => (
        <RowItem key={`subpattern-row-${rowIndex}`}>
          <RowButton
            type="button"
            $active={selectedRow === rowIndex}
            $empty={isSubpatternRowEmpty(row)}
            onClick={() => setSelectedRow(rowIndex)}
          >
            <RowTick>{String(rowIndex).padStart(2, "0")}</RowTick>
            <RowCell>{formatSubpatternPitch(row.note)}</RowCell>
            <RowCell>{formatSubpatternFlow(row.jump, rowIndex)}</RowCell>
            <RowCell>{formatSubpatternEffect(row.effectcode, row.effectparam)}</RowCell>
          </RowButton>

          {selectedRow === rowIndex ? (
            <EditorPanel>
              <EditorHeading>
                <EditorTitle>
                  Edit Tick {String(selectedRow).padStart(2, "0")}
                </EditorTitle>
                <Button type="button" size="small" onClick={onClearRow}>
                  Clear Row
                </Button>
              </EditorHeading>

              <FieldGrid>
                <FieldBlock>
                  <FieldLabel htmlFor="subpattern_pitch_offset">
                    Pitch
                  </FieldLabel>
                  <Input
                    id="subpattern_pitch_offset"
                    type="number"
                    min={-36}
                    max={35}
                    value={selectedPitchOffset}
                    onChange={onChangePitch}
                  />
                  <HelpText>
                    Semitone offset from the played note. 0 means Base.
                  </HelpText>
                </FieldBlock>

                <FieldBlock>
                  <FieldLabel>Flow</FieldLabel>
                  <ToggleButtonGroup<"continue" | "jump">
                    name="subpattern_flow"
                    value={selectedFlowType}
                    options={[
                      { value: "continue", label: "Continue" },
                      { value: "jump", label: "Jump" },
                    ]}
                    onChange={onChangeFlowType}
                  />
                  {selectedFlowType === "jump" ? (
                    <>
                      <HelpText>Choose which tick to jump to next.</HelpText>
                      <Input
                        type="number"
                        min={0}
                        max={31}
                        value={selectedJumpTarget}
                        onChange={onChangeJumpTarget}
                      />
                    </>
                  ) : null}
                </FieldBlock>

                <FieldBlock>
                  <FieldLabel>Effect</FieldLabel>
                  <EffectCodeSelect
                    name="subpattern_effect"
                    value={selectedCell.effectcode}
                    effectParam={selectedCell.effectparam ?? 0}
                    note={selectedCell.note ?? undefined}
                    instrumentId={instrumentId}
                    allowedEffectCodes={[...validSubpatternEffectCodes]}
                    onChange={onChangeEffectCode}
                    noneLabel="None"
                  />
                  <HelpText>
                    Only effects that are valid inside subpatterns can be
                    selected in this view.
                  </HelpText>
                </FieldBlock>
              </FieldGrid>

              {selectedEffectIsAdvancedOnly ? (
                <AdvancedOnlyNotice>
                  This row uses an advanced-only effect. Switch to the tracker
                  view to edit it directly, or choose a supported effect here.
                </AdvancedOnlyNotice>
              ) : selectedCell.effectcode !== null ? (
                <EffectParamsForm
                  effectCode={selectedCell.effectcode}
                  value={selectedCell.effectparam}
                  note={selectedCell.note ?? undefined}
                  instrumentId={instrumentId}
                  onChange={onChangeEffectParam}
                />
              ) : null}
            </EditorPanel>
          ) : null}
        </RowItem>
      ))}
    </Wrapper>
  );
};
