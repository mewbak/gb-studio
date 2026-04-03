import React, { useRef, useCallback, useEffect } from "react";
import { Song } from "shared/lib/uge/types";
import { useAppDispatch } from "store/hooks";
import {
  PIANO_ROLL_PIANO_WIDTH,
  PIANO_ROLL_CELL_SIZE,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import {
  StyledPianoRollScrollHeaderFooterSpacer,
  StyledPianoRollScrollTopWrapper,
  StyledPianoRollSequenceHeader,
  StyledPianoRollSequenceHeaderPattern,
  StyledPianoRollSequenceHeaderOrder,
  StyledPianoRollSequenceHeaderText,
  StyledPianoRollPlayhead,
  StyledPianoRollSequenceHeaderTimeMarker,
} from "./style";
import clamp from "shared/lib/helpers/clamp";
import trackerActions from "store/features/tracker/trackerActions";
import {
  calculateDocumentWidth,
  calculatePlaybackTrackerPosition,
} from "./helpers";
import API from "renderer/lib/api";
import l10n from "shared/lib/lang/l10n";
import { useContextMenu } from "ui/hooks/use-context-menu";
import renderPatternContextMenu from "components/music/contextMenus/renderPatternContextMenu";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { fromAbsRow } from "store/features/trackerDocument/trackerDocumentHelpers";

interface PianoRollSequenceBarProps {
  song: Song;
  playbackOrder: number;
  playbackRow: number;
}

interface PianoRollSequenceBarPatternProps {
  patternIndex: number;
  orderIndex: number;
  orderLength: number;
}

const tickMarkers = [8, 16, 24, 32, 40, 48, 56] as const;

const PianoRollSequenceBarPattern = ({
  patternIndex,
  orderIndex,
  orderLength,
}: PianoRollSequenceBarPatternProps) => {
  const dispatch = useAppDispatch();

  const getContextMenu = useCallback(
    (onClose?: () => void) =>
      renderPatternContextMenu({
        dispatch,
        patternIndex,
        orderIndex,
        orderLength,
        onClose,
      }),
    [dispatch, patternIndex, orderIndex, orderLength],
  );

  const { onContextMenu, contextMenuElement } = useContextMenu({
    getMenu: ({ closeMenu }) => getContextMenu(closeMenu),
  });

  return (
    <StyledPianoRollSequenceHeaderPattern
      $patternIndex={patternIndex}
      onContextMenu={onContextMenu}
    >
      <StyledPianoRollSequenceHeaderText>
        <DropdownButton
          variant="transparent"
          label={`${orderIndex + 1}: ${l10n("FIELD_PATTERN")} ${String(patternIndex).padStart(2, "0")}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {getContextMenu()}
        </DropdownButton>
      </StyledPianoRollSequenceHeaderText>
      {contextMenuElement}
    </StyledPianoRollSequenceHeaderPattern>
  );
};

export const PianoRollSequenceBar = ({
  song,
  playbackOrder,
  playbackRow,
}: PianoRollSequenceBarProps) => {
  const dispatch = useAppDispatch();

  const sequenceLength = song.sequence.length;
  const documentWidth = calculateDocumentWidth(sequenceLength);

  const headerRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<[number, number] | null>(null);

  const setPlaybackPosition = useCallback(
    (sequenceId: number, rowId: number) => {
      const next: [number, number] = [sequenceId, rowId];
      const prev = lastPositionRef.current;

      if (prev && prev[0] === next[0] && prev[1] === next[1]) {
        return;
      }

      lastPositionRef.current = next;

      dispatch(trackerActions.setDefaultStartPlaybackPosition(next));

      API.music.sendToMusicWindow({
        action: "position",
        position: next,
      });
    },
    [dispatch],
  );

  useEffect(() => {
    if (playbackOrder >= sequenceLength) {
      // Playback has overflowed song
      // e.g. deleted a pattern when playback was inside that pattern
      API.music.sendToMusicWindow({
        action: "position",
        position: [0, 0],
      });
    }
  }, [playbackOrder, sequenceLength]);

  const updatePlaybackPosition = useCallback(
    (e: MouseEvent) => {
      const header = headerRef.current;
      if (!header) {
        return;
      }

      const rect = header.getBoundingClientRect();
      const x = e.clientX - rect.left - PIANO_ROLL_PIANO_WIDTH;

      const totalCols = sequenceLength * TRACKER_PATTERN_LENGTH;

      const absRow = clamp(
        Math.floor(x / PIANO_ROLL_CELL_SIZE),
        0,
        totalCols - 1,
      );

      const { sequenceId, rowId } = fromAbsRow(absRow);

      setPlaybackPosition(sequenceId, rowId);
    },
    [sequenceLength, setPlaybackPosition],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const handleMouseMove = (ev: MouseEvent) => {
        updatePlaybackPosition(ev);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      updatePlaybackPosition(e.nativeEvent);
    },
    [updatePlaybackPosition],
  );

  const playheadX = calculatePlaybackTrackerPosition(
    playbackOrder,
    playbackRow,
  );

  return (
    <StyledPianoRollScrollTopWrapper
      ref={headerRef}
      style={{ minWidth: PIANO_ROLL_PIANO_WIDTH + documentWidth }}
      onMouseDown={onMouseDown}
    >
      <StyledPianoRollScrollHeaderFooterSpacer />
      {song.sequence.map((pattern, i) => (
        <StyledPianoRollSequenceHeader key={`${i}:${pattern}`}>
          <StyledPianoRollSequenceHeaderOrder>
            {tickMarkers.map((n) => (
              <StyledPianoRollSequenceHeaderTimeMarker key={n}>
                {n}
              </StyledPianoRollSequenceHeaderTimeMarker>
            ))}
          </StyledPianoRollSequenceHeaderOrder>
          <PianoRollSequenceBarPattern
            orderIndex={i}
            patternIndex={pattern}
            orderLength={song.sequence.length}
          />
        </StyledPianoRollSequenceHeader>
      ))}
      <StyledPianoRollPlayhead
        style={{ transform: `translateX(${playheadX}px)` }}
      />
    </StyledPianoRollScrollTopWrapper>
  );
};
