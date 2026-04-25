import React, { memo } from "react";
import { TRACKER_PATTERN_LENGTH } from "consts";
import { StyledTrackerPatternChannel } from "./style";
import { SongTrackerPatternChannelRow } from "./SongTrackerPatternChannelRow";

const ROW_INDICES = Array.from(
  { length: TRACKER_PATTERN_LENGTH },
  (_, index) => index,
);

interface SongTrackerPatternChannelProps {
  patternId: number;
  channelId: 0 | 1 | 2 | 3;
  renderSequenceId: number;
  isMuted: boolean;
  activeFieldRef: React.RefObject<HTMLSpanElement | null>;
}

export const SongTrackerPatternChannel = memo(
  ({
    patternId,
    channelId,
    renderSequenceId,
    isMuted,
    activeFieldRef,
  }: SongTrackerPatternChannelProps) => {
    return (
      <StyledTrackerPatternChannel $isMuted={isMuted}>
        {ROW_INDICES.map((rowIndex) => (
          <SongTrackerPatternChannelRow
            key={rowIndex}
            patternId={patternId}
            channelId={channelId}
            rowIndex={rowIndex}
            renderSequenceId={renderSequenceId}
            activeFieldRef={activeFieldRef}
          />
        ))}
      </StyledTrackerPatternChannel>
    );
  },
);
