import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import API from "renderer/lib/api";
import l10n from "shared/lib/lang/l10n";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import styled, { css, ThemeContext } from "styled-components";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import {
  PauseIcon,
  PianoIcon,
  PianoInverseIcon,
  PlayIcon,
  PlayStartIcon,
  StopIcon,
  TrackerIcon,
} from "ui/icons/Icons";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";

const StyledSongContextBar = styled.div<{ $isCompactLayout?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  ${(props) =>
    props.$isCompactLayout &&
    css`
      flex-grow: 500;
    `}
`;

const StyledSongContextBarTimer = styled.div<{ disabled: boolean }>`
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  font-family: "Public Pixel", monospace;
  background: #212228;
  color: #828891;
  height: 30px;
  padding: 0 10px;
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
  gap: 5px;

  ${(props) =>
    props.disabled &&
    css`
      opacity: 0.5;
    `}
`;

const StyledSongContextBarTimerPart = styled.div`
  flex:grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledSongContextBarTimerPartLabel = styled.div`
  font-size: 8px;
`;

const getPlayButtonLabel = (play: boolean, playbackFromStart: boolean) => {
  if (play) {
    return l10n("FIELD_PAUSE");
  } else {
    if (playbackFromStart) {
      return l10n("FIELD_RESTART");
    } else {
      return l10n("FIELD_PLAY");
    }
  }
};

export const SongContextBar = ({
  isCompactLayout,
}: {
  isCompactLayout?: boolean;
}) => {
  const dispatch = useAppDispatch();

  const play = useAppSelector((state) => state.tracker.playing);
  const view = useAppSelector((state) => state.tracker.view);
  const exporting = useAppSelector((state) => state.tracker.exporting);
  const playerReady = useAppSelector((state) => state.tracker.playerReady);

  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const defaultStartPlaybackPosition = useAppSelector(
    (state) => state.tracker.defaultStartPlaybackPosition,
  );

  const [playbackFromStart, setPlaybackFromStart] = useState(false);

  const setTrackerView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("tracker"));
  }, [dispatch]);

  const setRollView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("roll"));
  }, [dispatch]);

  const toggleView = useCallback(() => {
    if (view === "tracker") {
      dispatch(trackerActions.setViewAndSave("roll"));
    } else {
      dispatch(trackerActions.setViewAndSave("tracker"));
    }
  }, [dispatch, view]);

  const togglePlay = useCallback(() => {
    if (!playerReady) return;
    if (!play) {
      if (playbackFromStart) {
        API.music.sendToMusicWindow({
          action: "position",
          position: defaultStartPlaybackPosition,
        });
      }
      dispatch(trackerActions.playTracker());
    } else {
      dispatch(trackerActions.pauseTracker());
    }
  }, [
    defaultStartPlaybackPosition,
    dispatch,
    play,
    playbackFromStart,
    playerReady,
  ]);

  const stopPlayback = useCallback(() => {
    dispatch(trackerActions.stopTracker());
    API.music.sendToMusicWindow({
      action: "stop",
      position: defaultStartPlaybackPosition,
    });
  }, [defaultStartPlaybackPosition, dispatch]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target && (e.target as Node).nodeName === "INPUT") {
        return;
      }
      if (e.ctrlKey || e.shiftKey) {
        return;
      }
      if (e.altKey) {
        setPlaybackFromStart(true);
      }
      if (e.key === "`") {
        toggleView();
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    },
    [togglePlay, toggleView],
  );

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.altKey) {
      setPlaybackFromStart(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  const [playbackState, setPlaybackState] = useState([0, 0]);

  const startPlaybackPosition = useAppSelector(
    (state) => state.tracker.startPlaybackPosition,
  );

  useEffect(() => {
    setPlaybackState(startPlaybackPosition);
  }, [setPlaybackState, startPlaybackPosition]);

  useEffect(() => {
    const listener = (_event: unknown, d: MusicDataReceivePacket) => {
      if (d.action === "update") {
        setPlaybackState(d.update);
      } else if (d.action === "initialized") {
        setPlaybackState([0, 0]);
      }
    };
    const unsubscribeMusicData = API.events.music.response.subscribe(listener);
    return () => {
      unsubscribeMusicData();
    };
  }, [setPlaybackState]);

  const orderIndex = playbackState[0] + 1;
  const patternIndex = song?.sequence[playbackState[0]] ?? 0;
  const rowIndex = playbackState[1];

  const themeContext = useContext(ThemeContext);

  const themePianoIcon =
    themeContext?.type === "light" ? <PianoIcon /> : <PianoInverseIcon />;

  const playPauseButtons = useMemo(
    () => (
      <ButtonGroup>
        <Button
          disabled={!playerReady || exporting}
          onClick={togglePlay}
          title={getPlayButtonLabel(play, playbackFromStart)}
        >
          {play ? (
            <PauseIcon />
          ) : playbackFromStart ? (
            <PlayStartIcon />
          ) : (
            <PlayIcon />
          )}
        </Button>
        <Button
          disabled={!playerReady || exporting}
          onClick={stopPlayback}
          title={l10n("FIELD_STOP")}
        >
          <StopIcon />
        </Button>
      </ButtonGroup>
    ),
    [exporting, play, playbackFromStart, playerReady, stopPlayback, togglePlay],
  );

  return (
    <StyledSongContextBar $isCompactLayout={isCompactLayout}>
      {!isCompactLayout && (
        <>
          {playPauseButtons}
          <FixedSpacer width={10} />
        </>
      )}
      {isCompactLayout && <FlexGrow />}

      <StyledSongContextBarTimer disabled={!playerReady}>
        <StyledSongContextBarTimerPart>
          <StyledSongContextBarTimerPartLabel>
            ORD
          </StyledSongContextBarTimerPartLabel>
          {String(orderIndex).padStart(2, "0")}
        </StyledSongContextBarTimerPart>
        <StyledSongContextBarTimerPart>
          <StyledSongContextBarTimerPartLabel>
            PAT
          </StyledSongContextBarTimerPartLabel>
          {String(patternIndex).padStart(2, "0")}
        </StyledSongContextBarTimerPart>
        <StyledSongContextBarTimerPart>
          <StyledSongContextBarTimerPartLabel>
            ROW
          </StyledSongContextBarTimerPartLabel>
          {String(rowIndex).padStart(2, "0")}
        </StyledSongContextBarTimerPart>
      </StyledSongContextBarTimer>

      {!isCompactLayout && (
        <>
          <FixedSpacer width={10} />
          <ButtonGroup>
            <Button
              disabled={!playerReady}
              variant={view === "roll" ? "primary" : "normal"}
              onClick={setRollView}
            >
              {view === "roll" ? <PianoInverseIcon /> : themePianoIcon}
            </Button>
            <Button
              disabled={!playerReady}
              variant={view === "tracker" ? "primary" : "normal"}
              onClick={setTrackerView}
            >
              <TrackerIcon />
            </Button>
          </ButtonGroup>
        </>
      )}
      {isCompactLayout && (
        <>
          <FlexGrow />
          {playPauseButtons}
        </>
      )}
    </StyledSongContextBar>
  );
};
