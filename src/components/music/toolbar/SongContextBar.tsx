import React from "react";
import styled from "styled-components";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { Slider } from "ui/form/Slider";
import { PianoIcon, PlayIcon, StopIcon, TrackerIcon } from "ui/icons/Icons";
import { FixedSpacer } from "ui/spacing/Spacing";

const StyledSongContextBar = styled.div`
  display: flex;
  align-items: center;
  width: 300px;
`;

const StyledSongContextBarTimer = styled.div`
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  font-family: "Public Pixel", monospace;
  background: #212228;
  color: #828891;
  height: 30px;
  padding: 0 20px;
  border: 1px solid ${(props) => props.theme.colors.toolbar.border};
  border-radius: 8px;
  overflow: hidden;
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 20px;
    mix-blend-mode: overlay;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0) 100%
    );
  }
`;

export const SongContextBar = () => {
  return (
    <StyledSongContextBar>
      <ButtonGroup>
        <Button>
          <PlayIcon />
        </Button>
        <Button>
          <StopIcon />
        </Button>
      </ButtonGroup>
      <FixedSpacer width={10} />
      <StyledSongContextBarTimer>00:00</StyledSongContextBarTimer>
      <FixedSpacer width={10} />
      <ButtonGroup>
        <Button variant="primary">
          <PianoIcon />
        </Button>
        <Button>
          <TrackerIcon />
        </Button>
      </ButtonGroup>
    </StyledSongContextBar>
  );
};
