import React, { useEffect, useLayoutEffect, useRef } from "react";
import API from "renderer/lib/api";
import { useAppSelector } from "store/hooks";
import {
  TRACKER_CELL_HEIGHT,
  TRACKER_HEADER_HEIGHT,
} from "./helpers";
import { TRACKER_PATTERN_LENGTH } from "consts";

interface SongTrackerPlaybackControllerProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  sequenceLength: number;
}

const getPlaybackRowCellId = (sequenceId: number, rowId: number) =>
  `tracker_playhead_${sequenceId}_${rowId}`;

export const SongTrackerPlaybackController = ({
  scrollRef,
  sequenceLength,
}: SongTrackerPlaybackControllerProps) => {
  const playing = useAppSelector((state) => state.tracker.playing);
  const playbackPosition = useAppSelector(
    (state) => state.tracker.playbackPosition,
  );

  const playbackSequence = playbackPosition[0];
  const playbackRow = playbackPosition[1];

  const previousPlaybackCellRef = useRef<HTMLElement | null>(null);
  const scrollRafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      previousPlaybackCellRef.current?.removeAttribute("data-playing");
      if (scrollRafRef.current !== undefined) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (playbackSequence >= sequenceLength) {
      API.music.sendToMusicWindow({
        action: "position",
        position: [0, 0],
      });
    }
  }, [playbackSequence, sequenceLength]);

  useLayoutEffect(() => {
    previousPlaybackCellRef.current?.removeAttribute("data-playing");

    const nextPlaybackCell = document.getElementById(
      getPlaybackRowCellId(playbackSequence, playbackRow),
    );

    if (nextPlaybackCell instanceof HTMLElement) {
      nextPlaybackCell.setAttribute("data-playing", "true");
      previousPlaybackCellRef.current = nextPlaybackCell;
    } else {
      previousPlaybackCellRef.current = null;
    }
  }, [playbackRow, playbackSequence]);

  useLayoutEffect(() => {
    if (!playing) {
      return;
    }

    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      return;
    }

    const patternHeight =
      TRACKER_HEADER_HEIGHT + TRACKER_CELL_HEIGHT * TRACKER_PATTERN_LENGTH;
    const playheadTop =
      playbackSequence * patternHeight +
      TRACKER_HEADER_HEIGHT +
      playbackRow * TRACKER_CELL_HEIGHT;
    const viewportHeight = scrollEl.clientHeight;
    const followMarginTop = TRACKER_HEADER_HEIGHT + TRACKER_CELL_HEIGHT * 2;
    const followMarginBottom = TRACKER_CELL_HEIGHT * 3;
    const visibleTop = scrollEl.scrollTop + followMarginTop;
    const visibleBottom = scrollEl.scrollTop + viewportHeight - followMarginBottom;

    if (playheadTop >= visibleTop && playheadTop <= visibleBottom) {
      return;
    }

    const scrollHeight =
      sequenceLength * patternHeight + TRACKER_HEADER_HEIGHT;
    const maxScrollTop = Math.max(0, scrollHeight - viewportHeight);
    const nextScrollTop = Math.max(
      0,
      Math.min(playheadTop - viewportHeight * 0.5, maxScrollTop),
    );

    if (scrollRafRef.current !== undefined) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollEl.scrollTop = nextScrollTop;
    });
  }, [playbackRow, playbackSequence, playing, scrollRef, sequenceLength]);

  return null;
};
