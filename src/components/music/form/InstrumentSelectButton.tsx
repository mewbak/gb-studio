import React, { FC } from "react";
import styled from "styled-components";
import { InstrumentSelect } from "components/music/form/InstrumentSelect";
import { StyledButton } from "ui/buttons/style";
import { selectMenuStyleProps } from "ui/form/Select";
import {
  SelectButton,
  SelectButtonRenderButtonProps,
} from "ui/form/SelectButton";

interface InstrumentSelectProps {
  name: string;
  value?: number;
  onChange?: (newId: number) => void;
}

const Wrapper = styled.div`
  position: relative;
`;

const LabelWrapper = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: ${(props) => props.theme.colors.input.background};
  border: 2px solid ${(props) => props.theme.colors.input.background};
  outline: 1px solid ${(props) => props.theme.colors.input.border};
`;

interface LabelColorProps {
  $instrument?: number;
}

const LabelColor = styled.div<LabelColorProps>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
  font-size: 10px;
  border: 1px solid black;

  background: ${(props) =>
    props.$instrument !== undefined
      ? `var(--instrument-${props.$instrument}-color)`
      : "black"};

  &::before {
    content: "";
    position: absolute;
    bottom: 0px;
    left: 0px;
    right: 0px;
    height: 2px;
    background: rgba(0, 0, 0, 0.25);
  }

  &::after {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    height: 2px;
    background: rgba(255, 255, 255, 0.6);
    mix-blend-mode: overlay;
  }

  color: ${(props) =>
    props.$instrument !== undefined
      ? `var(--instrument-${props.$instrument}-text-color)`
      : "white"};
`;

const TriggerButton = React.forwardRef<
  HTMLButtonElement,
  Omit<SelectButtonRenderButtonProps, "ref"> & {
    name: string;
    value?: number;
  }
>(({ name, value, ...props }, ref) => {
  return (
    <StyledButton id={name} $variant="transparent" ref={ref} {...props}>
      <LabelWrapper>
        <LabelColor $instrument={value}>
          {String((value ?? 0) + 1).padStart(2, "0")}
        </LabelColor>
      </LabelWrapper>
    </StyledButton>
  );
});

export const InstrumentSelectButton: FC<InstrumentSelectProps> = ({
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
          <InstrumentSelect
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
