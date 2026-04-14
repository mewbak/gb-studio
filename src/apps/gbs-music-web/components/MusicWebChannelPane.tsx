import { InstrumentSelect } from "components/music/form/InstrumentSelect";
import {
  channelIdToInstrumentType,
  getL10NChannelName,
} from "shared/lib/uge/display";
import React, { useCallback, useMemo } from "react";
import API from "renderer/lib/api";
import l10n from "shared/lib/lang/l10n";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import styled from "styled-components";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { StyledButton } from "ui/buttons/style";
import { InputGroup, InputGroupAppend } from "ui/form/InputGroup";
import { Label } from "ui/form/Label";
import { FormField } from "ui/form/layout/FormLayout";
import {
  Duty1Icon,
  Duty2Icon,
  Wave3Icon,
  Noise4Icon,
  ChannelMuteIcon,
  ChannelSoloIcon,
  InstrumentIcon,
} from "ui/icons/Icons";

const StyledChannelPane = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 10px;
  padding-bottom: 10px;
`;

const StyledChannelHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  span {
    flex-grow: 1;
    font-size: 16px;
  }
  ${StyledButton} {
    min-width: 40px;
  }
`;

const StyledChannelIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 10px;

  && svg {
    background: ${(props) => props.theme.colors.input.background};
    border: 1px solid ${(props) => props.theme.colors.input.border};
    border-radius: 4px;
    padding: 4px;
    width: 40px;
    height: 40px;
    fill: ${(props) => props.theme.colors.text};
  }
`;

export const MusicWebChannelPane = () => {
  const dispatch = useAppDispatch();
  const channelId = useAppSelector((state) => state.tracker.selectedChannel);
  const channelStatus = useAppSelector((state) => state.tracker.channelStatus);
  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  const soloChannel = useMemo(() => {
    const firstUnmuted = channelStatus.findIndex((x) => !x);
    const lastUnmuted = channelStatus.findLastIndex((x) => !x);
    if (firstUnmuted !== -1 && firstUnmuted === lastUnmuted) {
      return firstUnmuted;
    }
    return -1;
  }, [channelStatus]);

  const muted = channelStatus[channelId] && soloChannel === -1;
  const solo = soloChannel === channelId;

  const setMute = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      API.music.sendToMusicWindow({
        action: "set-mute",
        channel: channelId,
        muted: !muted,
      });
    },
    [muted, channelId],
  );

  const setSolo = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(trackerActions.setSelectedChannel(channelId));
      API.music.sendToMusicWindow({
        action: "set-solo",
        channel: channelId,
        enabled: !solo,
      });
    },
    [channelId, dispatch, solo],
  );

  const setSelectedInstrumentId = useCallback(
    (instrument: number) => {
      dispatch(trackerActions.setSelectedInstrumentId(instrument));
    },
    [dispatch],
  );

  const onViewInstrument = useCallback(() => {
    dispatch(
      trackerActions.setSelectedInstrument({
        id: String(selectedInstrumentId),
        type: channelIdToInstrumentType(channelId),
      }),
    );
    dispatch(trackerActions.setSidebarView("instrument"));
    dispatch(trackerActions.setMobileOverlayView("instrument"));
  }, [channelId, dispatch, selectedInstrumentId]);

  return (
    <StyledChannelPane>
      <StyledChannelHeader>
        <StyledChannelIcon>
          {channelId === 0 && <Duty1Icon />}
          {channelId === 1 && <Duty2Icon />}
          {channelId === 2 && <Wave3Icon />}
          {channelId === 3 && <Noise4Icon />}
        </StyledChannelIcon>
        <span>
          {l10n("FIELD_CHANNELS")}
          {" / "}
          {getL10NChannelName(channelId)}
        </span>
        <ButtonGroup>
          <Button
            size="small"
            onClick={setSolo}
            variant={solo ? "primary" : "normal"}
            title={l10n("FIELD_SOLO_CHANNEL")}
          >
            <ChannelSoloIcon />
          </Button>
          <Button
            size="small"
            onClick={setMute}
            variant={muted ? "primary" : "normal"}
            title={l10n("FIELD_MUTE_CHANNEL")}
          >
            <ChannelMuteIcon />
          </Button>
        </ButtonGroup>
      </StyledChannelHeader>
      <FormField name={"selectedInstrumentId"}>
        <Label htmlFor="selectedInstrumentId">{l10n("FIELD_INSTRUMENT")}</Label>
        <InputGroup>
          <InstrumentSelect
            name={"selectedInstrumentId"}
            value={selectedInstrumentId}
            onChange={setSelectedInstrumentId}
            previewNoteOnChange
          />
          <InputGroupAppend>
            <Button
              onClick={onViewInstrument}
              title={l10n("FIELD_EDIT_INSTRUMENT")}
            >
              <InstrumentIcon />
            </Button>
          </InputGroupAppend>
        </InputGroup>
      </FormField>
    </StyledChannelPane>
  );
};
