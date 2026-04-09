import React, { useState } from "react";
import Select from "react-windowed-select";
import FocusLock from "react-focus-lock";
import API from "renderer/lib/api";
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
  SplashLoading,
  SplashLogo,
  SplashOpenButton,
  SplashSidebar,
  SplashTab,
  SplashWindow,
} from "ui/splash/Splash";
import { LoadingIcon } from "ui/icons/Icons";
import { FlexGrow } from "ui/spacing/Spacing";
import styled from "styled-components";

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

interface MusicWebSplashProps {
  onCreateSong: () => void;
  onImportSong?: () => void;
  onOpenDirectoryWorkspace?: () => void;
  onRestoreBackup?: () => void;
  backupSongName?: string;
}

export const MusicWebSplash = ({
  onCreateSong,
  onImportSong,
  onOpenDirectoryWorkspace,
  onRestoreBackup,
  backupSongName,
}: MusicWebSplashProps) => {
  const [loading, setLoading] = useState(false);
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
              {l10n("SPLASH_NEW")}
            </SplashTab>

            <SplashTab onClick={() => {}}>Open File</SplashTab>

            {onRestoreBackup ? (
              <SplashTab onClick={onRestoreBackup}>Restore Backup</SplashTab>
            ) : null}
            <SplashTab
              selected={section === "examples"}
              onClick={() => setSection("examples")}
              // disabled={}
            >
              Examples
            </SplashTab>

            <SplashTab onClick={() => setOpenCredits(true)}>
              {l10n("SPLASH_CREDITS")}
            </SplashTab>
            <SplashTab onClick={() => setOpenCredits(true)}>
              {l10n("MENU_HELP")}
            </SplashTab>
            <FlexGrow />

            {/* <SplashOpenButton onClick={() => {}}>Open File</SplashOpenButton> */}
            {/* <SplashOpenButton onClick={() => {}}>Open Folder</SplashOpenButton> */}
          </SplashSidebar>

          {section === "new" && (
            <SplashContent>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div>
                  <Select
                    value={{ value: "workspace", label: "Workspace" }}
                    options={[
                      { value: "workspace", label: "Workspace" },
                      { value: "single", label: "Single File" },
                    ]}
                  />
                </div>
                <div
                  style={{ display: "flex", gap: 10, justifyContent: "center" }}
                >
                  {onCreateSong ? (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onCreateSong}
                    >
                      {l10n("TOOL_ADD_SONG_LABEL")}
                    </Button>
                  ) : null}
                  {onImportSong ? (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onImportSong}
                    >
                      {l10n("FIELD_OPEN_FILE")}
                    </Button>
                  ) : null}
                  {onOpenDirectoryWorkspace ? (
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onOpenDirectoryWorkspace}
                    >
                      {l10n("FIELD_OPEN_FOLDER")}
                    </Button>
                  ) : null}
                </div>
                {onRestoreBackup ? (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      style={{ flexGrow: 1 }}
                      size="large"
                      variant="primary"
                      onClick={onRestoreBackup}
                    >
                      {backupSongName
                        ? `Restore backup: ${backupSongName}`
                        : "Restore backup"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </SplashContent>
          )}
        </SplashWindow>

        {openCredits && (
          <FocusLock>
            <Credits onClose={() => setOpenCredits(false)}>
              <CreditsTitle>GBS Music</CreditsTitle>
              <CreditsSubHeading>
                {l10n("SPLASH_CONTRIBUTORS")}
              </CreditsSubHeading>
              {goldContributors.map((contributor) => (
                <CreditsPerson
                  key={contributor.login}
                  onClick={
                    contributor.html_url
                      ? () => API.app.openExternal(contributor.html_url)
                      : undefined
                  }
                >
                  {contributor.login}
                </CreditsPerson>
              ))}
              <CreditsGrid>
                {silverContributors.map((contributor) => (
                  <CreditsPerson
                    key={contributor.login}
                    onClick={
                      contributor.html_url
                        ? () => API.app.openExternal(contributor.html_url)
                        : undefined
                    }
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
