import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { MenuAccelerator, MenuDivider, MenuItem } from "ui/menu/Menu";

interface PianoContextMenuProps {
  dispatch: Dispatch<UnknownAction>;
  selectedAbsRows: number[];
  channelId: number;
  selectedInstrumentId: number;
}

const renderPianoContextMenu = ({
  dispatch,
  selectedAbsRows,
  channelId,
  selectedInstrumentId,
}: PianoContextMenuProps) => {
  if (selectedAbsRows.length === 0) {
    return [];
  }
  return [
    <MenuItem
      key="transpose-up-note"
      onClick={() => {
        dispatch(
          trackerDocumentActions.transposeAbsoluteCells({
            absRows: selectedAbsRows,
            channelId,
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
          trackerDocumentActions.transposeAbsoluteCells({
            absRows: selectedAbsRows,
            channelId,
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
          trackerDocumentActions.transposeAbsoluteCells({
            absRows: selectedAbsRows,
            channelId,
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
          trackerDocumentActions.transposeAbsoluteCells({
            absRows: selectedAbsRows,
            channelId,
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
          trackerDocumentActions.changeInstrumentAbsoluteCells({
            absRows: selectedAbsRows,
            channelId,
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
          trackerDocumentActions.clearAbsoluteCells({
            absRows: selectedAbsRows,
            channelId,
          }),
        );
      }}
    >
      {l10n("MENU_DELETE")} <MenuAccelerator accelerator="Backspace" />
    </MenuItem>,
  ];
};

export default renderPianoContextMenu;
