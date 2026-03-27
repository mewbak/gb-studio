import React from "react";
import styled, { css } from "styled-components";

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

type TrackerFieldType = "note" | "instrument" | "effectCode" | "effectParam";

interface TrackerKeyboardProps {
  open?: boolean;
  fieldType: TrackerFieldType;
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
  button {
    min-width: 40px;
    min-height: 40px;
  }
`;

export const TrackerKeyboard = ({
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
      <button
        type="button"
        onClick={() => {
          onKeyPressed({ type: "navigation", direction: "left" });
        }}
      >
        Left
      </button>
      <button
        type="button"
        onClick={() => {
          onKeyPressed({ type: "navigation", direction: "up" });
        }}
      >
        Up
      </button>

      <button
        type="button"
        onClick={() => {
          onKeyPressed({ type: "navigation", direction: "down" });
        }}
      >
        Down
      </button>

      <button
        type="button"
        onClick={() => {
          onKeyPressed({ type: "navigation", direction: "right" });
        }}
      >
        Right
      </button>
    </StyledTrackerKeyboard>
  );
};
