import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import l10n from "shared/lib/lang/l10n";
import { AppThunk } from "store/configureStore";
import { pasteAbsoluteCells } from "store/features/tracker/trackerState";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import {
  copyAbsoluteCells,
  cutAbsoluteCells,
  pasteInPlace,
} from "store/features/trackerDocument/trackerDocumentState";
import { MenuAccelerator, MenuDivider, MenuItem } from "ui/menu/Menu";

interface PianoContextMenuProps {
  dispatch: Dispatch<UnknownAction | AppThunk>;
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
    return [
      <MenuItem
        key="paste"
        onClick={() => {
          dispatch(pasteAbsoluteCells());
        }}
      >
        {l10n("MENU_PASTE")}
        <MenuAccelerator accelerator="CommandOrControl+V" />
      </MenuItem>,

      <MenuItem
        key="paste-in-place"
        onClick={() => {
          dispatch(
            pasteInPlace({
              channelId,
            }),
          );
        }}
      >
        {l10n("MENU_PASTE_IN_PLACE")}
        <MenuAccelerator accelerator="CommandOrControl+Shift+V" />
      </MenuItem>,
    ];
  }
  return [
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
      <MenuAccelerator accelerator="Alt+Shift+Q" />
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
      <MenuAccelerator accelerator="Alt+Shift+A" />
    </MenuItem>,
    <MenuDivider key="div-clipboard"></MenuDivider>,
    <MenuItem
      key="cut"
      onClick={() => {
        dispatch(
          cutAbsoluteCells({
            channelId,
            absRows: selectedAbsRows,
          }),
        );
      }}
    >
      {l10n("MENU_CUT")}
      <MenuAccelerator accelerator="CommandOrControl+Shift+C" />
    </MenuItem>,
    <MenuItem
      key="copy"
      onClick={() => {
        dispatch(
          copyAbsoluteCells({
            channelId,
            absRows: selectedAbsRows,
          }),
        );
      }}
    >
      {l10n("MENU_COPY")}
      <MenuAccelerator accelerator="CommandOrControl+C" />
    </MenuItem>,
    <MenuItem
      key="paste"
      onClick={() => {
        dispatch(pasteAbsoluteCells());
      }}
    >
      {l10n("MENU_PASTE")}
      <MenuAccelerator accelerator="CommandOrControl+V" />
    </MenuItem>,
    <MenuItem
      key="paste-in-place"
      onClick={() => {
        dispatch(
          pasteInPlace({
            channelId,
          }),
        );
      }}
    >
      {l10n("MENU_PASTE_IN_PLACE")}
      <MenuAccelerator accelerator="CommandOrControl+Shift+V" />
    </MenuItem>,
    <MenuDivider key="div-change"></MenuDivider>,
    ...(selectedAbsRows.length > 1
      ? [
          <MenuItem
            key="interpolate"
            onClick={() => {
              dispatch(
                trackerDocumentActions.interpolateAbsoluteCells({
                  absRows: selectedAbsRows,
                  channelId,
                }),
              );
            }}
          >
            {l10n("FIELD_INTERPOLATE")}
            <MenuAccelerator accelerator="Control+K" />
          </MenuItem>,
        ]
      : []),
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
