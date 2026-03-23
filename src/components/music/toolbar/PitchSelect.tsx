import React, { FC, useMemo } from "react";
import styled, { css } from "styled-components";
import { GroupBase, SingleValue } from "react-select";
import {
  Select,
  OptionLabelWithPreview,
  SingleValueWithPreview,
  SelectCommonProps,
} from "ui/form/Select";
import l10n from "shared/lib/lang/l10n";
import { useAppSelector } from "store/hooks";
import {
  playDutyNotePreview,
  playNoiseNotePreview,
  playWaveNotePreview,
} from "components/music/helpers";
import { MAX_OCTAVE, OCTAVE_SIZE, TOTAL_OCTAVES } from "consts";

type PitchOption = {
  value: number;
  label: string;
  isSharp: boolean;
  octave: number;
};

interface PitchSelectProps extends SelectCommonProps {
  name: string;
  value?: number;
  onChange?: (newNote: number) => void;
  noneLabel?: string;
  instrumentId?: number;
}

const NOTE_NAMES = [
  "C-",
  "C#",
  "D-",
  "D#",
  "E-",
  "F-",
  "F#",
  "G-",
  "G#",
  "A-",
  "A#",
  "B-",
] as const;

const START_OCTAVE = 3;
const TOTAL_NOTES = 72;

const isSharpNote = (noteInOctave: number) => {
  return [1, 3, 6, 8, 10].includes(noteInOctave);
};

const getNoteLabel = (note: number) => {
  const noteInOctave = note % OCTAVE_SIZE;
  const octave = START_OCTAVE + Math.floor(note / OCTAVE_SIZE);
  return `${NOTE_NAMES[noteInOctave]}${octave}`;
};

const buildNoteOptions = (): PitchOption[] =>
  Array.from({ length: TOTAL_NOTES }, (_, value) => {
    const noteInOctave = value % OCTAVE_SIZE;
    const octave = START_OCTAVE + Math.floor(value / OCTAVE_SIZE);

    return {
      value,
      label: getNoteLabel(value),
      isSharp: isSharpNote(noteInOctave),
      octave,
    };
  });

const buildGroupedOptions = (): GroupBase<PitchOption>[] => {
  const options = buildNoteOptions();

  return Array.from({ length: TOTAL_OCTAVES }, (_, octaveIndex) => {
    const octave = MAX_OCTAVE - octaveIndex;

    return {
      label: `${l10n("FIELD_OCTAVE")} ${octave}`,
      options: options
        .filter((option) => option.octave === octave)
        .slice()
        .reverse(),
    };
  });
};

interface PitchPreviewProps {
  $isSharp: boolean;
}

const PitchPreview = styled.div<PitchPreviewProps>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-left: 5px;
  border: 1px solid #ccc;

  ${(props) =>
    props.$isSharp
      ? css`
          background: #000;
        `
      : css`
          background: #fff;
        `}
`;

const NoteLabel = styled.span`
  font-variant-numeric: tabular-nums;
`;

export const PitchSelect: FC<PitchSelectProps> = ({
  value,
  onChange,
  noneLabel,
  instrumentId,
  ...selectProps
}) => {
  const groupedOptions = useMemo(() => buildGroupedOptions(), []);
  const flatOptions = useMemo(
    () => groupedOptions.flatMap((group) => group.options),
    [groupedOptions],
  );

  const dutyInstruments = useAppSelector(
    (state) => state.trackerDocument.present.song?.duty_instruments,
  );
  const waveInstruments = useAppSelector(
    (state) => state.trackerDocument.present.song?.wave_instruments,
  );
  const waveForms = useAppSelector(
    (state) => state.trackerDocument.present.song?.waves,
  );
  const noiseInstruments = useAppSelector(
    (state) => state.trackerDocument.present.song?.noise_instruments,
  );

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  const playInstrumentId = instrumentId ?? selectedInstrumentId;

  const dutyInstrument = dutyInstruments?.[playInstrumentId];
  const waveInstrument = waveInstruments?.[playInstrumentId];
  const waveForm = waveInstrument
    ? waveForms?.[waveInstrument?.wave_index]
    : undefined;
  const noiseInstrument = noiseInstruments?.[playInstrumentId];

  const currentValue = useMemo(() => {
    const selected = flatOptions.find((option) => option.value === value);
    if (selected) {
      return selected;
    }

    return {
      value: -1,
      label: noneLabel ?? l10n("FIELD_NONE"),
      isSharp: false,
      octave: START_OCTAVE,
    };
  }, [flatOptions, noneLabel, value]);

  console.log({ currentValue });

  const onSelectChange = (newValue: SingleValue<PitchOption>) => {
    if (newValue && newValue.value >= 0) {
      onChange?.(newValue.value);

      if ((selectedChannel === 0 || selectedChannel === 1) && dutyInstrument) {
        playDutyNotePreview(
          newValue.value,
          dutyInstrument,
          selectedChannel === 1 ? 1 : 0,
        );
      } else if (selectedChannel === 2 && waveInstrument && waveForm) {
        playWaveNotePreview(newValue.value, waveInstrument, waveForm);
      } else if (selectedChannel === 3 && noiseInstrument) {
        playNoiseNotePreview(newValue.value, noiseInstrument);
      }
    }
  };

  return (
    <Select<PitchOption, false, GroupBase<PitchOption>>
      value={currentValue}
      options={groupedOptions}
      onChange={onSelectChange}
      formatOptionLabel={(option: PitchOption) => (
        <OptionLabelWithPreview
          preview={<PitchPreview $isSharp={option.isSharp} />}
        >
          <NoteLabel>{option.label}</NoteLabel>
        </OptionLabelWithPreview>
      )}
      formatGroupLabel={(group) => group.label}
      components={{
        SingleValue: () =>
          currentValue.value === -1 ? (
            <SingleValueWithPreview>
              {currentValue.label}
            </SingleValueWithPreview>
          ) : (
            <SingleValueWithPreview
              preview={<PitchPreview $isSharp={currentValue.isSharp} />}
            >
              <NoteLabel>{currentValue.label}</NoteLabel>
            </SingleValueWithPreview>
          ),
      }}
      {...selectProps}
    />
  );
};
