import React, { memo, useRef, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "store/hooks";
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
  children?: React.ReactNode;
}

interface PianoRollSequenceBarPatternProps {
  patternIndex: number;
  orderIndex: number;
  orderLength: number;
  numPatterns: number;
}

const tickMarkers = [8, 16, 24, 32, 40, 48, 56] as const;

const PianoRollSequenceBarPattern = memo(
  ({
    patternIndex,
    orderIndex,
    orderLength,
    numPatterns,
  }: PianoRollSequenceBarPatternProps) => {
    const dispatch = useAppDispatch();

    const getContextMenu = useCallback(
      (onClose?: () => void) => {
        return renderPatternContextMenu({
          dispatch,
          patternIndex,
          orderIndex,
          orderLength,
          numPatterns,
          onClose,
        });
      },
      [dispatch, patternIndex, orderIndex, orderLength, numPatterns],
    );

    const { onContextMenu, contextMenuElement } = useContextMenu({
      getMenu: ({ closeMenu }) => getContextMenu(closeMenu),
    });

    const contextMenu = useMemo(() => getContextMenu(), [getContextMenu]);

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
            {contextMenu}
          </DropdownButton>
        </StyledPianoRollSequenceHeaderText>
        {contextMenuElement}
      </StyledPianoRollSequenceHeaderPattern>
    );
  },
);

export const PianoRollSequenceBar = memo(
  ({ children }: PianoRollSequenceBarProps) => {
    const dispatch = useAppDispatch();

    const songSequence = useAppSelector(
      (state) => state.trackerDocument.present.song?.sequence,
    );
    const sequenceLength = useAppSelector(
      (state) => state.trackerDocument.present.song?.sequence.length ?? 0,
    );
    const numPatterns = useAppSelector(
      (state) => state.trackerDocument.present.song?.patterns.length ?? 0,
    );

    const documentWidth = calculateDocumentWidth(sequenceLength);

    const defaultStartPlaybackPosition = useAppSelector(
      (state) => state.tracker.defaultStartPlaybackPosition,
    );

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

    const defaultPlayheadX = calculatePlaybackTrackerPosition(
      defaultStartPlaybackPosition[0],
      defaultStartPlaybackPosition[1],
    );

    return (
      <StyledPianoRollScrollTopWrapper
        ref={headerRef}
        style={{ minWidth: PIANO_ROLL_PIANO_WIDTH + documentWidth }}
        onMouseDown={onMouseDown}
      >
        <StyledPianoRollScrollHeaderFooterSpacer />
        {songSequence?.map((pattern, i) => (
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
              orderLength={sequenceLength}
              numPatterns={numPatterns}
            />
          </StyledPianoRollSequenceHeader>
        ))}
        {defaultPlayheadX > 0 && (
          <StyledPianoRollPlayhead
            $isDefaultMarker
            style={{ transform: `translateX(${defaultPlayheadX}px)` }}
          />
        )}
        {children}
      </StyledPianoRollScrollTopWrapper>
    );
  },
);
