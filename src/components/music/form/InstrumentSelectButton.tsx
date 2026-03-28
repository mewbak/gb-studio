import React, { FC, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { SelectMenu, selectMenuStyleProps } from "ui/form/Select";
import { RelativePortal } from "ui/layout/RelativePortal";
import { InstrumentSelect } from "components/music/form/InstrumentSelect";
import { StyledButton } from "ui/buttons/style";

interface InstrumentSelectProps {
  name: string;
  value?: number;
  onChange?: (newId: number) => void;
}

interface WrapperProps {
  $includeInfo?: boolean;
}

const Wrapper = styled.div<WrapperProps>`
  position: relative;
`;

const ButtonCover = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
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

export const InstrumentSelectButton: FC<InstrumentSelectProps> = ({
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
        <LabelWrapper>
          <LabelColor $instrument={value}>
            {String((value ?? 0) + 1).padStart(2, "0")}
          </LabelColor>
        </LabelWrapper>
      </StyledButton>
      {isOpen && <ButtonCover onMouseDown={delayedButtonFocus} />}

      <div style={{ position: "absolute", top: "100%", left: "0%" }}>
        {isOpen && (
          <RelativePortal pin="top-left">
            <SelectMenu>
              <InstrumentSelect
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
