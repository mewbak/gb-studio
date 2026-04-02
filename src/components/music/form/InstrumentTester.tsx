import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  playDutyNotePreview,
  playNoiseNotePreview,
  playWaveNotePreview,
} from "components/music/helpers";
import { testNotes } from "components/music/sidebar/helpers";
import { NOTE_C5 } from "consts";
import { isEqual } from "lodash";
import throttle from "lodash/throttle";
import l10n from "shared/lib/lang/l10n";
import {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";
import { useAppSelector } from "store/hooks";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FormField, FormRow } from "ui/form/layout/FormLayout";
import { InstrumentType } from "shared/lib/music/types";

interface InstrumentTesterProps {
  instrumentId: number;
  instrumentType: InstrumentType;
}

const genKey = (instrumentId: number, instrumentType: InstrumentType): string =>
  `${instrumentId}:${instrumentType}`;

const getInstrument = (
  instrumentType: InstrumentType,
  dutyInstrument: DutyInstrument | undefined,
  waveInstrument: WaveInstrument | undefined,
  noiseInstrument: NoiseInstrument | undefined,
) => {
  if (instrumentType === "duty") {
    return dutyInstrument;
  }
  if (instrumentType === "wave") {
    return waveInstrument;
  }
  if (instrumentType === "noise") {
    return noiseInstrument;
  }
  return undefined;
};

export const InstrumentTester = ({
  instrumentId,
  instrumentType,
}: InstrumentTesterProps) => {
  const selectedChannelId = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  const dutyInstrument = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.duty_instruments[instrumentId],
  );
  const waveInstrument = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.wave_instruments[instrumentId],
  );
  const noiseInstrument = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.noise_instruments[instrumentId],
  );
  const waveForm = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.waves[
        waveInstrument?.wave_index ?? 0
      ],
  );

  const selectedChannelIdRef = useRef(selectedChannelId);
  const keyRef = useRef(genKey(instrumentId, instrumentType));
  const dutyInstrumentRef = useRef(dutyInstrument);
  const waveInstrumentRef = useRef(waveInstrument);
  const noiseInstrumentRef = useRef(noiseInstrument);
  const waveFormRef = useRef(waveForm);

  const throttledTestInstrument = useRef(
    throttle(
      () => {
        const note = NOTE_C5;
        if (instrumentType === "duty" && dutyInstrumentRef.current) {
          playDutyNotePreview(
            note,
            dutyInstrumentRef.current,
            selectedChannelIdRef.current === 1 ? 1 : 0,
            0,
            0,
          );
        } else if (
          instrumentType === "wave" &&
          waveInstrumentRef.current &&
          waveFormRef.current
        ) {
          playWaveNotePreview(
            note,
            waveInstrumentRef.current,
            waveFormRef.current,
            0,
            0,
          );
        } else if (instrumentType === "noise" && noiseInstrumentRef.current) {
          playNoiseNotePreview(note, noiseInstrumentRef.current, 0, 0);
        }
      },
      400,
      { leading: false, trailing: true },
    ),
  ).current;

  useEffect(() => {
    const prevInstrument = getInstrument(
      instrumentType,
      dutyInstrumentRef.current,
      waveInstrumentRef.current,
      noiseInstrumentRef.current,
    );
    const prevWave = waveFormRef.current;

    dutyInstrumentRef.current = dutyInstrument;
    waveInstrumentRef.current = waveInstrument;
    noiseInstrumentRef.current = noiseInstrument;

    waveFormRef.current = waveForm;

    const newKey = genKey(instrumentId, instrumentType);

    if (keyRef.current === newKey) {
      const newInstrument = getInstrument(
        instrumentType,
        dutyInstrument,
        waveInstrument,
        noiseInstrument,
      );
      if (
        !isEqual(prevInstrument, newInstrument) ||
        (instrumentType === "wave" && !isEqual(prevWave, waveForm))
      ) {
        throttledTestInstrument();
      }
    }

    keyRef.current = newKey;
  }, [
    dutyInstrument,
    instrumentId,
    instrumentType,
    noiseInstrument,
    throttledTestInstrument,
    waveForm,
    waveInstrument,
  ]);

  const onTestInstrument = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const note = parseInt(e.currentTarget.dataset.note ?? "", 10);
      if (instrumentType === "duty" && dutyInstrumentRef.current) {
        playDutyNotePreview(
          note,
          dutyInstrumentRef.current,
          selectedChannelIdRef.current === 1 ? 1 : 0,
          0,
          0,
        );
      } else if (
        instrumentType === "wave" &&
        waveInstrumentRef.current &&
        waveFormRef.current
      ) {
        playWaveNotePreview(
          note,
          waveInstrumentRef.current,
          waveFormRef.current,
          0,
          0,
        );
      } else if (instrumentType === "noise" && noiseInstrumentRef.current) {
        playNoiseNotePreview(note, noiseInstrumentRef.current, 0, 0);
      }
    },
    [instrumentType],
  );

  return (
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
              data-note={value}
              onClick={onTestInstrument}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </FormField>
    </FormRow>
  );
};
