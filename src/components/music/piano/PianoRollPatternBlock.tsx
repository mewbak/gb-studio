import React, { memo, useCallback } from "react";
import { PatternChannelNotes } from "./PatternChannelNotes";
import { PianoRollCrosshair } from "./PianoRollCrosshair";
import {
  StyledPianoRollPatternBlockGrid,
  StyledPianoRollPatternBlock,
} from "./style";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerActions from "store/features/tracker/trackerActions";

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
    const dispatch = useAppDispatch();

    const isSequenceHovered = useAppSelector(
      (state) =>
        state.tracker.hoverSequence === sequenceId ||
        (state.tracker.hoverSequence === null && sequenceId === 0),
    );

    const isFiltered = useAppSelector((state) => {
      const loopSequenceId = state.tracker.loopSequenceId;
      return loopSequenceId !== undefined && loopSequenceId !== sequenceId;
    });

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

    const onPointerDown = useCallback(() => {
      if (isFiltered) {
        dispatch(trackerActions.setLoopSequenceId(undefined));
      }
    }, [dispatch, isFiltered]);

    return (
      <StyledPianoRollPatternBlock
        $hovered={isSequenceHovered}
        $isPlaying={playing}
        $isFiltered={isFiltered}
        onPointerDown={onPointerDown}
      >
        <StyledPianoRollPatternBlockGrid $size="sharp" />
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
