import React, { useCallback, useState } from "react";
import FocusLock from "react-focus-lock";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";
import {
  Credits,
  CreditsTitle,
  CreditsSubHeading,
  CreditsPerson,
  CreditsGrid,
} from "ui/splash/credits/Credits";
import contributors from "contributors.json";
import contributorsExternal from "contributors-external.json";
import inbuiltPatrons from "patrons.json";
import type { Patrons } from "scripts/fetchPatrons";
import appIconUrl from "gbs-music-web/components/ui/icons/app_music_icon_180.png";
import trackerImageUrl from "gbs-music-web/static/tracker.png";
import pianoImageUrl from "gbs-music-web/static/piano.png";
import {
  SplashAppTitle,
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
import styled, { css } from "styled-components";
import { musicExamples } from "gbs-music-web/data/musicExamples";
import projectIcon from "ui/icons/gbsproj.png";
import { StyledButton } from "ui/buttons/style";
import { Label } from "ui/form/Label";
import { FormRow } from "ui/form/layout/FormLayout";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
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

const COMPACT_LAYOUT_BREAKPOINT = 840;

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
  justify-content: center;

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
      margin-top: 0;
      margin-bottom: 20px;
      img {
        max-width: min(calc(100% - 100px), 140px);
      }
    }

    ${StyledSplashWindow} {
      flex-direction: column;
    }

    ${SplashSidebar} {
      background: transparent;
      box-shadow: none;
    }

    ${SplashContent} {
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      padding: 30px 0px 20px 0px;
    }
  }
`;

const StyledSplashWindowChrome = styled.div`
  position: relative;
  width: 700px;
  height: 430px;
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
    margin: 0px auto;
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

const StyledSplashRestorePanel = styled.div<{ $variant?: "glass" }>`
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

  ${StyledButton} {
    height: 50px;
  }

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
  padding: 20px 30px;
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

interface SplashExampleMusicProps {
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
  padding: 15px 30px;
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

export const StyledFileForm = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

export const SplashExampleMusic = ({
  name,
  artist,
  onClick,
}: SplashExampleMusicProps) => (
  <SplashProjectWrapper onClick={onClick}>
    <img src={projectIcon} alt="" draggable={false} />
    <SplashProjectDetails>
      <SplashProjectName>{name}</SplashProjectName>
      <SplashProjectArtist>{artist}</SplashProjectArtist>
    </SplashProjectDetails>
  </SplashProjectWrapper>
);

interface MusicWebSplashProps {
  onCreateSong: (name: string, artist: string) => void;
  onImportSong?: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onRestoreBackup?: () => void;
  backupSongName?: string;
  onOpenExample: (name: string, filename: string, url: string) => void;
  initialArtist?: string;
}

const ARTIST_STORAGE_KEY = "gbsMusicWeb:artist";

export const MusicWebSplash = ({
  onCreateSong,
  onImportSong,
  onOpenDirectoryWorkspace,
  onRestoreBackup,
  backupSongName,
  onOpenExample,
}: MusicWebSplashProps) => {
  const dispatch = useAppDispatch();

  const [openCredits, setOpenCredits] = useState(false);
  const [patrons, _setPatrons] = useState<Patrons>(inbuiltPatrons as Patrons);
  const [section, setSection] = useState<string>("new");

  const [name, setName] = useState<string>("New Song");
  const [artist, setArtist] = useLocalStorageState<string>(
    "Artist",
    ARTIST_STORAGE_KEY,
  );

  const view = useAppSelector((state) => state.tracker.view);

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

  const goldContributors = contributors.filter((user) => user.group === "gold");
  const silverContributors = [...contributorsExternal]
    // eslint-disable-next-line camelcase
    .map((contributor) => ({
      ...contributor,
      // eslint-disable-next-line camelcase
      html_url: contributor.html_url ?? "",
    }))
    .concat(contributors.filter((user) => user.group === "silver"))
    .sort((a, b) => {
      const loginA = a.login.toLowerCase();
      const loginB = b.login.toLowerCase();
      if (loginA < loginB) return -1;
      if (loginA > loginB) return 1;
      return 0;
    });

  return (
    <StyledSplashPage>
      <div style={{ color: "white", margin: 20, textAlign: "center" }}>
        GBS Music: Chiptune Music Editor
      </div>
      <StyledSplashWindowChrome>
        <SplashWindow focus>
          <SplashSidebar>
            <SplashLogo>
              <img src={appIconUrl} alt="GBS Music" draggable={false} />
            </SplashLogo>
            {!isCompactLayout && <SplashAppTitle appName="GBS Music" />}
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
                Example Songs
              </SplashTab>

              <SplashTabLink
                target="_blank"
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
                    label="Song Name"
                    errorLabel={undefined}
                    size="large"
                    value={name}
                    placeholder="Song Name"
                    onChange={(e) => {
                      setName(e.currentTarget.value);
                    }}
                    disabled={false}
                  />
                </FormRow>
                <FormRow>
                  <TextField
                    name="name"
                    label="Artist"
                    errorLabel={undefined}
                    size="large"
                    value={artist}
                    placeholder="Artist Name"
                    onChange={(e) => {
                      setArtist(e.currentTarget.value);
                    }}
                    disabled={false}
                  />
                </FormRow>
                <FormRow>
                  <Label>{l10n("MENU_VIEW")}</Label>
                </FormRow>
                <FormRow>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        flexGrow: 1,
                        height: 80,
                        background: "#fff",
                        border:
                          view === "roll"
                            ? "4px solid #c92c61"
                            : "4px solid #ddd",
                        borderRadius: 4,
                        backgroundImage: `url(${pianoImageUrl})`,
                        backgroundSize: "cover",
                      }}
                      onClick={setRollView}
                    />
                    <div
                      style={{
                        flexGrow: 1,
                        height: 80,
                        background: "#fff",
                        border:
                          view === "tracker"
                            ? "4px solid #c92c61"
                            : "4px solid #ddd",
                        borderRadius: 4,
                        backgroundImage: `url(${trackerImageUrl})`,
                        backgroundSize: "cover",
                      }}
                      onClick={setTrackerView}
                    />
                  </div>
                </FormRow>
                <FormRow>
                  <div style={{ marginTop: 5, fontSize: 11, marginBottom: 20 }}>
                    {view === "roll"
                      ? "Piano Roll description"
                      : "Tracker description"}
                  </div>
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
                      Create Song
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
                      Open File
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
                    <span>
                      A previous session has been recovered{" "}
                      {backupSongName ? `"${backupSongName}"` : ""}
                    </span>
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      onClick={onRestoreBackup}
                    >
                      Restore File
                    </Button>
                  </StyledSplashRestorePanel>
                </div>
              ) : null}

              {isCompactLayout && <FixedSpacer height={20} />}

              {isCompactLayout && (
                <StyledMobileListMenu>
                  <StyledMobileListMenuLink
                    target="_blank"
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
              Example Songs
            </StyledSplashSectionHeader>
          )}

          {(section === "examples" || isCompactLayout) && (
            <SplashScroll>
              {musicExamples.map((example) => (
                <SplashExampleMusic
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
          <FocusLock>
            <Credits onClose={() => setOpenCredits(false)}>
              <CreditsTitle>GBS Music</CreditsTitle>
              <CreditsSubHeading>Based On hUGETracker By</CreditsSubHeading>
              <CreditsPerson
                href="https://nickfa.ro/wiki/Main_Page"
                target="_blank"
              >
                Nick "SuperDisk" Faro
              </CreditsPerson>
              <CreditsSubHeading>
                {l10n("SPLASH_CONTRIBUTORS")}
              </CreditsSubHeading>
              {goldContributors.map((contributor) => (
                <CreditsPerson
                  key={contributor.login}
                  href={contributor.html_url}
                  target="_blank"
                >
                  {contributor.login}
                </CreditsPerson>
              ))}
              <CreditsGrid>
                {silverContributors.map((contributor) => (
                  <CreditsPerson
                    key={contributor.login}
                    href={contributor.html_url}
                    target="_blank"
                  >
                    {contributor.login}
                  </CreditsPerson>
                ))}
              </CreditsGrid>
              <CreditsSubHeading>Patrons</CreditsSubHeading>
              <CreditsGrid>
                {(patrons.goldTier || []).map((patron) => (
                  <CreditsPerson key={patron.id} gold>
                    {patron.attributes.full_name}
                  </CreditsPerson>
                ))}
              </CreditsGrid>
              <CreditsGrid>
                {(patrons.silverTier || []).map((patron) => (
                  <CreditsPerson key={patron.id}>
                    {patron.attributes.full_name}
                  </CreditsPerson>
                ))}
              </CreditsGrid>
              <CreditsGrid>
                {(patrons.pastPatrons || []).map((patron) => (
                  <CreditsPerson key={patron.id}>
                    {patron.attributes.full_name}
                  </CreditsPerson>
                ))}
              </CreditsGrid>
            </Credits>
          </FocusLock>
        )}
      </StyledSplashWindowChrome>

      {!isCompactLayout && onRestoreBackup ? (
        <div style={{ maxWidth: 420, marginTop: 20 }}>
          <StyledSplashRestorePanel $variant="glass">
            <span>
              A previous session has been recovered{" "}
              {backupSongName ? `"${backupSongName}"` : ""}
            </span>
            <Button
              style={{ flexGrow: 1 }}
              size="large"
              onClick={onRestoreBackup}
            >
              Restore File
            </Button>
          </StyledSplashRestorePanel>
        </div>
      ) : null}
    </StyledSplashPage>
  );
};
