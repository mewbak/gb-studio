import React, { memo } from "react";
import { PatternCell } from "shared/lib/uge/types";
import { PatternChannelNotes } from "./PatternChannelNotes";
import { PianoRollCrosshair } from "./PianoRollCrosshair";
import {
  StyledPianoRollPatternBlockGrid,
  StyledPianoRollPatternBlock,
} from "./style";

interface PianoRollPatternBlockProps {
  pattern: PatternCell[][];
  sequenceId: number;
  displayChannels: number[];
  isDragging: boolean;
  playing: boolean;
  selectedChannel: number;
  hoverColumn: number | null;
  hoverNote: number | null;
  hoverSequence: number | null;
  selectedRowsByChannel: ReadonlyMap<number, ReadonlySet<number>>;
}

export const PianoRollPatternBlock = memo(({
  pattern,
  sequenceId,
  displayChannels,
  isDragging,
  playing,
  selectedChannel,
  hoverColumn,
  hoverNote,
  hoverSequence,
  selectedRowsByChannel,
}: PianoRollPatternBlockProps) => {
  const isSequenceHovered =
    hoverSequence === sequenceId ||
    (hoverSequence === null && sequenceId === 0);

  return (
    <StyledPianoRollPatternBlock
      $hovered={isSequenceHovered}
      $isPlaying={playing}
    >
      <StyledPianoRollPatternBlockGrid $size="small" />
      <StyledPianoRollPatternBlockGrid $size="medium" />
      <StyledPianoRollPatternBlockGrid $size="large" />

      <PianoRollCrosshair
        hoverColumn={hoverColumn}
        hoverRow={hoverNote}
        isSequenceHovered={isSequenceHovered}
      />

      {displayChannels.map((channelId) => (
        <PatternChannelNotes
          key={channelId}
          channelId={channelId}
          isActive={selectedChannel === channelId}
          pattern={pattern}
          selectedRowIds={selectedRowsByChannel.get(channelId)}
          isDragging={isDragging}
        />
      ))}
    </StyledPianoRollPatternBlock>
  );
});
