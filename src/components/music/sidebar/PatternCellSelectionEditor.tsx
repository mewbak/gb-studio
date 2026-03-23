import React, { useMemo } from "react";
import {
  FormDivider,
  FormRow,
  FormSectionTitle,
} from "ui/form/layout/FormLayout";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { Label } from "ui/form/Label";
import l10n from "shared/lib/lang/l10n";
import { getSharedPatternCellValue } from "shared/lib/uge/editor/helpers";
import { InstrumentSelect } from "components/music/toolbar/InstrumentSelect";
import { PitchSelect } from "components/music/toolbar/PitchSelect";

export const PatternCellSelectionEditor = () => {
  const dispatch = useAppDispatch();

  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const selectedPatternCells = useAppSelector(
    (state) => state.tracker.selectedPatternCells,
  );

  const sharedNote = useMemo(() => {
    if (!song || selectedPatternCells.length === 0) {
      return null;
    }
    return getSharedPatternCellValue(
      song,
      selectedPatternCells,
      (cell) => cell.note,
    );
  }, [selectedPatternCells, song]);

  const sharedInstrumentId = useMemo(() => {
    if (!song || selectedPatternCells.length === 0) {
      return null;
    }
    return getSharedPatternCellValue(
      song,
      selectedPatternCells,
      (cell) => cell.instrument,
    );
  }, [selectedPatternCells, song]);

  return (
    <>
      <FormSectionTitle>NOTES</FormSectionTitle>

      <FormRow>
        <Label>Pitch</Label>
      </FormRow>
      <FormRow>
        <PitchSelect
          name="note"
          value={sharedNote !== null ? sharedNote : undefined}
          onChange={(note) => {
            dispatch(
              trackerDocumentActions.changeNoteAbsoluteCells({
                patternCells: selectedPatternCells,
                note,
              }),
            );
          }}
          noneLabel={
            selectedPatternCells.length > 1 ? "Multiple Values" : "None"
          }
          instrumentId={
            sharedInstrumentId !== null ? sharedInstrumentId : undefined
          }
        />
      </FormRow>

      <FormRow>
        <Label>{l10n("FIELD_INSTRUMENT")}</Label>
      </FormRow>
      <FormRow>
        <InstrumentSelect
          name="instrument"
          value={sharedInstrumentId !== null ? sharedInstrumentId : undefined}
          onChange={(instrumentId) => {
            dispatch(
              trackerDocumentActions.changeInstrumentAbsoluteCells({
                patternCells: selectedPatternCells,
                instrumentId,
              }),
            );
          }}
          noneLabel={
            selectedPatternCells.length > 1 ? "Multiple Values" : "None"
          }
          note={sharedNote !== null ? sharedNote : undefined}
        />
      </FormRow>

      <FormDivider />
      <FormRow>
        <div>
          <Label>{l10n("FIELD_SEMITONE")}</Label>
          <ButtonGroup>
            <Button
              onClick={(e) => {
                e.preventDefault();
                dispatch(
                  trackerDocumentActions.transposeAbsoluteCells({
                    patternCells: selectedPatternCells,
                    direction: "down",
                    size: "note",
                  }),
                );
              }}
            >
              -
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                dispatch(
                  trackerDocumentActions.transposeAbsoluteCells({
                    patternCells: selectedPatternCells,
                    direction: "up",
                    size: "note",
                  }),
                );
              }}
            >
              +
            </Button>
          </ButtonGroup>
        </div>
        <div>
          <Label>{l10n("FIELD_OCTAVE")}</Label>
          <ButtonGroup>
            <Button
              onClick={(e) => {
                e.preventDefault();
                dispatch(
                  trackerDocumentActions.transposeAbsoluteCells({
                    patternCells: selectedPatternCells,
                    direction: "down",
                    size: "octave",
                  }),
                );
              }}
            >
              -
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                dispatch(
                  trackerDocumentActions.transposeAbsoluteCells({
                    patternCells: selectedPatternCells,
                    direction: "up",
                    size: "octave",
                  }),
                );
              }}
            >
              +
            </Button>
          </ButtonGroup>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <Label></Label>
          <Button
            onClick={(e) => {
              e.preventDefault();
              dispatch(
                trackerDocumentActions.interpolateAbsoluteCells({
                  patternCells: selectedPatternCells,
                }),
              );
            }}
          >
            {l10n("FIELD_INTERPOLATE")}
          </Button>
        </div>
      </FormRow>
    </>
  );
};
