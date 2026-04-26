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
  const playing = useAppSelector((state) => state.tracker.playing);
  const playbackSequence = useAppSelector(
    (state) => state.tracker.playbackSequence,
  );
  const playbackRow = useAppSelector((state) => state.tracker.playbackRow);
  const scrollRafRef = useRef<number | undefined>(undefined);
  const targetScrollLeftRef = useRef<number | null>(null);

  const playheadLeft = calculatePlaybackTrackerPosition(
    playbackSequence,
    playbackRow,
  );

  useEffect(() => {
    if (playbackSequence >= sequenceLength) {
      API.music.sendToMusicWindow({
        action: "position",
        position: { sequence: 0, row: 0 },
      });
    }
  }, [playbackSequence, sequenceLength]);

  useLayoutEffect(() => {
    if (!playing) {
      return;
    }

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

    targetScrollLeftRef.current = nextScrollLeft;

    if (scrollRafRef.current !== undefined) {
      return;
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const targetScrollLeft = targetScrollLeftRef.current;

      if (targetScrollLeft !== null) {
        scrollEl.scrollLeft = targetScrollLeft;
      }

      targetScrollLeftRef.current = null;
      scrollRafRef.current = undefined;
    });
  }, [
    playheadLeft,
    playing,
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
