import React from "react";
import { FormContainer, FormSectionTitle } from "ui/form/layout/FormLayout";
import { Sidebar } from "ui/sidebars/Sidebar";
import { SongMetadataEditor } from "./SongMetadataEditor";
import { useAppSelector } from "store/hooks";
import { InstrumentEditor } from "./InstrumentEditor";
import { PatternCellSelectionEditor } from "./PatternCellSelectionEditor";
import l10n from "shared/lib/lang/l10n";

export const SongEditor = () => {
  const isPatternSelection = useAppSelector(
    (state) =>
      state.tracker.sidebarView === "cell" &&
      state.tracker.selectedPatternCells.length > 0 &&
      !state.tracker.playing,
  );
  const hasSong = useAppSelector(
    (state) => !!state.trackerDocument.present.song,
  );

  if (!hasSong) {
    return null;
  }

  return (
    <Sidebar>
      <SongMetadataEditor />
      <FormContainer>
        <div style={{ marginTop: -1 }}>
          {isPatternSelection ? (
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
