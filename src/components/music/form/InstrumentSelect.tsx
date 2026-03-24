import React, { FC, useEffect, useState } from "react";
import { useAppSelector } from "store/hooks";
import styled from "styled-components";
import {
  Select,
  OptionLabelWithPreview,
  SingleValueWithPreview,
  SelectCommonProps,
} from "ui/form/Select";
import { SingleValue } from "react-select";
import l10n from "shared/lib/lang/l10n";
import { useMusicNotePreview } from "components/music/hooks/useMusicNotePreview";

type InstrumentOption = {
  value: number;
  label: string;
};

const defaultInstrumentOptions = Array(15)
  .fill("")
  .map((_, i) => ({
    value: i,
    label: `Instrument ${i + 1}`,
  })) as InstrumentOption[];

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
  value?: number;
  onChange?: (newId: number) => void;
  noneLabel?: string;
  note?: number;
  effectCode?: number;
  effectParam?: number;
}

export const InstrumentSelect: FC<InstrumentSelectProps> = ({
  value,
  onChange,
  noneLabel,
  note,
  effectCode,
  effectParam,
  ...selectProps
}) => {
  const playPreview = useMusicNotePreview();

  const [options, setOptions] = useState<InstrumentOption[]>([]);
  const [currentInstrument, setCurrentInstrument] =
    useState<InstrumentOption>();
  const [currentValue, setCurrentValue] = useState<InstrumentOption>();

  const song = useAppSelector((state) => state.trackerDocument.present.song);
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  useEffect(() => {
    let instruments = defaultInstrumentOptions;
    if (song) {
      switch (selectedChannel) {
        case 0:
        case 1:
          instruments = song?.duty_instruments.map((instrument) => ({
            value: instrument.index,
            label: instrument.name || `Duty ${instrument.index + 1}`,
          }));
          break;
        case 2:
          instruments = song?.wave_instruments.map((instrument) => ({
            value: instrument.index,
            label: instrument.name || `Wave ${instrument.index + 1}`,
          }));
          break;
        case 3:
          instruments = song?.noise_instruments.map((instrument) => ({
            value: instrument.index,
            label: instrument.name || `Noise ${instrument.index + 1}`,
          }));
          break;
      }
    }
    setOptions(
      ([] as InstrumentOption[]).concat([] as InstrumentOption[], instruments),
    );
  }, [selectedChannel, song]);

  useEffect(() => {
    setCurrentInstrument(options.find((v) => v.value === value));
  }, [options, value]);

  useEffect(() => {
    if (currentInstrument) {
      setCurrentValue(currentInstrument);
    } else {
      setCurrentValue({
        value: -1,
        label: noneLabel ?? l10n("FIELD_NONE"),
      });
    }
  }, [currentInstrument, noneLabel, options]);

  const onSelectChange = (newValue: SingleValue<InstrumentOption>) => {
    if (newValue) {
      onChange?.(newValue.value);
      playPreview({
        note,
        instrumentId: newValue.value,
        effectCode,
        effectParam,
      });
    }
  };

  return (
    <Select
      classNamePrefix="CustomSelect--Left CustomSelect--WidthAuto"
      value={currentValue}
      options={options}
      onChange={onSelectChange}
      formatOptionLabel={(option: InstrumentOption) => {
        return (
          <OptionLabelWithPreview
            preview={<LabelColor $instrument={Number(option.value)} />}
          >
            {String(option.value + 1).padStart(2, "0")}: {option.label}
          </OptionLabelWithPreview>
        );
      }}
      components={{
        SingleValue: () =>
          !currentValue || currentValue.value === -1 ? (
            <SingleValueWithPreview>
              {currentValue?.label}
            </SingleValueWithPreview>
          ) : (
            <SingleValueWithPreview
              preview={<LabelColor $instrument={Number(value)} />}
            >
              {String((currentValue?.value ?? 0) + 1).padStart(2, "0")}:{" "}
              {currentValue?.label}
            </SingleValueWithPreview>
          ),
      }}
      {...selectProps}
    />
  );
};
