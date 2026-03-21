import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled, { ThemeContext } from "styled-components";
import debounce from "lodash/debounce";
import useResizable from "ui/hooks/use-resizable";
import useWindowSize from "ui/hooks/use-window-size";
import {
  SplitPaneHorizontalDivider,
  SplitPaneVerticalDivider,
} from "ui/splitpane/SplitPaneDivider";
import editorActions from "store/features/editor/editorActions";
import { SongTracker } from "components/music/tracker/SongTracker";
import { SongEditor } from "components/music/sidebar/SongEditor";
import SongEditorToolsPanel from "components/music/toolbar/SongEditorToolsPanel";
import { loadSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { SongPianoRoll } from "components/music/piano/SongPianoRoll";
import l10n from "shared/lib/lang/l10n";
import { clampSidebarWidth } from "renderer/lib/window/sidebar";
import { UgePlayer } from "components/music/UgePlayer";
import trackerActions from "store/features/tracker/trackerActions";
import { Button } from "ui/buttons/Button";
import { sortByFilename } from "shared/lib/entities/entitiesHelpers";
import { MenuOverlay } from "ui/menu/Menu";
import { CloseIcon, SongIcon, StackIcon } from "ui/icons/Icons";
import { musicSelectors } from "store/features/entities/entitiesState";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { NavigatorInstrumentsPane } from "components/music/navigator/NavigatorInstrumentsPane";
import { NavigatorSongsPane } from "components/music/navigator/NavigatorSongsPane";
import SplitPaneVerticalContainer, {
  SplitPaneLayout,
} from "ui/splitpane/SplitPaneVerticalContainer";
import { NavigatorChannelsPane } from "components/music/navigator/NavigatorChannelsPane";

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
`;

const ContentWrapper = styled.div`
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  background: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  position: relative;
  display: flex;
`;

const ContentMessage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  text-align: center;
  padding: 24px;
`;

const ErrorTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
`;

const ErrorDescription = styled.div`
  padding-top: 5px;
`;

const EmptyStateActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

const defaultPaneLayout: SplitPaneLayout[] = [
  { type: "fill", initialMinSize: 200 },
  { type: "fixed", size: 190, minSize: 190, maxSize: 190 },
  { type: "fixed", size: 485 },
];

const COMPACT_LAYOUT_BREAKPOINT = 900;

const MobilePanelBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 8px 6px;
  border-bottom: 1px solid ${(props) => props.theme.colors.sidebar.border};
  background: ${(props) => props.theme.colors.sidebar.header.background};
`;

const MobilePanelButton = styled(Button)`
  flex: 1 1 0;
  min-width: 0;
`;

const MobileOverlay = styled(MenuOverlay)`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 20;
`;

const MobileSheet = styled.div`
  position: absolute;
  inset: 0;
  background: ${(props) => props.theme.colors.sidebar.background};
  color: ${(props) => props.theme.colors.text};
  display: flex;
  flex-direction: column;
  z-index: 21;
`;

const MobileSheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 0 8px;
  border-bottom: 1px solid ${(props) => props.theme.colors.sidebar.border};
  background: ${(props) => props.theme.colors.sidebar.header.background};
`;

const MobileSheetTitle = styled.div`
  font-weight: bold;
  min-width: 0;
`;

const MobileSheetContent = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
`;

interface StandaloneMusicPageProps {
  onCreateSong?: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onImportSong?: () => void;
  onSelectSong?: (id: string) => void;
  topInset?: number;
}

export const StandaloneMusicPage = ({
  onCreateSong,
  onOpenDirectoryWorkspace,
  onImportSong,
  onSelectSong,
  topInset = 0,
}: StandaloneMusicPageProps) => {
  const dispatch = useAppDispatch();
  const themeContext = useContext(ThemeContext);
  const worldSidebarWidth = useAppSelector(
    (state) => state.editor.worldSidebarWidth,
  );
  const navigatorSidebarWidth = useAppSelector(
    (state) => state.editor.navigatorSidebarWidth,
  );
  const windowSize = useWindowSize();
  const prevWindowWidthRef = useRef<number>(0);
  const windowWidth = windowSize.width || 0;
  const windowHeight = windowSize.height || 0;
  const availableHeight = Math.max(0, windowHeight - topInset);
  const paneHeight = Math.max(0, availableHeight);
  const minCenterPaneWidth = 0;
  const isCompactLayout =
    windowWidth > 0 && windowWidth <= COMPACT_LAYOUT_BREAKPOINT;

  const allSongs = useAppSelector(musicSelectors.selectAll);
  const allSortedSongs = useMemo(
    () => [...allSongs].sort(sortByFilename),
    [allSongs],
  );
  const selectedSongId = useAppSelector(
    (state) => state.tracker.selectedSongId,
  );
  const song = useAppSelector((state) =>
    musicSelectors.selectById(state, selectedSongId),
  );

  const lastSongId = useRef("");
  useEffect(() => {
    if (song) {
      lastSongId.current = song.id;
    }
  }, [song]);

  const viewSongId = useMemo(
    () => song?.id || lastSongId.current || allSortedSongs[0]?.id,
    [allSortedSongs, song],
  );

  const viewSong = useAppSelector((state) =>
    musicSelectors.selectById(state, viewSongId),
  );

  const sequenceId = useAppSelector((state) => state.tracker.selectedSequence);
  const songDocument = useAppSelector(
    (state) => state.trackerDocument.present.song,
  );
  const modified = useAppSelector(
    (state) => state.trackerDocument.present.modified,
  );
  const status = useAppSelector(
    (state) => state.trackerDocument.present.status,
  );
  const error = useAppSelector((state) => state.trackerDocument.present.error);

  const [selectedSongPath, setSelectedSongPath] = useState("");
  useEffect(() => {
    if (viewSong) {
      setSelectedSongPath(viewSong.filename);
    }
  }, [viewSong]);

  useEffect(() => {
    if (selectedSongPath !== "") {
      dispatch(loadSongFile(selectedSongPath));
    }
  }, [dispatch, selectedSongPath]);

  useEffect(() => {
    if (!selectedSongId && allSortedSongs[0]?.id) {
      dispatch(trackerActions.setSelectedSongId(allSortedSongs[0].id));
    }
  }, [allSortedSongs, dispatch, selectedSongId]);

  const [leftPaneWidth, setLeftPaneSize, startLeftPaneResize] = useResizable({
    initialSize: navigatorSidebarWidth,
    direction: "right",
    minSize: 50,
    maxSize: Math.max(101, windowWidth - minCenterPaneWidth - 200),
    onResize: () => {
      recalculateRightColumn();
    },
    onResizeComplete: (v) => {
      if (v < 200) {
        setLeftPaneSize(200);
      }
      recalculateRightColumn();
    },
  });
  const [rightPaneWidth, setRightPaneSize, onResizeRight] = useResizable({
    initialSize: worldSidebarWidth,
    direction: "left",
    minSize: 280,
    maxSize: Math.max(281, windowWidth - minCenterPaneWidth - 100),
    onResize: () => {
      recalculateLeftColumn();
    },
    onResizeComplete: (width) => {
      if (width > windowWidth - 200) {
        setLeftPaneSize(200);
        setRightPaneSize(windowWidth - 200);
      } else {
        recalculateLeftColumn();
      }
    },
  });

  useEffect(() => {
    prevWindowWidthRef.current = windowWidth;
  });
  const prevWidth = prevWindowWidthRef.current;

  useEffect(() => {
    if (windowWidth !== prevWidth) {
      const panelsTotalWidth =
        leftPaneWidth + rightPaneWidth + minCenterPaneWidth;
      const widthOverflow = panelsTotalWidth - windowWidth;
      if (widthOverflow > 0) {
        setLeftPaneSize(leftPaneWidth - 0.5 * widthOverflow);
        setRightPaneSize(rightPaneWidth - 0.5 * widthOverflow);
      }
    }
  }, [
    windowWidth,
    prevWidth,
    leftPaneWidth,
    setLeftPaneSize,
    rightPaneWidth,
    setRightPaneSize,
  ]);

  const debouncedStoreWidths = useRef(
    debounce((leftWidth: number, rightWidth: number) => {
      dispatch(editorActions.resizeWorldSidebar(clampSidebarWidth(rightWidth)));
      dispatch(editorActions.resizeNavigatorSidebar(leftWidth));
    }, 100),
  );

  useEffect(
    () => debouncedStoreWidths.current(leftPaneWidth, rightPaneWidth),
    [leftPaneWidth, rightPaneWidth],
  );

  const recalculateLeftColumn = () => {
    const newWidth = Math.min(
      leftPaneWidth,
      windowWidth - rightPaneWidth - minCenterPaneWidth,
    );
    if (newWidth !== leftPaneWidth) {
      setLeftPaneSize(newWidth);
    }
  };

  const recalculateRightColumn = () => {
    const newWidth = Math.min(
      rightPaneWidth,
      windowWidth - leftPaneWidth - minCenterPaneWidth,
    );
    if (newWidth !== rightPaneWidth) {
      setRightPaneSize(newWidth);
    }
  };

  const [activeMobilePanel, setActiveMobilePanel] = useState<
    "songs" | "editor" | null
  >(null);

  const view = useAppSelector((state) => state.tracker.view);

  useEffect(() => {
    if (!isCompactLayout && activeMobilePanel) {
      setActiveMobilePanel(null);
    }
  }, [activeMobilePanel, isCompactLayout]);

  const closeMobilePanel = useCallback(() => {
    setActiveMobilePanel(null);
  }, []);

  const openSongsPanel = useCallback(() => {
    setActiveMobilePanel("songs");
  }, []);

  const openEditorPanel = useCallback(() => {
    setActiveMobilePanel("editor");
  }, []);

  const onSelectSongWithMobileClose = useCallback(
    (id: string) => {
      onSelectSong?.(id);
      if (isCompactLayout) {
        setActiveMobilePanel(null);
      }
    },
    [isCompactLayout, onSelectSong],
  );

  const renderGridView = useCallback(() => {
    if (!songDocument) {
      return;
    } else if (view === "tracker") {
      return (
        <div style={{ position: "relative" }}>
          <SongTracker
            sequenceId={sequenceId}
            song={songDocument}
            height={Math.max(0, paneHeight - 61)}
          />
        </div>
      );
    } else {
      return (
        <SongPianoRoll
          sequenceId={sequenceId}
          song={songDocument}
          height={Math.max(0, paneHeight - 61)}
        />
      );
    }
  }, [paneHeight, sequenceId, songDocument, view]);

  return (
    <Wrapper>
      {!isCompactLayout ? (
        <>
          <div
            style={{
              transition: "opacity 0.3s ease-in-out",
              width: Math.max(200, leftPaneWidth),
              background: themeContext?.colors.sidebar.background,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                minWidth: 200,
                position: "relative",
                width: "100%",
                height: "100%",
              }}
            >
              <SplitPaneVerticalContainer
                height={windowHeight - topInset}
                defaultLayout={defaultPaneLayout}
              >
                <NavigatorSongsPane
                  modified={modified}
                  selectedSongId={viewSongId}
                  onCreateSong={onCreateSong}
                  onImportSong={onImportSong}
                  onSelectSong={onSelectSong}
                />
                <NavigatorChannelsPane />
                <NavigatorInstrumentsPane />
              </SplitPaneVerticalContainer>
            </div>
          </div>
          <SplitPaneHorizontalDivider onMouseDown={startLeftPaneResize} />
        </>
      ) : null}
      {status === "error" ? (
        <ContentWrapper style={{ height: paneHeight }}>
          <ContentMessage>
            <ErrorTitle>Can&apos;t load the song</ErrorTitle>
            <ErrorDescription>{error}</ErrorDescription>
          </ContentMessage>
        </ContentWrapper>
      ) : songDocument !== undefined ? (
        <>
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              overflow: "hidden",
              background: themeContext?.colors.background,
              color: themeContext?.colors.text,
              height: paneHeight,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ position: "relative", height: "60px" }}>
              <SongEditorToolsPanel selectedSong={viewSong} />
            </div>
            {isCompactLayout && songDocument ? (
              <MobilePanelBar>
                <MobilePanelButton
                  variant={activeMobilePanel === "songs" ? "primary" : "normal"}
                  onClick={openSongsPanel}
                >
                  <SongIcon /> {l10n("FIELD_SONGS")}
                </MobilePanelButton>
                <MobilePanelButton
                  variant={
                    activeMobilePanel === "editor" ? "primary" : "normal"
                  }
                  onClick={openEditorPanel}
                >
                  <StackIcon /> {l10n("SIDEBAR_INSTRUMENT")}
                </MobilePanelButton>
              </MobilePanelBar>
            ) : null}
            <SplitPaneVerticalDivider />
            {renderGridView()}
            <UgePlayer data={songDocument} />
          </div>
          {!isCompactLayout ? (
            <>
              <SplitPaneHorizontalDivider onMouseDown={onResizeRight} />
              <div
                style={{
                  width: rightPaneWidth,
                  background: themeContext?.colors.sidebar.background,
                  height: "100%",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <SongEditor />
              </div>
            </>
          ) : null}
        </>
      ) : (
        <ContentWrapper style={{ height: paneHeight }}>
          <ContentMessage>
            {status === "loading" ? l10n("FIELD_LOADING") : "No song loaded"}
            {status !== "loading" ? (
              <EmptyStateActions>
                {onCreateSong ? (
                  <Button onClick={onCreateSong}>New Song</Button>
                ) : null}
                {onImportSong ? (
                  <Button variant="normal" onClick={onImportSong}>
                    Open File
                  </Button>
                ) : null}
                {onOpenDirectoryWorkspace ? (
                  <Button variant="normal" onClick={onOpenDirectoryWorkspace}>
                    Open Folder
                  </Button>
                ) : null}
              </EmptyStateActions>
            ) : null}
          </ContentMessage>
        </ContentWrapper>
      )}
      {isCompactLayout && activeMobilePanel ? (
        <>
          <MobileOverlay onClick={closeMobilePanel} />
          <MobileSheet
            style={{
              top: 0,
              height: paneHeight,
            }}
          >
            <MobileSheetHeader>
              <MobileSheetTitle>
                {activeMobilePanel === "songs"
                  ? l10n("FIELD_SONGS")
                  : l10n("SIDEBAR_INSTRUMENT")}
              </MobileSheetTitle>
              <Button variant="transparent" onClick={closeMobilePanel}>
                <CloseIcon /> {l10n("MENU_CLOSE")}
              </Button>
            </MobileSheetHeader>
            <MobileSheetContent>
              {activeMobilePanel === "songs" ? (
                <SplitPaneVerticalContainer
                  height={windowHeight - topInset}
                  defaultLayout={defaultPaneLayout}
                >
                  <NavigatorSongsPane
                    modified={modified}
                    selectedSongId={viewSongId}
                    onCreateSong={onCreateSong}
                    onImportSong={onImportSong}
                    onSelectSong={onSelectSongWithMobileClose}
                  />
                  <NavigatorChannelsPane />
                  <NavigatorInstrumentsPane />
                </SplitPaneVerticalContainer>
              ) : (
                <div
                  style={{
                    height: "100%",
                    background: themeContext?.colors.sidebar.background,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <SongEditor />
                </div>
              )}
            </MobileSheetContent>
          </MobileSheet>
        </>
      ) : null}
    </Wrapper>
  );
};

export default StandaloneMusicPage;
