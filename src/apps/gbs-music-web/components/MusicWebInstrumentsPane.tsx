import {
  StyledMobileCloseButton,
  StyledMobileListMenu,
  StyledMobileListMenuCaret,
  StyledMobileListMenuHeader,
  StyledMobileListMenuItem,
} from "gbs-music-web/components/ui/style";
import React from "react";
import l10n from "shared/lib/lang/l10n";
import { InstrumentType } from "shared/lib/music/types";
import {
  DutyInstrument,
  WaveInstrument,
  NoiseInstrument,
} from "shared/lib/uge/types";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import styled from "styled-components";
import {
  DutyIcon,
  WaveIcon,
  NoiseIcon,
  CaretRightIcon,
  CloseIcon,
} from "ui/icons/Icons";

const emptyDutyInstruments: DutyInstrument[] = [];
const emptyWaveInstruments: WaveInstrument[] = [];
const emptyNoiseInstruments: NoiseInstrument[] = [];

const StyledInstrumentSection = styled.div`
  margin-bottom: 10px;

  ${StyledMobileListMenuHeader} {
    position: sticky;
    top: 0px;
    background: ${(props) => props.theme.colors.sidebar.background};
    z-index: 1;

    svg {
      width: 22px;
      margin-right: 10px;
      fill: ${(props) => props.theme.colors.text};
    }
  }
`;

const StyledInstrumentItemDetails = styled.div`
  flex-grow: 1;
  margin-right: 10px;
  overflow: hidden;
  padding: 15px 10px;
  div {
    overflow: hidden;
    display: block;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 14px;
    margin-bottom: 1px;
  }
  span {
    font-size: 12px;
    overflow: hidden;
    display: block;
    white-space: nowrap;
    text-overflow: ellipsis;
    opacity: 0.5;
    font-weight: normal;
  }
`;

const StyledLabelColor = styled.div<{ $instrument?: number }>`
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 2px;
  border: 1px solid black;
  flex-shrink: 0;
  z-index: 0;
  font-size: 11px;
  background: ${(props) =>
    props.$instrument !== undefined
      ? `var(--instrument-${props.$instrument}-color)`
      : "black"};
  color: ${(props) =>
    props.$instrument !== undefined
      ? `var(--instrument-${props.$instrument}-text-color)`
      : "white"};

  &::before {
    content: "";
    position: absolute;
    bottom: 0px;
    left: 0px;
    right: 0px;
    height: 2px;
    background: rgba(0, 0, 0, 0.25);
  }
  &::after {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    height: 2px;
    background: rgba(255, 255, 255, 0.6);
    mix-blend-mode: overlay;
  }

  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    width: 14px;
    fill: ${(props) =>
      props.$instrument !== undefined
        ? `var(--instrument-${props.$instrument}-text-color)`
        : "white"};
    fill: rgba(0, 0, 0, 0.6);
    mix-blend-mode: overlay;
  }
  font-weight: normal;
`;

const getDutyInfo = (instrument: DutyInstrument): string => {
  const infoParts: string[] = [];
  if (instrument.dutyCycle === 0) {
    infoParts.push(`${l10n("FIELD_DUTY_CYCLE")} 12.5%`);
  } else if (instrument.dutyCycle === 1) {
    infoParts.push(`${l10n("FIELD_DUTY_CYCLE")} 25%`);
  } else if (instrument.dutyCycle === 2) {
    infoParts.push(`${l10n("FIELD_DUTY_CYCLE")} 50%`);
  } else if (instrument.dutyCycle === 3) {
    infoParts.push(`${l10n("FIELD_DUTY_CYCLE")} 75%`);
  }
  if (instrument.subpatternEnabled) {
    infoParts.push(l10n("FIELD_SUBPATTERN_ENABLED"));
  }
  return infoParts.join(", ");
};

const getWaveInfo = (instrument: WaveInstrument): string => {
  const infoParts: string[] = [];
  infoParts.push(`${l10n("FIELD_WAVEFORM")} ${instrument.waveIndex}`);
  if (instrument.subpatternEnabled) {
    infoParts.push(l10n("FIELD_SUBPATTERN_ENABLED"));
  }
  return infoParts.join(", ");
};

const getNoiseInfo = (instrument: NoiseInstrument): string => {
  const infoParts: string[] = [];
  if (instrument.bitCount === 7) {
    infoParts.push(l10n("FIELD_BIT_COUNT"));
  }
  if (instrument.subpatternEnabled) {
    infoParts.push(l10n("FIELD_SUBPATTERN_ENABLED"));
  }
  return infoParts.join(", ");
};

const getNextChannel = (
  type: InstrumentType,
  currentChannel: 0 | 1 | 2 | 3,
): 0 | 1 | 2 | 3 => {
  if (type === "wave") {
    return 2;
  }
  if (type === "noise") {
    return 3;
  }
  return currentChannel === 1 ? 1 : 0;
};

type InstrumentRowProps =
  | {
      type: "duty";
      instrument: DutyInstrument;
    }
  | {
      type: "wave";
      instrument: WaveInstrument;
    }
  | {
      type: "noise";
      instrument: NoiseInstrument;
    };

const InstrumentRow = ({ type, instrument }: InstrumentRowProps) => {
  const dispatch = useAppDispatch();

  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );

  let info: string;
  let defaultName: string;

  switch (type) {
    case "duty":
      info = getDutyInfo(instrument);
      defaultName = `Duty ${String(instrument.index + 1).padStart(2, "0")}`;
      break;
    case "wave":
      info = getWaveInfo(instrument);
      defaultName = `Wave ${String(instrument.index + 1).padStart(2, "0")}`;
      break;
    case "noise":
      info = getNoiseInfo(instrument);
      defaultName = `Noise ${String(instrument.index + 1).padStart(2, "0")}`;
      break;
  }

  const onClick = () => {
    dispatch(trackerActions.setSelectedInstrumentId(instrument.index));
    dispatch(
      trackerActions.setSelectedInstrument({
        id: String(instrument.index),
        type,
      }),
    );
    dispatch(
      trackerActions.setSelectedChannel(getNextChannel(type, selectedChannel)),
    );
    dispatch(trackerActions.setMobileOverlayView("instrument"));
  };

  return (
    <StyledMobileListMenuItem onClick={onClick}>
      <StyledLabelColor $instrument={instrument.index}>
        {String(instrument.index + 1).padStart(2, "0")}
      </StyledLabelColor>

      <StyledInstrumentItemDetails>
        <div>{instrument.name || defaultName}</div>
        <span>{info}</span>
      </StyledInstrumentItemDetails>

      <StyledMobileListMenuCaret>
        <CaretRightIcon />
      </StyledMobileListMenuCaret>
    </StyledMobileListMenuItem>
  );
};

export const MusicWebInstrumentsPane = () => {
  const dispatch = useAppDispatch();

  const dutyInstruments = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.dutyInstruments ??
      emptyDutyInstruments,
  );

  const waveInstruments = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.waveInstruments ??
      emptyWaveInstruments,
  );

  const noiseInstruments = useAppSelector(
    (state) =>
      state.trackerDocument.present.song?.noiseInstruments ??
      emptyNoiseInstruments,
  );

  return (
    <>
      <StyledInstrumentSection>
        <StyledMobileCloseButton
          onClick={() => {
            dispatch(trackerActions.setMobileOverlayView("none"));
          }}
        >
          <CloseIcon />
        </StyledMobileCloseButton>

        <StyledMobileListMenuHeader>
          <DutyIcon /> Duty
        </StyledMobileListMenuHeader>
        <StyledMobileListMenu>
          {dutyInstruments.map((instrument) => (
            <InstrumentRow
              key={instrument.index}
              type="duty"
              instrument={instrument}
            />
          ))}
        </StyledMobileListMenu>
      </StyledInstrumentSection>
      <StyledInstrumentSection>
        <StyledMobileListMenuHeader>
          <WaveIcon />
          Wave
        </StyledMobileListMenuHeader>
        <StyledMobileListMenu>
          {waveInstruments.map((instrument) => (
            <InstrumentRow
              key={instrument.index}
              type="wave"
              instrument={instrument}
            />
          ))}
        </StyledMobileListMenu>
      </StyledInstrumentSection>
      <StyledInstrumentSection>
        <StyledMobileListMenuHeader>
          <NoiseIcon /> Noise
        </StyledMobileListMenuHeader>
        <StyledMobileListMenu>
          {noiseInstruments.map((instrument) => (
            <InstrumentRow
              key={instrument.index}
              type="noise"
              instrument={instrument}
            />
          ))}
        </StyledMobileListMenu>
      </StyledInstrumentSection>
    </>
  );
};
