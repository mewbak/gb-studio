import React, { FC, useCallback, useMemo } from "react";
import { OptionLabelWithInfo, Select, SelectCommonProps } from "ui/form/Select";
import { SingleValue } from "react-select";
import l10n from "shared/lib/lang/l10n";

interface SweepTimeOption {
  value: number;
  label: string;
}

interface SweepTimeSelectProps extends SelectCommonProps {
  name: string;
  value?: number;
  onChange?: (newValue: number) => void;
}

export const SweepTimeSelect: FC<SweepTimeSelectProps> = ({
  value,
  onChange,
  ...selectProps
}) => {
  const options: SweepTimeOption[] = useMemo(
    () => [
      {
        value: 0,
        label: l10n("FIELD_NONE"),
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
    ],
    [],
  );

  const currentValue = useMemo(
    () => options.find((i) => i.value === value),
    [options, value],
  );

  const onSelectChange = (newValue: SingleValue<SweepTimeOption>) => {
    if (newValue) {
      onChange?.(newValue.value);
    }
  };

  const formatOptionLabel = useCallback(
    (option: SweepTimeOption) => (
      <OptionLabelWithInfo
        info={
          option.value > 0
            ? `${(1000 * (option.value / 128)).toFixed(1)}ms`
            : ""
        }
      >
        {option.label}
      </OptionLabelWithInfo>
    ),
    [],
  );

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
