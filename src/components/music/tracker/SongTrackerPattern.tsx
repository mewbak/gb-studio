import React, { memo, useMemo } from "react";
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
import { useAppSelector } from "store/hooks";
import l10n from "shared/lib/lang/l10n";

interface SongTrackerPatternProps {
  sequencePatternId: number;
  renderSequenceId: number;
  activeSequenceId: number;
  activeLocalField: number | undefined;
  selectedTrackerFieldSet?: Set<number>;
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
    sequencePatternId,
    renderSequenceId,
    activeSequenceId,
    activeLocalField,
    selectedTrackerFieldSet,
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
    const pattern = useAppSelector(
      (state) =>
        state.trackerDocument.present.song?.patterns[sequencePatternId],
    );

    const isActivePattern = renderSequenceId === activeSequenceId;
    const activeRowIndex =
      activeLocalField !== undefined
        ? Math.floor(activeLocalField / TRACKER_ROW_SIZE)
        : undefined;

    const selectedFieldsByRow = useMemo(() => {
      if (!selectedTrackerFieldSet) {
        return undefined;
      }

      const next = new Map<number, Set<number>>();

      for (const field of selectedTrackerFieldSet) {
        const rowIndex = Math.floor(field / TRACKER_ROW_SIZE);
        const rowStart = rowIndex * TRACKER_ROW_SIZE;
        let rowFields = next.get(rowIndex);

        if (!rowFields) {
          rowFields = new Set<number>();
          next.set(rowIndex, rowFields);
        }

        rowFields.add(field - rowStart);
      }

      return next;
    }, [selectedTrackerFieldSet]);

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
              {l10n("FIELD_CHANNEL_DUTY_1")}
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={1}
              muted={channelStatus[1] && soloChannel === -1}
              solo={soloChannel === 1}
            >
              {l10n("FIELD_CHANNEL_DUTY_2")}
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={2}
              muted={channelStatus[2] && soloChannel === -1}
              solo={soloChannel === 2}
            >
              {l10n("FIELD_CHANNEL_WAVE")}
            </TrackerHeaderCell>
            <TrackerHeaderCell
              type="channel"
              channel={3}
              muted={channelStatus[3] && soloChannel === -1}
              solo={soloChannel === 3}
            >
              {l10n("FIELD_CHANNEL_NOISE")}
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
                selectedFieldsInRow={selectedFieldsByRow?.get(rowIndex)}
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
