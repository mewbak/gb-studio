import React, { useCallback, useEffect, useMemo, useRef } from "react";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { DutyInstrument } from "shared/lib/uge/types";
import { FormDivider, FormField, FormRow } from "ui/form/layout/FormLayout";
// import { Button } from "ui/buttons/Button";
import l10n from "shared/lib/lang/l10n";
import { useAppDispatch, useAppSelector } from "store/hooks";
// import { ButtonGroup } from "ui/buttons/ButtonGroup";
// import { testNotes } from "./helpers";
// import throttle from "lodash/throttle";
// import { NOTE_C5 } from "consts";
// import { playDutyNotePreview } from "components/music/helpers";
import { Alert, AlertItem } from "ui/alerts/Alert";
import { InstrumentEnvelopeEditor } from "components/music/sidebar/InstrumentEnvelopeEditor";
import { InstrumentEnvelopePreview } from "components/music/sidebar/InstrumentEnvelopePreview";
import { Slider } from "ui/form/Slider";
import { FlexGrow } from "ui/spacing/Spacing";
import { DutyCycleSelect } from "components/music/form/DutyCycleSelect";
import { SweepTimeSelect } from "components/music/form/SweepTimeSelect";

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

  // const throttledTestInstrument = useRef(
  //   throttle(
  //     (instrument: DutyInstrument, channel: number) => {
  //       playDutyNotePreview(NOTE_C5, instrument, channel === 1 ? 1 : 0, 0, 0);
  //     },
  //     500,
  //     { trailing: true },
  //   ),
  // ).current;

  // useEffect(() => {
  //   return () => {
  //     throttledTestInstrument.cancel();
  //   };
  // }, [throttledTestInstrument]);

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
        // const newValue = { ...instrumentRef.current, [key]: editValue };
        // throttledTestInstrument(newValue, selectedChannel);
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

  const onChangeDutyCycle = useMemo(
    () => onChangeField("duty_cycle"),
    [onChangeField],
  );

  const onChangeSweepShift = useCallback(
    (value: number) => {
      if (Number(instrument?.frequency_sweep_time) === 0) {
        onChangeField("frequency_sweep_time")(4);
      }
      onChangeField("frequency_sweep_shift")(value);
    },
    [instrument?.frequency_sweep_time, onChangeField],
  );

  const onChangeSweepTime = useCallback(
    (value: number) => {
      if (value !== 0 && Number(instrument?.frequency_sweep_shift) === 0) {
        onChangeField("frequency_sweep_shift")(7);
      } else if (value === 0) {
        onChangeField("frequency_sweep_shift")(0);
      }
      onChangeField("frequency_sweep_time")(value);
    },
    [instrument?.frequency_sweep_shift, onChangeField],
  );

  // const onTestInstrument = useCallback(
  //   (note: number) => () => {
  //     if (!instrument) {
  //       return;
  //     }
  //     playDutyNotePreview(
  //       note,
  //       instrument,
  //       selectedChannel === 1 ? 1 : 0,
  //       0,
  //       0,
  //     );
  //   },
  //   [instrument, selectedChannel],
  // );

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
        <FormField name="dutyCycle" label={l10n("FIELD_DUTY_CYCLE")}>
          <DutyCycleSelect
            name="dutyCycle"
            value={instrument.duty_cycle}
            onChange={onChangeDutyCycle}
            menuPlacement="top"
          />
        </FormField>
      </FormRow>

      <FormDivider />
      <FormRow>
        <FormField
          name="frequency_sweep_time"
          label={l10n("FIELD_SWEEP_SHIFT")}
        >
          <Slider
            value={instrument.frequency_sweep_shift || 0}
            min={-7}
            max={7}
            onChange={onChangeSweepShift}
          />
        </FormField>
        <FormField name="frequencySweepTime" label={l10n("FIELD_SWEEP_TIME")}>
          <SweepTimeSelect
            name={"frequencySweepTime"}
            value={instrument.frequency_sweep_time}
            onChange={onChangeSweepTime}
            menuPlacement="top"
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
      <FlexGrow />
      {/* <div style={{ position: "sticky", bottom: 0 }}>
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
      </div> */}
    </>
  );
};
