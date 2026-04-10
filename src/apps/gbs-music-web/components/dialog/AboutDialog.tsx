import React from "react";
import {
  StyledConfirmModal,
  StyledConfirmCloseButton,
  StyledConfirmActions,
} from "gbs-music-web/components/dialog/style";
import l10n from "shared/lib/lang/l10n";
import styled from "styled-components";
import { Button } from "ui/buttons/Button";
import { CloseIcon } from "ui/icons/Icons";
import { MenuOverlay } from "ui/menu/Menu";
import appIconUrl from "gbs-music-web/components/ui/icons/app_music_icon_180.png";

interface AboutDialogProps {
  onClose: () => void;
}

declare const VERSION: string;
declare const COMMITHASH: string;

const clearAppCache = async () => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((r) => r.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }
  } catch (e) {
    // ignore
  }

  window.location.reload();
};

const AboutHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const AboutHeaderText = styled.div`
  flex-grow: 1;
  text-align: center;
`;

const AboutLogo = styled.img`
  width: 180px;
  height: 180px;
  flex-shrink: 0;
  margin-top: 20px;
`;

const AboutTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
`;

const AboutText = styled.p`
  margin: 0 0 10px;
  line-height: 1.5;
  text-align: center;
  font-size: 14px;
`;

export const AboutDialog = ({ onClose }: AboutDialogProps) => {
  return (
    <>
      <MenuOverlay onClick={onClose} />
      <StyledConfirmModal
        role="dialog"
        aria-modal="true"
        aria-label={l10n("MENU_ABOUT")}
      >
        <AboutHeader>
          <StyledConfirmCloseButton onClick={onClose}>
            <CloseIcon />
          </StyledConfirmCloseButton>
          <AboutLogo src={appIconUrl} alt="GB Studio" />
          <AboutHeaderText>
            <AboutTitle>GBS Music</AboutTitle>
            <AboutText>Chiptune Music Editor</AboutText>
            <AboutText>
              {VERSION} ({COMMITHASH})
            </AboutText>
          </AboutHeaderText>
        </AboutHeader>
        <AboutText>{l10n("GBSTUDIO_COPYRIGHT")}</AboutText>
        <StyledConfirmActions>
          <Button onClick={clearAppCache}>Clear App Cache</Button>
        </StyledConfirmActions>
      </StyledConfirmModal>
    </>
  );
};
