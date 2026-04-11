import React, { memo } from "react";
import { PatternCell } from "shared/lib/uge/types";
import {
  StyledTrackerRow,
  StyledTrackerCell,
  StyledTrackerRowIndexField,
  StyledTrackerNoteField,
  StyledTrackerInstrumentField,
  StyledTrackerEffectCodeField,
  StyledTrackerEffectParamField,
} from "./style";
import {
  renderEffect,
  renderEffectParam,
  renderInstrument,
  renderNote,
} from "shared/lib/uge/display";
import { TRACKER_CHANNEL_FIELDS, TRACKER_ROW_SIZE } from "consts";

const renderCounter = (n: number): string => {
  return n.toString().padStart(2, "0");
};

interface SongTrackerRowProps {
  row: PatternCell[];
  rowIndex: number;
  renderSequenceId: number;
  channelStatus: boolean[];
  activeFieldInRow: number | undefined;
  selectedFieldsInRow?: Set<number>;
  isDefaultPlayhead: boolean;
  isStepMarker: boolean;
  activeFieldRef: React.RefObject<HTMLSpanElement | null>;
}

export const SongTrackerRow = memo(
  ({
    row,
    rowIndex,
    renderSequenceId,
    channelStatus,
    activeFieldInRow,
    selectedFieldsInRow,
    isDefaultPlayhead,
    isStepMarker,
    activeFieldRef,
  }: SongTrackerRowProps) => {
    const rowFieldBase = rowIndex * TRACKER_ROW_SIZE;

    const isActive = activeFieldInRow !== undefined;

    return (
      <StyledTrackerRow $isStepMarker={isStepMarker} $isActive={isActive}>
        <StyledTrackerCell
          id={`tracker_playhead_${renderSequenceId}_${rowIndex}`}
          $isDefaultPlayhead={isDefaultPlayhead}
          $isMuted={false}
          data-row={rowIndex}
          data-sequenceid={renderSequenceId}
        >
          <StyledTrackerRowIndexField
            id={`cell_${renderSequenceId}_${rowIndex}`}
          >
            {renderCounter(rowIndex)}
          </StyledTrackerRowIndexField>
        </StyledTrackerCell>

        {row.map((cell, rowChannelId) => {
          const localField =
            rowFieldBase + rowChannelId * TRACKER_CHANNEL_FIELDS;

          const fieldInRow = rowChannelId * TRACKER_CHANNEL_FIELDS;

          const isNoteActive = activeFieldInRow === fieldInRow;
          const isInstrumentActive = activeFieldInRow === fieldInRow + 1;
          const isEffectCodeActive = activeFieldInRow === fieldInRow + 2;
          const isEffectParamActive = activeFieldInRow === fieldInRow + 3;

          return (
            <StyledTrackerCell
              $isMuted={channelStatus[rowChannelId]}
              key={rowChannelId}
            >
              <StyledTrackerNoteField
                id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_note`}
                $active={isNoteActive}
                ref={isNoteActive ? activeFieldRef : null}
                data-sequenceid={renderSequenceId}
                data-fieldid={localField}
                $selected={
                  selectedFieldsInRow?.has(localField - rowFieldBase) ?? false
                }
              >
                {renderNote(cell.note)}
              </StyledTrackerNoteField>

              <StyledTrackerInstrumentField
                id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_instrument`}
                $active={isInstrumentActive}
                ref={isInstrumentActive ? activeFieldRef : null}
                data-sequenceid={renderSequenceId}
                data-fieldid={localField + 1}
                $selected={
                  selectedFieldsInRow?.has(localField + 1 - rowFieldBase) ??
                  false
                }
              >
                {renderInstrument(cell.instrument)}
              </StyledTrackerInstrumentField>

              <StyledTrackerEffectCodeField
                id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_effectcode`}
                $active={isEffectCodeActive}
                ref={isEffectCodeActive ? activeFieldRef : null}
                data-sequenceid={renderSequenceId}
                data-fieldid={localField + 2}
                $selected={
                  selectedFieldsInRow?.has(localField + 2 - rowFieldBase) ??
                  false
                }
              >
                {renderEffect(cell.effectcode)}
              </StyledTrackerEffectCodeField>

              <StyledTrackerEffectParamField
                id={`cell_${renderSequenceId}_${rowIndex}_${rowChannelId}_effectparam`}
                $active={isEffectParamActive}
                ref={isEffectParamActive ? activeFieldRef : null}
                data-sequenceid={renderSequenceId}
                data-fieldid={localField + 3}
                $selected={
                  selectedFieldsInRow?.has(localField + 3 - rowFieldBase) ??
                  false
                }
              >
                {renderEffectParam(cell.effectparam)}
              </StyledTrackerEffectParamField>
            </StyledTrackerCell>
          );
        })}
      </StyledTrackerRow>
    );
  },
);
