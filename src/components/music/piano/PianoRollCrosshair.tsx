import React from "react";
import {
  StyledPianoRollCrosshair,
  StyledPianoRollCrosshairHorizontal,
  StyledPianoRollCrosshairVertical,
} from "./style";
import { PIANO_ROLL_CELL_SIZE, TOTAL_NOTES } from "consts";
import { useAppSelector } from "store/hooks";

interface PianoRollCrosshairProps {
  isSequenceHovered: boolean;
}

export const PianoRollCrosshair = ({
  isSequenceHovered,
}: PianoRollCrosshairProps) => {
  const hoverNote = useAppSelector((state) => state.tracker.hoverNote);
  const hoverColumn = useAppSelector((state) => state.tracker.hoverColumn);

  if (hoverColumn === null || hoverNote == null) {
    return null;
  }
  return (
    <StyledPianoRollCrosshair>
      <StyledPianoRollCrosshairHorizontal
        style={{
          top: (TOTAL_NOTES - hoverNote - 1) * PIANO_ROLL_CELL_SIZE,
        }}
      />
      {isSequenceHovered && (
        <StyledPianoRollCrosshairVertical
          style={{
            left: hoverColumn * PIANO_ROLL_CELL_SIZE,
          }}
        />
      )}
    </StyledPianoRollCrosshair>
  );
};
