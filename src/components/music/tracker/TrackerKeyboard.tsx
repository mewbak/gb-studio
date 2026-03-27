import React from "react";
import styled from "styled-components";

type VirtualTrackerKey =
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

type TrackerFieldType = "note" | "instrument" | "effectCode" | "effect";

interface TrackerKeyboardProps {
  fieldType: TrackerFieldType;
  onKeyPressed: (e: VirtualTrackerKey) => void;
}

const StyledTrackerKeyboard = styled.div`
  min-height: 100px;
  flex-grow: 0.5;
  flex-basis: 0;
  background: red;
`;

export const TrackerKeyboard = ({ onKeyPressed }: TrackerKeyboardProps) => {
  return (
    <StyledTrackerKeyboard>
      <button
        onClick={() => {
          onKeyPressed({ type: "navigation", direction: "left" });
        }}
      >
        Left
      </button>
      <button
        onClick={() => {
          onKeyPressed({ type: "navigation", direction: "right" });
        }}
      >
        Right
      </button>
    </StyledTrackerKeyboard>
  );
};
