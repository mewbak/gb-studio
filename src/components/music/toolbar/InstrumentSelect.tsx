import React, { FC, useEffect, useState } from "react";
import { useAppSelector } from "store/hooks";
import styled from "styled-components";
import {
  Option,
  Select,
  OptionLabelWithPreview,
  SingleValueWithPreview,
  SelectCommonProps,
} from "ui/form/Select";
import { SingleValue } from "react-select";
import {
  playDutyNotePreview,
  playNoiseNotePreview,
  playWaveNotePreview,
} from "components/music/helpers";
import { NOTE_C5 } from "consts";
import { InstrumentType } from "shared/lib/music/types";

const defaultInstrumentOptions = Array(15)
  .fill("")
  .map((_, i) => ({
    value: `${i}`,
    label: `Instrument ${i + 1}`,
  })) as Option[];

interface LabelColorProps {
  $instrument?: number;
}

const LabelColor = styled.div<LabelColorProps>`
  width: 10px;
  height: 10px;
  border-radius: 10px;
  flex-shrink: 0;
  margin-left: 5px;
  background: ${(props) =>
    props.$instrument !== undefined
      ? `var(--instrument-${props.$instrument}-color)`
      : "black"};
`;

interface InstrumentSelectProps extends SelectCommonProps {
  name: string;
  value?: string;
  onChange?: (newId: string) => void;
  optional?: boolean;
  optionalLabel?: string;
  optionalDefaultInstrumentId?: string;
  instrumentType?: InstrumentType;
}

export const InstrumentSelect: FC<InstrumentSelectProps> = ({
  value,
  instrumentType,
  onChange,
  ...selectProps
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [currentInstrument, setCurrentInstrument] = useState<Option>();
  const [currentValue, setCurrentValue] = useState<Option>();

  const song = useAppSelector((state) => state.trackerDocument.present.song);
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  useEffect(() => {
    let instruments = defaultInstrumentOptions;
    if (song) {
      switch (instrumentType) {
        case "duty":
          instruments = song?.duty_instruments.map((instrument) => ({
            value: `${instrument.index}`,
            label: instrument.name || `Duty ${instrument.index + 1}`,
          }));
          break;
        case "wave":
          instruments = song?.wave_instruments.map((instrument) => ({
            value: `${instrument.index}`,
            label: instrument.name || `Wave ${instrument.index + 1}`,
          }));
          break;
        case "noise":
          instruments = song?.noise_instruments.map((instrument) => ({
            value: `${instrument.index}`,
            label: instrument.name || `Noise ${instrument.index + 1}`,
          }));
          break;
      }
    }
    setOptions(([] as Option[]).concat([] as Option[], instruments));
  }, [instrumentType, song]);

  useEffect(() => {
    setCurrentInstrument(options.find((v) => v.value === value));
  }, [options, value]);

  useEffect(() => {
    if (currentInstrument) {
      setCurrentValue(currentInstrument);
    } else {
      const firstInstrument = options[0];
      if (firstInstrument) {
        setCurrentValue(firstInstrument);
      }
    }
  }, [currentInstrument, options]);

  const onSelectChange = (newValue: SingleValue<Option>) => {
    if (newValue) {
      onChange?.(newValue.value);
      if (instrumentType === "duty") {
        const instrument = song?.duty_instruments[Number(newValue.value)];
        if (instrument) {
          playDutyNotePreview(
            NOTE_C5,
            instrument,
            selectedChannel === 1 ? 1 : 0,
          );
        }
      } else if (instrumentType === "wave") {
        const instrument = song?.wave_instruments[Number(newValue.value)];
        if (instrument) {
          playWaveNotePreview(
            NOTE_C5,
            instrument,
            song.waves[instrument.wave_index],
          );
        }
      } else if (instrumentType === "noise") {
        const instrument = song?.noise_instruments[Number(newValue.value)];
        if (instrument) {
          playNoiseNotePreview(NOTE_C5, instrument);
        }
      }
    }
  };

  return (
    <Select
      value={currentValue}
      options={options}
      onChange={onSelectChange}
      formatOptionLabel={(option: Option) => {
        return (
          <OptionLabelWithPreview
            preview={<LabelColor $instrument={Number(option.value)} />}
          >
            {option.label}
          </OptionLabelWithPreview>
        );
      }}
      components={{
        SingleValue: () => (
          <SingleValueWithPreview
            preview={<LabelColor $instrument={Number(value)} />}
          >
            {currentValue?.label}
          </SingleValueWithPreview>
        ),
      }}
      {...selectProps}
    />
  );
};
