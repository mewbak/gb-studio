import React from "react";
import { Song } from "shared/lib/uge/types";
import { StyledPianoRollWrapper } from "./style";
import { PianoRollCanvas } from "./PianoRollCanvas";

interface SongPianoRollProps {
  song: Song | null;
}

export const SongPianoRoll = ({ song }: SongPianoRollProps) => {
  return (
    <StyledPianoRollWrapper>
      {song && <PianoRollCanvas song={song} />}
    </StyledPianoRollWrapper>
  );
};
