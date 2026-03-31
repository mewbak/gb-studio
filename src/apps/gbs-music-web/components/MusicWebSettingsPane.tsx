import React, { useCallback, useContext } from "react";
import { SongMetadataEditor } from "components/music/sidebar/SongMetadataEditor";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { PianoIcon, PianoInverseIcon, TrackerIcon } from "ui/icons/Icons";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerActions from "store/features/tracker/trackerActions";
import styled, { css, ThemeContext } from "styled-components";
import { FormField, FormRow } from "ui/form/layout/FormLayout";
import { Label } from "ui/form/Label";
import { SidebarColumn } from "ui/sidebars/Sidebar";
import l10n from "shared/lib/lang/l10n";

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
    </div>
  );
};
