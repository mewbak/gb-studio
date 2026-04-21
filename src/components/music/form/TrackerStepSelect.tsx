import React, { FC, useMemo } from "react";
import { Select, SelectCommonProps } from "ui/form/Select";
import { SingleValue } from "react-select";
import l10n from "shared/lib/lang/l10n";

interface TrackerStepOption {
  value: number;
  label: string;
}

interface TrackerStepSelectProps extends SelectCommonProps {
  name: string;
  value?: number;
  onChange?: (newValue: number) => void;
  noneLabel?: string;
  note?: number;
  effectCode?: number;
  effectParam?: number;
}

export const TrackerStepSelect: FC<TrackerStepSelectProps> = ({
  value,
  onChange,
  ...selectProps
}) => {
  const options: TrackerStepOption[] = useMemo(
    () =>
      Array.from({ length: 17 }).map((_, i) => ({
        value: i,
        label: `${l10n("FIELD_STEP")} ${i}`,
      })),
    [],
  );

  const currentValue = useMemo(
    () => options.find((i) => i.value === value),
    [options, value],
  );

  const onSelectChange = (newValue: SingleValue<TrackerStepOption>) => {
    if (newValue) {
      onChange?.(newValue.value);
    }
  };

  return (
    <Select
      value={currentValue}
      options={options}
      onChange={onSelectChange}
      {...selectProps}
    />
  );
};
