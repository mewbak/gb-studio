import React, { useState } from "react";
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
import {
  SplashAppTitle,
  SplashContent,
  SplashEasterEggButton,
  SplashLogo,
  SplashScroll,
  SplashSidebar,
  SplashTab,
  SplashTabLink,
  SplashWindow,
} from "ui/splash/Splash";
import { FlexGrow } from "ui/spacing/Spacing";
import styled from "styled-components";
import { musicExamples } from "gbs-music-web/data/musicExamples";
import projectIcon from "ui/icons/gbsproj.png";
import { StyledButton } from "ui/buttons/style";
import { Label } from "ui/form/Label";
import { FormRow } from "ui/form/layout/FormLayout";

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
  width: 640px;
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
  background: ${(props) => props.theme.colors.highlight};
  color: ${(props) => props.theme.colors.highlightText};
  border-radius: 4px;
  padding: 10px;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 10px;

  ${StyledButton} {
    color: ${(props) => props.theme.colors.highlightText};
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.37);
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
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;

  ${StyledButton}:first-child {
    flex: 1 0 100%;
  }

  ${StyledButton}:nth-child(2),
  ${StyledButton}:nth-child(3) {
    flex: 1 1 0;
  }
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
  onCreateSong: () => void;
  onImportSong?: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onRestoreBackup?: () => void;
  backupSongName?: string;
  onOpenExample: (name: string, filename: string, url: string) => void;
}

export const MusicWebSplash = ({
  onCreateSong,
  onImportSong,
  onOpenDirectoryWorkspace,
  onRestoreBackup,
  backupSongName,
  onOpenExample,
}: MusicWebSplashProps) => {
  const [openCredits, setOpenCredits] = useState(false);
  const [patrons, _setPatrons] = useState<Patrons>(inbuiltPatrons as Patrons);
  const [section, setSection] = useState<string>("new");

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
          </SplashSidebar>

          {section === "new" && (
            <SplashContent>
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
              ) : null}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",

                  flexGrow: 1,
                }}
              >
                <FormRow>
                  <Label>View</Label>
                </FormRow>
                <div style={{ display: "flex", gap: 10 }}>
                  <div
                    style={{
                      flexGrow: 1,
                      height: 150,
                      background: "#fff",
                      border: "3px solid red",
                      borderRadius: 4,
                    }}
                  />
                  <div
                    style={{
                      flexGrow: 1,
                      height: 150,
                      background: "#fff",
                      border: "3px solid red",
                      borderRadius: 4,
                    }}
                  />
                </div>

                <FlexGrow />
                <StyledFileActions style={{}}>
                  {onCreateSong ? (
                    <Button
                      size="large"
                      variant="primary"
                      onClick={onCreateSong}
                    >
                      {/* {l10n("TOOL_ADD_SONG_LABEL")} */}
                      Create .UGE Song
                    </Button>
                  ) : null}
                  {onImportSong ? (
                    <Button size="large" onClick={onImportSong}>
                      {/* {l10n("FIELD_OPEN_FILE")} */}
                      Open .UGE File
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
              </div>
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
    </StyledSplashPage>
  );
};
