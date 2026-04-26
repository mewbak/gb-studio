import React, { memo, useCallback } from "react";
import { SequenceItem } from "shared/lib/uge/types";
import { TrackerHeaderCell } from "./TrackerHeaderCell";
import {
  StyledTrackerPattern,
  StyledTrackerPatternBody,
  StyledTrackerPatternHeader,
} from "./style";
import renderSequenceItemContextMenu from "components/music/contextMenus/renderSequenceItemContextMenu";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { TRACKER_PATTERN_LENGTH, TRACKER_ROW_SIZE } from "consts";
import { useAppSelector } from "store/hooks";
import l10n from "shared/lib/lang/l10n";
import trackerActions from "store/features/tracker/trackerActions";
import { SongTrackerPatternChannel } from "./SongTrackerPatternChannel";
import { SongTrackerPatternRowIndexColumn } from "./SongTrackerPatternRowIndexColumn";

const PATTERN_FIELD_COUNT = TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE;

interface SongTrackerPatternProps {
  sequenceItem: SequenceItem;
  sequencePatternId: number;
  renderSequenceId: number;
  defaultStartPlaybackSequence: number;
  defaultStartPlaybackRow: number;
  channelStatus: boolean[];
  soloChannel: number;
  orderLength: number;
  numPatterns: number;
  dispatch: ReturnType<typeof import("store/hooks").useAppDispatch>;
  tableRef: React.RefObject<HTMLDivElement | null>;
  activeFieldRef: React.RefObject<HTMLSpanElement | null>;
  onFocus: () => void;
  onSelectionContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
}

export const SongTrackerPattern = memo(
  ({
    sequenceItem,
    sequencePatternId,
    renderSequenceId,
    defaultStartPlaybackSequence,
    defaultStartPlaybackRow,
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
    const globalSplitPattern = useAppSelector(
      (state) => state.tracker.globalSplitPattern,
    );

    const loopSequenceId = useAppSelector(
      (state) => state.tracker.loopSequenceId,
    );

    const isActivePattern = useAppSelector((state) => {
      const activeField = state.tracker.trackerActiveField;
      const selectedSequence = !state.tracker.playing
        ? state.tracker.selectedSequence
        : -1;
      const activeSequenceId =
        activeField !== undefined
          ? Math.floor(activeField / PATTERN_FIELD_COUNT)
          : selectedSequence;

      return renderSequenceId === activeSequenceId;
    });

    const isFiltered =
      loopSequenceId !== undefined && loopSequenceId !== renderSequenceId;

    const onPointerDown = useCallback(() => {
      if (isFiltered) {
        dispatch(trackerActions.setLoopSequenceId(undefined));
      }
    }, [dispatch, isFiltered]);

    return (
      <StyledTrackerPattern
        onPointerDown={onPointerDown}
        $isFiltered={isFiltered}
      >
        <StyledTrackerPatternHeader>
          <TrackerHeaderCell
            type="patternIndex"
            patternId={sequencePatternId}
            isFiltered={isFiltered}
          >
            <DropdownButton
              variant="transparent"
              label={String(sequencePatternId).padStart(2, "0")}
            >
              {renderSequenceItemContextMenu({
                dispatch,
                sequenceItem,
                orderIndex: renderSequenceId,
                orderLength,
                numPatterns,
                loopSequenceId,
                globalSplitPattern,
              })}
            </DropdownButton>
          </TrackerHeaderCell>
          <TrackerHeaderCell
            type="channel"
            patternId={Math.floor(sequenceItem.channels[0] / 4)}
            channel={0}
            muted={channelStatus[0] && soloChannel === -1}
            solo={soloChannel === 0}
          >
            {l10n("FIELD_CHANNEL_DUTY_1")}
          </TrackerHeaderCell>
          <TrackerHeaderCell
            type="channel"
            patternId={Math.floor(sequenceItem.channels[1] / 4)}
            channel={1}
            muted={channelStatus[1] && soloChannel === -1}
            solo={soloChannel === 1}
          >
            {l10n("FIELD_CHANNEL_DUTY_2")}
          </TrackerHeaderCell>
          <TrackerHeaderCell
            type="channel"
            patternId={Math.floor(sequenceItem.channels[2] / 4)}
            channel={2}
            muted={channelStatus[2] && soloChannel === -1}
            solo={soloChannel === 2}
          >
            {l10n("FIELD_CHANNEL_WAVE")}
          </TrackerHeaderCell>
          <TrackerHeaderCell
            type="channel"
            patternId={Math.floor(sequenceItem.channels[3] / 4)}
            channel={3}
            muted={channelStatus[3] && soloChannel === -1}
            solo={soloChannel === 3}
          >
            {l10n("FIELD_CHANNEL_NOISE")}
          </TrackerHeaderCell>
        </StyledTrackerPatternHeader>

        <StyledTrackerPatternBody
          ref={isActivePattern ? tableRef : null}
          tabIndex={isActivePattern ? 0 : -1}
          onFocus={onFocus}
          onContextMenu={onSelectionContextMenu}
        >
          <SongTrackerPatternRowIndexColumn
            renderSequenceId={renderSequenceId}
            defaultStartPlaybackSequence={defaultStartPlaybackSequence}
            defaultStartPlaybackRow={defaultStartPlaybackRow}
          />
          <SongTrackerPatternChannel
            patternId={sequenceItem.channels[0]}
            channelId={0}
            renderSequenceId={renderSequenceId}
            isMuted={channelStatus[0]}
            activeFieldRef={activeFieldRef}
          />
          <SongTrackerPatternChannel
            patternId={sequenceItem.channels[1]}
            channelId={1}
            renderSequenceId={renderSequenceId}
            isMuted={channelStatus[1]}
            activeFieldRef={activeFieldRef}
          />
          <SongTrackerPatternChannel
            patternId={sequenceItem.channels[2]}
            channelId={2}
            renderSequenceId={renderSequenceId}
            isMuted={channelStatus[2]}
            activeFieldRef={activeFieldRef}
          />
          <SongTrackerPatternChannel
            patternId={sequenceItem.channels[3]}
            channelId={3}
            renderSequenceId={renderSequenceId}
            isMuted={channelStatus[3]}
            activeFieldRef={activeFieldRef}
          />
        </StyledTrackerPatternBody>
      </StyledTrackerPattern>
    );
  },
);
