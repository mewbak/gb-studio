import { MIN_OCTAVE, OCTAVE_SIZE } from "consts";
import React from "react";
import styled, { css } from "styled-components";
import { KeyWhen } from "renderer/lib/keybindings/keyBindings";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { FlexGrow } from "ui/spacing/Spacing";

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
  flex-grow: 1;
  flex-basis: 0;

  overflow: hidden;
  height: 600px;
  transition: max-height 200ms ease-in-out;
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};
  max-height: ${(props) => (props.$open ? "200px" : "0px")};
  box-sizing: border-box;

  box-shadow: ${(props) =>
    props.$open ? "0px 2px 50px rgba(0, 0, 0, 0.2)" : "none"};

  background: red;

  button {
    min-width: 40px;
    min-height: 40px;
    white-space: nowrap;
  }
`;

const StyledTrackerNavigationButtons = styled.div`
  display: flex;
  gap: 10px;
  padding: 5px;
  background: ${(props) => props.theme.colors.sidebar.header.background};
  border-bottom: 1px solid
    ${(props) => props.theme.colors.sidebar.header.border};
`;

const StyledTrackerInstrumentButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  button {
    width: calc((100% - 30px) / 4);
  }

  gap: 10px;
`;

const StyledTrackerEffectButtons = styled.div`
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
  padding: 5px;
`;

const StyledTrackerKeyboardNotes = styled.div`
  background: ${(props) => props.theme.colors.sidebar.background};
  width: 100%;
  overflow-x: auto;
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
        <button
          type="button"
          onMouseDown={() => {
            onKeyPressed({ type: "navigation", direction: "up" });
          }}
        >
          Up
        </button>

        <button
          type="button"
          onMouseDown={() => {
            onKeyPressed({ type: "navigation", direction: "down" });
          }}
        >
          Down
        </button>

        <FlexGrow />

        <button
          type="button"
          onMouseDown={() => {
            onKeyPressed({ type: "navigation", direction: "left" });
          }}
        >
          Left
        </button>

        <button
          type="button"
          onMouseDown={() => {
            onKeyPressed({ type: "navigation", direction: "right" });
          }}
        >
          Right
        </button>
      </StyledTrackerNavigationButtons>

      {fieldType === "instrumentColumnFocus" && (
        <StyledTrackerInstrumentButtons>
          {Array.from({ length: 10 }).map((_, n) => (
            <button
              key={n}
              type="button"
              onMouseDown={() => {
                onKeyPressed({ type: "number", value: n });
              }}
            >
              {n.toString(16)}
            </button>
          ))}
        </StyledTrackerInstrumentButtons>
      )}

      {(fieldType === "effectCodeColumnFocus" ||
        fieldType === "effectParamColumnFocus") && (
        <StyledTrackerEffectButtons>
          {Array.from({ length: 16 }).map((_, n) => (
            <button
              key={n}
              type="button"
              onMouseDown={() => {
                onKeyPressed({ type: "number", value: n });
              }}
            >
              {n.toString(16)}
            </button>
          ))}
        </StyledTrackerEffectButtons>
      )}

      {fieldType === "noteColumnFocus" && (
        <StyledTrackerKeyboardNotes>
          {Array.from({ length: 3 }).map((_, octave) => (
            <StyledTrackerButtonGroup key={octave}>
              {NOTE_NAMES.map((note, noteIndex) => (
                <button
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
                </button>
              ))}
            </StyledTrackerButtonGroup>
          ))}
        </StyledTrackerKeyboardNotes>
      )}
    </StyledTrackerKeyboard>
  );
};
