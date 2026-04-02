import React, { useCallback, useMemo } from "react";
import { castEventToBool } from "renderer/lib/helpers/castEventValue";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { NoiseInstrument } from "shared/lib/uge/types";
import { CheckboxField } from "ui/form/CheckboxField";
import { FormDivider, FormField, FormRow } from "ui/form/layout/FormLayout";
import { Button } from "ui/buttons/Button";
import { useAppDispatch } from "store/hooks";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { testNotes } from "./helpers";
import { playNoiseNotePreview } from "components/music/helpers";
import { InstrumentEnvelopeEditor } from "components/music/sidebar/InstrumentEnvelopeEditor";
import { InstrumentEnvelopePreview } from "components/music/sidebar/InstrumentEnvelopePreview";

interface InstrumentNoiseEditorProps {
  id: string;
  instrument?: NoiseInstrument;
}

export const InstrumentNoiseEditor = ({
  instrument,
}: InstrumentNoiseEditorProps) => {
  const dispatch = useAppDispatch();

  const instrumentId = instrument?.index;

  const onChangeField = useCallback(
    <T extends keyof NoiseInstrument>(key: T) =>
      (editValue: NoiseInstrument[T]) => {
        if (instrumentId === undefined) {
          return;
        }
        dispatch(
          trackerDocumentActions.editNoiseInstrument({
            instrumentId,
            changes: {
              [key]: editValue,
            },
          }),
        );
      },
    [dispatch, instrumentId],
  );

  const onChangeEnvelopeLength = useMemo(
    () => onChangeField("length"),
    [onChangeField],
  );

  const onChangeEnvelopeVolume = useMemo(
    () => onChangeField("initial_volume"),
    [onChangeField],
  );

  const onChangeEnvelopeSweep = useMemo(
    () => onChangeField("volume_sweep_change"),
    [onChangeField],
  );

  const onTestInstrument = useCallback(
    (note: number) => () => {
      if (!instrument) {
        return;
      }
      playNoiseNotePreview(note, instrument, 0, 0);
    },
    [instrument],
  );

  if (!instrument) {
    return null;
  }

  return (
    <>
      <InstrumentEnvelopeEditor
        volume={instrument.initial_volume}
        sweep={instrument.volume_sweep_change}
        length={instrument.length}
        onChangeVolume={onChangeEnvelopeVolume}
        onChangeSweep={onChangeEnvelopeSweep}
        onChangeLength={onChangeEnvelopeLength}
      />
      <FormRow>
        <InstrumentEnvelopePreview
          volume={instrument.initial_volume}
          sweep={instrument.volume_sweep_change}
          length={instrument.length}
        />
      </FormRow>

      <FormDivider />

      <FormRow>
        <CheckboxField
          name="bit_count"
          label={l10n("FIELD_BIT_COUNT")}
          checked={instrument.bit_count === 7}
          onChange={(e) => {
            const v = castEventToBool(e);
            const value = v ? 7 : 15;
            onChangeField("bit_count")(value);
          }}
        />
      </FormRow>

      <FormDivider />

      <FormRow>
        <FormField
          name="test_instrument_C5"
          label={l10n("FIELD_TEST_INSTRUMENT")}
        >
          <ButtonGroup>
            {testNotes.map(({ label, value }) => (
              <Button
                key={`test_instrument_${label}`}
                id={`test_instrument_${label}`}
                onClick={onTestInstrument(value)}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </FormField>
      </FormRow>
    </>
  );
};
