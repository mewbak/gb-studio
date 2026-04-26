import React, { memo } from "react";
import { TRACKER_PATTERN_LENGTH } from "consts";
import {
  StyledTrackerPatternRowIndexCell,
  StyledTrackerPatternRowIndexColumn,
  StyledTrackerRowIndexField,
} from "./style";

const renderCounter = (n: number): string => {
  return n.toString().padStart(2, "0");
};

const ROW_INDICES = Array.from(
  { length: TRACKER_PATTERN_LENGTH },
  (_, index) => index,
);

interface SongTrackerPatternRowIndexColumnProps {
  renderSequenceId: number;
  defaultStartPlaybackSequence: number;
  defaultStartPlaybackRow: number;
}

export const SongTrackerPatternRowIndexColumn = memo(
  ({
    renderSequenceId,
    defaultStartPlaybackSequence,
    defaultStartPlaybackRow,
  }: SongTrackerPatternRowIndexColumnProps) => {
    return (
      <StyledTrackerPatternRowIndexColumn $sticky>
        {ROW_INDICES.map((rowIndex) => (
          <StyledTrackerPatternRowIndexCell
            key={rowIndex}
            id={`tracker_playhead_${renderSequenceId}_${rowIndex}`}
            $isDefaultPlayhead={
              defaultStartPlaybackSequence === renderSequenceId &&
              defaultStartPlaybackRow === rowIndex
            }
            data-row={rowIndex}
            data-sequenceid={renderSequenceId}
          >
            <StyledTrackerRowIndexField
              id={`cell_${renderSequenceId}_${rowIndex}`}
            >
              {renderCounter(rowIndex)}
            </StyledTrackerRowIndexField>
          </StyledTrackerPatternRowIndexCell>
        ))}
      </StyledTrackerPatternRowIndexColumn>
    );
  },
);
