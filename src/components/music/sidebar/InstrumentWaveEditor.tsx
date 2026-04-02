import React, { useCallback, useMemo } from "react";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { WaveInstrument } from "shared/lib/uge/types";
import { FormDivider, FormField, FormRow } from "ui/form/layout/FormLayout";
import { Option, Select } from "ui/form/Select";
import { InstrumentLengthForm } from "components/music/form/InstrumentLengthForm";
import { WaveEditorForm } from "components/music/form/WaveEditorForm";
import { useAppDispatch } from "store/hooks";
import { SingleValue } from "react-select";
import { Knob } from "ui/form/Knob";
import { InstrumentWaveEnvelopeEditor } from "components/music/sidebar/InstrumentWaveEnvelopeEditor";

const volumeOptions = [
  {
    value: "0",
    label: "Mute",
  },
  {
    value: "1",
    label: "100%",
  },
  {
    value: "2",
    label: "50%",
  },
  {
    value: "3",
    label: "25%",
  },
];

interface InstrumentWaveEditorProps {
  id: string;
  instrument: WaveInstrument;
  waveForms: Uint8Array[];
}

export const InstrumentWaveEditor = ({
  instrument,
}: InstrumentWaveEditorProps) => {
  const dispatch = useAppDispatch();

  const selectedVolume = volumeOptions.find(
    (i) => parseInt(i.value, 10) === instrument.volume,
  );

  const instrumentId = instrument?.index;

  const onChangeField = useCallback(
    <T extends keyof WaveInstrument>(key: T) =>
      (editValue: WaveInstrument[T]) => {
        dispatch(
          trackerDocumentActions.editWaveInstrument({
            instrumentId,
            changes: {
              [key]: editValue,
            },
          }),
        );
      },
    [dispatch, instrumentId],
  );

  const onChangeFieldSelect = useCallback(
    <T extends keyof WaveInstrument>(key: T) =>
      (e: { value: number | string; label: string }) => {
        const editValue = e.value;
        dispatch(
          trackerDocumentActions.editWaveInstrument({
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
    () => onChangeField("volume"),
    [onChangeField],
  );

  if (!instrument) {
    return null;
  }

  return (
    <>
      <InstrumentWaveEnvelopeEditor
        volume={instrument.volume}
        length={instrument.length}
        onChangeVolume={onChangeEnvelopeVolume}
        onChangeLength={onChangeEnvelopeLength}
      />

      <FormDivider />

      <WaveEditorForm
        waveId={instrument.wave_index}
        onChange={onChangeFieldSelect("wave_index")}
      />
    </>
  );
};
