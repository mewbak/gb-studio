import React, { useEffect, useLayoutEffect, useRef } from "react";
import API from "renderer/lib/api";
import { useAppSelector } from "store/hooks";
import {
  calculatePlaybackTrackerPosition,
  calculateDocumentWidth,
} from "./helpers";
import { StyledPianoRollPlayhead } from "./style";

interface PianoRollPlaybackControllerProps {
  scrollElement: HTMLDivElement | null;
  sequenceLength: number;
}

export const PianoRollPlaybackController = ({
  scrollElement,
  sequenceLength,
}: PianoRollPlaybackControllerProps) => {
  const playbackSequence = useAppSelector(
    (state) => state.tracker.playbackSequence,
  );
  const playbackRow = useAppSelector((state) => state.tracker.playbackRow);
  const playbackCurrentTick = useAppSelector(
    (state) => state.tracker.playbackCurrentTick,
  );
  const playbackTicksPerRow = useAppSelector(
    (state) => state.tracker.playbackTicksPerRow,
  );
  const playbackFollowScrollRevision = useAppSelector(
    (state) => state.tracker.playbackFollowScrollRevision,
  );

  const playheadLeft = Math.round(
    calculatePlaybackTrackerPosition(
      playbackSequence,
      playbackRow,
      playbackCurrentTick,
      playbackTicksPerRow,
    ),
  );
  const lastFollowScrollRevisionRef = useRef(playbackFollowScrollRevision);

  useEffect(() => {
    if (playbackSequence >= sequenceLength) {
      API.music.sendToMusicWindow({
        action: "position",
        position: { sequence: 0, row: 0 },
      });
    }
  }, [playbackSequence, sequenceLength]);

  useLayoutEffect(() => {
    if (playbackFollowScrollRevision === lastFollowScrollRevisionRef.current) {
      return;
    }
    lastFollowScrollRevisionRef.current = playbackFollowScrollRevision;

    const scrollEl = scrollElement;
    if (!scrollEl) {
      return;
    }

    const viewportWidth = scrollEl.clientWidth;
    const maxScrollLeft = Math.max(0, calculateDocumentWidth(sequenceLength));
    const nextScrollLeft = Math.max(
      0,
      Math.min(playheadLeft - viewportWidth * 0.3, maxScrollLeft),
    );

    if (Math.abs(scrollEl.scrollLeft - nextScrollLeft) < 1) {
      return;
    }

    scrollEl.scrollLeft = nextScrollLeft;
  }, [
    playbackFollowScrollRevision,
    playheadLeft,
    scrollElement,
    sequenceLength,
  ]);

  return (
    <StyledPianoRollPlayhead
      style={{
        transform: `translateX(${playheadLeft}px)`,
      }}
    />
  );
};
