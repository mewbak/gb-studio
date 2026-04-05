import {
  StyledConfirmOverlay,
  StyledConfirmModal,
  StyledConfirmTitle,
  StyledConfirmDetail,
  StyledConfirmActions,
} from "gbs-music-web/components/dialog/style";
import React from "react";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";

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
      <StyledConfirmOverlay onClick={onCancel} />
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
          <Button onClick={onSave}>{l10n("DIALOG_SAVE_AND_CONTINUE")}</Button>
          <Button variant="normal" onClick={onDiscard}>
            {l10n("DIALOG_CONTINUE_WITHOUT_SAVING")}
          </Button>
          <Button variant="transparent" onClick={onCancel}>
            {l10n("DIALOG_CANCEL")}
          </Button>
        </StyledConfirmActions>
      </StyledConfirmModal>
    </>
  );
};
