import React, { FC, useCallback, useMemo } from "react";
import { GroupBase, SingleValue } from "react-select";
import {
  Select,
  OptionLabelWithPreview,
  SingleValueWithPreview,
  SelectCommonProps,
} from "ui/form/Select";
import l10n from "shared/lib/lang/l10n";
import styled from "styled-components";

interface EffectCodeOption {
  value: number | "";
  label: string;
  info?: string;
  defaultParams: number;
}

type EffectCodeOptionGroup = GroupBase<EffectCodeOption>;

interface EffectCodeSelectProps extends SelectCommonProps {
  name: string;
  value?: number | null;
  onChange?: (newEffectCode: number | null, newEffectParam: number) => void;
  noneLabel?: string;
  allowedEffectCodes?: number[];
}

const buildEffectCodeOptions = (): EffectCodeOptionGroup[] => [
  {
    label: "",
    options: [
      {
        value: "",
        label: l10n("FIELD_NO_EFFECT"),
        defaultParams: 0,
      },
    ],
  },
  {
    label: l10n("FIELD_PITCH"),
    options: [
      {
        value: 0,
        label: l10n("FIELD_ARPEGGIO"),
        info: "0xy",
        defaultParams: 0x47,
      },
      {
        value: 1,
        label: l10n("FIELD_PORTAMENTO_UP"),
        info: "1xx",
        defaultParams: 0x18,
      },
      {
        value: 2,
        label: l10n("FIELD_PORTAMENTO_DOWN"),
        info: "2xx",
        defaultParams: 0x18,
      },
      {
        value: 3,
        label: l10n("FIELD_TONE_PORTAMENTO"),
        info: "3xx",
        defaultParams: 0x80,
      },
      {
        value: 4,
        label: l10n("FIELD_VIBRATO"),
        info: "4xy",
        defaultParams: 0x1f,
      },
    ],
  },
  {
    label: l10n("FIELD_VOLUME"),
    options: [
      {
        value: 5,
        label: l10n("FIELD_SET_MASTER_VOLUME"),
        info: "5xx",
        defaultParams: 0xff,
      },
      {
        value: 12,
        label: l10n("FIELD_SET_VOLUME"),
        info: "Cev",
        defaultParams: 0x0f,
      },
      {
        value: 10,
        label: l10n("FIELD_VOLUME_SLIDE"),
        info: "Axy",
        defaultParams: 0x20,
      },
      {
        value: 8,
        label: l10n("FIELD_SET_PANNING"),
        info: "8xx",
        defaultParams: 0xff,
      },
    ],
  },
  {
    label: l10n("FIELD_MUSIC_NOTE"),
    options: [
      {
        value: 7,
        label: l10n("FIELD_NOTE_DELAY"),
        info: "7xx",
        defaultParams: 0x02,
      },
      {
        value: 14,
        label: l10n("FIELD_NOTE_CUT"),
        info: "Exx",
        defaultParams: 0x02,
      },
    ],
  },
  {
    label: l10n("FIELD_POSITION"),
    options: [
      {
        value: 11,
        label: l10n("FIELD_POSITION_JUMP"),
        info: "Bxx",
        defaultParams: 0x00,
      },
      {
        value: 13,
        label: l10n("FIELD_PATTERN_BREAK"),
        info: "Dxx",
        defaultParams: 0x01,
      },
    ],
  },
  {
    label: l10n("EVENT_GROUP_MISC"),
    options: [
      {
        value: 6,
        label: l10n("FIELD_CALL_ROUTINE"),
        info: "6xx",
        defaultParams: 0x00,
      },
      {
        value: 9,
        label: l10n("FIELD_SET_DUTY_CYCLE"),
        info: "9xx",
        defaultParams: 0x00,
      },
      {
        value: 15,
        label: l10n("FIELD_SET_SPEED"),
        info: "Fxx",
        defaultParams: 0x06,
      },
    ],
  },
];

const StyledEffectCodePreview = styled.div`
  display: flex;
  width: 14px;
  height: 14px;
  color: white;
  overflow: hidden;

  font-family: "Public Pixel", monospace;
  font-size: 12px;
  font-weight: bold;
  justify-content: center;
  align-items: center;
  background-color: ${(props) => props.theme.colors.tracker.background};
  color: ${(props) => props.theme.colors.tracker.effectCode};
  border-radius: 2px;
`;

const effectValueToIconLabel = (value: number | "") =>
  typeof value === "number" ? value.toString(16).toUpperCase() : " ";

export const EffectCodeSelect: FC<EffectCodeSelectProps> = ({
  value,
  onChange,
  noneLabel,
  allowedEffectCodes,
  ...selectProps
}) => {
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
      defaultParams: 0,
    };
  }, [allFlatOptions, noneLabel, value]);

  const onSelectChange = (newValue: SingleValue<EffectCodeOption>) => {
    if (!newValue) {
      return;
    }
    const newEffectCode = newValue.value !== "" ? newValue.value : null;
    onChange?.(newEffectCode, newValue.defaultParams ?? 0);
  };

  const formatOptionLabel = useCallback(
    (option: EffectCodeOption, { context }: { context: "menu" | "value" }) => (
      <OptionLabelWithPreview
        preview={
          <StyledEffectCodePreview>
            {effectValueToIconLabel(option.value)}
          </StyledEffectCodePreview>
        }
        info={context === "menu" ? option.info : ""}
      >
        {option.label}
      </OptionLabelWithPreview>
    ),
    [],
  );

  const components = useMemo(() => {
    return {
      SingleValue: () => (
        <SingleValueWithPreview
          preview={
            <StyledEffectCodePreview>
              {effectValueToIconLabel(currentValue.value)}
            </StyledEffectCodePreview>
          }
        >
          {currentValue.label}
        </SingleValueWithPreview>
      ),
    };
  }, [currentValue.label, currentValue.value]);

  return (
    <Select<EffectCodeOption, false, EffectCodeOptionGroup>
      value={currentValue}
      options={groupedOptions}
      onChange={onSelectChange}
      formatOptionLabel={formatOptionLabel}
      components={components}
      {...selectProps}
    />
  );
};
