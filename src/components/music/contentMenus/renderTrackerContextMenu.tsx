import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { MenuAccelerator, MenuDivider, MenuItem } from "ui/menu/Menu";

interface TrackerContextMenuProps {
  dispatch: Dispatch<UnknownAction>;
  patternId: number;
  selectedTrackerFields: number[];
  selectedInstrumentId: number;
}

const renderTrackerContextMenu = ({
  dispatch,
  patternId,
  selectedTrackerFields,
  selectedInstrumentId,
}: TrackerContextMenuProps) => {
  if (selectedTrackerFields.length === 0) {
    return [];
  }
  return [
    <MenuItem
      key="transpose-up-note"
      onClick={() => {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "up",
            size: "note",
          }),
        );
      }}
    >
      {l10n("FIELD_TRANSPOSE_SEMITONE", { n: "+1" })}
      <MenuAccelerator accelerator="Control+Q" />
    </MenuItem>,
    <MenuItem
      key="transpose-down-note"
      onClick={() => {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "down",
            size: "note",
          }),
        );
      }}
    >
      {l10n("FIELD_TRANSPOSE_SEMITONE", { n: "-1" })}
      <MenuAccelerator accelerator="Control+A" />
    </MenuItem>,
    <MenuItem
      key="transpose-up-octave"
      onClick={() => {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "up",
            size: "octave",
          }),
        );
      }}
    >
      {l10n("FIELD_TRANSPOSE_OCTAVE", { n: "+1" })}
      <MenuAccelerator accelerator="Control+Shift+Q" />
    </MenuItem>,
    <MenuItem
      key="transpose-down-octave"
      onClick={() => {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "down",
            size: "octave",
          }),
        );
      }}
    >
      {l10n("FIELD_TRANSPOSE_OCTAVE", { n: "-1" })}
      <MenuAccelerator accelerator="Control+Shift+A" />
    </MenuItem>,
    <MenuDivider key="div-change"></MenuDivider>,
    <MenuItem
      key="change"
      onClick={() => {
        dispatch(
          trackerDocumentActions.changeInstrumentTrackerFields({
            patternId,
            selectedTrackerFields,
            instrumentId: selectedInstrumentId,
          }),
        );
      }}
    >
      {l10n("FIELD_CHANGE_INSTRUMENT")}
      <MenuAccelerator accelerator="Control+I" />
    </MenuItem>,
    <MenuDivider key="div-delete"></MenuDivider>,
    <MenuItem
      key="delete"
      onClick={() => {
        dispatch(
          trackerDocumentActions.clearTrackerFields({
            patternId,
            selectedTrackerFields,
          }),
        );
      }}
    >
      {l10n("MENU_DELETE")} <MenuAccelerator accelerator="Backspace" />
    </MenuItem>,
  ];
};

export default renderTrackerContextMenu;
