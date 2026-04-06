import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { Toolbar } from "ui/toolbar/Toolbar";
import { Button } from "ui/buttons/Button";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { MenuDivider, MenuItem, MenuItemIcon, MenuOverlay } from "ui/menu/Menu";
import {
  BlankIcon,
  CheckIcon,
  FullscreenCloseIcon,
  FullscreenIcon,
} from "ui/icons/Icons";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import l10n from "shared/lib/lang/l10n";
import appIconUrl from "ui/icons/app_icon_256.png";
import { webLocaleOptions } from "gbs-music-web/lib/preferences";
import { useWebFullscreen } from "ui/hooks/use-web-fullscreen";
import { SongContextBar } from "components/music/toolbar/SongContextBar";
import useWindowSize from "ui/hooks/use-window-size";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { StyledButton } from "ui/buttons/style";
import { TRACKER_REDO, TRACKER_UNDO } from "consts";

declare const VERSION: string;
declare const COMMITHASH: string;

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

const AboutOverlay = styled(MenuOverlay)`
  background: rgba(0, 0, 0, 0.35);
`;

const AboutModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(300px, calc(100vw - 32px));
  transform: translate(-50%, -50%);
  background: ${(props) => props.theme.colors.card.background};
  color: ${(props) => props.theme.colors.card.text};
  border: 1px solid ${(props) => props.theme.colors.card.border};
  box-shadow: ${(props) => props.theme.colors.card.boxShadow};
  border-radius: 4px;
  padding: 24px;
  z-index: 1001;
`;

const AboutHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const AboutLogo = styled.img`
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
  flex-shrink: 0;
`;

const AboutTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
`;

const AboutText = styled.p`
  margin: 0 0 10px;
  line-height: 1.5;
`;

const AboutFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
`;

interface MusicWebToolbarProps {
  themeId: string;
  localeId: string;
  onThemeChange: (themeId: string) => void;
  onLocaleChange: (localeId: string) => void;
  onCreateSong: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onImportSong?: () => void;
}

export const MusicWebToolbar = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
  onCreateSong,
  onOpenDirectoryWorkspace,
  onImportSong,
}: MusicWebToolbarProps) => {
  const dispatch = useAppDispatch();

  const [showAbout, setShowAbout] = useState(false);

  const view = useAppSelector((state) => state.tracker.view);

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

  const fileMenu = useMemo(() => {
    return [
      <MenuItem key="new" onClick={onCreateSong}>
        {l10n("TOOL_ADD_SONG_LABEL")}
      </MenuItem>,
      ...(onImportSong
        ? [
            <MenuItem key="open" onClick={onImportSong}>
              {l10n("FIELD_OPEN_FILE")}
            </MenuItem>,
          ]
        : []),
      ...(onOpenDirectoryWorkspace
        ? [
            <MenuDivider key="dir-div" />,
            <MenuItem key="dir" onClick={onOpenDirectoryWorkspace}>
              {l10n("FIELD_OPEN_FOLDER")}
            </MenuItem>,
          ]
        : []),
    ];
  }, [onCreateSong, onImportSong, onOpenDirectoryWorkspace]);

  const editMenu = useMemo(() => {
    return [
      <MenuItem key="undo" onClick={onUndo}>
        {l10n("MENU_UNDO")}
      </MenuItem>,
      <MenuItem key="redo" onClick={onRedo}>
        {l10n("MENU_REDO")}
      </MenuItem>,
    ];
  }, [onRedo, onUndo]);

  const viewMenu = useMemo(
    () => [
      <MenuItem
        key="roll"
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
    ],
    [setRollView, setTrackerView, view],
  );

  const themeMenu = useMemo(
    () => [
      <MenuItem key={"light"} onClick={() => onThemeChange("light")}>
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
    [onThemeChange, themeId],
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

  const { isFullscreen, toggleFullscreen } = useWebFullscreen();

  const windowSize = useWindowSize();
  const windowWidth = windowSize.width || 0;

  const isCompactLayout =
    windowWidth > 0 && windowWidth <= COMPACT_LAYOUT_BREAKPOINT;

  return (
    <>
      <Wrapper>
        <Toolbar>
          <Brand>
            <DropdownButton
              label={
                <>
                  <Logo src={appIconUrl} alt="GB Studio" />
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
                {l10n("MENU_ABOUT")}
              </MenuItem>
            </DropdownButton>
          </Brand>
          <FlexGrow />
          <SongContextBar isCompactLayout={isCompactLayout} />

          {!isCompactLayout && (
            <>
              <FlexGrow />
              <FixedSpacer width={58} />
              <Button onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenCloseIcon /> : <FullscreenIcon />}
              </Button>
            </>
          )}
        </Toolbar>
      </Wrapper>
      {showAbout && (
        <>
          <AboutOverlay onClick={() => setShowAbout(false)} />
          <AboutModal
            role="dialog"
            aria-modal="true"
            aria-label={l10n("MENU_ABOUT")}
          >
            <AboutHeader>
              <AboutLogo src={appIconUrl} alt="GB Studio" />
              <div>
                <AboutTitle>GBS Music</AboutTitle>
                <div>
                  {VERSION} ({COMMITHASH})
                </div>
              </div>
            </AboutHeader>
            <AboutText>{l10n("GBSTUDIO_DESCRIPTION")}</AboutText>
            <AboutText>{l10n("GBSTUDIO_COPYRIGHT")}</AboutText>
            <AboutFooter>
              <Button onClick={() => setShowAbout(false)}>
                {l10n("FIELD_CLOSE")}
              </Button>
            </AboutFooter>
          </AboutModal>
        </>
      )}
    </>
  );
};
