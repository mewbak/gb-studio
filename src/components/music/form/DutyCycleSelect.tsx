import React, { FC, useCallback, useMemo } from "react";
import { Select, SelectCommonProps } from "ui/form/Select";
import { SingleValue } from "react-select";
import styled from "styled-components";

export interface DutyCycleOption {
  value: number;
  label: string;
  width: number;
}

interface DutyCycleSelectProps extends SelectCommonProps {
  name: string;
  value?: number;
  onChange?: (newValue: number) => void;
  noneLabel?: string;
  note?: number;
  effectCode?: number;
  effectParam?: number;
  isEffectParam?: boolean;
}

const StyledDutyCycleOptionLabel = styled.div`
  display: flex;
  align-items: center;
  span {
    flex-grow: 1;
  }
  svg {
    justify-self: flex-end;
    fill: transparent;
    stroke: ${(props) => props.theme.colors.text};
    opacity: 0.5;
  }
`;

const DutyCyclePreview = ({ width }: { width: number }) => {
  const cycleWidth = 40;
  const upWidth = width * cycleWidth;
  const downWidth = cycleWidth - upWidth;
  const path = `M 2 16 v -13 h ${upWidth} v 13 h ${downWidth} v -13 h ${upWidth} v 13 h ${downWidth}`;
  return (
    <svg width={cycleWidth * 2} height={17}>
      <path d={path} />
    </svg>
  );
};

export const DutyCycleSelect: FC<DutyCycleSelectProps> = ({
  value,
  onChange,
  isEffectParam,
  ...selectProps
}) => {
  const options: DutyCycleOption[] = useMemo(
    () => [
      {
        value: 0,
        label: "12.5%",
        width: 0.125,
      },
      {
        value: isEffectParam ? 0x40 : 1,
        label: "25%",
        width: 0.25,
      },
      {
        value: isEffectParam ? 0x80 : 2,
        label: "50%",
        width: 0.5,
      },
      {
        value: isEffectParam ? 0xc0 : 3,
        label: "75%",
        width: 0.75,
      },
    ],
    [isEffectParam],
  );

  const currentValue = useMemo(
    () => options.find((i) => i.value === value),
    [options, value],
  );

  const onSelectChange = (newValue: SingleValue<DutyCycleOption>) => {
    if (newValue) {
      onChange?.(newValue.value);
    }
  };

  const formatOptionLabel = useCallback(
    (option: DutyCycleOption) => (
      <StyledDutyCycleOptionLabel>
        <span>{option.label}</span>
        <DutyCyclePreview width={option.width} />
      </StyledDutyCycleOptionLabel>
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
