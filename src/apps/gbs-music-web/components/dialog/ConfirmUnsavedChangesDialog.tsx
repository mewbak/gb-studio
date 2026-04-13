import {
  StyledConfirmModal,
  StyledConfirmTitle,
  StyledConfirmDetail,
  StyledConfirmActions,
} from "gbs-music-web/components/dialog/style";
import React from "react";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";
import { MenuOverlay } from "ui/menu/Menu";

interface ConfirmUnsavedChangesDialogProps {
  filename: string;
  onCancel: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const ConfirmUnsavedChangesDialog = ({
  filename,
  onCancel,
  onSave,
  onDiscard,
}: ConfirmUnsavedChangesDialogProps) => {
  return (
    <>
      <MenuOverlay onClick={onCancel} />
      <StyledConfirmModal role="dialog" aria-modal="true">
        <StyledConfirmTitle>
          {l10n("DIALOG_TRACKER_CHANGES_NOT_SAVED", {
            name: filename,
          })}
        </StyledConfirmTitle>
        <StyledConfirmDetail>
          {l10n("DIALOG_TRACKER_CHANGES_NOT_SAVED_DESCRIPTION")}
        </StyledConfirmDetail>
        <StyledConfirmActions>
          <Button variant="primary" onClick={onSave} autoFocus>
            {l10n("DIALOG_SAVE_AND_CONTINUE")}
          </Button>
          <Button onClick={onDiscard}>
            {l10n("DIALOG_CONTINUE_WITHOUT_SAVING")}
          </Button>
          <Button onClick={onCancel}>{l10n("DIALOG_CANCEL")}</Button>
        </StyledConfirmActions>
      </StyledConfirmModal>
    </>
  );
};
