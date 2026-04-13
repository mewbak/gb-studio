import React, { useMemo } from "react";
import l10n from "shared/lib/lang/l10n";
import {
  Credits,
  CreditsTitle,
  CreditsSubHeading,
  CreditsPerson,
  CreditsGrid,
} from "ui/splash/credits/Credits";
import contributors from "contributors.json";
import contributorsExternal from "contributors-external.json";
import patrons from "patrons.json";

interface MusicWebCreditsProps {
  onClose: () => void;
}

const MusicWebCredits = ({ onClose }: MusicWebCreditsProps) => {
  const goldContributors = useMemo(
    () => contributors.filter((user) => user.group === "gold"),
    [],
  );

  const silverContributors = useMemo(
    () =>
      [...contributorsExternal]
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
        }),
    [],
  );

  return (
    <Credits onClose={onClose}>
      <CreditsTitle>GBS Music</CreditsTitle>
      <CreditsSubHeading>Based On hUGETracker By</CreditsSubHeading>
      <CreditsPerson
        href="https://nickfa.ro/wiki/Main_Page"
        target="_blank"
        rel="noreferrer"
      >
        Nick "SuperDisk" Faro
      </CreditsPerson>
      <CreditsSubHeading>{l10n("SPLASH_CONTRIBUTORS")}</CreditsSubHeading>
      {goldContributors.map((contributor) => (
        <CreditsPerson
          key={contributor.login}
          href={contributor.html_url}
          target="_blank"
          rel="noreferrer"
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
            rel="noreferrer"
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
  );
};

export default MusicWebCredits;
