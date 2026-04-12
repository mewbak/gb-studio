import React from "react";
import { FormContainer, FormSectionTitle } from "ui/form/layout/FormLayout";
import { Sidebar } from "ui/sidebars/Sidebar";
import { SongMetadataEditor } from "./SongMetadataEditor";
import { useAppSelector } from "store/hooks";
import { InstrumentEditor } from "./InstrumentEditor";
import { PatternCellSelectionEditor } from "./PatternCellSelectionEditor";
import l10n from "shared/lib/lang/l10n";

export const SongEditor = () => {
  const selectedPatternCells = useAppSelector(
    (state) => state.tracker.selectedPatternCells,
  );
  const sidebarView = useAppSelector((state) => state.tracker.sidebarView);
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  if (!song) {
    return null;
  }

  return (
    <Sidebar>
      <SongMetadataEditor />
      <FormContainer>
        <div style={{ marginTop: -1 }}>
          {sidebarView === "cell" && selectedPatternCells.length > 0 ? (
            <>
              <FormSectionTitle>{l10n("FIELD_SELECTION")}</FormSectionTitle>
              <PatternCellSelectionEditor />
            </>
          ) : (
            <InstrumentEditor />
          )}
        </div>
      </FormContainer>
    </Sidebar>
  );
};
