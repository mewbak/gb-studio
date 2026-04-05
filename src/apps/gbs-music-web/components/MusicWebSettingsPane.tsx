import React, { useCallback, useContext } from "react";
import { SongMetadataEditor } from "components/music/sidebar/SongMetadataEditor";
import { Button } from "ui/buttons/Button";
import {
  CaretRightIcon,
  HelpIcon,
  PianoIcon,
  PianoInverseIcon,
  TrackerIcon,
  UndoIcon,
} from "ui/icons/Icons";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerActions from "store/features/tracker/trackerActions";
import styled, { ThemeContext } from "styled-components";
import { FormDivider, FormRow } from "ui/form/layout/FormLayout";
import { Label } from "ui/form/Label";
import l10n from "shared/lib/lang/l10n";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import { TRACKER_UNDO } from "consts";
import {
  ToggleButtonGroup,
  ToggleButtonGroupWrapper,
} from "ui/form/ToggleButtonGroup";
import { TrackerViewType } from "store/features/tracker/trackerState";
import {
  StyledMobileListMenu,
  StyledMobileListMenuItem,
  StyledMobileListMenuCaret,
} from "gbs-music-web/components/style";

const StyledViewSelection = styled.div`
  padding-top: 10px;
  width: 100%;
  ${ToggleButtonGroupWrapper} {
    width: 100%;
    height: 70px;
  }
`;

const StyledViewButtonLabel = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  svg {
    min-width: 25px;
    min-height: 25px;
    margin-bottom: 5px;
  }
`;

export const MusicWebSettingPane = () => {
  const dispatch = useAppDispatch();

  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const view = useAppSelector((state) => state.tracker.view);

  const setView = useCallback(
    (view: TrackerViewType) => {
      dispatch(trackerActions.setViewAndSave(view));
      dispatch(trackerActions.setMobileOverlayView("none"));
    },
    [dispatch],
  );

  const themeContext = useContext(ThemeContext);

  const themePianoIcon =
    themeContext?.type === "light" ? <PianoIcon /> : <PianoInverseIcon />;

  if (!song) {
    return null;
  }

  return (
    <div>
      <SongMetadataEditor />

      <StyledViewSelection>
        <FormRow>
          <Label>{l10n("MENU_VIEW")}</Label>
        </FormRow>
        <FormRow>
          <ToggleButtonGroup
            name="view"
            value={view}
            options={[
              {
                value: "roll",
                label: (
                  <StyledViewButtonLabel>
                    {view === "roll" ? <PianoInverseIcon /> : themePianoIcon}
                    {l10n("FIELD_PIANO_ROLL")}
                  </StyledViewButtonLabel>
                ),
                title: l10n("FIELD_PIANO_ROLL"),
              },
              {
                value: "tracker",
                label: (
                  <StyledViewButtonLabel>
                    <TrackerIcon />
                    {l10n("FIELD_TRACKER")}
                  </StyledViewButtonLabel>
                ),
                title: l10n("FIELD_TRACKER"),
              },
            ]}
            onChange={setView}
          ></ToggleButtonGroup>
        </FormRow>
      </StyledViewSelection>

      <FormDivider />

      <StyledMobileListMenu>
        <StyledMobileListMenuItem
          onClick={() => {
            dispatch(trackerActions.setMobileOverlayView("instrumentsList"));
          }}
        >
          <span>{l10n("FIELD_EDIT_INSTRUMENTS")}</span>
          <StyledMobileListMenuCaret>
            <CaretRightIcon />
          </StyledMobileListMenuCaret>
        </StyledMobileListMenuItem>
        <StyledMobileListMenuItem
          onClick={() => {
            dispatch(trackerActions.setMobileOverlayView("sequence"));
          }}
        >
          <span>{l10n("FIELD_EDIT_PATTERN_ORDER")}</span>
          <StyledMobileListMenuCaret>
            <CaretRightIcon />
          </StyledMobileListMenuCaret>
        </StyledMobileListMenuItem>
      </StyledMobileListMenu>

      <FixedSpacer height={10} />
      <FormDivider />

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
