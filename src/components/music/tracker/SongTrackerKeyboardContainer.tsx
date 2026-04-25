import React from "react";
import { TRACKER_PATTERN_LENGTH, TRACKER_ROW_SIZE } from "consts";
import { useAppSelector } from "store/hooks";
import { getFieldColumnFocus } from "./helpers";
import {
  TrackerKeyboard,
  VirtualTrackerKey,
} from "components/music/tracker/TrackerKeyboard";

const PATTERN_FIELD_COUNT = TRACKER_PATTERN_LENGTH * TRACKER_ROW_SIZE;

interface SongTrackerKeyboardContainerProps {
  octaveOffset: number;
  open: boolean;
  onKeyPressed: (virtualKey: VirtualTrackerKey) => void;
}

export const SongTrackerKeyboardContainer = ({
  octaveOffset,
  open,
  onKeyPressed,
}: SongTrackerKeyboardContainerProps) => {
  const fieldType = useAppSelector((state) =>
    getFieldColumnFocus(
      state.tracker.trackerActiveField !== undefined
        ? state.tracker.trackerActiveField % PATTERN_FIELD_COUNT
        : 0,
    ),
  );

  return (
    <TrackerKeyboard
      type="pattern"
      fieldType={fieldType}
      octaveOffset={octaveOffset}
      open={open}
      onKeyPressed={onKeyPressed}
    />
  );
};
