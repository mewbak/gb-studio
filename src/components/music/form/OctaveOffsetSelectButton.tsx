import React, { FC } from "react";
import styled from "styled-components";
import { OctaveOffsetSelect } from "components/music/form/OctaveOffsetSelect";
import { StyledButton } from "ui/buttons/style";
import { ClefIcon } from "ui/icons/Icons";
import { MIN_OCTAVE } from "consts";
import { selectMenuStyleProps } from "ui/form/Select";
import {
  SelectButton,
  SelectButtonRenderButtonProps,
} from "ui/form/SelectButton";
import { Button } from "ui/buttons/Button";

interface OctaveOffsetSelectButtonProps {
  name: string;
  value?: number;
  onChange?: (newId: number) => void;
}

const Wrapper = styled.div`
  position: relative;

  ${StyledButton} {
    width: auto;
  }

  && svg {
    width: auto;
    height: 42px;
    max-width: none;
    max-height: none;
    position: absolute;
    top: -3px;
    left: -5px;
    user-select: none;
  }
`;

const LabelWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 21px;
  padding-right: 5px;
  font-size: 15px;
  font-weight: bold;
`;

const TriggerButton = React.forwardRef<
  HTMLButtonElement,
  Omit<SelectButtonRenderButtonProps, "ref"> & {
    name: string;
    value?: number;
  }
>(({ name, value, ...props }, ref) => {
  return (
    <Button id={name} variant="transparent" ref={ref} {...props}>
      <ClefIcon />
      <LabelWrapper>{(value ?? 0) + MIN_OCTAVE}</LabelWrapper>
    </Button>
  );
});

export const OctaveOffsetSelectButton: FC<OctaveOffsetSelectButtonProps> = ({
  name,
  value,
  onChange,
}) => {
  return (
    <Wrapper>
      <SelectButton
        pin="top-left"
        offsetTop="100%"
        offsetLeft="0%"
        renderButton={(buttonProps) => (
          <TriggerButton {...buttonProps} name={name} value={value} />
        )}
        renderMenu={({ closeMenu }) => (
          <OctaveOffsetSelect
            name={name}
            value={value}
            onChange={(newValue) => {
              closeMenu();
              onChange?.(newValue);
            }}
            onBlur={closeMenu}
            {...selectMenuStyleProps}
          />
        )}
      />
    </Wrapper>
  );
};
