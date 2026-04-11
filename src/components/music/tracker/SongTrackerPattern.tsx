import React, { memo } from "react";
import { PatternCell } from "shared/lib/uge/types";
import { TrackerHeaderCell } from "./TrackerHeaderCell";
import {
  StyledTrackerContentTable,
  StyledTrackerTableHeader,
  StyledTrackerTableHeaderRow,
  StyledTrackerTableBody,
} from "./style";
import { patternHue } from "shared/lib/uge/display";
import renderPatternContextMenu from "components/music/contextMenus/renderPatternContextMenu";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { SongTrackerRow } from "./SongTrackerRow";
import { TRACKER_ROW_SIZE } from "consts";

interface SongTrackerPatternProps {
  pattern: PatternCell[][];
  sequencePatternId: number;
  renderSequenceId: number;
  activeSequenceId: number;
  activeLocalField: number | undefined;
  selectedTrackerFieldSet?: Set<number>;
  playbackState: [number, number];
  defaultStartPlaybackPosition: [number, number];
  channelStatus: boolean[];
  soloChannel: number;
  orderLength: number;
  numPatterns: number;
  dispatch: ReturnType<typeof import("store/hooks").useAppDispatch>;
  tableRef: React.RefObject<HTMLTableSectionElement | null>;
  activeFieldRef: React.RefObject<HTMLSpanElement | null>;
  onFocus: () => void;
  onSelectionContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}

export const SongTrackerPattern = memo(
  ({
    pattern,
    sequencePatternId,
    renderSequenceId,
    activeSequenceId,
    activeLocalField,
    selectedTrackerFieldSet,
    playbackState,
    defaultStartPlaybackPosition,
    channelStatus,
    soloChannel,
    orderLength,
    numPatterns,
    dispatch,
    tableRef,
    activeFieldRef,
    onFocus,
    onSelectionContextMenu,
  }: SongTrackerPatternProps) => {
    const isActivePattern = renderSequenceId === activeSequenceId;

    return (
      <StyledTrackerContentTable $type="pattern">
        <StyledTrackerTableHeader
          style={{
            background: `linear-gradient(0deg, hsl(${patternHue(sequencePatternId)}deg 100% 70%) 0%, hsl(${patternHue(sequencePatternId)}deg 100% 80%) 100%)`,
            borderColor: `hsl(${patternHue(sequencePatternId)}deg 80% 50% / 30%)`,
          }}
        >
          <StyledTrackerTableHeaderRow>
            <TrackerHeaderCell
              type="patternIndex"
              sequencePatternId={sequencePatternId}
            >
              <DropdownButton
                variant="transparent"
                label={String(sequencePatternId).padStart(2, "0")}
              >
                {renderPatternContextMenu({
                  dispatch,
                  patternIndex: sequencePatternId,
                  orderIndex: renderSequenceId,
                  orderLength,
                  numPatterns,
                })}
              </DropdownButton>
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={0}
              muted={channelStatus[0] && soloChannel === -1}
              solo={soloChannel === 0}
            >
              Duty 1
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={1}
              muted={channelStatus[1] && soloChannel === -1}
              solo={soloChannel === 1}
            >
              Duty 2
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={2}
              muted={channelStatus[2] && soloChannel === -1}
              solo={soloChannel === 2}
            >
              Wave
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={3}
              muted={channelStatus[3] && soloChannel === -1}
              solo={soloChannel === 3}
            >
              Noise
            </TrackerHeaderCell>
          </StyledTrackerTableHeaderRow>
        </StyledTrackerTableHeader>

        <StyledTrackerTableBody
          ref={isActivePattern ? tableRef : null}
          tabIndex={isActivePattern ? 0 : -1}
          onFocus={onFocus}
          onContextMenu={onSelectionContextMenu}
        >
          {pattern?.map((row: PatternCell[], rowIndex: number) => {
            let selectedFieldsInRow: Set<number> | undefined;

            if (selectedTrackerFieldSet) {
              const rowStart = rowIndex * TRACKER_ROW_SIZE;
              const rowEnd = rowStart + TRACKER_ROW_SIZE - 1;

              for (const field of selectedTrackerFieldSet) {
                if (field >= rowStart && field <= rowEnd) {
                  if (!selectedFieldsInRow) {
                    selectedFieldsInRow = new Set<number>();
                  }
                  selectedFieldsInRow.add(field - rowStart);
                }
              }
            }

            const activeRowIndex =
              activeLocalField !== undefined
                ? Math.floor(activeLocalField / TRACKER_ROW_SIZE)
                : undefined;

            const activeFieldInRow =
              activeRowIndex === rowIndex && activeLocalField !== undefined
                ? activeLocalField - rowIndex * TRACKER_ROW_SIZE
                : undefined;

            return (
              <SongTrackerRow
                key={rowIndex}
                row={row}
                rowIndex={rowIndex}
                renderSequenceId={renderSequenceId}
                channelStatus={channelStatus}
                activeFieldInRow={activeFieldInRow}
                selectedFieldsInRow={selectedFieldsInRow}
                isPlaying={
                  playbackState[0] === renderSequenceId &&
                  playbackState[1] === rowIndex
                }
                isDefaultPlayhead={
                  defaultStartPlaybackPosition[0] === renderSequenceId &&
                  defaultStartPlaybackPosition[1] === rowIndex
                }
                isStepMarker={rowIndex % 8 === 0}
                activeFieldRef={activeFieldRef}
              />
            );
          })}
        </StyledTrackerTableBody>
      </StyledTrackerContentTable>
    );
  },
);
