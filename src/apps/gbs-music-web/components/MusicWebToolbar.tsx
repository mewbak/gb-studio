import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { Toolbar } from "ui/toolbar/Toolbar";
import { Button } from "ui/buttons/Button";
import { DropdownButton } from "ui/buttons/DropdownButton";
import {
  MenuDivider,
  MenuItem,
  MenuItemDisabled,
  MenuItemIcon,
} from "ui/menu/Menu";
import { BlankIcon, CheckIcon, CloseIcon } from "ui/icons/Icons";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import l10n from "shared/lib/lang/l10n";
import appPixelIconUrl from "gbs-music-web/components/ui/icons/app_music_icon_pixel.png";
import { useWebFullscreen } from "ui/hooks/use-web-fullscreen";
import { SongContextBar } from "components/music/toolbar/SongContextBar";
import useWindowSize from "ui/hooks/use-window-size";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { StyledButton } from "ui/buttons/style";
import { TRACKER_REDO, TRACKER_UNDO } from "consts";
import { AboutDialog } from "gbs-music-web/components/dialog/AboutDialog";
import { saveSongFile } from "store/features/trackerDocument/trackerDocumentState";
import { useMusicWebPreferenceMenus } from "gbs-music-web/components/MusicWebPreferencesDropdowns";
import {
  isMidiSupported,
  musicMidiController,
} from "components/music/midi/musicMidiController";
import { useMusicMidiState } from "components/music/midi/useMusicMidi";

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

const MusicWebToolbar = ({
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

  const { supportsFullscreen, isFullscreen, toggleFullscreen } =
    useWebFullscreen();

  const windowSize = useWindowSize();
  const windowWidth = windowSize.width || 0;
  const midiState = useMusicMidiState();
  const supportsMidi = midiState.supported || isMidiSupported();

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
      ...(supportsFullscreen
        ? [
            <MenuDivider key="fullscreen-div" />,
            <MenuItem key={"fullscreen"} onClick={() => toggleFullscreen()}>
              <MenuItemIcon>
                {isFullscreen ? <CheckIcon /> : <BlankIcon />}
              </MenuItemIcon>
              {l10n("FIELD_FULLSCREEN")}
            </MenuItem>,
          ]
        : []),
    ],
    [
      isFullscreen,
      localeId,
      setRollView,
      setTrackerView,
      supportsFullscreen,
      toggleFullscreen,
      view,
    ],
  );

  const { themeMenu, localeMenu } = useMusicWebPreferenceMenus({
    themeId,
    localeId,
    onThemeChange,
    onLocaleChange,
  });

  const midiMenu = useMemo(() => {
    const enabledItem = (
      <MenuItem
        key="midi-enabled"
        onClick={() => {
          void musicMidiController.toggleEnabled();
        }}
        icon={midiState.enabled ? <CheckIcon /> : <BlankIcon />}
      >
        {l10n("FIELD_ENABLE_MIDI_INPUT")}
      </MenuItem>
    );

    if (!midiState.enabled) {
      return [enabledItem];
    }

    const deviceItems =
      midiState.inputs.length > 0
        ? midiState.inputs.map((input) => (
            <MenuItem
              key={input.id}
              onClick={() => {
                void musicMidiController.selectInput(input.id);
              }}
              icon={
                midiState.selectedInputId === input.id ? (
                  <CheckIcon />
                ) : (
                  <BlankIcon />
                )
              }
            >
              {input.name}
            </MenuItem>
          ))
        : [
            <MenuItemDisabled key="midi-no-devices">
              {l10n("FIELD_NO_DEVICES_FOUND")}
            </MenuItemDisabled>,
          ];

    return [enabledItem, <MenuDivider key="midi-divider" />, ...deviceItems];
  }, [midiState.enabled, midiState.inputs, midiState.selectedInputId]);

  return (
    <>
      <Wrapper>
        <Toolbar>
          <Brand>
            <DropdownButton
              label={
                <>
                  <Logo src={appPixelIconUrl} alt="GBS Music" />
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
              {supportsMidi && (
                <MenuItem subMenu={midiMenu}>
                  {l10n("MENU_MIDI_INPUT")}
                </MenuItem>
              )}
              <MenuItem subMenu={themeMenu}>{l10n("MENU_THEME")}</MenuItem>
              <MenuItem subMenu={localeMenu}>{l10n("MENU_LANGUAGE")}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => setShowAbout(true)}>
                {l10n("FIELD_ABOUT_APPNAME", { name: "GBS Music" })}
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

export default MusicWebToolbar;
