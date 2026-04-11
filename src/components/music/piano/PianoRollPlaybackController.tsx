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
  const playbackPosition = useAppSelector(
    (state) => state.tracker.playbackPosition,
  );

  const playbackOrder = playbackPosition[0];
  const playbackRow = playbackPosition[1];

  const scrollRafRef = useRef<number | undefined>(undefined);
  const targetScrollLeftRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== undefined) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (playbackOrder >= sequenceLength) {
      API.music.sendToMusicWindow({
        action: "position",
        position: [0, 0],
      });
    }
  }, [playbackOrder, sequenceLength]);

  useLayoutEffect(() => {
    if (!playing) {
      return;
    }

    const scrollEl = scrollElement;
    if (!scrollEl) {
      return;
    }

    const playheadLeft = calculatePlaybackTrackerPosition(
      playbackOrder,
      playbackRow,
    );
    const viewportWidth = scrollEl.clientWidth;
    const maxScrollLeft = Math.max(
      0,
      calculateDocumentWidth(sequenceLength) - viewportWidth,
    );
    const nextScrollLeft = Math.max(
      0,
      Math.min(playheadLeft - viewportWidth * 0.5, maxScrollLeft),
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
  }, [playing, playbackOrder, playbackRow, scrollElement, sequenceLength]);

  return (
    <StyledPianoRollPlayhead
      style={{
        transform: `translateX(${calculatePlaybackTrackerPosition(playbackOrder, playbackRow)}px)`,
      }}
    />
  );
};
