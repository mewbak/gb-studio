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

const ROW_INDICES = Array.from({ length: TRACKER_PATTERN_LENGTH }, (_, index) => index);

interface SongTrackerPatternRowIndexColumnProps {
  renderSequenceId: number;
  defaultStartPlaybackPosition: [number, number];
}

export const SongTrackerPatternRowIndexColumn = memo(
  ({
    renderSequenceId,
    defaultStartPlaybackPosition,
  }: SongTrackerPatternRowIndexColumnProps) => {
    return (
      <StyledTrackerPatternRowIndexColumn $sticky>
        {ROW_INDICES.map((rowIndex) => (
          <StyledTrackerPatternRowIndexCell
            key={rowIndex}
            id={`tracker_playhead_${renderSequenceId}_${rowIndex}`}
            $isDefaultPlayhead={
              defaultStartPlaybackPosition[0] === renderSequenceId &&
              defaultStartPlaybackPosition[1] === rowIndex
            }
            data-row={rowIndex}
            data-sequenceid={renderSequenceId}
          >
            <StyledTrackerRowIndexField id={`cell_${renderSequenceId}_${rowIndex}`}>
              {renderCounter(rowIndex)}
            </StyledTrackerRowIndexField>
          </StyledTrackerPatternRowIndexCell>
        ))}
      </StyledTrackerPatternRowIndexColumn>
    );
  },
);
