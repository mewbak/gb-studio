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

const StyledMenuItems = styled.div`
  margin: 0 10px;
  > :first-child {
    border-top: 1px solid ${(props) => props.theme.colors.input.border};
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
  > :last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const StyledMenuItem = styled.div`
  background: ${(props) => props.theme.colors.input.background};
  color: ${(props) => props.theme.colors.input.text};
  border-left: 1px solid ${(props) => props.theme.colors.input.border};
  border-right: 1px solid ${(props) => props.theme.colors.input.border};
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
                    Piano Roll
                  </StyledViewButtonLabel>
                ),
                title: "Piano Roll",
              },
              {
                value: "tracker",
                label: (
                  <StyledViewButtonLabel>
                    <TrackerIcon />
                    Tracker
                  </StyledViewButtonLabel>
                ),
                title: "Tracker",
              },
            ]}
            onChange={setView}
          ></ToggleButtonGroup>
        </FormRow>
      </StyledViewSelection>

      <FormDivider />

      <StyledMenuItems>
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
      </StyledMenuItems>

      <FixedSpacer height={10} />
      <FormDivider />

      {/* <FixedSpacer height={20} /> */}

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
