import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import API from "renderer/lib/api";
import l10n from "shared/lib/lang/l10n";
import { patternIndexLabel, rowIndexLabel } from "shared/lib/uge/display";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector, useAppStore } from "store/hooks";
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
    top: 2px;
    left: 2px;
    right: 2px;
    height: 16px;
    mix-blend-mode: overlay;
    border-radius: 6px;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.4) 100%
    );
  }
  gap: 5px;

  ${(props) =>
    props.disabled &&
    css`
      opacity: 0.5;
    `}

  @media (max-width: 360px) {
    font-size: 10px;
    padding: 0 5px;
    gap: 2px;
  }
`;

const StyledSongContextBarTimerPart = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledSongContextBarTimerPartLabel = styled.div`
  font-size: 8px;
  @media (max-width: 360px) {
    font-size: 7px;
  }
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

const OrderPosition = () => {
  const orderIndex = useAppSelector((state) => state.tracker.playbackSequence);
  return String(orderIndex + 1).padStart(2, "0");
};

const PatternPosition = () => {
  const orderIndex = useAppSelector((state) => state.tracker.playbackSequence);
  const sequence = useAppSelector(
    (state) => state.trackerDocument.present.song?.sequence,
  );
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const patternIndex = sequence?.[orderIndex]?.channels[selectedChannel] ?? 0;
  return patternIndexLabel(patternIndex, false);
};

const RowPosition = () => {
  const rowIndex = useAppSelector((state) => state.tracker.playbackRow);
  return rowIndexLabel(rowIndex);
};

export const SongContextBar = ({
  isCompactLayout,
}: {
  isCompactLayout?: boolean;
}) => {
  const store = useAppStore();
  const dispatch = useAppDispatch();

  const play = useAppSelector((state) => state.tracker.playing);
  const view = useAppSelector((state) => state.tracker.view);
  const exporting = useAppSelector((state) => state.tracker.exporting);
  const playerReady = useAppSelector((state) => state.tracker.playerReady);

  const defaultStartPlaybackSequence = useAppSelector(
    (state) => state.tracker.defaultStartPlaybackSequence,
  );
  const defaultStartPlaybackRow = useAppSelector(
    (state) => state.tracker.defaultStartPlaybackRow,
  );

  const [playbackFromStart, setPlaybackFromStart] = useState(false);

  const themeContext = useContext(ThemeContext);

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
          position: {
            sequence: defaultStartPlaybackSequence,
            row: defaultStartPlaybackRow,
          },
        });
      }
      dispatch(trackerActions.playTracker());
    } else {
      dispatch(trackerActions.pauseTracker());
    }
  }, [
    defaultStartPlaybackRow,
    defaultStartPlaybackSequence,
    dispatch,
    play,
    playbackFromStart,
    playerReady,
  ]);

  const stopPlayback = useCallback(() => {
    const state = store.getState();

    dispatch(trackerActions.stopTracker());

    const wasPlaying = state.tracker.playing;
    const defaultOrderIndex = defaultStartPlaybackSequence;
    const defaultRowIndex = defaultStartPlaybackRow;
    const { playbackSequence: orderIndex, playbackRow: rowIndex } =
      state.tracker;

    // Already at default start - restart default to start of song
    if (
      !wasPlaying &&
      orderIndex === defaultOrderIndex &&
      rowIndex === defaultRowIndex
    ) {
      dispatch(
        trackerActions.setDefaultStartPlaybackPosition({
          sequence: 0,
          row: 0,
        }),
      );
      API.music.sendToMusicWindow({
        action: "position",
        position: { sequence: 0, row: 0 },
      });
    } else {
      // Otherwise jump to default start
      API.music.sendToMusicWindow({
        action: "stop",
        position: {
          sequence: defaultStartPlaybackSequence,
          row: defaultStartPlaybackRow,
        },
      });
    }
  }, [store, defaultStartPlaybackRow, defaultStartPlaybackSequence, dispatch]);

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

  const onWindowFocusChange = useCallback(() => {
    setPlaybackFromStart(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("focus", onWindowFocusChange);
    window.addEventListener("blur", onWindowFocusChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("focus", onWindowFocusChange);
      window.removeEventListener("blur", onWindowFocusChange);
    };
  }, [onKeyDown, onKeyUp, onWindowFocusChange]);

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
          <OrderPosition />
        </StyledSongContextBarTimerPart>
        <StyledSongContextBarTimerPart>
          <StyledSongContextBarTimerPartLabel>
            PAT
          </StyledSongContextBarTimerPartLabel>
          <PatternPosition />
        </StyledSongContextBarTimerPart>
        <StyledSongContextBarTimerPart>
          <StyledSongContextBarTimerPartLabel>
            ROW
          </StyledSongContextBarTimerPartLabel>
          <RowPosition />
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
