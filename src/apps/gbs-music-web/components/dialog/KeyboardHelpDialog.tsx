import React, { useCallback, useEffect } from "react";
import styled from "styled-components";
import {
  StyledConfirmActions,
  StyledConfirmCloseButton,
  StyledConfirmModal,
} from "gbs-music-web/components/dialog/style";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";
import { ButtonGroup } from "ui/buttons/ButtonGroup";
import { CloseIcon } from "ui/icons/Icons";
import { MenuOverlay } from "ui/menu/Menu";
import { useAppDispatch, useAppSelector } from "store/hooks";
import API from "renderer/lib/api";
import trackerActions from "store/features/tracker/trackerActions";
import { useTrackerKeyBindings } from "components/music/hooks/useTrackerKeyBindings";
import { TrackerKeysPreview } from "components/music/tracker/keyboard/TrackerKeysPreview";
import FocusLock from "react-focus-lock";

interface KeyboardHelpDialogProps {
  onClose: () => void;
}

const HelpModal = styled(StyledConfirmModal)`
  width: min(620px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding-top: 65px;
`;

const KeyboardFields = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const KeyboardField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
`;

export const KeyboardHelpDialog = ({ onClose }: KeyboardHelpDialogProps) => {
  const dispatch = useAppDispatch();
  const octaveOffset = useAppSelector((state) => state.tracker.octaveOffset);
  const trackerKeyBindings = useTrackerKeyBindings();

  const onChangeTrackerKeyBindings = useCallback((value: number) => {
    void API.settings.app.setTrackerKeyBindings(value);
  }, []);

  const onChangeOctaveOffset = useCallback(
    (offset: number) => {
      dispatch(trackerActions.setOctaveOffset(offset));
    },
    [dispatch],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <FocusLock>
      <MenuOverlay onClick={onClose} />
      <HelpModal
        role="dialog"
        aria-modal="true"
        aria-label={l10n("FIELD_UI_TRACKER_KEYBINDINGS")}
      >
        <StyledConfirmCloseButton
          onClick={onClose}
          aria-label={l10n("FIELD_CLOSE")}
        >
          <CloseIcon />
        </StyledConfirmCloseButton>

        <TrackerKeysPreview octaveOffset={octaveOffset} />

        <StyledConfirmActions>
          <KeyboardFields>
            <KeyboardField>
              <label>{l10n("FIELD_LAYOUT")}</label>
              <ButtonGroup>
                <Button
                  variant={trackerKeyBindings === 0 ? "primary" : "normal"}
                  onClick={() => onChangeTrackerKeyBindings(0)}
                >
                  {l10n("FIELD_UI_LINEAR")}
                </Button>
                <Button
                  variant={trackerKeyBindings === 1 ? "primary" : "normal"}
                  onClick={() => onChangeTrackerKeyBindings(1)}
                >
                  {l10n("FIELD_UI_PIANO")}
                </Button>
              </ButtonGroup>
            </KeyboardField>

            <KeyboardField>
              <label>{l10n("FIELD_OCTAVE")}</label>
              <ButtonGroup>
                <Button
                  variant={octaveOffset === 0 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(0)}
                >
                  3
                </Button>
                <Button
                  variant={octaveOffset === 1 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(1)}
                >
                  4
                </Button>
                <Button
                  variant={octaveOffset === 2 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(2)}
                >
                  5
                </Button>
                <Button
                  variant={octaveOffset === 3 ? "primary" : "normal"}
                  onClick={() => onChangeOctaveOffset(3)}
                >
                  6
                </Button>
              </ButtonGroup>
            </KeyboardField>
          </KeyboardFields>
        </StyledConfirmActions>
      </HelpModal>
    </FocusLock>
  );
};
