import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FlexGrow } from "ui/spacing/Spacing";
import {
  ArrowRightLineIcon,
  BackspaceIcon,
  CaretDownIcon,
  CaretUpIcon,
  FXIcon,
  SettingsIcon,
  ShiftIcon,
} from "ui/icons/Icons";
import { Button } from "ui/buttons/Button";
import { StyledButton } from "ui/buttons/style";
import useWindowSize from "ui/hooks/use-window-size";
import l10n from "shared/lib/lang/l10n";

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
  | { type: "sign"; value: "-" | "+" }
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
      type: "editEffects";
    }
  | {
      type: "toggle";
    };

type TrackerKeyboardProps = {
  open?: boolean;
  octaveOffset: number;
  onKeyPressed: (e: VirtualTrackerKey) => void;
} & (
  | {
      type: "pattern";
      fieldType:
        | "noteColumnFocus"
        | "instrumentColumnFocus"
        | "effectCodeColumnFocus"
        | "effectParamColumnFocus";
    }
  | {
      type: "subpattern";
      fieldType:
        | "effectCodeColumnFocus"
        | "effectParamColumnFocus"
        | "offsetColumnFocus"
        | "jumpColumnFocus";
    }
);

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
    max-height: ${(props) => (props.$open ? "240px" : "70px")};
    pointer-events: auto;

    ${StyledButton} {
      font-size: 15px;
      font-weight: bold;
      height: auto;
      min-height: 40px;
    }
  }

  @media (max-width: 840px) {
    ${StyledButton} {
      line-height: 16px;
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
    padding-bottom: ${(props) => (props.$open ? "5px" : "60px")};
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
  padding-bottom: 30px;

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
  padding-bottom: 30px;
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
  padding-bottom: 30px;
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

const StyledBackspaceIcon = styled.div`
  display: flex;
  svg {
    height: 25px;
    width: 25px;
  }
`;

export const StyledKeyboardToggleIcon = styled.div`
  display: flex;
  svg {
    height: 10px;
    width: 10px;
    min-width: 10px;
    min-height: 10px;
  }
`;

export const StyledArrowIcon = styled.div<{
  $direction: "up" | "down" | "left" | "right";
}>`
  display: flex;

  ${(props) =>
    props.$direction === "down" &&
    css`
      svg {
        transform: rotate(90deg);
      }
    `}

  ${(props) =>
    props.$direction === "left" &&
    css`
      svg {
        transform: rotate(180deg);
      }
    `}

  ${(props) =>
    props.$direction === "up" &&
    css`
      svg {
        transform: rotate(270deg);
      }
    `}
`;

export const StyledBreak = styled.br`
  display: none;
  @media (max-width: 840px) {
    display: block;
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
  type,
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
      onPointerDown={(e) => {
        e.preventDefault();
      }}
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
            <StyledArrowIcon $direction="left">
              <ArrowRightLineIcon />
            </StyledArrowIcon>
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
            <StyledArrowIcon $direction="up">
              <ArrowRightLineIcon />
            </StyledArrowIcon>
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
            <StyledArrowIcon $direction="down">
              <ArrowRightLineIcon />
            </StyledArrowIcon>
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
            <StyledArrowIcon $direction="right">
              <ArrowRightLineIcon />
            </StyledArrowIcon>
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
          <ShiftIcon />
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
          <StyledKeyboardToggleIcon>
            {open ? <CaretDownIcon /> : <CaretUpIcon />}
          </StyledKeyboardToggleIcon>
        </Button>
      </StyledTrackerNavigationButtons>

      <StyledTrackerSectionButtons>
        {shiftKey ? (
          <StyledTrackerEffectButtons>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "transposeField",
                    direction: "up",
                  });
                }}
              >
                + <StyledBreak />
                {l10n("FIELD_VALUE")}
              </Button>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "transpose",
                    direction: "up",
                    size: "octave",
                  });
                }}
              >
                + <StyledBreak />
                {l10n("FIELD_OCTAVE")}
              </Button>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "transpose",
                    direction: "up",
                    size: "note",
                  });
                }}
              >
                + <StyledBreak />
                {l10n("FIELD_SEMITONE")}
              </Button>
            </StyledTrackerKeyboardButtonsRow>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "transposeField",
                    direction: "down",
                  });
                }}
              >
                - <StyledBreak />
                {l10n("FIELD_VALUE")}
              </Button>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "transpose",
                    direction: "down",
                    size: "octave",
                  });
                }}
              >
                - <StyledBreak />
                {l10n("FIELD_OCTAVE")}
              </Button>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "transpose",
                    direction: "down",
                    size: "note",
                  });
                }}
              >
                - <StyledBreak />
                {l10n("FIELD_SEMITONE")}
              </Button>
            </StyledTrackerKeyboardButtonsRow>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "insertRow",
                  });
                }}
              >
                {l10n("FIELD_INSERT_ROW")}
              </Button>
              <Button
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPressed({
                    type: "removeRow",
                  });
                }}
              >
                {l10n("FIELD_DELETE_ROW")}
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
                      onPointerDown={(e) => {
                        e.preventDefault();
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
                      onPointerDown={(e) => {
                        e.preventDefault();
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
                      onPointerDown={(e) => {
                        e.preventDefault();
                        onKeyPressed({ type: "number", value: n + 10 });
                      }}
                    >
                      {(n + 10).toString(16).toUpperCase()}
                    </Button>
                  ))}
                </StyledTrackerKeyboardButtonsRow>
              </StyledTrackerEffectButtons>
            )}

            {(fieldType === "offsetColumnFocus" ||
              fieldType === "jumpColumnFocus") && (
              <StyledTrackerEffectButtons>
                <StyledTrackerKeyboardButtonsRow>
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Button
                      key={n}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
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
                      onPointerDown={(e) => {
                        e.preventDefault();
                        onKeyPressed({ type: "number", value: n + 5 });
                      }}
                    >
                      {(n + 5).toString(16).toUpperCase()}
                    </Button>
                  ))}
                </StyledTrackerKeyboardButtonsRow>
                <StyledTrackerKeyboardButtonsRow>
                  <Button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onKeyPressed({ type: "sign", value: "-" });
                    }}
                  >
                    -
                  </Button>

                  <Button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onKeyPressed({ type: "sign", value: "+" });
                    }}
                  >
                    +
                  </Button>
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
                                e.preventDefault();
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
            onPointerDown={(e) => {
              e.preventDefault();
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
            <StyledBackspaceIcon>
              <BackspaceIcon />
            </StyledBackspaceIcon>
          </Button>

          {isCompactLayout && type === "pattern" && (
            <Button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onKeyPressed({
                  type: "editEffects",
                });
              }}
            >
              <FXIcon />
            </Button>
          )}

          {isCompactLayout && type === "pattern" && (
            <Button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
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
