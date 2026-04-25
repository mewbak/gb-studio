import React, { memo } from "react";
import { useAppSelector } from "store/hooks";
import {
  renderEffect,
  renderEffectParam,
  renderInstrument,
  renderNote,
} from "shared/lib/uge/display";
import { TRACKER_CHANNEL_FIELDS, TRACKER_ROW_SIZE } from "consts";
import { createPatternCell } from "shared/lib/uge/song";
import {
  StyledTrackerEffectCodeField,
  StyledTrackerEffectParamField,
  StyledTrackerInstrumentField,
  StyledTrackerNoteField,
  StyledTrackerPatternChannelRow,
} from "./style";
import {
  decodePatternChannelRowState,
  getPatternChannelRowState,
} from "./helpers";

const EMPTY_CELL = createPatternCell();

interface SongTrackerPatternChannelRowProps {
  patternId: number;
  channelId: 0 | 1 | 2 | 3;
  rowIndex: number;
  renderSequenceId: number;
  activeFieldRef: React.RefObject<HTMLSpanElement | null>;
}

export const SongTrackerPatternChannelRow = memo(
  ({
    patternId,
    channelId,
    rowIndex,
    renderSequenceId,
    activeFieldRef,
  }: SongTrackerPatternChannelRowProps) => {
    const cell = useAppSelector(
      (state) =>
        state.trackerDocument.present.song?.patterns[patternId]?.[rowIndex] ??
        EMPTY_CELL,
    );

    const rowState = useAppSelector((state) =>
      getPatternChannelRowState({
        trackerActiveField: state.tracker.trackerActiveField,
        selectionSequenceId: state.tracker.trackerSelectionOrigin?.sequenceId,
        selectedTrackerFields: state.tracker.selectedTrackerFields,
        renderSequenceId,
        channelId,
        rowIndex,
      }),
    );

    const {
      rowActive,
      noteActive,
      noteSelected,
      instrumentActive,
      instrumentSelected,
      effectCodeActive,
      effectCodeSelected,
      effectParamActive,
      effectParamSelected,
    } = decodePatternChannelRowState(rowState);
    const channelFieldBase = channelId * TRACKER_CHANNEL_FIELDS;
    const localField = rowIndex * TRACKER_ROW_SIZE + channelFieldBase;

    return (
      <StyledTrackerPatternChannelRow
        $isStepMarker={rowIndex % 8 === 0}
        $isActive={rowActive}
      >
        <StyledTrackerNoteField
          id={`cell_${renderSequenceId}_${rowIndex}_${channelId}_note`}
          $active={noteActive}
          ref={noteActive ? activeFieldRef : null}
          data-sequenceid={renderSequenceId}
          data-fieldid={localField}
          $selected={noteSelected}
        >
          {renderNote(cell.note)}
        </StyledTrackerNoteField>

        <StyledTrackerInstrumentField
          id={`cell_${renderSequenceId}_${rowIndex}_${channelId}_instrument`}
          $active={instrumentActive}
          ref={instrumentActive ? activeFieldRef : null}
          data-sequenceid={renderSequenceId}
          data-fieldid={localField + 1}
          $selected={instrumentSelected}
        >
          {renderInstrument(cell.instrument)}
        </StyledTrackerInstrumentField>

        <StyledTrackerEffectCodeField
          id={`cell_${renderSequenceId}_${rowIndex}_${channelId}_effectCode`}
          $active={effectCodeActive}
          ref={effectCodeActive ? activeFieldRef : null}
          data-sequenceid={renderSequenceId}
          data-fieldid={localField + 2}
          $selected={effectCodeSelected}
        >
          {renderEffect(cell.effectCode)}
        </StyledTrackerEffectCodeField>

        <StyledTrackerEffectParamField
          id={`cell_${renderSequenceId}_${rowIndex}_${channelId}_effectParam`}
          $active={effectParamActive}
          ref={effectParamActive ? activeFieldRef : null}
          data-sequenceid={renderSequenceId}
          data-fieldid={localField + 3}
          $selected={effectParamSelected}
        >
          {renderEffectParam(cell.effectParam)}
        </StyledTrackerEffectParamField>
      </StyledTrackerPatternChannelRow>
    );
  },
);
