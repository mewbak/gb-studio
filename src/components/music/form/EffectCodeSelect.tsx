import React, { FC, useMemo } from "react";
import { GroupBase, SingleValue } from "react-select";
import {
  Select,
  OptionLabelWithInfo,
  SingleValueWithPreview,
  SelectCommonProps,
} from "ui/form/Select";
import l10n from "shared/lib/lang/l10n";
import { useMusicNotePreview } from "components/music/hooks/useMusicNotePreview";

export interface EffectCodeOption {
  value: number | "";
  label: string;
  info?: string;
}

type EffectCodeOptionGroup = GroupBase<EffectCodeOption>;

interface EffectCodeSelectProps extends SelectCommonProps {
  name: string;
  value?: number | null;
  onChange?: (newEffectCode: number | null) => void;
  noneLabel?: string;
  note?: number;
  instrumentId?: number;
  effectParam?: number;
  allowedEffectCodes?: number[];
}

const buildEffectCodeOptions = (): EffectCodeOptionGroup[] => [
  {
    label: "",
    options: [
      {
        value: "",
        label: l10n("FIELD_NO_EFFECT"),
      },
    ],
  },
  {
    label: "Pitch",
    options: [
      {
        value: 0,
        label: "Arpeggio",
        info: "0xy",
      },
      {
        value: 1,
        label: "Portamento Up",
        info: "1xx",
      },
      {
        value: 2,
        label: "Portamento Down",
        info: "2xx",
      },
      {
        value: 3,
        label: "Tone Portamento",
        info: "3xx",
      },
      {
        value: 4,
        label: "Vibrato",
        info: "4xy",
      },
    ],
  },
  {
    label: "Volume",
    options: [
      {
        value: 5,
        label: "Set Master Volume",
        info: "5xx",
      },
      {
        value: 12,
        label: "Set Volume",
        info: "Cev",
      },
      {
        value: 10,
        label: "Volume Slide",
        info: "Axy",
      },
      {
        value: 8,
        label: "Set Panning",
        info: "8xx",
      },
    ],
  },
  {
    label: "Note",
    options: [
      {
        value: 7,
        label: "Note Delay",
        info: "7xx",
      },
      {
        value: 14,
        label: "Note Cut",
        info: "Exx",
      },
    ],
  },
  {
    label: "Position",
    options: [
      {
        value: 11,
        label: "Position Jump",
        info: "Bxx",
      },
      {
        value: 13,
        label: "Pattern Break",
        info: "Dxx",
      },
    ],
  },
  {
    label: "Other",
    options: [
      {
        value: 6,
        label: "Call Routine",
        info: "6xx",
      },
      {
        value: 9,
        label: "Set Duty Cycle",
        info: "9xx",
      },
      {
        value: 15,
        label: "Set Speed",
        info: "Fxx",
      },
    ],
  },
];

export const EffectCodeSelect: FC<EffectCodeSelectProps> = ({
  value,
  onChange,
  noneLabel,
  note,
  instrumentId,
  effectParam,
  allowedEffectCodes,
  ...selectProps
}) => {
  const playPreview = useMusicNotePreview();

  const allGroupedOptions = useMemo(() => buildEffectCodeOptions(), []);
  const groupedOptions = useMemo(
    () =>
      allGroupedOptions
        .map((group) => ({
          ...group,
          options: group.options.filter(
            (option) =>
              option.value === "" ||
              !allowedEffectCodes ||
              allowedEffectCodes.includes(option.value),
          ),
        }))
        .filter((group) => group.options.length > 0),
    [allGroupedOptions, allowedEffectCodes],
  );
  const allFlatOptions = useMemo(
    () => allGroupedOptions.flatMap((group) => group.options),
    [allGroupedOptions],
  );

  const currentValue = useMemo<EffectCodeOption>(() => {
    const selected = allFlatOptions.find((option) => option.value === value);

    if (selected) {
      return selected;
    }

    return {
      value: value ?? "",
      label:
        value === null || value === undefined
          ? (noneLabel ?? l10n("FIELD_NO_EFFECT"))
          : `Effect ${value.toString(16).toUpperCase()}`,
    };
  }, [allFlatOptions, noneLabel, value]);

  const onSelectChange = (newValue: SingleValue<EffectCodeOption>) => {
    if (!newValue) {
      return;
    }
    const newEffectCode = newValue.value !== "" ? newValue.value : null;
    onChange?.(newEffectCode);
    playPreview({
      note,
      instrumentId,
      effectCode: newEffectCode,
      effectParam,
    });
  };

  return (
    <Select<EffectCodeOption, false, EffectCodeOptionGroup>
      value={currentValue}
      options={groupedOptions}
      onChange={onSelectChange}
      formatOptionLabel={(
        option: EffectCodeOption,
        { context }: { context: "menu" | "value" },
      ) => (
        <OptionLabelWithInfo info={context === "menu" ? option.info : ""}>
          {option.label}
        </OptionLabelWithInfo>
      )}
      components={{
        SingleValue: () => (
          <SingleValueWithPreview>{currentValue.label}</SingleValueWithPreview>
        ),
      }}
      {...selectProps}
    />
  );
};
