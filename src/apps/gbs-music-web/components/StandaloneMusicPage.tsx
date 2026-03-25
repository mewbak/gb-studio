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
import { SongEditor } from "components/music/sidebar/SongEditor";
import { loadSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { clampSidebarWidth } from "renderer/lib/window/sidebar";
import trackerActions from "store/features/tracker/trackerActions";
import { sortByFilename } from "shared/lib/entities/entitiesHelpers";
import { musicSelectors } from "store/features/entities/entitiesState";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { NavigatorInstrumentsPane } from "components/music/navigator/NavigatorInstrumentsPane";
import { NavigatorSongsPane } from "components/music/navigator/NavigatorSongsPane";
import SplitPaneVerticalContainer, {
  SplitPaneLayout,
} from "ui/splitpane/SplitPaneVerticalContainer";
import { NavigatorChannelsPane } from "components/music/navigator/NavigatorChannelsPane";
import SongDocument from "components/music/SongDocument";
import { SequenceEditor } from "components/music/sequence/SequenceEditor";
import l10n from "shared/lib/lang/l10n";
import { SplitPaneHeader } from "ui/splitpane/SplitPaneHeader";
import API from "renderer/lib/api";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { InstrumentEditor } from "components/music/sidebar/InstrumentEditor";
import { FixedSpacer } from "ui/spacing/Spacing";
import SongEditorToolsPanel from "components/music/toolbar/SongEditorToolsPanel";

const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
`;

const defaultPaneLayout: SplitPaneLayout[] = [
  { type: "fill", initialMinSize: 200 },
  { type: "fixed", size: 190, minSize: 190, maxSize: 190 },
  { type: "fixed", size: 485 },
];

const COMPACT_LAYOUT_BREAKPOINT = 900;

interface StandaloneMusicPageProps {
  onCreateSong?: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onImportSong?: () => void;
  onSelectSong?: (id: string) => void;
  topInset?: number;
}

export const StandaloneMusicPage = ({
  onCreateSong,
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
  const minCenterPaneWidth = 0;
  const isCompactLayout =
    windowWidth > 0 && windowWidth <= COMPACT_LAYOUT_BREAKPOINT;

  const allSongs = useAppSelector(musicSelectors.selectAll);
  const allSortedSongs = useMemo(
    () => [...allSongs].sort(sortByFilename),
    [allSongs],
  );

  const songDocument = useAppSelector(
    (state) => state.trackerDocument.present.song,
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

  const modified = useAppSelector((state) => state.tracker.modified);
  const status = useAppSelector((state) => state.tracker.status);

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

  useEffect(() => {
    if (!isCompactLayout && activeMobilePanel) {
      setActiveMobilePanel(null);
    }
  }, [activeMobilePanel, isCompactLayout]);

  const [patternsPanelOpen, setPatternsPanelOpen] = useState(true);

  const togglePatternsPanel = useCallback(() => {
    setPatternsPanelOpen((value) => !value);
  }, []);

  const [playbackState, setPlaybackState] = useState<[number, number]>([0, 0]);

  const startPlaybackPosition = useAppSelector(
    (state) => state.tracker.startPlaybackPosition,
  );

  useEffect(() => {
    setPlaybackState(startPlaybackPosition);
  }, [startPlaybackPosition]);

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
  }, []);

  const songsPane = useMemo(
    () => (
      <NavigatorSongsPane
        modified={modified}
        selectedSongId={viewSongId}
        onCreateSong={onCreateSong}
        onImportSong={onImportSong}
        onSelectSong={onSelectSong}
      />
    ),
    [modified, onCreateSong, onImportSong, onSelectSong, viewSongId],
  );
  return (
    <Wrapper>
      {!isCompactLayout && (
        <>
          <div
            style={{
              transition: "opacity 0.3s ease-in-out",
              width: Math.max(200, leftPaneWidth),
              background: themeContext?.colors.sidebar.background,
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
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
                height={windowHeight - 38}
                defaultLayout={defaultPaneLayout}
              >
                {songsPane}
                {viewSong.type === "uge" ? <NavigatorChannelsPane /> : null}
                {viewSong.type === "uge" ? <NavigatorInstrumentsPane /> : null}
              </SplitPaneVerticalContainer>
            </div>
          </div>
          <SplitPaneHorizontalDivider onMouseDown={startLeftPaneResize} />
        </>
      )}
      {viewSong.type === "uge" && (
        <>
          <div
            id="song-document"
            style={{
              flex: "1 1 0",
              minWidth: 0,
              overflow: "hidden",
              background: themeContext?.colors.background,
              color: themeContext?.colors.text,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{ position: "relative", height: "60px", flexShrink: 0 }}
            >
              <SongEditorToolsPanel musicAsset={viewSong} />
            </div>
            <SplitPaneVerticalDivider />

            <SongDocument musicAsset={viewSong} />

            {isCompactLayout && (
              <>
                <SplitPaneVerticalDivider />
                <div
                  style={{
                    height: 500,
                    background: themeContext?.colors.sidebar.background,
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                  }}
                >
                  <SplitPaneHeader collapsed={false}>WIP</SplitPaneHeader>
                  <div
                    style={{
                      flexGrow: 1,
                      overflow: "auto",
                    }}
                  >
                    {status === "loaded" && <InstrumentEditor />}
                    <FixedSpacer height={40} />
                  </div>
                </div>
              </>
            )}

            {!isCompactLayout && (
              <>
                <SplitPaneVerticalDivider />
                <SplitPaneHeader
                  onToggle={togglePatternsPanel}
                  collapsed={!patternsPanelOpen}
                >
                  {l10n("FIELD_ORDER")}
                </SplitPaneHeader>

                {patternsPanelOpen &&
                  (status === "loaded" ? (
                    <SequenceEditor
                      direction="horizontal"
                      sequence={songDocument?.sequence}
                      patterns={songDocument?.patterns.length}
                      playingSequence={playbackState[0]}
                    />
                  ) : (
                    <div
                      style={{
                        height: 75,
                        background: themeContext?.colors.sidebar.background,
                      }}
                    />
                  ))}
              </>
            )}
          </div>
          {!isCompactLayout && (
            <>
              <SplitPaneHorizontalDivider onMouseDown={onResizeRight} />
              <div
                id="song-editor"
                style={{
                  width: rightPaneWidth,
                  background: themeContext?.colors.sidebar.background,
                  height: "100%",
                  overflow: "hidden",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {status === "loaded" && <SongEditor />}
              </div>
            </>
          )}
        </>
      )}
    </Wrapper>
  );
};

export default StandaloneMusicPage;
