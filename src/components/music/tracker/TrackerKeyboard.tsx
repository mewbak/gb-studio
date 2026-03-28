import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import React from "react";
import styled, { css } from "styled-components";
import { KeyWhen } from "renderer/lib/keybindings/keyBindings";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import { DotsIcon, SettingsIcon } from "ui/icons/Icons";
import { Button } from "ui/buttons/Button";

export type VirtualTrackerKey =
  | {
      type: "navigation";
      direction: "up" | "down" | "left" | "right";
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "note";
      value: number;
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
    // background: ${(props) => props.theme.colors.panel.background};
    // border-radius: 4px;
    // border: 1px solid ${(props) => props.theme.colors.panel.border};
    border-bottom: 5px solid ${(props) => props.theme.colors.button.border};
    // color: ${(props) => props.theme.colors.text};
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

const StyledTrackerInstrumentButtons = styled.div`
  background: ${(props) => props.theme.colors.sidebar.background};
  padding: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  button {
    width: calc((100% - 30px) / 4);
  }

  gap: 10px;
`;

const StyledTrackerEffectButtons = styled.div`
  background: ${(props) => props.theme.colors.sidebar.background};
  padding: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  button {
    width: calc((100% - 50px) / 6);
  }

  gap: 10px;
`;

const StyledTrackerButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  width: max-content;
  flex-grow: 1;
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
              onKeyPressed({ type: "navigation", direction: "left" });
            }}
          >
            ←
          </Button>

          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({ type: "navigation", direction: "up" });
            }}
          >
            ↑
          </Button>

          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({ type: "navigation", direction: "down" });
            }}
          >
            ↓
          </Button>

          <Button
            type="button"
            onMouseDown={() => {
              onKeyPressed({ type: "navigation", direction: "right" });
            }}
          >
            →
          </Button>
        </ButtonGroup>

        <Button
          type="button"
          onMouseDown={() => {
            onKeyPressed({ type: "navigation", direction: "right" });
          }}
        >
          <DotsIcon />
        </Button>

        <FlexGrow />

        <Button
          type="button"
          onMouseDown={() => {
            onKeyPressed({ type: "navigation", direction: "right" });
          }}
        >
          <SettingsIcon />
        </Button>
      </StyledTrackerNavigationButtons>

      {fieldType === "instrumentColumnFocus" && (
        <StyledTrackerInstrumentButtons>
          {Array.from({ length: 10 }).map((_, n) => (
            <Button
              key={n}
              type="button"
              onMouseDown={() => {
                onKeyPressed({ type: "number", value: n });
              }}
            >
              {n.toString(10)}
            </Button>
          ))}
        </StyledTrackerInstrumentButtons>
      )}

      {(fieldType === "effectCodeColumnFocus" ||
        fieldType === "effectParamColumnFocus") && (
        <StyledTrackerEffectButtons>
          {Array.from({ length: 16 }).map((_, n) => (
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
        </StyledTrackerEffectButtons>
      )}

      {fieldType === "noteColumnFocus" && (
        <StyledTrackerKeyboardNotes>
          <StyledTrackerKeyboardNotesInner>
            {Array.from({ length: 3 }).map((_, octave) => (
              <StyledTrackerButtonGroup key={octave}>
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
              </StyledTrackerButtonGroup>
            ))}
          </StyledTrackerKeyboardNotesInner>
        </StyledTrackerKeyboardNotes>
      )}
    </StyledTrackerKeyboard>
  );
};
