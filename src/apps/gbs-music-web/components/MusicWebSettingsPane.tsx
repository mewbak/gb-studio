import React, { useCallback, useContext } from "react";
import { SongMetadataEditor } from "components/music/sidebar/SongMetadataEditor";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import {
  CaretRightIcon,
  HelpIcon,
  PianoIcon,
  PianoInverseIcon,
  RedoIcon,
  TrackerIcon,
  UndoIcon,
} from "ui/icons/Icons";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerActions from "store/features/tracker/trackerActions";
import styled, { css, ThemeContext } from "styled-components";
import { FormField, FormRow } from "ui/form/layout/FormLayout";
import { Label } from "ui/form/Label";
import { SidebarColumn } from "ui/sidebars/Sidebar";
import l10n from "shared/lib/lang/l10n";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import { getBPM } from "components/music/helpers";
import {
  InputGroup,
  InputGroupAppend,
  InputGroupLabel,
} from "ui/form/InputGroup";
import { NumberInput } from "ui/form/NumberInput";
import { castEventToInt } from "renderer/lib/helpers/castEventValue";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { Song } from "shared/lib/uge/types";
import { StyledButtonGroup } from "ui/buttons/style";
import { TRACKER_UNDO } from "consts";

const ViewButtonLabel = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;

  svg {
    margin-right: 10px;
    min-width: 20px;
    min-height: 20px;
  }

  ${(props) =>
    props.$isActive &&
    css`
    svg {
        fill: ${props.theme.colors.highlightText}
    `}
`;

const StyledMenuItem = styled.div`
  background: ${(props) => props.theme.colors.input.background};
  color: ${(props) => props.theme.colors.input.text};
  border-bottom: 1px solid ${(props) => props.theme.colors.input.border};
  height: 50px;
  font-size: 14px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  font-weight: bold;

  span {
    flex-grow: 1;
  }

  ${InputGroup} {
    width: 50%;
  }

  ${StyledButtonGroup} {
    width: 50%;
  }
`;

const StyledMenuCaret = styled.div`
  svg {
    fill: ${(props) => props.theme.colors.text};
    opacity: 0.5;
    width: 16px;
  }
`;

export const MusicWebSettingPane = () => {
  const dispatch = useAppDispatch();

  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const onChangeSongProp = useCallback(
    <K extends keyof Song>(key: K, value: Song[K]) => {
      dispatch(
        trackerDocumentActions.editSong({
          changes: {
            [key]: value,
          },
        }),
      );
    },
    [dispatch],
  );

  const onChangeName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeSongProp("name", e.currentTarget.value),
    [onChangeSongProp],
  );

  const onChangeArtist = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeSongProp("artist", e.currentTarget.value),
    [onChangeSongProp],
  );

  const onChangeTicksPerRow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChangeSongProp("ticks_per_row", castEventToInt(e, 0)),
    [onChangeSongProp],
  );

  const view = useAppSelector((state) => state.tracker.view);

  const setTrackerView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("tracker"));
  }, [dispatch]);

  const setRollView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("roll"));
  }, [dispatch]);

  const themeContext = useContext(ThemeContext);

  const themePianoIcon =
    themeContext?.type === "light" ? <PianoIcon /> : <PianoInverseIcon />;

  if (!song) {
    return null;
  }

  return (
    <div>
      <SongMetadataEditor />

      {/* <StyledMenuItem>
        <span>Tempo (Ticks Per Row)</span>
        <InputGroup>
          <NumberInput
            id="ticks_per_row"
            name="ticks_per_row"
            type="number"
            value={song?.ticks_per_row}
            min={1}
            max={20}
            placeholder="1"
            onChange={onChangeTicksPerRow}
            title={l10n("FIELD_TEMPO_TOOLTIP")}
          />
          <InputGroupAppend>
            <InputGroupLabel
              htmlFor="ticks_per_row"
              style={{ minWidth: 70, justifyContent: "flex-end" }}
            >
              ~{Math.round(getBPM(song.ticks_per_row))} BPM
            </InputGroupLabel>
          </InputGroupAppend>
        </InputGroup>
      </StyledMenuItem> */}

      <StyledMenuItem>
        <span>View</span>
        <ButtonGroup>
          <Button
            variant={view === "roll" ? "primary" : "normal"}
            onClick={setRollView}
          >
            <ViewButtonLabel $isActive={view === "roll"}>
              {view === "roll" ? <PianoInverseIcon /> : themePianoIcon}
              Piano Roll
            </ViewButtonLabel>
          </Button>
          <Button
            variant={view === "tracker" ? "primary" : "normal"}
            onClick={setTrackerView}
          >
            <ViewButtonLabel $isActive={view === "tracker"}>
              <TrackerIcon />
              Tracker
            </ViewButtonLabel>
          </Button>
        </ButtonGroup>
      </StyledMenuItem>

      <StyledMenuItem
        onClick={() => {
          dispatch(trackerActions.setMobileOverlayView("instruments"));
        }}
      >
        <span>Edit Instruments</span>
        <StyledMenuCaret>
          <CaretRightIcon />
        </StyledMenuCaret>
      </StyledMenuItem>
      <StyledMenuItem
        onClick={() => {
          dispatch(trackerActions.setMobileOverlayView("sequence"));
        }}
      >
        <span>Edit Pattern Order</span>
        <StyledMenuCaret>
          <CaretRightIcon />
        </StyledMenuCaret>
      </StyledMenuItem>
      <FixedSpacer height={20} />

      <FormRow>
        <Button variant="transparent">
          <HelpIcon />
          <FixedSpacer width={10} />
          {l10n("MENU_HELP")}
        </Button>
        <FlexGrow />
        <Button
          variant="transparent"
          onClick={() => {
            dispatch({ type: TRACKER_UNDO });
            dispatch(trackerActions.setMobileOverlayView("none"));
          }}
        >
          <UndoIcon />
          <FixedSpacer width={10} />
          {l10n("MENU_UNDO")}
        </Button>
      </FormRow>
    </div>
  );
};
