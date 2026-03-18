import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Toolbar, ToolbarTitle } from "ui/toolbar/Toolbar";
import { Button } from "ui/buttons/Button";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { MenuDivider, MenuItem, MenuItemIcon, MenuOverlay } from "ui/menu/Menu";
import {
  BlankIcon,
  CheckIcon,
  DotsIcon,
  FolderIcon,
  HelpIcon,
  InfoIcon,
  InstantiateIcon,
  NoteIcon,
} from "ui/icons/Icons";
import { FlexGrow } from "ui/spacing/Spacing";
import l10n from "shared/lib/lang/l10n";
import appIconUrl from "ui/icons/app_icon_256.png";
import {
  webLocaleOptions,
  webThemeOptions,
} from "gbs-music-web/lib/preferences";

declare const VERSION: string;
declare const COMMITHASH: string;

const Logo = styled.img`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  flex-shrink: 0;
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
  onOpenFileWorkspace: () => void;
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
  onOpenFileWorkspace,
  onOpenDirectoryWorkspace,
  onImportSong,
}: MusicWebToolbarProps) => {
  const [showAbout, setShowAbout] = useState(false);

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

  return (
    <>
      <Toolbar>
        <Brand>
          <Logo src={appIconUrl} alt="GB Studio" />
          <BrandText>GB Studio Music</BrandText>
        </Brand>
        <DropdownButton
          label={<FolderIcon />}
          showArrow={false}
          title="Workspace"
        >
          <MenuItem onClick={onCreateSong}>
            <MenuItemIcon>
              <InstantiateIcon />
            </MenuItemIcon>
            New Song
          </MenuItem>
          <MenuItem onClick={onOpenFileWorkspace}>
            <MenuItemIcon>
              <FolderIcon />
            </MenuItemIcon>
            Open File
          </MenuItem>
          {onOpenDirectoryWorkspace ? (
            <MenuItem onClick={onOpenDirectoryWorkspace}>
              <MenuItemIcon>
                <FolderIcon />
              </MenuItemIcon>
              Open Folder
            </MenuItem>
          ) : null}
          {onImportSong ? <MenuDivider /> : null}
          {onImportSong ? (
            <MenuItem onClick={onImportSong}>
              <MenuItemIcon>
                <NoteIcon />
              </MenuItemIcon>
              Import .uge File...
            </MenuItem>
          ) : null}
        </DropdownButton>
        <FlexGrow />
        <ToolbarTitle>GB Studio Music</ToolbarTitle>
        <FlexGrow />
        <DropdownButton
          label={<DotsIcon />}
          showArrow={false}
          menuDirection="right"
          title={l10n("MENU_SETTINGS")}
        >
          <MenuItem subMenu={themeMenu}>
            <MenuItemIcon>
              <InfoIcon />
            </MenuItemIcon>
            {l10n("MENU_THEME")}
          </MenuItem>
          <MenuItem subMenu={localeMenu}>
            <MenuItemIcon>
              <InfoIcon />
            </MenuItemIcon>
            {l10n("MENU_LANGUAGE")}
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={() => setShowAbout(true)}>
            <MenuItemIcon>
              <HelpIcon />
            </MenuItemIcon>
            {l10n("MENU_ABOUT")}
          </MenuItem>
        </DropdownButton>
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
                <AboutTitle>GB Studio Music</AboutTitle>
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
