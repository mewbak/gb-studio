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
  SplashCreateButton,
  SplashEasterEggButton,
  SplashForm,
  SplashLogo,
  SplashScroll,
  SplashSidebar,
  SplashTab,
  SplashTabLink,
  SplashWindow,
} from "ui/splash/Splash";
import { FixedSpacer, FlexGrow } from "ui/spacing/Spacing";
import styled from "styled-components";
import { musicExamples } from "gbs-music-web/data/musicExamples";
import projectIcon from "ui/icons/gbsproj.png";
import { StyledButton } from "ui/buttons/style";
import { Label } from "ui/form/Label";
import { FormDivider, FormRow } from "ui/form/layout/FormLayout";
import { DropdownButton } from "ui/buttons/DropdownButton";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { TextField } from "ui/form/TextField";
import { useLocalStorageState } from "ui/hooks/use-local-storage-state";

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
    height: 100dvh;
    border: 0;
    box-shadow: none;
    border-radius: 0;
  }
`;

const StyledSplashRestorePanel = styled.div`
  display: flex;
  // background: ${(props) => props.theme.colors.highlight};
  // color: ${(props) => props.theme.colors.highlightText};

  background: ${(props) => props.theme.colors.panel.background};
  color: ${(props) => props.theme.colors.panel.text};
  border: 1px solid ${(props) => props.theme.colors.panel.border};

  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;

  border-radius: 4px;
  padding: 10px;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 10px;
  flex-grow: 1;

  ${StyledButton} {
    color: ${(props) => props.theme.colors.panel.text};
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.37);
    color: #fff;
  }
  ${StyledButton}[data-variant="normal"] {
    background: rgba(255, 255, 255, 0.19);
  }
`;

interface SplashExampleMusicProps {
  name: string;
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
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledFileActions = styled.div`
  padding: 0px 10px;
  display: flex;
  gap: 10px;

  // display: flex;
  // gap: 10px;
  // justify-content: center;
  // flex-wrap: wrap;
  // box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);

  // ${StyledButton} {
  //   height: 50px;
  //   flex-grow: 1;
  // }
`;

export const StyledFileForm = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

export const SplashExampleMusic = ({
  name,
  onClick,
}: SplashExampleMusicProps) => (
  <SplashProjectWrapper onClick={onClick}>
    <img src={projectIcon} alt="" draggable={false} />
    <SplashProjectDetails>
      <SplashProjectName>{name}</SplashProjectName>
      {/* <SplashProjectPath>{project.dir}</SplashProjectPath> */}
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
      <div style={{ color: "white", marginBottom: 20 }}>
        GBS Music: A Free and Open-Source Chiptune Music Editor
      </div>
      <StyledSplashWindowChrome>
        <SplashWindow focus>
          <SplashSidebar>
            <SplashLogo>
              <img src={appIconUrl} alt="GBS Music" draggable={false} />
              <SplashEasterEggButton
                onClick={() => setOpenCredits(true)}
                tabIndex={-1}
              />
            </SplashLogo>
            <SplashAppTitle appName="GBS Music" />
            <SplashTab
              selected={section === "new"}
              onClick={() => setSection("new")}
              // disabled={}
            >
              {l10n("MENU_FILE")}
            </SplashTab>

            <SplashTab
              selected={section === "examples"}
              onClick={() => setSection("examples")}
              // disabled={}
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
          </SplashSidebar>

          {section === "new" && (
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
                        height: 120,
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
                        height: 120,
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
                  <div style={{ marginTop: 5, fontSize: 11 }}>
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
                    <Button size="large" onClick={onImportSong}>
                      Open File
                    </Button>
                  ) : null}
                  {onOpenDirectoryWorkspace ? (
                    <Button size="large" onClick={onOpenDirectoryWorkspace}>
                      {l10n("FIELD_OPEN_FOLDER")}
                    </Button>
                  ) : (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      disabled
                      onClick={() => {}}
                    >
                      {l10n("FIELD_OPEN_FOLDER")}
                    </Button>
                  )}
                </StyledFileActions>
              </SplashForm>
            </SplashContent>
          )}

          {section === "examples" && (
            <SplashScroll>
              {musicExamples.map((example) => (
                <SplashExampleMusic
                  key={example.filename}
                  name={example.displayName}
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

      <div style={{ maxWidth: 420, marginTop: 20 }}>
        {onRestoreBackup ? (
          <StyledSplashRestorePanel>
            A previous session has been recovered{" "}
            {backupSongName ? `"${backupSongName}"` : ""}
            <Button
              style={{ flexGrow: 1 }}
              size="large"
              onClick={onRestoreBackup}
            >
              Restore File
            </Button>
          </StyledSplashRestorePanel>
        ) : (
          <FlexGrow />
        )}
      </div>
    </StyledSplashPage>
  );
};
