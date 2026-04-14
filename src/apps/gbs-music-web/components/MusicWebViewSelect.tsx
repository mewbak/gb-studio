import React, { useCallback, useContext } from "react";
import l10n from "shared/lib/lang/l10n";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import trackerImageUrl from "gbs-music-web/static/tracker.png";
import pianoImageUrl from "gbs-music-web/static/piano.png";
import trackerDarkImageUrl from "gbs-music-web/static/tracker_dark.png";
import pianoDarkImageUrl from "gbs-music-web/static/piano_dark.png";
import styled, { ThemeContext } from "styled-components";

interface MusicWebViewSelectProps {
  showLabels?: boolean;
}

const StyledViewSelectWrapper = styled.div`
  width: 100%;
`;

const StyledViewSelectOptions = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 10px;
  gap: 10px;
`;

const StyledViewButtonWrapper = styled.div`
  position: relative;
  flex-grow: 1;
`;

const StyledViewButton = styled.input.attrs({
  type: "radio",
})`
  width: 100%;
  height: 80px;
  margin: 0;
  padding: 0;
  border-radius: ${(props) => props.theme.borderRadius}px;
  -webkit-appearance: none;
`;

const SplashViewLabel = styled.label`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #fff;
  border: 2px solid ${(props) => props.theme.colors.input.background};
  border-radius: ${(props) => props.theme.borderRadius}px;
  -webkit-appearance: none;
  box-sizing: border-box;
  overflow: hidden;
  background-size: cover;

  ${StyledViewButton}:checked + & {
    border: 2px solid ${(props) => props.theme.colors.highlight};
    box-shadow: 0 0 0px 2px ${(props) => props.theme.colors.highlight};
  }
`;

const StyledViewName = styled.div`
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StyledViewDescription = styled.div`
  font-size: 11px;
`;

export const MusicWebViewSelect = ({ showLabels }: MusicWebViewSelectProps) => {
  const dispatch = useAppDispatch();

  const view = useAppSelector((state) => state.tracker.view);

  const themeContext = useContext(ThemeContext);

  const setTrackerView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("tracker"));
    dispatch(trackerActions.setMobileOverlayView("none"));
  }, [dispatch]);

  const setRollView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("roll"));
    dispatch(trackerActions.setMobileOverlayView("none"));
  }, [dispatch]);

  return (
    <StyledViewSelectWrapper>
      <StyledViewSelectOptions>
        <StyledViewButtonWrapper>
          <StyledViewButton
            id="view_roll"
            name="view"
            checked={view === "roll"}
            onChange={setRollView}
          />
          <SplashViewLabel
            htmlFor="view_roll"
            title={l10n("FIELD_PIANO_ROLL")}
            style={{
              backgroundImage: `url(${
                themeContext?.type === "light"
                  ? pianoImageUrl
                  : pianoDarkImageUrl
              })`,
              backgroundPosition: "0% 50%",
            }}
          />
        </StyledViewButtonWrapper>

        <StyledViewButtonWrapper>
          <StyledViewButton
            id="view_tracker"
            name="view"
            checked={view === "tracker"}
            onChange={setTrackerView}
          />
          <SplashViewLabel
            htmlFor="view_tracker"
            title={l10n("FIELD_TRACKER")}
            style={{
              backgroundImage: `url(${
                themeContext?.type === "light"
                  ? trackerImageUrl
                  : trackerDarkImageUrl
              })`,
              backgroundPosition: "0% 0%",
            }}
          />
        </StyledViewButtonWrapper>
      </StyledViewSelectOptions>
      {showLabels && (
        <>
          <StyledViewName>
            {view === "roll" ? l10n("FIELD_PIANO_ROLL") : l10n("FIELD_TRACKER")}
          </StyledViewName>
          <StyledViewDescription>
            {view === "roll"
              ? l10n("FIELD_PIANO_ROLL_DESCRIPTION")
              : l10n("FIELD_TRACKER_DESCRIPTION")}
          </StyledViewDescription>
        </>
      )}
    </StyledViewSelectWrapper>
  );
};
