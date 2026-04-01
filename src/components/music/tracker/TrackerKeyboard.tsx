import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { KeyWhen } from "renderer/lib/keybindings/keyBindings";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FlexGrow } from "ui/spacing/Spacing";
import {
  CaretDownIcon,
  CaretUpIcon,
  RedoIcon,
  SettingsIcon,
  UndoIcon,
} from "ui/icons/Icons";
import { Button } from "ui/buttons/Button";
import { StyledButton } from "ui/buttons/style";
import useWindowSize from "ui/hooks/use-window-size";

export type VirtualTrackerKey =
  | {
      type: "navigation";
      direction: "up" | "down" | "left" | "right";
      shiftKey: boolean;
    }
  | {
      type: "number";
      value: number | null;
    }
  | {
      type: "note";
      value: number | null;
    }
  | {
      type: "transpose";
      direction: "up" | "down";
      size: "octave" | "note";
    }
  | {
      type: "transposeField";
      direction: "up" | "down";
    }
  | {
      type: "removeRow";
    }
  | {
      type: "insertRow";
    }
  | {
      type: "clear";
    }
  | {
      type: "undo";
    }
  | {
      type: "redo";
    }
  | {
      type: "settings";
    }
  | {
      type: "toggle";
    };

interface TrackerKeyboardProps {
  open?: boolean;
  fieldType: KeyWhen;
  octaveOffset: number;
  onKeyPressed: (e: VirtualTrackerKey) => void;
}

const NAV_REPEAT_INITIAL_DELAY = 300;
const NAV_REPEAT_INTERVAL = 100;
const DRAG_NOTES_THRESHOLD = 10;

const COMPACT_LAYOUT_BREAKPOINT = 840;

const StyledTrackerKeyboard = styled.div<{ $open?: boolean }>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  flex-basis: 0;

  overflow: hidden;
  height: 600px;
  transition: max-height 200ms ease-in-out;
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};
  max-height: ${(props) => (props.$open ? "182px" : "0px")};

  box-sizing: border-box;

  touch-action: manipulation;

  ${StyledButton} {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    min-width: 50px;
    white-space: nowrap;

    * {
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
  }

  @media (max-width: 840px) {
    max-height: ${(props) =>
      props.$open ? "240px" : "calc(50px + env(safe-area-inset-bottom))"};
    pointer-events: auto;

    ${StyledButton} {
      font-size: 15px;
      font-weight: bold;
      height: auto;
      min-height: 40px;
    }
  }

  @media (max-width: 340px) {
    ${StyledButton} {
      min-width: 40px;
    }
  }
`;

const StyledTrackerNavigationButtons = styled.div<{ $open?: boolean }>`
  display: flex;
  gap: 10px;
  padding: 5px 10px;
  flex-shrink: 0;
  background: ${(props) => props.theme.colors.sidebar.header.background};
  border-top: 1px solid ${(props) => props.theme.colors.sidebar.header.border};
  border-bottom: 1px solid
    ${(props) => props.theme.colors.sidebar.header.border};

  @media (max-width: 840px) {
    transition: padding-bottom 200ms ease-in-out;
    padding-bottom: ${(props) =>
      props.$open ? "5px" : "calc(40px + env(safe-area-inset-bottom))"};
  }
`;

const StyledTrackerSectionButtons = styled.div`
  display: flex;
  flex-grow: 1;
`;

const StyledTrackerKeyboardActions = styled.div<{ $overflow: boolean }>`
  position: relative;
  display: flex;
  background: ${(props) => props.theme.colors.sidebar.background};
  flex-direction: column;
  min-height: 0;
  padding: 10px;
  z-index: 10;
  gap: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));

  ${(props) =>
    props.$overflow &&
    css`
      &:before {
        content: "";
        position: absolute;
        width: 50px;
        left: -50px;
        top: 0px;
        bottom: 0px;
        pointer-events: none;
        background: linear-gradient(
          to left,
          ${(props) => props.theme.colors.sidebar.background},
          transparent 100%
        );
      }
    `}

  &&& > * {
    height: calc((100% - 20px) / 3);
  }
`;

const StyledTrackerEffectButtons = styled.div`
  background: ${(props) => props.theme.colors.sidebar.background};
  padding: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  button {
    width: calc((100% - 50px) / 6);
  }

  gap: 10px;
`;

const StyledTrackerKeyboardNotes = styled.div`
  overflow-x: scroll;
  overflow-y: hidden;
  background: ${(props) => props.theme.colors.sidebar.background};
  flex-grow: 1;
`;

const StyledTrackerKeyboardNotesInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: max-content;
  padding: 10px;
  flex-grow: 1;
  height: 100%;
  box-sizing: border-box;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  max-width: 0;
`;

const StyledTrackerKeyboardNotesRow = styled.div`
  display: flex;
  gap: 10px;
  width: max-content;
  flex-grow: 1;
  padding-right: 50px;

  ${StyledButton} {
    width: 50px;
  }
`;

const StyledTrackerKeyboardButtonsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-grow: 1;
  padding-right: 10px;
  max-width: 515px;

  & ${StyledButton} {
    flex-grow: 1;
    min-width: 0;
    padding: 0 5px;
  }
`;

const NOTE_NAMES = [
  "C-",
  "C#",
  "D-",
  "D#",
  "E-",
  "F-",
  "F#",
  "G-",
  "G#",
  "A-",
  "A#",
  "B-",
] as const;

const NOTE_ROW_GROUPS = [
  [0, 1, 2, 3], // C, C#, D, D#
  [4, 5, 6, 7], // E, F, F#, G
  [8, 9, 10, 11], // G#, A, A#, B
] as const;

type RepeatHandlers = {
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
  onPointerUp: React.PointerEventHandler<HTMLButtonElement>;
  onPointerCancel: React.PointerEventHandler<HTMLButtonElement>;
  onPointerLeave: React.PointerEventHandler<HTMLButtonElement>;
};

const useRepeatPress = (
  callback: () => void,
  initialDelay = NAV_REPEAT_INITIAL_DELAY,
  repeatInterval = NAV_REPEAT_INTERVAL,
): RepeatHandlers => {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback<React.PointerEventHandler<HTMLButtonElement>>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      callback();

      stop();

      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(() => {
          callback();
        }, repeatInterval);
      }, initialDelay);
    },
    [callback, initialDelay, repeatInterval, stop],
  );

  useEffect(() => stop, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
  };
};

type RepeatButtonProps = {
  children: React.ReactNode;
  onRepeatPress: () => void;
};

const RepeatButton = ({ children, onRepeatPress }: RepeatButtonProps) => {
  const repeatHandlers = useRepeatPress(onRepeatPress);

  return (
    <Button type="button" {...repeatHandlers}>
      {children}
    </Button>
  );
};

export const TrackerKeyboard = ({
  fieldType,
  octaveOffset,
  open,
  onKeyPressed,
}: TrackerKeyboardProps) => {
  const [shiftKey, setShiftKey] = useState(false);

  const touchStartX = useRef(-1);

  const windowSize = useWindowSize();
  const windowWidth = windowSize.width || 0;
  const isCompactLayout =
    windowWidth > 0 && windowWidth <= COMPACT_LAYOUT_BREAKPOINT;

  return (
    <StyledTrackerKeyboard
      $open={open}
      onTouchEnd={(e) => {
        // Prevent double tap causing
        // text loupe to appear on iOS
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <StyledTrackerNavigationButtons $open={open}>
        <ButtonGroup>
          <RepeatButton
            onRepeatPress={() => {
              onKeyPressed({
                type: "navigation",
                direction: "left",
                shiftKey,
              });
            }}
          >
            ←
          </RepeatButton>

          <RepeatButton
            onRepeatPress={() => {
              onKeyPressed({
                type: "navigation",
                direction: "up",
                shiftKey,
              });
            }}
          >
            ↑
          </RepeatButton>

          <RepeatButton
            onRepeatPress={() => {
              onKeyPressed({
                type: "navigation",
                direction: "down",
                shiftKey,
              });
            }}
          >
            ↓
          </RepeatButton>

          <RepeatButton
            onRepeatPress={() => {
              onKeyPressed({
                type: "navigation",
                direction: "right",
                shiftKey,
              });
            }}
          >
            →
          </RepeatButton>
        </ButtonGroup>

        <Button
          type="button"
          variant={shiftKey ? "primary" : "normal"}
          onPointerDown={(e) => {
            e.preventDefault();
            setShiftKey((value) => !value);
          }}
        >
          ⇧
        </Button>

        <FlexGrow />

        <Button
          type="button"
          variant="transparent"
          onPointerDown={() => {
            onKeyPressed({
              type: "toggle",
            });
          }}
        >
          {open ? <CaretDownIcon /> : <CaretUpIcon />}
        </Button>
      </StyledTrackerNavigationButtons>

      <StyledTrackerSectionButtons>
        {shiftKey ? (
          <StyledTrackerEffectButtons>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "transposeField",
                    direction: "up",
                  });
                }}
              >
                +<br />
                Val
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "up",
                    size: "octave",
                  });
                }}
              >
                +<br />
                Oct
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "up",
                    size: "note",
                  });
                }}
              >
                +<br />
                Semi
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "undo",
                  });
                }}
              >
                <UndoIcon />
              </Button>
            </StyledTrackerKeyboardButtonsRow>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "transposeField",
                    direction: "down",
                  });
                }}
              >
                -<br />
                Val
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "down",
                    size: "octave",
                  });
                }}
              >
                -<br />
                Oct
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "down",
                    size: "note",
                  });
                }}
              >
                -<br />
                Semi
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "redo",
                  });
                }}
              >
                <RedoIcon />
              </Button>
            </StyledTrackerKeyboardButtonsRow>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "insertRow",
                  });
                }}
              >
                Insert Row
              </Button>
              <Button
                onPointerDown={() => {
                  onKeyPressed({
                    type: "removeRow",
                  });
                }}
              >
                Remove Row
              </Button>
            </StyledTrackerKeyboardButtonsRow>
          </StyledTrackerEffectButtons>
        ) : (
          <>
            {(fieldType === "instrumentColumnFocus" ||
              fieldType === "effectCodeColumnFocus" ||
              fieldType === "effectParamColumnFocus") && (
              <StyledTrackerEffectButtons>
                <StyledTrackerKeyboardButtonsRow>
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Button
                      key={n}
                      type="button"
                      onPointerDown={() => {
                        onKeyPressed({ type: "number", value: n });
                      }}
                    >
                      {n.toString(16).toUpperCase()}
                    </Button>
                  ))}
                </StyledTrackerKeyboardButtonsRow>
                <StyledTrackerKeyboardButtonsRow>
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Button
                      key={n}
                      type="button"
                      onPointerDown={() => {
                        onKeyPressed({ type: "number", value: n + 5 });
                      }}
                    >
                      {(n + 5).toString(16).toUpperCase()}
                    </Button>
                  ))}
                </StyledTrackerKeyboardButtonsRow>
                <StyledTrackerKeyboardButtonsRow>
                  {Array.from({ length: 6 }).map((_, n) => (
                    <Button
                      key={n}
                      type="button"
                      onPointerDown={() => {
                        onKeyPressed({ type: "number", value: n + 10 });
                      }}
                    >
                      {(n + 10).toString(16).toUpperCase()}
                    </Button>
                  ))}
                </StyledTrackerKeyboardButtonsRow>
              </StyledTrackerEffectButtons>
            )}

            {fieldType === "noteColumnFocus" && (
              <StyledTrackerKeyboardNotes>
                <StyledTrackerKeyboardNotesInner>
                  {NOTE_ROW_GROUPS.map((noteGroup, rowIndex) => (
                    <StyledTrackerKeyboardNotesRow key={rowIndex}>
                      {Array.from({ length: 3 }).flatMap((_, octave) =>
                        noteGroup.map((noteIndex) => {
                          const key = noteIndex + octave * OCTAVE_SIZE;
                          return (
                            <Button
                              key={key}
                              type="button"
                              onPointerDown={(e) => {
                                // Track click start x to prevent
                                // creating note if scrolling notes div
                                touchStartX.current = e.clientX;
                              }}
                              onPointerUp={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const touchMoveDistanceX = Math.abs(
                                  touchStartX.current - e.clientX,
                                );

                                if (touchMoveDistanceX < DRAG_NOTES_THRESHOLD) {
                                  onKeyPressed({
                                    type: "note",
                                    value: noteIndex + octave * OCTAVE_SIZE,
                                  });
                                }
                              }}
                            >
                              {NOTE_NAMES[noteIndex]}
                              {MIN_OCTAVE + octave + octaveOffset}
                            </Button>
                          );
                        }),
                      )}
                    </StyledTrackerKeyboardNotesRow>
                  ))}
                </StyledTrackerKeyboardNotesInner>
              </StyledTrackerKeyboardNotes>
            )}
          </>
        )}

        <StyledTrackerKeyboardActions
          $overflow={fieldType === "noteColumnFocus" && !shiftKey}
        >
          <Button
            type="button"
            onPointerDown={() => {
              onKeyPressed(
                shiftKey
                  ? {
                      type: "clear",
                    }
                  : {
                      type: "note",
                      value: null,
                    },
              );
            }}
          >
            ⌫
          </Button>
          <FlexGrow />

          {isCompactLayout && (
            <Button
              type="button"
              onPointerDown={() => {
                onKeyPressed({
                  type: "settings",
                });
              }}
            >
              <SettingsIcon />
            </Button>
          )}
        </StyledTrackerKeyboardActions>
      </StyledTrackerSectionButtons>
    </StyledTrackerKeyboard>
  );
};
