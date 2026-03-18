import React, { useCallback, useMemo, useState } from "react";
import { musicSelectors } from "store/features/entities/entitiesState";
import { FlatList } from "ui/lists/FlatList";
import editorActions from "store/features/editor/editorActions";
import { EntityListItem, EntityListSearch } from "ui/lists/EntityListItem";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";
import { PlusIcon, SearchIcon } from "ui/icons/Icons";
import { SplitPaneHeader } from "ui/splitpane/SplitPaneHeader";
import useSplitPane from "ui/hooks/use-split-pane";
import styled from "styled-components";
import { SplitPaneVerticalDivider } from "ui/splitpane/SplitPaneDivider";
import { requestAddNewSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { assetPath } from "shared/lib/helpers/assets";
import { stripInvalidPathCharacters } from "shared/lib/helpers/stripInvalidFilenameCharacters";
import { MenuDivider, MenuItem } from "ui/menu/Menu";
import projectActions from "store/features/project/projectActions";
import { ListItem } from "ui/lists/ListItem";
import useToggleableList from "ui/hooks/use-toggleable-list";
import {
  FileSystemNavigatorItem,
  buildAssetNavigatorItems,
} from "shared/lib/assets/buildAssetNavigatorItems";
import { FixedSpacer } from "ui/spacing/Spacing";
import { MusicAsset } from "shared/lib/resources/types";
import { NavigatorInstrumentsPane } from "./NavigatorInstrumentsPane";
import { DropdownButton } from "ui/buttons/DropdownButton";

const COLLAPSED_SIZE = 30;

interface NavigatorSongsProps {
  height: number;
  modified: boolean;
  selectedSongId: string;
  onCreateSong?: () => void;
  onImportSong?: () => void;
  onSelectSong?: (id: string) => void;
}

interface NavigatorItem {
  id: string;
  name: string;
}

const Pane = styled.div`
  overflow: hidden;
`;

const EmptyState = styled.div`
  display: flex;
  text-align: center;
  flex-direction: column;
  height: 100%;
  padding: 36px 12px;
`;

export const NavigatorSongs = ({
  height,
  modified,
  selectedSongId,
  onSelectSong,
  onCreateSong,
  onImportSong,
}: NavigatorSongsProps) => {
  const dispatch = useAppDispatch();

  const [addSongMode, setAddSongMode] = useState(false);
  const allSongs = useAppSelector((state) => musicSelectors.selectAll(state));
  const songsLookup = useAppSelector((state) =>
    musicSelectors.selectEntities(state),
  );
  const navigationId = useAppSelector((state) => state.editor.selectedSongId);

  const {
    values: openFolders,
    isSet: isFolderOpen,
    toggle: toggleFolderOpen,
    set: openFolder,
    unset: closeFolder,
  } = useToggleableList<string>([]);

  const [songsSearchTerm, setSongsSearchTerm] = useState("");
  const [songsSearchEnabled, setSongsSearchEnabled] = useState(false);

  const nestedSongItems = useMemo(
    () => buildAssetNavigatorItems(allSongs, openFolders, songsSearchTerm),
    [allSongs, openFolders, songsSearchTerm],
  );

  const setSelectedSongId = useCallback(
    (id: string) => {
      if (onSelectSong) {
        onSelectSong(id);
        return;
      }
      dispatch(editorActions.setSelectedSongId(id));
    },
    [dispatch, onSelectSong],
  );

  const selectedSong = songsLookup[selectedSongId];

  const [splitSizes, setSplitSizes] = useState([100, 200]);
  const [onDragStart, togglePane] = useSplitPane({
    sizes: splitSizes,
    setSizes: setSplitSizes,
    minSizes: [COLLAPSED_SIZE, COLLAPSED_SIZE],
    collapsedSize: COLLAPSED_SIZE,
    reopenSize: 200,
    maxTotal: height,
    direction: "vertical",
  });

  const showInstrumentList = selectedSong && selectedSong.type === "uge";

  const addSong = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation();
      setAddSongMode(true);
    },
    [],
  );

  const [renameId, setRenameId] = useState("");

  const listenForRenameStart = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        setRenameId(navigationId);
      }
    },
    [navigationId],
  );

  const onRenameSongComplete = useCallback(
    (name: string) => {
      if (renameId) {
        dispatch(
          projectActions.renameMusicAsset({
            musicId: renameId,
            newFilename: stripInvalidPathCharacters(name),
          }),
        );
      }
      setRenameId("");
    },
    [dispatch, renameId],
  );

  const onRenameCancel = useCallback(() => {
    setRenameId("");
  }, []);

  const renderContextMenu = useCallback(
    (item: NavigatorItem) => {
      return [
        <MenuItem key="rename" onClick={() => setRenameId(item.id)}>
          {l10n("FIELD_RENAME")}
        </MenuItem>,
        <MenuDivider key="div-delete" />,
        <MenuItem
          key="delete"
          onClick={() =>
            dispatch(projectActions.removeMusicAsset({ musicId: item.id }))
          }
        >
          {l10n("MENU_DELETE_SONG")}
        </MenuItem>,
      ];
    },
    [dispatch],
  );

  const renderLabel = useCallback(
    (item: FileSystemNavigatorItem<MusicAsset>) => {
      if (item.type === "folder") {
        return (
          <div onClick={() => toggleFolderOpen(item.id)}>{item.filename}</div>
        );
      }
      return `${item.filename}${
        modified && item.id === selectedSongId ? "*" : ""
      }`;
    },
    [modified, selectedSongId, toggleFolderOpen],
  );

  const showSongsSearch = songsSearchEnabled && splitSizes[0] > 60;

  const toggleSongsSearchEnabled = useCallback(() => {
    if (songsSearchEnabled) {
      setSongsSearchTerm("");
    }
    setSongsSearchEnabled(!songsSearchEnabled);
  }, [songsSearchEnabled]);

  return (
    <>
      <Pane style={{ height: showInstrumentList ? splitSizes[0] : height }}>
        <SplitPaneHeader
          onToggle={() => togglePane(0)}
          collapsed={Math.floor(splitSizes[0]) <= COLLAPSED_SIZE}
          buttons={
            <>
              <FixedSpacer width={5} />
              {onCreateSong || onImportSong ? (
                <DropdownButton
                  label={<PlusIcon />}
                  showArrow={false}
                  variant="transparent"
                  size="small"
                  menuDirection="right"
                  title={l10n("TOOL_ADD_SONG_LABEL")}
                >
                  {onCreateSong && (
                    <MenuItem onClick={onCreateSong}>
                      {l10n("TOOL_ADD_SONG_LABEL")}
                    </MenuItem>
                  )}
                  {onImportSong && (
                    <MenuItem onClick={onImportSong}>
                      {l10n("FIELD_OPEN_FILE")}
                    </MenuItem>
                  )}
                </DropdownButton>
              ) : (
                <Button
                  variant="transparent"
                  size="small"
                  title={l10n("TOOL_ADD_SONG_LABEL")}
                  onClick={addSong}
                >
                  <PlusIcon />
                </Button>
              )}
              <Button
                variant={songsSearchEnabled ? "primary" : "transparent"}
                size="small"
                title={l10n("TOOLBAR_SEARCH")}
                onClick={toggleSongsSearchEnabled}
              >
                <SearchIcon />
              </Button>
            </>
          }
        >
          {l10n("FIELD_SONGS")}
        </SplitPaneHeader>

        {showSongsSearch && (
          <EntityListSearch
            type="search"
            value={songsSearchTerm}
            onChange={(e) => setSongsSearchTerm(e.currentTarget.value)}
            placeholder={l10n("TOOLBAR_SEARCH")}
            autoFocus
          />
        )}

        {addSongMode && (
          <ListItem>
            <EntityListItem
              type="song"
              item={{ id: "", name: "song_template" }}
              rename
              onRename={(filename) => {
                if (filename) {
                  const path = assetPath("music", {
                    filename: `${stripInvalidPathCharacters(filename)}.uge`,
                  });
                  dispatch(requestAddNewSongFile(path));
                }
                setAddSongMode(false);
              }}
              onRenameCancel={() => {
                setAddSongMode(false);
              }}
            />
          </ListItem>
        )}
        {nestedSongItems.length > 0 || songsSearchTerm.length > 0 ? (
          <FlatList
            selectedId={selectedSongId}
            items={nestedSongItems}
            setSelectedId={setSelectedSongId}
            height={
              (showInstrumentList ? splitSizes[0] : height) -
              (showSongsSearch ? 60 : 30)
            }
            onKeyDown={(e: KeyboardEvent, item) => {
              listenForRenameStart(e);
              if (item?.type === "folder") {
                if (e.key === "ArrowRight") {
                  openFolder(navigationId);
                } else if (e.key === "ArrowLeft") {
                  closeFolder(navigationId);
                }
              }
            }}
          >
            {({ item }) => (
              <EntityListItem
                type={item.type === "folder" ? "folder" : "song"}
                item={item}
                rename={item.type === "file" && renameId === item.id}
                onRename={onRenameSongComplete}
                onRenameCancel={onRenameCancel}
                renderContextMenu={
                  item.type === "file" && !item.asset?.plugin
                    ? renderContextMenu
                    : undefined
                }
                collapsable={item.type === "folder"}
                collapsed={!isFolderOpen(item.name)}
                onToggleCollapse={() => toggleFolderOpen(item.name)}
                nestLevel={item.nestLevel}
                renderLabel={renderLabel}
              />
            )}
          </FlatList>
        ) : (
          <EmptyState>
            <h2>{l10n("MESSAGE_NO_SONGS_FOUND")}</h2>
          </EmptyState>
        )}
      </Pane>
      {showInstrumentList && (
        <>
          <SplitPaneVerticalDivider onMouseDown={onDragStart(0)} />
          <NavigatorInstrumentsPane
            height={splitSizes[1]}
            onToggle={() => togglePane(1)}
          />
        </>
      )}
    </>
  );
};
