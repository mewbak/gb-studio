import { useCallback, useState } from "react";

type GuardedAction = () => void | Promise<void>;

interface UseUnsavedChangesGuardOptions {
  modified: boolean;
  save: () => Promise<boolean>;
}

interface UseUnsavedChangesGuardResult {
  hasPendingAction: boolean;
  runWithUnsavedCheck: (action: GuardedAction) => Promise<void>;
  closeConfirm: () => void;
  saveAndContinue: () => Promise<void>;
  discardAndContinue: () => Promise<void>;
}

export const useUnsavedChangesGuard = ({
  modified,
  save,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult => {
  const [pendingAction, setPendingAction] = useState<GuardedAction | null>(
    null,
  );

  const closeConfirm = useCallback(() => {
    setPendingAction(null);
  }, []);

  const runWithUnsavedCheck = useCallback(
    async (action: GuardedAction) => {
      if (!modified) {
        await action();
        return;
      }

      setPendingAction(() => action);
    },
    [modified],
  );

  const saveAndContinue = useCallback(async () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    const didSave = await save();

    if (!didSave) {
      return;
    }

    closeConfirm();
    await action();
  }, [closeConfirm, pendingAction, save]);

  const discardAndContinue = useCallback(async () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    closeConfirm();
    await action();
  }, [closeConfirm, pendingAction]);

  return {
    hasPendingAction: pendingAction !== null,
    runWithUnsavedCheck,
    closeConfirm,
    saveAndContinue,
    discardAndContinue,
  };
};
