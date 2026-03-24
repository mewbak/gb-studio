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
import { getPatternCellSelectionValue } from "shared/lib/uge/editor/helpers";
import { InstrumentSelect } from "components/music/toolbar/InstrumentSelect";
import { PitchSelect } from "components/music/toolbar/PitchSelect";
import { EffectCodeSelect } from "components/music/toolbar/EffectCodeSelect";
import { PatternCellAddress } from "shared/lib/uge/editor/types";
import { PatternCell, Song } from "shared/lib/uge/types";
import { EffectParamsForm } from "./EffectParamsForm";

const getSharedValue = <T extends keyof PatternCell>(
  song: Song | undefined,
  selectedPatternCells: PatternCellAddress[],
  field: T,
) => {
  if (!song || selectedPatternCells.length === 0) {
    return { type: "none", value: null } as const;
  }
  return getPatternCellSelectionValue(
    song,
    selectedPatternCells,
    (cell) => cell[field],
  );
};

export const PatternCellSelectionEditor = () => {
  const dispatch = useAppDispatch();

  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const selectedPatternCells = useAppSelector(
    (state) => state.tracker.selectedPatternCells,
  );

  const sharedNote = useMemo(
    () => getSharedValue(song, selectedPatternCells, "note"),
    [selectedPatternCells, song],
  );

  const sharedInstrumentId = useMemo(
    () => getSharedValue(song, selectedPatternCells, "instrument"),
    [selectedPatternCells, song],
  );

  const sharedEffectCode = useMemo(
    () => getSharedValue(song, selectedPatternCells, "effectcode"),
    [selectedPatternCells, song],
  );

  const sharedEffectParam = useMemo(
    () => getSharedValue(song, selectedPatternCells, "effectparam"),
    [selectedPatternCells, song],
  );

  return (
    <>
      <FormSectionTitle>NOTES</FormSectionTitle>
      <FormRow>
        <Label>Pitch</Label>
      </FormRow>
      <FormRow>
        <PitchSelect
          name="note"
          value={sharedNote.value ?? undefined}
          onChange={(note) => {
            dispatch(
              trackerDocumentActions.changeNoteAbsoluteCells({
                patternCells: selectedPatternCells,
                note,
              }),
            );
          }}
          noneLabel={
            sharedNote.type === "multiple" ? "Multiple Values" : "None"
          }
          instrumentId={sharedInstrumentId.value ?? undefined}
          effectCode={sharedEffectCode.value ?? undefined}
          effectParam={sharedEffectParam.value ?? undefined}
        />
      </FormRow>

      <FormRow>
        <Label>{l10n("FIELD_INSTRUMENT")}</Label>
      </FormRow>
      <FormRow>
        <InstrumentSelect
          name="instrument"
          value={sharedInstrumentId.value ?? undefined}
          onChange={(instrumentId) => {
            dispatch(
              trackerDocumentActions.changeInstrumentAbsoluteCells({
                patternCells: selectedPatternCells,
                instrumentId,
              }),
            );
          }}
          noneLabel={
            sharedInstrumentId.type === "multiple" ? "Multiple Values" : "None"
          }
          note={sharedNote.value ?? undefined}
          effectCode={sharedEffectCode.value ?? undefined}
          effectParam={sharedEffectParam.value ?? undefined}
        />
      </FormRow>

      <FormRow>
        <Label>{l10n("FIELD_EFFECT")}</Label>
      </FormRow>
      <FormRow>
        <EffectCodeSelect
          name="effectCode"
          value={sharedEffectCode.value ?? undefined}
          onChange={(effectCode) => {
            dispatch(
              trackerDocumentActions.editPatternCells({
                patternCells: selectedPatternCells,
                changes: {
                  effectcode: effectCode,
                },
              }),
            );
          }}
          noneLabel={
            sharedEffectCode.type === "multiple" ? "Multiple Values" : "None"
          }
          // note={sharedNote !== null ? sharedNote : undefined}
          note={sharedNote.value ?? undefined}
          instrumentId={sharedInstrumentId.value ?? undefined}
          effectParam={sharedEffectParam.value ?? undefined}
        />
      </FormRow>

      {sharedEffectCode.type === "shared" && (
        <EffectParamsForm
          effectCode={sharedEffectCode.value ?? undefined}
          value={sharedEffectParam.value ?? undefined}
          note={sharedNote.value ?? undefined}
          onChange={(newEffectParam) => {
            dispatch(
              trackerDocumentActions.editPatternCells({
                patternCells: selectedPatternCells,
                changes: {
                  effectparam: newEffectParam,
                },
              }),
            );
          }}
          onChangeNote={(newNote) => {
            dispatch(
              trackerDocumentActions.editPatternCells({
                patternCells: selectedPatternCells,
                changes: {
                  note: newNote,
                },
              }),
            );
          }}
          instrumentId={sharedInstrumentId.value ?? undefined}
        />
      )}
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
        {selectedPatternCells.length > 1 && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
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
        )}
      </FormRow>
    </>
  );
};
