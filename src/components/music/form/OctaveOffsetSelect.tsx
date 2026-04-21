import React, { FC, useCallback, useMemo } from "react";
import { OptionLabelWithInfo, Select, SelectCommonProps } from "ui/form/Select";
import { SingleValue } from "react-select";
import l10n from "shared/lib/lang/l10n";
import { MIN_OCTAVE } from "consts";

interface OctaveOffsetOption {
  value: number;
  label: string;
}

interface OctaveOffsetSelectProps extends SelectCommonProps {
  name: string;
  value?: number;
  onChange?: (newValue: number) => void;
  noneLabel?: string;
  note?: number;
  effectCode?: number;
  effectParam?: number;
}

export const OctaveOffsetSelect: FC<OctaveOffsetSelectProps> = ({
  value,
  onChange,
  ...selectProps
}) => {
  const options: OctaveOffsetOption[] = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => ({
        value: i,
        label: `${l10n("FIELD_OCTAVE")} ${i + 3}`,
      })),
    [],
  );

  const currentValue = useMemo(
    () => options.find((i) => i.value === value),
    [options, value],
  );

  const onSelectChange = useCallback(
    (newValue: SingleValue<OctaveOffsetOption>) => {
      if (newValue) {
        onChange?.(newValue.value);
      }
    },
    [onChange],
  );

  const formatOptionLabel = useCallback((option: OctaveOffsetOption) => {
    return (
      <OptionLabelWithInfo
        info={`C${option.value + MIN_OCTAVE} - B${option.value + MIN_OCTAVE + 2}`}
      >
        {option.label}
      </OptionLabelWithInfo>
    );
  }, []);

  return (
    <Select
      value={currentValue}
      options={options}
      onChange={onSelectChange}
      formatOptionLabel={formatOptionLabel}
      {...selectProps}
    />
  );
};
