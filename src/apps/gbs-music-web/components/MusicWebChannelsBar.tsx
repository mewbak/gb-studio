import React from "react";
import {
  StyledMobileToolbar,
  StyledMobileToolbarButton,
} from "gbs-music-web/components/style";
import { channels } from "shared/lib/music/constants";
import styled, { css } from "styled-components";
import { DutyIcon, WaveIcon, NoiseIcon, SettingsIcon } from "ui/icons/Icons";
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

const StyledChannelLabel = styled.div`
  margin-top: 3px;
  font-size: 11px;
`;

export const MusicWebChannelsBar = () => {
  const dispatch = useAppDispatch();
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  return (
    <StyledMobileToolbar>
      {channels.map((channel) => (
        <StyledMobileToolbarButton
          $isActive={selectedChannel === channel.index}
          onClick={() => {
            dispatch(trackerActions.setSelectedChannel(channel.index));
          }}
        >
          <StyledChannelIcon channel={channel.index}>
            {channel.type === "duty" && <DutyIcon />}
            {channel.type === "wave" && <WaveIcon />}
            {channel.type === "noise" && <NoiseIcon />}
          </StyledChannelIcon>
          {/* <StyledChannelLabel>{channel.name}</StyledChannelLabel> */}
        </StyledMobileToolbarButton>
      ))}

      <StyledMobileToolbarButton>
        <SettingsIcon />
        {/* <StyledChannelLabel>Config</StyledChannelLabel> */}
      </StyledMobileToolbarButton>

      {/* <StyledMobileToolbarButton
        $isActive={mobileView === "channels"}
        onClick={() => {
          setMobileView(mobileView !== "channels" ? "channels" : "none");
        }}
      >
        Channels
      </StyledMobileToolbarButton>
      <StyledMobileToolbarButton
        $isActive={mobileView === "instruments"}
        onClick={() => {
          setMobileView(mobileView !== "instruments" ? "instruments" : "none");
        }}
      >
        Instruments
      </StyledMobileToolbarButton>
      <StyledMobileToolbarButton
        $isActive={mobileView === "sequence"}
        onClick={() => {
          setMobileView(mobileView !== "sequence" ? "sequence" : "none");
        }}
      >
        Sequence
      </StyledMobileToolbarButton>
      <StyledMobileToolbarButton
        $isActive={mobileView === "notes"}
        onClick={() => {
          setMobileView(mobileView !== "notes" ? "notes" : "none");
        }}
      >
        Notes
      </StyledMobileToolbarButton> */}
      {/* <StyledMobileToolbarButton
                  $isActive={view === "tracker"}
                  onClick={() => {
                    setMobileView("none");
                    dispatch(
                      trackerActions.setView(
                        view === "tracker" ? "roll" : "tracker",
                      ),
                    );
                  }}
                >
                  Tracker
                </StyledMobileToolbarButton> */}
    </StyledMobileToolbar>
  );
};
