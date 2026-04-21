import React, { lazy, Suspense, useState } from "react";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";
import appIconUrl from "gbs-music-web/components/ui/icons/app_music_icon_180.png";
import {
  SplashAppTitleWrapper,
  SplashContent,
  SplashForm,
  SplashLogo,
  SplashScroll,
  SplashSidebar,
  SplashTab,
  SplashTabLink,
  SplashWindow,
} from "ui/splash/Splash";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import styled, { css, keyframes } from "styled-components";
import { musicExamples } from "gbs-music-web/data/musicExamples";
import ugeIcon from "ui/icons/uge_128.png";
import { StyledButton } from "ui/buttons/style";
import { Label } from "ui/form/Label";
import { FormRow } from "ui/form/layout/FormLayout";
import { TextField } from "ui/form/TextField";
import { useLocalStorageState } from "ui/hooks/use-local-storage-state";
import { StyledSplashWindow } from "ui/splash/style";
import useWindowSize from "ui/hooks/use-window-size";
import {
  StyledMobileListMenu,
  StyledMobileListMenuItem,
  StyledMobileListMenuCaret,
  StyledMobileListMenuLink,
} from "gbs-music-web/components/ui/style";
import { CaretRightIcon } from "ui/icons/Icons";
import { MusicWebViewSelect } from "gbs-music-web/components/MusicWebViewSelect";

const COMPACT_LAYOUT_BREAKPOINT = 840;

const MusicWebCredits = lazy(
  () => import("gbs-music-web/components/MusicWebCredits"),
);

const MusicWebLocaleDropdown = lazy(() =>
  import("gbs-music-web/components/MusicWebPreferencesDropdowns").then(
    (module) => ({
      default: module.MusicWebLocaleDropdown,
    }),
  ),
);

const MusicWebThemeDropdown = lazy(() =>
  import("gbs-music-web/components/MusicWebPreferencesDropdowns").then(
    (module) => ({
      default: module.MusicWebThemeDropdown,
    }),
  ),
);

const StyledSplashPage = styled.div`
  background: radial-gradient(
    circle at 50% 40%,
    #e9a1ab 0%,
    #d1456d 26%,
    #982c51 50%,
    #1f1828 100%
  );
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;

  @media (max-width: 840px) {
    justify-content: flex-start;
    overflow: auto;

    ${SplashSidebar} {
      width: 100%;
      height: auto;
    }

    ${SplashLogo} {
      display: flex;
      justify-content: center;
      margin-top: 10px;
      margin-bottom: 20px;
      img {
        width: 160px;
        height: 160px;
      }
    }

    ${SplashAppTitleWrapper} {
      color: #fff;
      font-size: 16px;
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
    }

    ${StyledSplashWindow} {
      flex-direction: column;
    }

    ${SplashSidebar} {
      background: transparent;
      box-shadow: none;
    }

    ${SplashContent} {
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      padding: 30px 0px 20px 0px;
      border-top: 1px solid ${(props) => props.theme.colors.sidebar.border};
      box-shadow: 0px -5px 10px rgba(0, 0, 0, 0.1);
    }
  }

  @media (max-width: 840px) {
    ${SplashLogo} {
      img {
        width: 120px;
        height: 120px;
      }
    }
  }
`;

const StyledSplashWindowChrome = styled.div`
  position: relative;
  width: 730px;
  height: 430px;
  min-height: 430px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 0 40px -10px rgba(0, 0, 0, 0.3),
    0 0 25px -15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(128, 128, 128, 0.5);

  @media (max-width: 840px) {
    width: 100dvw;
    height: auto;
    border: 0;
    box-shadow: none;
    border-radius: 0;
    overflow: visible;

    max-width: 500px;
    min-height: auto;
    margin: 0px auto;
  }
`;

const fadeIn = keyframes`
from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledSplashPreferenceBar = styled.div`
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  flex-shrink: 0;

  display: flex;
  opacity: 0;
  animation: ${fadeIn} 1s normal forwards;

  ${StyledButton} {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    svg {
      fill: #fff;
    }
  }

  @media (max-width: 840px) {
    top: 10px;
    left: 10px;
    right: 10px;
    height: 58px;
  }
`;

const StyledSplashTabs = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  @media (max-width: 840px) {
    display: none;
  }
`;

const StyledSplashRestorePanel = styled.div<{
  $variant?: "glass";
  $visible?: boolean;
}>`
  display: flex;
  border: 1px solid ${(props) => props.theme.colors.panel.border};
  background: ${(props) => props.theme.colors.panel.background};
  color: ${(props) => props.theme.colors.panel.text};

  border-radius: 4px;
  padding: 10px;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  flex-grow: 1;

  span {
    flex-grow: 1;
  }

  transition: opacity 0.3s ease-in-out;
  opacity: 1;

  ${(props) =>
    props.$visible === false &&
    css`
      opacity: 0;
      pointer-events: none;
    `}

  ${(props) =>
    props.$variant === "glass" &&
    css`
      color: #fff;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding-left: 20px;
      gap: 20px;

      ${StyledButton} {
        color: #fff;
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
    `}
`;

const StyledSplashSectionHeader = styled.div<{ $sticky?: boolean }>`
  background-color: ${(props) => props.theme.colors.sidebar.header.background};
  color: ${(props) => props.theme.colors.sidebar.header.text};
  border-top: 1px solid ${(props) => props.theme.colors.sidebar.header.border};
  border-bottom: 1px solid
    ${(props) => props.theme.colors.sidebar.header.border};
  padding: 20px 20px;
  font-size: 16px;
  font-weight: bold;

  ${(props) =>
    props.$sticky
      ? css`
          position: sticky;
          top: 0;
          z-index: 1;
        `
      : ""}
`;

interface SplashExampleMusicTrackProps {
  name: string;
  artist: string;
  onClick: () => void;
}

const SplashProjectWrapper = styled.button`
  position: relative;
  display: flex;
  text-align: left;
  background: ${(props) => props.theme.colors.input.background};
  color: ${(props) => props.theme.colors.text};
  border: 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.input.border};
  border-radius: 0px;
  padding: 15px 20px;
  width: 100%;

  img {
    width: 42px;
    margin-right: 10px;
  }

  &:hover {
    background: ${(props) => props.theme.colors.input.hoverBackground};
  }

  &:active {
    background: ${(props) => props.theme.colors.input.activeBackground};
  }

  &:focus {
    background: transparent;
    box-shadow: inset 0 0 0px 2px #c92c61;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const SplashProjectDetails = styled.span`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SplashProjectName = styled.span`
  display: block;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SplashProjectArtist = styled.span`
  display: block;
  font-size: 12px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledFileActions = styled.div`
  padding: 0px 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 840px) {
    ${StyledButton} {
      width: 100%;
      height: 50px;
    }
  }
`;

const StyledSplashFooter = styled.div`
  text-align: center;
  color: #fff;
  padding: 20px;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);

  a {
    color: #fff;
    font-weight: bold;
  }

  @media (max-width: 840px) {
    padding: 40px 20px;
  }
`;

const SplashExampleMusicTrack = ({
  name,
  artist,
  onClick,
}: SplashExampleMusicTrackProps) => (
  <SplashProjectWrapper onClick={onClick}>
    <img src={ugeIcon} alt="" draggable={false} />
    <SplashProjectDetails>
      <SplashProjectName>{name}</SplashProjectName>
      <SplashProjectArtist>{artist}</SplashProjectArtist>
    </SplashProjectDetails>
  </SplashProjectWrapper>
);

interface MusicWebSplashProps {
  themeId: string;
  localeId: string;
  onThemeChange: (themeId: string) => void;
  onLocaleChange: (localeId: string) => void;
  onCreateSong: (name: string, artist: string) => void;
  onImportSong?: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onRestoreBackup?: () => void;
  onOpenExample: (name: string, filename: string, url: string) => void;
  initialArtist?: string;
}

const ARTIST_STORAGE_KEY = "gbsMusicWeb:artist";

export const MusicWebSplash = ({
  themeId,
  localeId,
  onThemeChange,
  onLocaleChange,
  onCreateSong,
  onImportSong,
  onOpenDirectoryWorkspace,
  onRestoreBackup,
  onOpenExample,
}: MusicWebSplashProps) => {
  const [openCredits, setOpenCredits] = useState(false);
  const [section, setSection] = useState<string>("new");

  const [name, setName] = useState<string>("");
  const [artist, setArtist] = useLocalStorageState<string>(
    "",
    ARTIST_STORAGE_KEY,
  );

  const windowSize = useWindowSize();
  const windowWidth = windowSize.width || 0;

  const isCompactLayout =
    windowWidth > 0 && windowWidth <= COMPACT_LAYOUT_BREAKPOINT;

  if (windowWidth === 0) {
    return null;
  }

  return (
    <StyledSplashPage>
      <Suspense
        fallback={
          <StyledSplashPreferenceBar />
          // <div style={{ width: "100%", height: 38, background: "red" }} />
        }
      >
        <StyledSplashPreferenceBar>
          <MusicWebLocaleDropdown
            themeId={themeId}
            localeId={localeId}
            onThemeChange={onThemeChange}
            onLocaleChange={onLocaleChange}
            menuDirection="left"
          />
          <MusicWebThemeDropdown
            themeId={themeId}
            localeId={localeId}
            onThemeChange={onThemeChange}
            onLocaleChange={onLocaleChange}
            menuDirection="right"
          />
        </StyledSplashPreferenceBar>
      </Suspense>
      <FlexGrow />
      <StyledSplashWindowChrome>
        <SplashWindow focus>
          <SplashSidebar>
            <SplashLogo>
              <img src={appIconUrl} alt="GBS Music" draggable={false} />
            </SplashLogo>
            <SplashAppTitleWrapper>
              <strong>GBS Music</strong>
              <br />
              {l10n("FIELD_CHIPTUNE_MUSIC_EDITOR")}
            </SplashAppTitleWrapper>
            <StyledSplashTabs>
              <SplashTab
                selected={section === "new"}
                onClick={() => setSection("new")}
              >
                {l10n("MENU_FILE")}
              </SplashTab>

              <SplashTab
                selected={section === "examples"}
                onClick={() => setSection("examples")}
              >
                {l10n("FIELD_EXAMPLE_SONGS")}
              </SplashTab>

              <SplashTabLink
                target="_blank"
                rel="noreferrer"
                href="https://www.gbstudio.dev/docs/assets/music/music-huge"
              >
                {l10n("SPLASH_DOCUMENTATION")}
              </SplashTabLink>

              <SplashTab onClick={() => setOpenCredits(true)}>
                {l10n("SPLASH_CREDITS")}
              </SplashTab>
              <FlexGrow />
              <SplashTabLink
                target="_blank"
                rel="noreferrer"
                href="https://github.com/chrismaltby/gb-studio"
              >
                GitHub
              </SplashTabLink>
              <FixedSpacer height={10} />
            </StyledSplashTabs>
          </SplashSidebar>

          {(section === "new" || isCompactLayout) && (
            <SplashContent>
              <SplashForm
                onSubmit={(e) => {
                  e.preventDefault();
                  onCreateSong(name, artist);
                }}
              >
                <FormRow>
                  <TextField
                    name="name"
                    label={l10n("FIELD_NAME")}
                    errorLabel={undefined}
                    size="large"
                    value={name}
                    placeholder={l10n("FIELD_NEW_SONG")}
                    onChange={(e) => {
                      setName(e.currentTarget.value);
                    }}
                    autoComplete="off"
                  />
                </FormRow>
                <FormRow>
                  <TextField
                    name="name"
                    label={l10n("FIELD_ARTIST")}
                    errorLabel={undefined}
                    size="large"
                    value={artist}
                    placeholder={l10n("FIELD_ARTIST")}
                    onChange={(e) => {
                      setArtist(e.currentTarget.value);
                    }}
                    autoComplete="off"
                  />
                </FormRow>
                <FormRow>
                  <Label>{l10n("MENU_VIEW")}</Label>
                </FormRow>
                <FormRow>
                  <MusicWebViewSelect showLabels />
                </FormRow>
                <FlexGrow />
                <StyledFileActions>
                  {onCreateSong ? (
                    <Button
                      size="large"
                      variant="primary"
                      onClick={(e) => {
                        e.preventDefault();
                        onCreateSong(name, artist);
                      }}
                    >
                      {l10n("FIELD_CREATE_SONG")}
                    </Button>
                  ) : null}
                  <FlexGrow />
                  {onImportSong ? (
                    <Button
                      size="large"
                      onClick={(e) => {
                        e.preventDefault();
                        onImportSong();
                      }}
                    >
                      {l10n("FIELD_OPEN_FILE")}
                    </Button>
                  ) : null}
                  {onOpenDirectoryWorkspace && !isCompactLayout ? (
                    <Button
                      size="large"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenDirectoryWorkspace();
                      }}
                    >
                      {l10n("FIELD_OPEN_FOLDER")}
                    </Button>
                  ) : null}
                </StyledFileActions>
              </SplashForm>

              {isCompactLayout && onRestoreBackup ? (
                <div
                  style={{
                    width: "100%",
                    padding: "0px 10px",
                    marginTop: 20,
                    boxSizing: "border-box",
                  }}
                >
                  <StyledSplashRestorePanel>
                    <span>{l10n("FIELD_RECOVER_PREVIOUS_SESSION")}</span>
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      onClick={onRestoreBackup}
                    >
                      {l10n("FIELD_RESTORE_FILE")}
                    </Button>
                  </StyledSplashRestorePanel>
                </div>
              ) : null}

              {isCompactLayout && <FixedSpacer height={20} />}

              {isCompactLayout && (
                <StyledMobileListMenu>
                  <StyledMobileListMenuLink
                    target="_blank"
                    rel="noreferrer"
                    href="https://www.gbstudio.dev/docs/assets/music/music-huge"
                  >
                    <span>{l10n("SPLASH_DOCUMENTATION")}</span>
                    <StyledMobileListMenuCaret>
                      <CaretRightIcon />
                    </StyledMobileListMenuCaret>
                  </StyledMobileListMenuLink>

                  <StyledMobileListMenuItem
                    onClick={() => {
                      setOpenCredits(true);
                    }}
                  >
                    <span>{l10n("SPLASH_CREDITS")}</span>
                    <StyledMobileListMenuCaret>
                      <CaretRightIcon />
                    </StyledMobileListMenuCaret>
                  </StyledMobileListMenuItem>

                  <StyledMobileListMenuLink
                    target="_blank"
                    rel="noreferrer"
                    href="https://github.com/chrismaltby/gb-studio"
                  >
                    <span>GitHub</span>
                    <StyledMobileListMenuCaret>
                      <CaretRightIcon />
                    </StyledMobileListMenuCaret>
                  </StyledMobileListMenuLink>
                </StyledMobileListMenu>
              )}
            </SplashContent>
          )}

          {isCompactLayout && (
            <StyledSplashSectionHeader $sticky>
              {l10n("FIELD_EXAMPLE_SONGS")}
            </StyledSplashSectionHeader>
          )}

          {(section === "examples" || isCompactLayout) && (
            <SplashScroll>
              {musicExamples.map((example) => (
                <SplashExampleMusicTrack
                  key={example.filename}
                  name={example.displayName}
                  artist={example.artistName}
                  onClick={() =>
                    onOpenExample(
                      example.displayName,
                      example.filename,
                      example.url,
                    )
                  }
                />
              ))}
            </SplashScroll>
          )}
        </SplashWindow>

        {openCredits && (
          <Suspense fallback={null}>
            <MusicWebCredits onClose={() => setOpenCredits(false)} />
          </Suspense>
        )}
      </StyledSplashWindowChrome>

      {!isCompactLayout && onRestoreBackup ? (
        <div style={{ maxWidth: 420, marginTop: 20 }}>
          <StyledSplashRestorePanel
            $variant="glass"
            $visible={section === "new"}
          >
            <span>{l10n("FIELD_RECOVER_PREVIOUS_SESSION")}</span>
            <Button style={{ flexGrow: 1 }} onClick={onRestoreBackup}>
              {l10n("FIELD_RESTORE_FILE")}
            </Button>
          </StyledSplashRestorePanel>
        </div>
      ) : null}

      <FlexGrow />
      <StyledSplashFooter>
        Also, check out{" "}
        <a href="https://gbstudio.dev" target="_blank" rel="noreferrer">
          GB Studio
        </a>
        .
      </StyledSplashFooter>
    </StyledSplashPage>
  );
};
