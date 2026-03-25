import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import {
  SaveIcon,
  ExportIcon,
  PencilIcon,
  EraserIcon,
  SelectionIcon,
} from "ui/icons/Icons";
import { FloatingPanel, FloatingPanelDivider } from "ui/panels/FloatingPanel";
import trackerActions from "store/features/tracker/trackerActions";
import { Button } from "ui/buttons/Button";
import { MenuOverlay } from "ui/menu/Menu";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { Select } from "ui/form/Select";
import { RelativePortal } from "ui/layout/RelativePortal";
import { PianoRollToolType } from "store/features/tracker/trackerState";
import API from "renderer/lib/api";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { SingleValue } from "react-select";
import { MusicAsset } from "shared/lib/resources/types";
import SongExportForm from "components/music/form/SongExportForm";
import l10n from "shared/lib/lang/l10n";
import { InstrumentSelectButton } from "components/music/form/InstrumentSelectButton";

interface OctaveOffsetOptions {
  value: number;
  label: string;
}

interface StepOption {
  value: number;
  label: string;
}

interface SongEditorToolsPanelProps {
  musicAsset?: MusicAsset;
}

const FloatingPanelSwitchView = styled(FloatingPanel)`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
`;

const FloatingPanelTools = styled(FloatingPanel)`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;

  .OctaveSelect,
  .StepSelect {
    width: 50px;
  }
`;

const ExportButtonWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const SongEditorToolsPanel = ({ musicAsset }: SongEditorToolsPanelProps) => {
  const dispatch = useAppDispatch();

  const play = useAppSelector((state) => state.tracker.playing);
  const playerReady = useAppSelector((state) => state.tracker.playerReady);
  const subpatternEditorFocus = useAppSelector(
    (state) => state.tracker.subpatternEditorFocus,
  );

  const modified = useAppSelector((state) => state.tracker.modified);
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  const view = useAppSelector((state) => state.tracker.view);

  const tool = useAppSelector((state) => state.tracker.tool);
  const [previousTool, setPreviousTool] = useState<PianoRollToolType>();
  const [tmpSelectionMode, setTmpSelectionMode] = useState(false);

  const defaultStartPlaybackPosition = useAppSelector(
    (state) => state.tracker.defaultStartPlaybackPosition,
  );

  const [playbackFromStart, setPlaybackFromStart] = useState(false);
  const exporting = useAppSelector((state) => state.tracker.exporting);
  const [showExportPanel, setShowExportPanel] = useState(false);

  const octaveOffsetOptions: OctaveOffsetOptions[] = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => ({
        value: i,
        label: `${l10n("FIELD_OCTAVE")} ${i + 3}`,
      })),
    [],
  );

  const stepOptions: StepOption[] = useMemo(
    () =>
      Array.from({ length: 64 }).map((_, i) => ({
        value: i,
        label: `${l10n("FIELD_STEP")} ${i}`,
      })),
    [],
  );

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

  const toggleView = useCallback(() => {
    if (view === "tracker") {
      dispatch(trackerActions.setViewAndSave("roll"));
    } else {
      dispatch(trackerActions.setViewAndSave("tracker"));
    }
  }, [dispatch, view]);

  const setTool = useCallback(
    (newTool: PianoRollToolType) => {
      setPreviousTool(tool);
      dispatch(trackerActions.setTool(newTool));
    },
    [dispatch, tool],
  );

  const saveSong = useCallback(() => {
    if (musicAsset && modified) {
      dispatch(saveSongFile());
    }
  }, [dispatch, modified, musicAsset]);

  const onOpenExportPanel = useCallback(() => {
    setShowExportPanel((isOpen) => !isOpen);
  }, []);

  const onCloseExportPanel = useCallback(() => {
    setShowExportPanel(false);
  }, []);

  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  const setSelectedInstrumentId = useCallback(
    (instrument: number) => {
      dispatch(trackerActions.setSelectedInstrumentId(instrument));
    },
    [dispatch],
  );

  const octaveOffset = useAppSelector((state) => state.tracker.octaveOffset);
  const editStep = useAppSelector((state) => state.tracker.editStep);

  const setOctaveOffset = useCallback(
    (offset: number) => {
      dispatch(trackerActions.setOctaveOffset(offset));
    },
    [dispatch],
  );

  const setEditStep = useCallback(
    (value: number) => {
      dispatch(trackerActions.setEditStep(value));
    },
    [dispatch],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target && (e.target as Node).nodeName === "INPUT") {
        return;
      }
      if (!tmpSelectionMode && e.shiftKey) {
        setTmpSelectionMode(true);
        setTool("selection");
      }
      if (e.code === "KeyS" && (e.ctrlKey || e.metaKey)) {
        if (API.env === "web") {
          e.preventDefault();
        }
        saveSong();
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
      if (view !== "roll") {
        return;
      }
      if (!subpatternEditorFocus) {
        if (e.code === "Digit1") {
          setSelectedInstrumentId(0);
        } else if (e.code === "Digit2") {
          setSelectedInstrumentId(1);
        } else if (e.code === "Digit3") {
          setSelectedInstrumentId(2);
        } else if (e.code === "Digit4") {
          setSelectedInstrumentId(3);
        } else if (e.code === "Digit5") {
          setSelectedInstrumentId(4);
        } else if (e.code === "Digit6") {
          setSelectedInstrumentId(5);
        } else if (e.code === "Digit7") {
          setSelectedInstrumentId(6);
        } else if (e.code === "Digit8") {
          setSelectedInstrumentId(7);
        } else if (e.code === "Digit9") {
          setSelectedInstrumentId(8);
        }
      }
    },
    [
      tmpSelectionMode,
      view,
      subpatternEditorFocus,
      setTool,
      saveSong,
      toggleView,
      togglePlay,
      setSelectedInstrumentId,
    ],
  );

  const onKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!e.altKey) {
        setPlaybackFromStart(false);
      }
      if (tmpSelectionMode && !e.shiftKey) {
        setTool(previousTool || "pencil");
        setTmpSelectionMode(false);
      }
    },
    [tmpSelectionMode, setTool, previousTool],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  const prevExporting = useRef(exporting);
  useEffect(() => {
    if (!song || !playerReady) {
      setShowExportPanel(false);
    }
    if (!exporting && prevExporting.current) {
      setShowExportPanel(false);
    }
    prevExporting.current = exporting;
  }, [song, playerReady, exporting]);

  return (
    <>
      <FloatingPanelSwitchView>
        <Button
          variant="transparent"
          disabled={!musicAsset || !modified}
          onClick={saveSong}
          title={l10n("FIELD_SAVE")}
        >
          <SaveIcon />
        </Button>
        <ExportButtonWrapper>
          <Button
            variant="transparent"
            disabled={!song || !playerReady || exporting}
            title={l10n("TOOLBAR_EXPORT_AS")}
            onClick={onOpenExportPanel}
            active={showExportPanel}
          >
            <ExportIcon />
          </Button>
          {showExportPanel && musicAsset && (
            <>
              <MenuOverlay onClick={onCloseExportPanel} />
              <RelativePortal pin="top-left" offsetY={10} zIndex={10001}>
                <SongExportForm name={musicAsset.filename} />
              </RelativePortal>
            </>
          )}
        </ExportButtonWrapper>

        {/* <Button
          variant="transparent"
          onClick={toggleView}
          title={
            view === "roll"
              ? l10n("TOOL_TRACKER_VIEW")
              : l10n("TOOL_PIANO_ROLL_VIEW")
          }
        >
          {view === "roll" ? <TrackerIcon /> : themePianoIcon}
        </Button> */}
      </FloatingPanelSwitchView>

      <FloatingPanelTools>
        {/* <FloatingPanelDivider /> */}
        {/* <Button
          variant="transparent"
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
          variant="transparent"
          disabled={!playerReady || exporting}
          onClick={stopPlayback}
          title={l10n("FIELD_STOP")}
        >
          <StopIcon />
        </Button> */}
        {view === "roll" && (
          <>
            {/* <FloatingPanelDivider /> */}
            <Button
              variant="transparent"
              onClick={() => setTool("pencil")}
              active={tool === "pencil"}
              title={l10n("TOOL_PENCIL")}
            >
              <PencilIcon />
            </Button>
            <Button
              variant="transparent"
              onClick={() => setTool("eraser")}
              active={tool === "eraser"}
              title={l10n("TOOL_ERASER")}
            >
              <EraserIcon />
            </Button>
            <Button
              variant="transparent"
              onClick={() => setTool("selection")}
              active={tool === "selection"}
            >
              <SelectionIcon />
            </Button>
            <FloatingPanelDivider />
          </>
        )}
        <InstrumentSelectButton
          name="instrument"
          value={selectedInstrumentId}
          onChange={(newValue) => {
            setSelectedInstrumentId(newValue);
          }}
        />
        {view === "tracker" && (
          <>
            <FloatingPanelDivider />
            <Select
              className="OctaveSelect"
              classNamePrefix="CustomSelect--Left CustomSelect--WidthAuto"
              value={octaveOffsetOptions.find((i) => i.value === octaveOffset)}
              options={octaveOffsetOptions}
              onChange={(newValue: SingleValue<OctaveOffsetOptions>) => {
                if (newValue) {
                  setOctaveOffset(newValue.value);
                }
              }}
            />
            <FloatingPanelDivider />
            <Select
              className="StepSelect"
              classNamePrefix="CustomSelect--Left CustomSelect--WidthAuto"
              value={stepOptions.find((i) => i.value === editStep)}
              options={stepOptions}
              onChange={(newValue: SingleValue<StepOption>) => {
                if (newValue) {
                  setEditStep(newValue.value);
                }
              }}
            />
          </>
        )}
      </FloatingPanelTools>
    </>
  );
};

export default SongEditorToolsPanel;
