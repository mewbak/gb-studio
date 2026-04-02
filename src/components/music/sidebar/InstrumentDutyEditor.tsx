import React, { useCallback, useEffect, useMemo, useRef } from "react";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { DutyInstrument } from "shared/lib/uge/types";
import { FormDivider, FormField, FormRow } from "ui/form/layout/FormLayout";
import { Select } from "ui/form/Select";
import { SliderField } from "ui/form/SliderField";
import { Button } from "ui/buttons/Button";
import l10n from "shared/lib/lang/l10n";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { SingleValue } from "react-select";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { testNotes } from "./helpers";
import throttle from "lodash/throttle";
import { NOTE_C5 } from "consts";
import { playDutyNotePreview } from "components/music/helpers";
import { Alert, AlertItem } from "ui/alerts/Alert";
import { InstrumentEnvelopeEditor } from "components/music/sidebar/InstrumentEnvelopeEditor";
import { InstrumentEnvelopePreview } from "components/music/sidebar/InstrumentEnvelopePreview";
import { Knob } from "ui/form/Knob";
import { Label } from "ui/form/Label";
import { Slider } from "ui/form/Slider";

const dutyOptions = [
  {
    value: 0,
    label: "12.5%",
  },
  {
    value: 1,
    label: "25%",
  },
  {
    value: 2,
    label: "50%",
  },
  {
    value: 3,
    label: "75%",
  },
];

const sweepTimeOptions = [
  {
    value: 0,
    label: "Off",
  },
  {
    value: 1,
    label: "1/128Hz",
  },
  {
    value: 2,
    label: "2/128Hz",
  },
  {
    value: 3,
    label: "3/128Hz",
  },
  {
    value: 4,
    label: "4/128Hz",
  },
  {
    value: 5,
    label: "5/128Hz",
  },
  {
    value: 6,
    label: "6/128Hz",
  },
  {
    value: 7,
    label: "7/128Hz",
  },
];

interface InstrumentDutyEditorProps {
  id: string;
  instrument?: DutyInstrument;
}

export const InstrumentDutyEditor = ({
  instrument,
}: InstrumentDutyEditorProps) => {
  const dispatch = useAppDispatch();
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  const instrumentId = instrument?.index;

  const instrumentRef = useRef(instrument);

  useEffect(() => {
    instrumentRef.current = instrument;
  }, [instrument]);

  const throttledTestInstrument = useRef(
    throttle(
      (instrument: DutyInstrument, channel: number) => {
        playDutyNotePreview(NOTE_C5, instrument, channel === 1 ? 1 : 0, 0, 0);
      },
      500,
      { trailing: true },
    ),
  ).current;

  useEffect(() => {
    return () => {
      throttledTestInstrument.cancel();
    };
  }, [throttledTestInstrument]);

  const selectedDuty = dutyOptions.find(
    (i) => i.value === instrument?.duty_cycle,
  );

  const selectedSweepTime = sweepTimeOptions.find(
    (i) => i.value === instrument?.frequency_sweep_time,
  );

  const onChangeField = useCallback(
    <T extends keyof DutyInstrument>(key: T) =>
      (editValue: DutyInstrument[T]) => {
        if (instrumentId === undefined || !instrumentRef.current) {
          return;
        }
        dispatch(
          trackerDocumentActions.editDutyInstrument({
            instrumentId,
            changes: {
              [key]: editValue,
            },
          }),
        );
        const newValue = { ...instrumentRef.current, [key]: editValue };
        throttledTestInstrument(newValue, selectedChannel);
      },
    [dispatch, instrumentId, selectedChannel, throttledTestInstrument],
  );

  const onChangeFieldSelect = useCallback(
    <T extends keyof DutyInstrument>(key: T) =>
      (e: SingleValue<{ value: DutyInstrument[T]; label: string }>) => {
        if (instrumentId === undefined || !instrumentRef.current) {
          return;
        }
        if (e) {
          const editValue = e.value;
          dispatch(
            trackerDocumentActions.editDutyInstrument({
              instrumentId,
              changes: {
                [key]: editValue,
              },
            }),
          );
          const newValue = { ...instrumentRef.current, [key]: editValue };
          throttledTestInstrument(newValue, selectedChannel);
        }
      },
    [dispatch, instrumentId, selectedChannel, throttledTestInstrument],
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
      playDutyNotePreview(
        note,
        instrument,
        selectedChannel === 1 ? 1 : 0,
        0,
        0,
      );
    },
    [instrument, selectedChannel],
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
        <FormField name="frequency_sweep_time" label={l10n("FIELD_SWEEP_TIME")}>
          <Select
            name="frequency_sweep_time"
            value={selectedSweepTime}
            options={sweepTimeOptions}
            onChange={onChangeFieldSelect("frequency_sweep_time")}
            menuPlacement="top"
          />
        </FormField>
        <FormField
          name="frequency_sweep_time"
          label={l10n("FIELD_SWEEP_SHIFT")}
        >
          <Slider
            value={instrument.frequency_sweep_shift || 0}
            min={-7}
            max={7}
            // disabled={Number(instrument.frequency_sweep_time) !== 0}
            onChange={(value) => {
              onChangeField("frequency_sweep_shift")(value || 0);
            }}
          />
        </FormField>
      </FormRow>
      {Number(instrument.frequency_sweep_time) !== 0 &&
        selectedChannel === 1 && (
          <FormRow>
            <Alert variant="info">
              <AlertItem>{l10n("MESSAGE_SWEEP_ONLY_DUTY1")}</AlertItem>
            </Alert>
          </FormRow>
        )}
      <FormDivider />
      <FormRow>
        <FormField name="duty_cycle" label={l10n("FIELD_DUTY")}>
          <Select
            name="duty_cycle"
            value={selectedDuty}
            options={dutyOptions}
            onChange={onChangeFieldSelect("duty_cycle")}
            menuPlacement="top"
          />
        </FormField>
      </FormRow>
      <div style={{ position: "sticky", bottom: 0 }}>
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
      </div>
    </>
  );
};
