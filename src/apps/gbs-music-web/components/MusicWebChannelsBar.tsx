import React from "react";
import {
  StyledMobileToolbar,
  StyledMobileToolbarButton,
  StyledMobileToolbarDivider,
} from "gbs-music-web/components/style";
import { channels } from "shared/lib/music/constants";
import styled from "styled-components";
import {
  SettingsIcon,
  FXIcon,
  Duty1Icon,
  Duty2Icon,
  Noise4Icon,
  Wave3Icon,
} from "ui/icons/Icons";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerActions from "store/features/tracker/trackerActions";

const StyledChannelIcon = styled.div<{ channel: number }>`
  display: flex;
  align-items: center;
  justify-content: center;

  && svg {
    width: 20px;
    height: 20px;
  }
`;

interface MusicWebChannelsBarProps {
  onOpenChannel: (channelId: 0 | 1 | 2 | 3) => void;
  onOpenFX: () => void;
  onOpenSettings: () => void;
}

export const MusicWebChannelsBar = ({
  onOpenChannel,
  onOpenFX,
  onOpenSettings,
}: MusicWebChannelsBarProps) => {
  const dispatch = useAppDispatch();
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const selectedPatternCells = useAppSelector(
    (state) => state.tracker.selectedPatternCells,
  );

  return (
    <StyledMobileToolbar>
      {channels.map((channel) => (
        <StyledMobileToolbarButton
          $isActive={selectedChannel === channel.index}
          onPointerDown={() => {
            onOpenChannel(channel.index);
          }}
        >
          <StyledChannelIcon channel={channel.index}>
            {channel.index === 0 && <Duty1Icon />}
            {channel.index === 1 && <Duty2Icon />}
            {channel.index === 2 && <Wave3Icon />}
            {channel.index === 3 && <Noise4Icon />}
          </StyledChannelIcon>
        </StyledMobileToolbarButton>
      ))}

      <StyledMobileToolbarDivider />

      <StyledMobileToolbarButton
        $isAvailable={selectedPatternCells.length > 0}
        onClick={selectedPatternCells.length > 0 ? onOpenFX : undefined}
      >
        <FXIcon />
      </StyledMobileToolbarButton>

      <StyledMobileToolbarButton onClick={onOpenSettings}>
        <SettingsIcon />
      </StyledMobileToolbarButton>
    </StyledMobileToolbar>
  );
};
