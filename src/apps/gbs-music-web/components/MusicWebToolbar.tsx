import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { Toolbar } from "ui/toolbar/Toolbar";
import { Button } from "ui/buttons/Button";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { MenuDivider, MenuItem, MenuItemIcon } from "ui/menu/Menu";
import {
  BlankIcon,
  CheckIcon,
  CloseIcon,
  FullscreenCloseIcon,
  FullscreenIcon,
} from "ui/icons/Icons";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import l10n from "shared/lib/lang/l10n";
import appPixelIconUrl from "gbs-music-web/components/ui/icons/app_music_icon_pixel.png";
import { webLocaleOptions } from "gbs-music-web/lib/preferences";
import { useWebFullscreen } from "ui/hooks/use-web-fullscreen";
import { SongContextBar } from "components/music/toolbar/SongContextBar";
import useWindowSize from "ui/hooks/use-window-size";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { StyledButton } from "ui/buttons/style";
import { TRACKER_REDO, TRACKER_UNDO } from "consts";
import { AboutDialog } from "gbs-music-web/components/dialog/AboutDialog";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";

const COMPACT_LAYOUT_BREAKPOINT = 590;

const Wrapper = styled.div`
  ${StyledButton} {
    svg {
      // Real nitpick, align play/stop buttons
      // with save/export panel in mobile view
      padding: 0 1.25px;
    }
  }
`;

const Logo = styled.img`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: -5px;
  margin-right: 5px;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const BrandText = styled.div`
  font-weight: bold;
  white-space: nowrap;
`;

interface MusicWebToolbarProps {
  themeId: string;
  localeId: string;
  onThemeChange: (themeId: string) => void;
  onLocaleChange: (localeId: string) => void;
  onCreateSong: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onImportSong?: () => void;
  onCloseWorkspace?: () => void;
}

export const MusicWebToolbar = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
  onCreateSong,
  onOpenDirectoryWorkspace,
  onImportSong,
  onCloseWorkspace,
}: MusicWebToolbarProps) => {
  const dispatch = useAppDispatch();

  const [showAbout, setShowAbout] = useState(false);

  const view = useAppSelector((state) => state.tracker.view);

  const { isFullscreen, toggleFullscreen } = useWebFullscreen();

  const windowSize = useWindowSize();
  const windowWidth = windowSize.width || 0;

  const isCompactLayout =
    windowWidth > 0 && windowWidth <= COMPACT_LAYOUT_BREAKPOINT;

  const setTrackerView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("tracker"));
  }, [dispatch]);

  const setRollView = useCallback(() => {
    dispatch(trackerActions.setViewAndSave("roll"));
  }, [dispatch]);

  const onUndo = useCallback(() => {
    dispatch({ type: TRACKER_UNDO });
  }, [dispatch]);

  const onRedo = useCallback(() => {
    dispatch({ type: TRACKER_REDO });
  }, [dispatch]);

  const onSave = useCallback(() => {
    dispatch(saveSongFile());
  }, [dispatch]);

  const fileMenu = useMemo(() => {
    return [
      <MenuItem key={`new${localeId}`} onClick={onCreateSong}>
        {l10n("FIELD_NEW_FILE")}
      </MenuItem>,
      <MenuDivider key="dir-open" />,
      ...(onImportSong
        ? [
            <MenuItem key="open" onClick={onImportSong}>
              {l10n("FIELD_OPEN_FILE")}
            </MenuItem>,
          ]
        : []),
      ...(onOpenDirectoryWorkspace
        ? [
            <MenuItem key="dir" onClick={onOpenDirectoryWorkspace}>
              {l10n("FIELD_OPEN_FOLDER")}
            </MenuItem>,
          ]
        : []),
      <MenuDivider key="dir-save" />,
      <MenuItem key="save" onClick={onSave}>
        {l10n("MENU_SAVE")}
      </MenuItem>,
      <MenuDivider key="dir-close" />,
      <MenuItem onClick={onCloseWorkspace}>
        {l10n("FIELD_CLOSE_PROJECT")}
      </MenuItem>,
    ];
  }, [
    localeId,
    onCreateSong,
    onImportSong,
    onOpenDirectoryWorkspace,
    onSave,
    onCloseWorkspace,
  ]);

  const editMenu = useMemo(() => {
    return [
      <MenuItem key={`undo${localeId}`} onClick={onUndo}>
        {l10n("MENU_UNDO")}
      </MenuItem>,
      <MenuItem key="redo" onClick={onRedo}>
        {l10n("MENU_REDO")}
      </MenuItem>,
    ];
  }, [onRedo, onUndo, localeId]);

  const viewMenu = useMemo(
    () => [
      <MenuItem
        key={`roll${localeId}`}
        onClick={setRollView}
        icon={view === "roll" ? <CheckIcon /> : <BlankIcon />}
      >
        {l10n("FIELD_PIANO_ROLL")}
      </MenuItem>,
      <MenuItem
        key="tracker"
        onClick={setTrackerView}
        icon={view === "tracker" ? <CheckIcon /> : <BlankIcon />}
      >
        {l10n("FIELD_TRACKER")}
      </MenuItem>,
      <MenuDivider key="fullscreen-div" />,
      <MenuItem key={"fullscreen"} onClick={() => toggleFullscreen()}>
        <MenuItemIcon>
          {isFullscreen ? <CheckIcon /> : <BlankIcon />}
        </MenuItemIcon>
        {l10n("FIELD_FULLSCREEN")}
      </MenuItem>,
    ],
    [
      isFullscreen,
      localeId,
      setRollView,
      setTrackerView,
      toggleFullscreen,
      view,
    ],
  );

  const themeMenu = useMemo(
    () => [
      <MenuItem key={`light${localeId}`} onClick={() => onThemeChange("light")}>
        <MenuItemIcon>
          {themeId === "light" ? <CheckIcon /> : <BlankIcon />}
        </MenuItemIcon>
        {l10n("MENU_THEME_LIGHT")}
      </MenuItem>,
      <MenuItem key={"dark"} onClick={() => onThemeChange("dark")}>
        <MenuItemIcon>
          {themeId === "dark" ? <CheckIcon /> : <BlankIcon />}
        </MenuItemIcon>
        {l10n("MENU_THEME_DARK")}
      </MenuItem>,
    ],
    [localeId, onThemeChange, themeId],
  );

  const localeMenu = useMemo(
    () =>
      webLocaleOptions.map((option) => (
        <MenuItem key={option.id} onClick={() => onLocaleChange(option.id)}>
          <MenuItemIcon>
            {localeId === option.id ? <CheckIcon /> : <BlankIcon />}
          </MenuItemIcon>
          {option.label}
        </MenuItem>
      )),
    [localeId, onLocaleChange],
  );

  return (
    <>
      <Wrapper>
        <Toolbar>
          <Brand>
            <DropdownButton
              label={
                <>
                  <Logo src={appPixelIconUrl} alt="GB Studio" />
                  <BrandText>GBS Music</BrandText>
                </>
              }
              menuDirection="left"
              title={l10n("MENU_SETTINGS")}
            >
              <MenuItem subMenu={fileMenu}>{l10n("MENU_FILE")}</MenuItem>
              <MenuDivider />
              <MenuItem subMenu={editMenu}>{l10n("MENU_EDIT")}</MenuItem>
              <MenuDivider />
              <MenuItem subMenu={viewMenu}>{l10n("MENU_VIEW")}</MenuItem>
              <MenuItem subMenu={themeMenu}>{l10n("MENU_THEME")}</MenuItem>
              <MenuItem subMenu={localeMenu}>{l10n("MENU_LANGUAGE")}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => setShowAbout(true)}>
                About GBS Music
              </MenuItem>
            </DropdownButton>
          </Brand>
          <FlexGrow />
          <SongContextBar isCompactLayout={isCompactLayout} />

          {!isCompactLayout && (
            <>
              <FlexGrow />
              <FixedSpacer width={58} />
              <Button onClick={onCloseWorkspace}>
                <CloseIcon />
              </Button>
            </>
          )}
        </Toolbar>
      </Wrapper>
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    </>
  );
};
