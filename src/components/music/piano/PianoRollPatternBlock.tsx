import React, { memo } from "react";
import { PatternChannelNotes } from "./PatternChannelNotes";
import { PianoRollCrosshair } from "./PianoRollCrosshair";
import {
  StyledPianoRollPatternBlockGrid,
  StyledPianoRollPatternBlock,
} from "./style";
import { useAppSelector } from "store/hooks";

interface PianoRollPatternBlockProps {
  patternId: number;
  sequenceId: number;
  displayChannels: number[];
  isDragging: boolean;
  playing: boolean;
  selectedChannel: number;
}

const areNumberSetsEqual = (a: Set<number>, b: Set<number>): boolean => {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
};

export const PianoRollPatternBlock = memo(
  ({
    patternId,
    sequenceId,
    displayChannels,
    isDragging,
    playing,
    selectedChannel,
  }: PianoRollPatternBlockProps) => {
    const isSequenceHovered = useAppSelector(
      (state) =>
        state.tracker.hoverSequence === sequenceId ||
        (state.tracker.hoverSequence === null && sequenceId === 0),
    );

    const selectedRows = useAppSelector<Set<number>>((state) => {
      const rows = new Set<number>();

      for (const cell of state.tracker.selectedPatternCells) {
        if (
          cell.sequenceId === sequenceId &&
          cell.channelId === selectedChannel
        ) {
          rows.add(cell.rowId);
        }
      }

      return rows;
    }, areNumberSetsEqual);

    return (
      <StyledPianoRollPatternBlock
        $hovered={isSequenceHovered}
        $isPlaying={playing}
      >
        <StyledPianoRollPatternBlockGrid $size="small" />
        <StyledPianoRollPatternBlockGrid $size="medium" />
        <StyledPianoRollPatternBlockGrid $size="large" />

        <PianoRollCrosshair isSequenceHovered={isSequenceHovered} />

        {displayChannels.map((channelId) => (
          <PatternChannelNotes
            key={channelId}
            patternId={patternId}
            channelId={channelId}
            isActive={selectedChannel === channelId}
            selectedRowIds={
              selectedChannel === channelId ? selectedRows : undefined
            }
            isDragging={isDragging}
          />
        ))}
      </StyledPianoRollPatternBlock>
    );
  },
);
