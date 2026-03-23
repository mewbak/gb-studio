import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import l10n from "shared/lib/lang/l10n";
import { AppThunk } from "store/configureStore";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import {
  copyTrackerFields,
  cutTrackerFields,
  pasteTrackerFields,
} from "store/features/trackerDocument/trackerDocumentState";
import { MenuAccelerator, MenuDivider, MenuItem } from "ui/menu/Menu";

interface TrackerContextMenuProps {
  dispatch: Dispatch<UnknownAction | AppThunk>;
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
      key="transpose-up-octave"
      onClick={() => {
        dispatch(
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "up",
            type: "octave",
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
            type: "octave",
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
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "up",
            type: "note",
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
          trackerDocumentActions.transposeTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "down",
            type: "note",
          }),
        );
      }}
    >
      {l10n("FIELD_TRANSPOSE_SEMITONE", { n: "-1" })}
      <MenuAccelerator accelerator="Alt+Shift+A" />
    </MenuItem>,
    <MenuDivider key="clipboard"></MenuDivider>,
    <MenuItem
      key="cut"
      onClick={() => {
        dispatch(
          cutTrackerFields({
            patternId,
            selectedTrackerFields,
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
          copyTrackerFields({
            patternId,
            selectedTrackerFields,
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
        const firstField = selectedTrackerFields[0];
        if (firstField) {
          dispatch(
            pasteTrackerFields({
              patternId,
              startField: firstField,
            }),
          );
        }
      }}
    >
      {l10n("MENU_PASTE")}
      <MenuAccelerator accelerator="CommandOrControl+V" />
    </MenuItem>,
    <MenuDivider key="div-shift"></MenuDivider>,
    <MenuItem
      key="insert"
      onClick={() => {
        dispatch(
          trackerDocumentActions.shiftTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "insert",
          }),
        );
      }}
    >
      {l10n("FIELD_INSERT_ROW")} <MenuAccelerator accelerator="Shift+Enter" />
    </MenuItem>,

    <MenuItem
      key="delete"
      onClick={() => {
        dispatch(
          trackerDocumentActions.shiftTrackerFields({
            patternId,
            selectedTrackerFields,
            direction: "delete",
          }),
        );
      }}
    >
      {l10n("FIELD_DELETE_ROW")}{" "}
      <MenuAccelerator accelerator="Shift+Backspace" />
    </MenuItem>,

    <MenuDivider key="div-change"></MenuDivider>,
    ...(selectedTrackerFields.length > 1
      ? [
          <MenuItem
            key="interpolate"
            onClick={() => {
              dispatch(
                trackerDocumentActions.interpolateTrackerFields({
                  patternId,
                  selectedTrackerFields,
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
