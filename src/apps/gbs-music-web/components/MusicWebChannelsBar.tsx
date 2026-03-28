import React from "react";
import {
  StyledMobileToolbar,
  StyledMobileToolbarButton,
} from "gbs-music-web/components/style";
import { channels } from "shared/lib/music/constants";
import styled, { css } from "styled-components";
import { DutyIcon, WaveIcon, NoiseIcon, SettingsIcon } from "ui/icons/Icons";

const StyledChannelIcon = styled.div<{ channel: number }>`
  display: flex;
  align-items: center;
  justify-content: center;

  && svg {
    fill: ${(props) => props.theme.colors.highlight};
    width: 20px;
    height: 20px;

    ${(props) =>
      props.channel === 0 &&
      css`
        fill: rgb(71, 153, 190);
      `}
    ${(props) =>
      props.channel === 1 &&
      css`
        fill: #4375c8;
      `}
    ${(props) =>
      props.channel === 2 &&
      css`
        fill: #3f5bc8;
      `}
    ${(props) =>
      props.channel === 3 &&
      css`
        fill: #3d3dcd;
      `}
  }
`;

const StyledChannelLabel = styled.div`
  margin-top: 3px;
  font-size: 11px;
`;

export const MusicWebChannelsBar = () => {
  return (
    <StyledMobileToolbar>
      {channels.map((channel) => (
        <StyledMobileToolbarButton>
          <StyledChannelIcon channel={channel.index}>
            {channel.type === "duty" && <DutyIcon />}
            {channel.type === "wave" && <WaveIcon />}
            {channel.type === "noise" && <NoiseIcon />}
          </StyledChannelIcon>
          <StyledChannelLabel>{channel.name}</StyledChannelLabel>
        </StyledMobileToolbarButton>
      ))}

      <StyledMobileToolbarButton>
        <SettingsIcon />
        <StyledChannelLabel>Config</StyledChannelLabel>
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
