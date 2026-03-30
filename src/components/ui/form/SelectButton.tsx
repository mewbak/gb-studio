import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { RelativePortal, PinDirection } from "ui/layout/RelativePortal";
import { SelectMenu } from "ui/form/Select";

export interface SelectButtonRenderButtonProps {
  ref: React.Ref<HTMLButtonElement>;
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onTouchStart: React.TouchEventHandler<HTMLElement>;
  onClick: React.MouseEventHandler<HTMLElement>;
  onFocus: React.FocusEventHandler<HTMLElement>;
  onBlur: React.FocusEventHandler<HTMLElement>;
  "aria-expanded": boolean;
  "aria-haspopup": "listbox";
}

export interface SelectButtonRenderMenuProps {
  closeMenu: () => void;
}

interface SelectButtonProps {
  renderButton: (props: SelectButtonRenderButtonProps) => ReactNode;
  renderMenu: (props: SelectButtonRenderMenuProps) => ReactNode;
  pin?: PinDirection;
  offsetTop?: string;
  offsetLeft?: string;
  restoreFocusOnClose?: boolean;
}

export const SelectButton: FC<SelectButtonProps> = ({
  renderButton,
  renderMenu,
  pin = "top-left",
  offsetTop = "100%",
  offsetLeft = "0%",
  restoreFocusOnClose = true,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ignoreNextClickRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [buttonFocus, setButtonFocus] = useState(false);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const focusButton = useCallback(() => {
    if (restoreFocusOnClose) {
      buttonRef.current?.focus();
    }
  }, [restoreFocusOnClose]);

  useEffect(() => {
    if (!buttonFocus || isOpen) {
      return;
    }

    const onKeyDownClosed = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDownClosed);
    return () => {
      window.removeEventListener("keydown", onKeyDownClosed);
    };
  }, [buttonFocus, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDownOpen = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        focusButton();
      }
    };

    window.addEventListener("keydown", onKeyDownOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDownOpen);
    };
  }, [isOpen, focusButton]);

  const onTriggerPointerDown = useCallback<
    React.PointerEventHandler<HTMLElement>
  >(
    (e) => {
      if (isOpen) {
        ignoreNextClickRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }
    },
    [isOpen, closeMenu],
  );

  const onTriggerTouchStart = useCallback<React.TouchEventHandler<HTMLElement>>(
    (e) => {
      if (isOpen) {
        ignoreNextClickRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }
    },
    [isOpen, closeMenu],
  );

  const onTriggerClick = useCallback<React.MouseEventHandler<HTMLElement>>(
    (e) => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (!isOpen) {
        openMenu();
      }
    },
    [isOpen, openMenu],
  );

  const onTriggerFocus = useCallback<
    React.FocusEventHandler<HTMLElement>
  >(() => {
    setButtonFocus(true);
  }, []);

  const onTriggerBlur = useCallback<
    React.FocusEventHandler<HTMLElement>
  >(() => {
    setButtonFocus(false);
  }, []);

  return (
    <>
      {renderButton({
        ref: buttonRef,
        onPointerDown: onTriggerPointerDown,
        onTouchStart: onTriggerTouchStart,
        onClick: onTriggerClick,
        onFocus: onTriggerFocus,
        onBlur: onTriggerBlur,
        "aria-expanded": isOpen,
        "aria-haspopup": "listbox",
      })}

      <div style={{ position: "absolute", top: offsetTop, left: offsetLeft }}>
        {isOpen && (
          <RelativePortal pin={pin}>
            <SelectMenu>{renderMenu({ closeMenu })}</SelectMenu>
          </RelativePortal>
        )}
      </div>
    </>
  );
};
