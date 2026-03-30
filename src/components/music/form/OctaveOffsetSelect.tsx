import React, { FC, useMemo } from "react";
import { Select, SelectCommonProps } from "ui/form/Select";
import {
  components,
  ContainerProps,
  GroupBase,
  SingleValue,
  SingleValueProps,
} from "react-select";
import l10n from "shared/lib/lang/l10n";
import styled from "styled-components";
import { MIN_OCTAVE } from "consts";
import { ClefIcon } from "ui/icons/Icons";

export interface OctaveOffsetOption {
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

// const CustomOctaveControl = styled(components.Control)`
//   outline: 5px solid red;
//   max-width: 50px;
// `;

const CustomOctaveValue = styled.div`
  display: flex;
  position: relative;
  grid-area: 1/1/2/3;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: hsl(0, 0%, 20%);
  margin-left: 2px;
  margin-right: 2px;
  box-sizing: border-box;
  color: #b7babb;
  width: 100%;
  font-weight: bold;
  height: 28px;

  svg {
    fill: ${(props) => props.theme.colors.text};
    width: auto;
    height: 46px;
    position: absolute;
    top: -8px;
    left: -20px;
  }

  span {
    display: flex;
    align-items: center;
    font-size: 15px;
    padding-left: 18px;
  }
`;

const CustomOctaveSelectContainer = styled.div`
  .CustomSelect {
    width: 40px;
    min-width: 40px;
  }
  .CustomSelect__value-container {
    overflow: visible;
  }
`;

// const CustomSelectContainer = (
//   props: ContainerProps<OctaveOffsetOption, false>,
// ) => {
//   return (
//     <CustomOctaveSelectContainer>
//       <components.SelectContainer {...props}>
//         {props.children}
//       </components.SelectContainer>
//     </CustomOctaveSelectContainer>
//   );
// };

// const SingleValueComponent = (
//   item: SingleValueProps<
//     OctaveOffsetOption,
//     false,
//     GroupBase<OctaveOffsetOption>
//   >,
// ) => (
//   <CustomOctaveValue>
//     <ClefIcon />
//     <span>{item.data.value + MIN_OCTAVE}</span>
//   </CustomOctaveValue>
// );

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

  const onSelectChange = (newValue: SingleValue<OctaveOffsetOption>) => {
    if (newValue) {
      onChange?.(newValue.value);
    }
  };

  return (
    <Select
      className="OctaveSelect"
      classNamePrefix="CustomSelect--Left"
      value={currentValue}
      options={options}
      onChange={onSelectChange}
      components={
        {
          // SelectContainer: CustomSelectContainer,
          // SingleValue: SingleValueComponent,
          // DropdownIndicator: null,
        }
      }
      styles={{
        control: (base) => ({
          ...base,
          outline: "5px solid red",
          maxWidth: 50,
        }),
      }}
      {...selectProps}
    />
  );
};
