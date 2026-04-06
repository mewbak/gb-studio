import React from "react";
import Select from "react-windowed-select";
import l10n from "shared/lib/lang/l10n";
import { Button } from "ui/buttons/Button";

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
  return (
    <div
      style={{
        background:
          "radial-gradient(circle at 50% 40%,#e9a1ab 0%, #d1456d 26%, #982c51 50%, #1f1828 100%)",
        flexGrow: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Select
            value={{ value: "workspace", label: "Workspace" }}
            options={[
              { value: "workspace", label: "Workspace" },
              { value: "single", label: "Single File" },
            ]}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
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
    </div>
  );
};
