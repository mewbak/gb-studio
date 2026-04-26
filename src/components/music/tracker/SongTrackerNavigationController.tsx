import { RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { TRACKER_PATTERN_LENGTH, TRACKER_ROW_SIZE } from "consts";
import { useAppSelector } from "store/hooks";
import {
  TRACKER_CELL_HEIGHT,
  TRACKER_HEADER_HEIGHT,
  TRACKER_INDEX_WIDTH,
} from "./helpers";

const PATTERN_FIELD_COUNT = TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE;
const TRACKER_PATTERN_HEIGHT =
  TRACKER_HEADER_HEIGHT + TRACKER_CELL_HEIGHT * TRACKER_PATTERN_LENGTH;

interface SongTrackerNavigationControllerProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  tableRef: RefObject<HTMLDivElement | null>;
  activeFieldRef: RefObject<HTMLSpanElement | null>;
  hasHadFocusRef: RefObject<boolean>;
}

export const SongTrackerNavigationController = ({
  scrollRef,
  tableRef,
  activeFieldRef,
  hasHadFocusRef,
}: SongTrackerNavigationControllerProps) => {
  const playing = useAppSelector((state) => state.tracker.playing);
  const activeField = useAppSelector(
    (state) => state.tracker.trackerActiveField,
  );
  const selectedSequenceId = useAppSelector((state) =>
    !state.tracker.playing ? state.tracker.selectedSequence : -1,
  );

  const lastSelectedSequenceId = useRef(selectedSequenceId);
  const suppressActiveFieldScrollRef = useRef(false);

  const activeSequenceId =
    activeField !== undefined
      ? Math.floor(activeField / PATTERN_FIELD_COUNT)
      : selectedSequenceId;

  useLayoutEffect(() => {
    if (
      !playing &&
      selectedSequenceId !== -1 &&
      selectedSequenceId !== lastSelectedSequenceId.current
    ) {
      suppressActiveFieldScrollRef.current = true;
    }
  }, [playing, selectedSequenceId]);

  useLayoutEffect(() => {
    if (!hasHadFocusRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      tableRef.current?.focus({ preventScroll: true });
    });
    tableRef.current?.focus({ preventScroll: true });
  }, [activeSequenceId, hasHadFocusRef, tableRef]);

  useLayoutEffect(() => {
    if (
      playing ||
      activeField === undefined ||
      !scrollRef.current ||
      !activeFieldRef.current
    ) {
      return;
    }

    if (suppressActiveFieldScrollRef.current) {
      suppressActiveFieldScrollRef.current = false;
      return;
    }

    const scrollEl = scrollRef.current;
    const fieldEl = activeFieldRef.current;
    const scrollRect = scrollEl.getBoundingClientRect();
    const fieldRect = fieldEl.getBoundingClientRect();

    const visibleTop = scrollRect.top + TRACKER_HEADER_HEIGHT;
    const visibleBottom = scrollRect.bottom - 30;
    const visibleLeft = scrollRect.left + TRACKER_INDEX_WIDTH + 30;
    const visibleRight = scrollRect.right - 30;

    if (fieldRect.top < visibleTop) {
      scrollEl.scrollTop -= visibleTop - fieldRect.top;
    } else if (fieldRect.bottom > visibleBottom) {
      scrollEl.scrollTop += fieldRect.bottom - visibleBottom;
    }

    if (fieldRect.left < visibleLeft) {
      scrollEl.scrollLeft -= visibleLeft - fieldRect.left;
    } else if (fieldRect.right > visibleRight) {
      scrollEl.scrollLeft += fieldRect.right - visibleRight;
    }
  }, [playing, activeField, activeFieldRef, scrollRef]);

  useEffect(() => {
    if (
      playing ||
      selectedSequenceId === -1 ||
      selectedSequenceId === lastSelectedSequenceId.current ||
      !scrollRef.current
    ) {
      return;
    }

    const scrollEl = scrollRef.current;
    const maxScrollTop = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    const nextScrollTop = Math.max(
      0,
      Math.min(selectedSequenceId * TRACKER_PATTERN_HEIGHT, maxScrollTop),
    );

    scrollEl.scrollTo({
      top: nextScrollTop,
      behavior: "smooth",
    });
  }, [playing, selectedSequenceId, scrollRef]);

  useEffect(() => {
    if (selectedSequenceId !== -1) {
      lastSelectedSequenceId.current = selectedSequenceId;
    }
  }, [selectedSequenceId]);

  return null;
};
