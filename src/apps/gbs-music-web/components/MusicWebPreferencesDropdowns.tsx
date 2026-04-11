import React, { useMemo } from "react";
import { DropdownButton } from "ui/buttons/DropdownButton";
import { MenuItem, MenuItemIcon } from "ui/menu/Menu";
import {
  BlankIcon,
  CheckIcon,
  LangIcon,
  MoonIcon,
  SunIcon,
} from "ui/icons/Icons";
import l10n from "shared/lib/lang/l10n";
import { webLocaleOptions } from "gbs-music-web/lib/preferences";

interface MusicWebPreferenceMenuProps {
  themeId: string;
  localeId: string;
  onThemeChange: (themeId: string) => void;
  onLocaleChange: (localeId: string) => void;
}

interface MusicWebPreferenceDropdownProps extends MusicWebPreferenceMenuProps {
  menuDirection?: "left" | "right";
}

const getLocaleBadgeLabel = (localeId: string) => {
  const parts = localeId.split("-");
  return (parts[parts.length - 1] || localeId).slice(0, 2).toUpperCase();
};

export const useMusicWebPreferenceMenus = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
}: MusicWebPreferenceMenuProps) => {
  const themeMenu = useMemo(
    () => [
      <MenuItem key={`light${localeId}`} onClick={() => onThemeChange("light")}>
        <MenuItemIcon>
          {themeId === "light" ? <CheckIcon /> : <BlankIcon />}
        </MenuItemIcon>
        {l10n("MENU_THEME_LIGHT")}
      </MenuItem>,
      <MenuItem key="dark" onClick={() => onThemeChange("dark")}>
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

  const localeBadgeLabel = useMemo(
    () => getLocaleBadgeLabel(localeId),
    [localeId],
  );

  const themeIcon = themeId === "dark" ? <MoonIcon /> : <SunIcon />;

  return {
    localeBadgeLabel,
    localeMenu,
    themeIcon,
    themeMenu,
  };
};

export const MusicWebLocaleDropdown = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
  menuDirection = "left",
}: MusicWebPreferenceDropdownProps) => {
  const { localeMenu } = useMusicWebPreferenceMenus({
    themeId,
    localeId,
    onThemeChange,
    onLocaleChange,
  });

  return (
    <DropdownButton
      label={<LangIcon />}
      title={l10n("MENU_LANGUAGE")}
      menuDirection={menuDirection}
    >
      {localeMenu}
    </DropdownButton>
  );
};

export const MusicWebThemeDropdown = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
  menuDirection = "right",
}: MusicWebPreferenceDropdownProps) => {
  const { themeIcon, themeMenu } = useMusicWebPreferenceMenus({
    themeId,
    localeId,
    onThemeChange,
    onLocaleChange,
  });

  return (
    <DropdownButton
      label={themeIcon}
      title={l10n("MENU_THEME")}
      menuDirection={menuDirection}
    >
      {themeMenu}
    </DropdownButton>
  );
};
