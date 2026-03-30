import React, { FC, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { SelectMenu, selectMenuStyleProps } from "ui/form/Select";
import { RelativePortal } from "ui/layout/RelativePortal";
import { OctaveOffsetSelect } from "components/music/form/OctaveOffsetSelect";
import { StyledButton } from "ui/buttons/style";
import { ClefIcon } from "ui/icons/Icons";
import { MIN_OCTAVE } from "consts";

interface OctaveOffsetSelectButtonProps {
  name: string;
  value?: number;
  onChange?: (newId: number) => void;
}

interface WrapperProps {
  $includeInfo?: boolean;
}

const Wrapper = styled.div<WrapperProps>`
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

const ButtonCover = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
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

export const OctaveOffsetSelectButton: FC<OctaveOffsetSelectButtonProps> = ({
  name,
  value,
  onChange,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [buttonFocus, setButtonFocus] = useState<boolean>(false);

  useEffect(() => {
    if (buttonFocus) {
      window.addEventListener("keydown", onKeyDownClosed);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDownClosed);
    };
  }, [buttonFocus]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", onKeyDownOpen);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDownOpen);
    };
  }, [isOpen]);

  const onKeyDownClosed = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      setIsOpen(true);
    }
  };

  const onKeyDownOpen = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const openMenu = () => {
    setIsOpen(true);
    cancelDelayedButtonFocus();
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const onSelectChange = (newValue: number) => {
    closeMenu();
    onChange?.(newValue);
    buttonRef.current?.focus();
  };

  const onButtonFocus = () => {
    setButtonFocus(true);
  };

  const onButtonBlur = () => {
    setButtonFocus(false);
  };

  const delayedButtonFocus = () => {
    timerRef.current = setTimeout(() => {
      buttonRef.current?.focus();
    }, 100);
  };

  const cancelDelayedButtonFocus = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return (
    <Wrapper>
      <StyledButton
        id={name}
        $variant="transparent"
        ref={buttonRef}
        onClick={openMenu}
        onFocus={onButtonFocus}
        onBlur={onButtonBlur}
      >
        <ClefIcon />
        <LabelWrapper>{(value ?? 0) + MIN_OCTAVE}</LabelWrapper>
      </StyledButton>
      {isOpen && <ButtonCover onMouseDown={delayedButtonFocus} />}
      <div style={{ position: "absolute", top: "100%", left: "0%" }}>
        {isOpen && (
          <RelativePortal pin="top-left">
            <SelectMenu>
              <OctaveOffsetSelect
                name={name}
                value={value}
                onChange={onSelectChange}
                onBlur={closeMenu}
                {...selectMenuStyleProps}
              />
            </SelectMenu>
          </RelativePortal>
        )}
      </div>
    </Wrapper>
  );
};
