import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  SaveIcon,
  ExportIcon,
  PencilIcon,
  EraserIcon,
  SelectionIcon,
  VirtualKeyboardIcon,
} from "ui/icons/Icons";
import { FloatingPanel, FloatingPanelDivider } from "ui/panels/FloatingPanel";
import trackerActions from "store/features/tracker/trackerActions";
import { Button } from "ui/buttons/Button";
import { MenuOverlay } from "ui/menu/Menu";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { RelativePortal } from "ui/layout/RelativePortal";
import { PianoRollToolType } from "store/features/tracker/trackerState";
import API from "renderer/lib/api";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { MusicAsset } from "shared/lib/resources/types";
import SongExportForm from "components/music/form/SongExportForm";
import l10n from "shared/lib/lang/l10n";
import { InstrumentSelectButton } from "components/music/form/InstrumentSelectButton";
import { StyledFloatingPanel } from "ui/panels/style";
import { StyledButton } from "ui/buttons/style";
import { OctaveOffsetSelectButton } from "components/music/form/OctaveOffsetSelectButton";
import { TrackerStepSelectButton } from "components/music/form/TrackerStepSelectButton";

interface SongEditorToolsPanelProps {
  musicAsset?: MusicAsset;
}

const FloatingPanelFiles = styled(FloatingPanel)``;

const FloatingPanelTools = styled(FloatingPanel)`
  .StepSelect {
    width: 50px;
  }
`;

const ExportButtonWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const SongToolsPanel = styled.div`
  display: flex;
  padding: 10px;
  box-sizing: border-box;
  justify-content: space-between;

  @media (max-width: 900px) {
    background: ${(props) => props.theme.colors.panel.background};
    border-bottom: 1px solid ${(props) => props.theme.colors.panel.border};

    padding: 5px;
    ${StyledFloatingPanel} {
      border-color: transparent;
      background: transparent;
      ${StyledButton} {
        border-radius: 4px;
      }
    }
  }
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

  const toggleTool = useCallback(() => {
    if (tool === "pencil") {
      dispatch(trackerActions.setTool("eraser"));
    } else {
      dispatch(trackerActions.setTool("pencil"));
    }
  }, [dispatch, tool]);

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
      if (e.code === "KeyT") {
        e.preventDefault();
        toggleTool();
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
      toggleTool,
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

  const showVirtualKeyboard = useAppSelector(
    (state) => state.tracker.showVirtualKeyboard,
  );

  const toggleVirtualKeyboard = useCallback(() => {
    dispatch(trackerActions.setShowVirtualKeyboard(!showVirtualKeyboard));
  }, [dispatch, showVirtualKeyboard]);

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
    <SongToolsPanel>
      <FloatingPanelTools>
        <InstrumentSelectButton
          name="instrument"
          value={selectedInstrumentId}
          onChange={(newValue) => {
            setSelectedInstrumentId(newValue);
          }}
        />
        <FloatingPanelDivider />
        {view === "roll" && (
          <>
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
          </>
        )}
        {view === "tracker" && (
          <>
            <OctaveOffsetSelectButton
              value={octaveOffset}
              onChange={setOctaveOffset}
              name={"octaveOffset"}
            />
            <FloatingPanelDivider />
            <TrackerStepSelectButton
              value={editStep}
              onChange={setEditStep}
              name="editStep"
            />
            <FloatingPanelDivider />

            <Button
              variant="transparent"
              active={showVirtualKeyboard}
              onClick={toggleVirtualKeyboard}
            >
              <VirtualKeyboardIcon />
            </Button>
          </>
        )}
      </FloatingPanelTools>

      <FloatingPanelFiles>
        <Button
          variant="transparent"
          disabled={!musicAsset || !modified}
          onClick={saveSong}
          title={l10n("FIELD_SAVE")}
        >
          <SaveIcon />
        </Button>
        <FloatingPanelDivider />

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
            <div style={{ position: "absolute", top: "100%", left: "100%" }}>
              <MenuOverlay onClick={onCloseExportPanel} />
              <RelativePortal pin="top-right" offsetY={5} zIndex={10001}>
                <SongExportForm name={musicAsset.filename} />
              </RelativePortal>
            </div>
          )}
        </ExportButtonWrapper>
      </FloatingPanelFiles>
    </SongToolsPanel>
  );
};

export default SongEditorToolsPanel;
