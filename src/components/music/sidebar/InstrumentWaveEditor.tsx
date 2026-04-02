import React, { useCallback, useMemo } from "react";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { WaveInstrument } from "shared/lib/uge/types";
import { FormDivider } from "ui/form/layout/FormLayout";
import { WaveEditorForm } from "components/music/form/WaveEditorForm";
import { useAppDispatch } from "store/hooks";
import { InstrumentWaveEnvelopeEditor } from "components/music/sidebar/InstrumentWaveEnvelopeEditor";

interface InstrumentWaveEditorProps {
  id: string;
  instrument: WaveInstrument;
  waveForms: Uint8Array[];
}

export const InstrumentWaveEditor = ({
  instrument,
}: InstrumentWaveEditorProps) => {
  const dispatch = useAppDispatch();

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

  const onChangeEnvelopeLength = useMemo(
    () => onChangeField("length"),
    [onChangeField],
  );

  const onChangeEnvelopeVolume = useMemo(
    () => onChangeField("volume"),
    [onChangeField],
  );

  const onChangeWaveIndex = useMemo(
    () => onChangeField("wave_index"),
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
        onChange={onChangeWaveIndex}
      />
    </>
  );
};
