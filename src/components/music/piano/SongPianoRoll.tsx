import React from "react";
import { StyledPianoRollWrapper } from "./style";
import { PianoRollCanvas } from "./PianoRollCanvas";

export const SongPianoRoll = () => {
  return (
    <StyledPianoRollWrapper>
      <PianoRollCanvas />
    </StyledPianoRollWrapper>
  );
};
