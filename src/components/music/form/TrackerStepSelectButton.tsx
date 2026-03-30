import React, { FC } from "react";
import styled from "styled-components";
import { TrackerStepSelect } from "components/music/form/TrackerStepSelect";
import { StyledButton } from "ui/buttons/style";
import { StepsIcon } from "ui/icons/Icons";
import { selectMenuStyleProps } from "ui/form/Select";
import {
  SelectButton,
  SelectButtonRenderButtonProps,
} from "ui/form/SelectButton";

interface TrackerStepSelectButtonProps {
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
    max-width: 15px;
    max-height: 15px;
    position: relative;
    user-select: none;
  }
`;

const LabelWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  width: 22px;
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
      <StepsIcon />
      <LabelWrapper>{value ?? 0}</LabelWrapper>
    </StyledButton>
  );
});

export const TrackerStepSelectButton: FC<TrackerStepSelectButtonProps> = ({
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
          <TrackerStepSelect
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
