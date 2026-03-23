import React, { useEffect } from "react";
import { FormContainer } from "ui/form/layout/FormLayout";
import { Sidebar } from "ui/sidebars/Sidebar";
import { PatternCellEditor } from "./PatternCellEditor";
import { SongMetadataEditor } from "./SongMetadataEditor";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { InstrumentEditor } from "./InstrumentEditor";

export const SongEditor = () => {
  const dispatch = useAppDispatch();

  const selectedInstrument = useAppSelector(
    (state) => state.tracker.selectedInstrument,
  );
  const selectedEffectCell = useAppSelector(
    (state) => state.tracker.selectedEffectCell,
  );
  const song = useAppSelector((state) => state.trackerDocument.present.song);

  useEffect(() => {
    dispatch(trackerActions.setSelectedEffectCell(null));
  }, [dispatch, selectedInstrument]);

  if (!song) {
    return null;
  }

  const renderContent = () => {
    if (selectedEffectCell !== null) {
      return (
        <div style={{ marginTop: -1 }}>
          <PatternCellEditor
            rowId={selectedEffectCell.rowId}
            patternId={selectedEffectCell.patternId}
            channelId={selectedEffectCell.channelId}
          />
        </div>
      );
    }

    return (
      <div style={{ marginTop: -1 }}>
        <InstrumentEditor />
      </div>
    );
  };

  return (
    <Sidebar onClick={() => {}}>
      <SongMetadataEditor />
      <FormContainer>{renderContent()}</FormContainer>
    </Sidebar>
  );
};
