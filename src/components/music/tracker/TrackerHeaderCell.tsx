import React, { useCallback } from "react";
import API from "renderer/lib/api";
import {
  StyledTrackerHeaderCell,
  StyledTrackerHeaderCellContents,
} from "./style";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch } from "store/hooks";
import l10n from "shared/lib/lang/l10n";
import { ChannelMuteIcon, ChannelSoloIcon } from "ui/icons/Icons";
import { patternHue } from "shared/lib/uge/display";

interface TrackerHeaderCellProps {
  channel?: 0 | 1 | 2 | 3;
  type: "channel" | "patternIndex";
  children?: React.ReactNode;
  muted?: boolean;
  solo?: boolean;
  sequencePatternId?: number;
}

export const TrackerHeaderCell = ({
  type,
  children,
  muted,
  solo,
  channel,
  sequencePatternId,
}: TrackerHeaderCellProps) => {
  const dispatch = useAppDispatch();

  const onToggleMuteSolo = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (channel === undefined) {
        return;
      }
      if (e.button === 0) {
        API.music.sendToMusicWindow({
          action: "set-mute",
          channel: channel,
          muted: !muted,
        });
      } else if (e.button === 2) {
        API.music.sendToMusicWindow({
          action: "set-solo",
          channel: channel,
          enabled: true,
        });
      }
    },
    [muted, channel],
  );

  const setMute = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (channel === undefined) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      API.music.sendToMusicWindow({
        action: "set-mute",
        channel,
        muted: !muted,
      });
    },
    [muted, channel],
  );

  const setSolo = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (channel === undefined) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      dispatch(trackerActions.setSelectedChannel(channel));
      API.music.sendToMusicWindow({
        action: "set-solo",
        channel,
        enabled: !solo,
      });
    },
    [dispatch, channel, solo],
  );

  return (
    <StyledTrackerHeaderCell
      $type={type}
      $muted={muted}
      $solo={solo}
      onMouseDown={onToggleMuteSolo}
      style={
        sequencePatternId !== undefined
          ? {
              background: `linear-gradient(0deg, hsl(${patternHue(sequencePatternId)}deg 100% 70%) 0%, hsl(${patternHue(sequencePatternId)}deg 100% 80%) 100%)`,
              borderColor: `hsl(${patternHue(sequencePatternId)}deg 80% 50% / 30%)`,
            }
          : undefined
      }
    >
      <StyledTrackerHeaderCellContents>
        <span>{children}</span>
        {type === "channel" && (
          <ButtonGroup>
            <Button
              size="small"
              onMouseDown={setSolo}
              title={l10n("FIELD_SOLO_CHANNEL")}
            >
              <ChannelSoloIcon />
            </Button>
            <Button
              size="small"
              onMouseDown={setMute}
              title={l10n("FIELD_MUTE_CHANNEL")}
            >
              <ChannelMuteIcon />
            </Button>
          </ButtonGroup>
        )}
      </StyledTrackerHeaderCellContents>
    </StyledTrackerHeaderCell>
  );
};
