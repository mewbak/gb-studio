import React, { useMemo } from "react";
import {
  StyledMobileToolbar,
  StyledMobileToolbarButton,
  StyledMobileToolbarDivider,
} from "gbs-music-web/components/ui/style";
import { channels } from "shared/lib/music/constants";
import styled from "styled-components";
import {
  SettingsIcon,
  FXIcon,
  Duty1Icon,
  Duty2Icon,
  Noise4Icon,
  Wave3Icon,
  ChannelSoloIcon,
  ChannelMuteIcon,
} from "ui/icons/Icons";
import { useAppSelector } from "store/hooks";

const StyledChannelIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  && svg {
    width: 20px;
    height: 20px;
  }
`;

const StyledChannelStatusIcon = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
  && svg {
    width: 12px;
    height: 12px;
    min-width: 12px;
    min-width: 12px;
    fill: ${(props) => props.theme.colors.highlight};
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
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const selectedPatternCellsLength = useAppSelector(
    (state) => state.tracker.selectedPatternCells.length,
  );

  const channelStatus = useAppSelector((state) => state.tracker.channelStatus);

  const soloChannel = useMemo(() => {
    const firstUnmuted = channelStatus.findIndex((x) => !x);
    const lastUnmuted = channelStatus.findLastIndex((x) => !x);
    if (firstUnmuted !== -1 && firstUnmuted === lastUnmuted) {
      return firstUnmuted;
    }
    return -1;
  }, [channelStatus]);

  return (
    <StyledMobileToolbar>
      {channels.map((channel) => (
        <StyledMobileToolbarButton
          $isActive={selectedChannel === channel.index}
          onClick={() => {
            onOpenChannel(channel.index);
          }}
        >
          <StyledChannelIcon>
            {channel.index === 0 && <Duty1Icon />}
            {channel.index === 1 && <Duty2Icon />}
            {channel.index === 2 && <Wave3Icon />}
            {channel.index === 3 && <Noise4Icon />}
          </StyledChannelIcon>
          {channel.index === soloChannel && (
            <StyledChannelStatusIcon>
              <ChannelSoloIcon />
            </StyledChannelStatusIcon>
          )}
          {!!(soloChannel === -1 && channelStatus[channel.index]) && (
            <StyledChannelStatusIcon>
              <ChannelMuteIcon />
            </StyledChannelStatusIcon>
          )}
        </StyledMobileToolbarButton>
      ))}

      <StyledMobileToolbarDivider />

      <StyledMobileToolbarButton
        $isAvailable={selectedPatternCellsLength > 0}
        onClick={selectedPatternCellsLength > 0 ? onOpenFX : undefined}
      >
        <FXIcon />
      </StyledMobileToolbarButton>

      <StyledMobileToolbarButton onClick={onOpenSettings}>
        <SettingsIcon />
      </StyledMobileToolbarButton>
    </StyledMobileToolbar>
  );
};
