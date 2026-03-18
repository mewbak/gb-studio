import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Toolbar } from "ui/toolbar/Toolbar";
import { Button } from "ui/buttons/Button";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { MenuDivider, MenuItem, MenuItemIcon, MenuOverlay } from "ui/menu/Menu";
import {
  BlankIcon,
  CheckIcon,
  FolderIcon,
  FullscreenCloseIcon,
  FullscreenIcon,
} from "ui/icons/Icons";
import { FlexGrow } from "ui/spacing/Spacing";
import l10n from "shared/lib/lang/l10n";
import appIconUrl from "ui/icons/app_icon_256.png";
import {
  webLocaleOptions,
  webThemeOptions,
} from "gbs-music-web/lib/preferences";
import { useWebFullscreen } from "ui/hooks/use-web-fullscreen";

declare const VERSION: string;
declare const COMMITHASH: string;

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
  width: min(420px, calc(100vw - 32px));
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

export const MUSIC_WEB_TOOLBAR_HEIGHT = 38;

export const MusicWebToolbar = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
  onCreateSong,
  onOpenDirectoryWorkspace,
  onImportSong,
}: MusicWebToolbarProps) => {
  const [showAbout, setShowAbout] = useState(false);

  const fileMenu = useMemo(() => {
    return [
      <MenuItem onClick={onCreateSong}>{l10n("TOOL_ADD_SONG_LABEL")}</MenuItem>,
      ...(onImportSong
        ? [
            <MenuItem onClick={onImportSong}>
              {l10n("FIELD_OPEN_FILE")}
            </MenuItem>,
          ]
        : []),
      ...(onOpenDirectoryWorkspace
        ? [
            <MenuDivider />,
            <MenuItem onClick={onOpenDirectoryWorkspace}>
              {l10n("FIELD_OPEN_FOLDER")}
            </MenuItem>,
          ]
        : []),
    ];
  }, [onCreateSong, onImportSong, onOpenDirectoryWorkspace]);

  const themeMenu = useMemo(
    () =>
      webThemeOptions.map((option) => (
        <MenuItem key={option.id} onClick={() => onThemeChange(option.id)}>
          <MenuItemIcon>
            {themeId === option.id ? <CheckIcon /> : <BlankIcon />}
          </MenuItemIcon>
          {option.label}
        </MenuItem>
      )),
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

  return (
    <>
      <Toolbar>
        <Brand>
          <DropdownButton
            label={
              <>
                <Logo src={appIconUrl} alt="GB Studio" />
                <BrandText>GBS Music</BrandText>
              </>
            }
            // variant="transparent"
            // showArrow={false}
            menuDirection="left"
            title={l10n("MENU_SETTINGS")}
          >
            <MenuItem subMenu={fileMenu}>{l10n("MENU_FILE")}</MenuItem>
            <MenuItem subMenu={themeMenu}>{l10n("MENU_THEME")}</MenuItem>
            <MenuItem subMenu={localeMenu}>{l10n("MENU_LANGUAGE")}</MenuItem>
            <MenuDivider />
            <MenuItem onClick={() => setShowAbout(true)}>
              {l10n("MENU_ABOUT")}
            </MenuItem>
          </DropdownButton>
        </Brand>

        <FlexGrow />
        <Button onClick={toggleFullscreen}>
          {isFullscreen ? <FullscreenCloseIcon /> : <FullscreenIcon />}
        </Button>
      </Toolbar>
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
            <AboutText>Standalone shared music editor for GB Studio.</AboutText>
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

export default MusicWebToolbar;
