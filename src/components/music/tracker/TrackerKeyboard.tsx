import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import React, { useState } from "react";
import styled, { css } from "styled-components";
import { KeyWhen } from "renderer/lib/keybindings/keyBindings";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FlexGrow } from "ui/spacing/Spacing";
import { SettingsIcon } from "ui/icons/Icons";
import { Button } from "ui/buttons/Button";
import { StyledButton } from "ui/buttons/style";

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
      type: "changeInstrument";
    }
  | {
      type: "interpolate";
    };

interface TrackerKeyboardProps {
  open?: boolean;
  fieldType: KeyWhen;
  octaveOffset: number;
  onKeyPressed: (e: VirtualTrackerKey) => void;
}

const StyledTrackerKeyboard = styled.div<{ $open?: boolean }>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  flex-basis: 0;

  overflow: hidden;
  height: 600px;
  transition: max-height 200ms ease-in-out;
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};
  max-height: ${(props) => (props.$open ? "240px" : "0px")};
  box-sizing: border-box;

  button {
    min-width: 50px;
    min-height: 40px;
    white-space: nowrap;
    font-weight: bold;
    font-size: 15px;
    height: auto;
  }
`;

const StyledTrackerNavigationButtons = styled.div`
  display: flex;
  gap: 10px;
  padding: 5px 10px;
  flex-shrink: 0;
  background: ${(props) => props.theme.colors.sidebar.header.background};
  border-top: 1px solid ${(props) => props.theme.colors.sidebar.header.border};
  border-bottom: 1px solid
    ${(props) => props.theme.colors.sidebar.header.border};
`;

const StyledTrackerSectionButtons = styled.div`
  display: flex;
  background: red;
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
    height: 50px;
  }
`;

const StyledTrackerEffectButtons = styled.div`
  background: ${(props) => props.theme.colors.sidebar.background};
  padding: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  flex-grow: 1;
  display: flex;
  // flex-wrap: wrap;
  // justify-content: center;
  flex-direction: column;

  button {
    width: calc((100% - 50px) / 6);
  }

  gap: 10px;
`;

const StyledTrackerKeyboardNotes = styled.div`
  overflow-x: auto;
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
  padding-right: 10px;
  padding-right: 50px;
`;

const StyledTrackerKeyboardButtonsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-grow: 1;
  padding-right: 10px;

  & ${StyledButton} {
    flex-grow: 1;
    min-width: 0;
    padding: 0 20px;
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

export const TrackerKeyboard = ({
  fieldType,
  octaveOffset,
  open,
  onKeyPressed,
}: TrackerKeyboardProps) => {
  const [shiftKey, setShiftKey] = useState(false);
  return (
    <StyledTrackerKeyboard
      $open={open}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <StyledTrackerNavigationButtons>
        <ButtonGroup>
          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({ type: "navigation", direction: "left", shiftKey });
            }}
          >
            ←
          </Button>

          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({ type: "navigation", direction: "up", shiftKey });
            }}
          >
            ↑
          </Button>

          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({ type: "navigation", direction: "down", shiftKey });
            }}
          >
            ↓
          </Button>

          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({
                type: "navigation",
                direction: "right",
                shiftKey,
              });
            }}
          >
            →
          </Button>
        </ButtonGroup>

        <Button
          type="button"
          variant={shiftKey ? "primary" : "normal"}
          onMouseDown={() => {
            setShiftKey((value) => !value);
          }}
        >
          ⇧
        </Button>

        <FlexGrow />

        <Button
          type="button"
          onMouseDown={() => {
            console.log("SONG SETTINGS");
          }}
        >
          <SettingsIcon />
        </Button>
      </StyledTrackerNavigationButtons>

      <StyledTrackerSectionButtons>
        {shiftKey ? (
          <StyledTrackerEffectButtons>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "transposeField",
                    direction: "up",
                  });
                }}
              >
                +
              </Button>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "up",
                    size: "octave",
                  });
                }}
              >
                + Octave
              </Button>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "up",
                    size: "note",
                  });
                }}
              >
                + Semitone
              </Button>
            </StyledTrackerKeyboardButtonsRow>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "transposeField",
                    direction: "down",
                  });
                }}
              >
                -
              </Button>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "down",
                    size: "octave",
                  });
                }}
              >
                - Octave
              </Button>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "transpose",
                    direction: "down",
                    size: "note",
                  });
                }}
              >
                - Semitone
              </Button>
            </StyledTrackerKeyboardButtonsRow>
            <StyledTrackerKeyboardButtonsRow>
              <Button
                onMouseDown={() => {
                  onKeyPressed({
                    type: "insertRow",
                  });
                }}
              >
                Insert Row
              </Button>
              <Button
                onMouseDown={() => {
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
                      onMouseDown={() => {
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
                      onMouseDown={() => {
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
                      onMouseDown={() => {
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
                  {Array.from({ length: 3 }).map((_, octave) => (
                    <StyledTrackerKeyboardNotesRow key={octave}>
                      {NOTE_NAMES.map((note, noteIndex) => (
                        <Button
                          key={noteIndex + octave * OCTAVE_SIZE}
                          type="button"
                          onMouseDown={() => {
                            onKeyPressed({
                              type: "note",
                              value: noteIndex + octave * OCTAVE_SIZE,
                            });
                          }}
                        >
                          {note}
                          {MIN_OCTAVE + (octave + octaveOffset)}
                        </Button>
                      ))}
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
            onMouseDown={() => {
              onKeyPressed({
                type: "note",
                value: null,
              });
            }}
          >
            ⌫
          </Button>
        </StyledTrackerKeyboardActions>
      </StyledTrackerSectionButtons>
    </StyledTrackerKeyboard>
  );
};
