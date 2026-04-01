import React, { useCallback, useContext } from "react";
import { SongMetadataEditor } from "components/music/sidebar/SongMetadataEditor";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import {
  CaretRightIcon,
  PianoIcon,
  PianoInverseIcon,
  TrackerIcon,
} from "ui/icons/Icons";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerActions from "store/features/tracker/trackerActions";
import styled, { css, ThemeContext } from "styled-components";
import { FormField, FormRow } from "ui/form/layout/FormLayout";
import { Label } from "ui/form/Label";
import { SidebarColumn } from "ui/sidebars/Sidebar";
import l10n from "shared/lib/lang/l10n";
import { FixedSpacer } from "ui/spacing/Spacing";

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

  svg {
    fill: ${(props) => props.theme.colors.text};
    opacity: 0.5;
    width: 16px;
  }
`;

export const MusicWebSettingPane = () => {
  const dispatch = useAppDispatch();

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

  return (
    <div>
      <SongMetadataEditor />
      <SidebarColumn>
        <FormRow>
          <FormField name="view">
            <Label>{l10n("MENU_VIEW")}</Label>
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
          </FormField>
        </FormRow>
      </SidebarColumn>
      <StyledMenuItem>
        <span>Edit Instruments</span>
        <CaretRightIcon />
      </StyledMenuItem>
      <StyledMenuItem>
        <span>Edit Pattern Order</span>
        <CaretRightIcon />
      </StyledMenuItem>
      <FixedSpacer height={20} />
    </div>
  );
};
