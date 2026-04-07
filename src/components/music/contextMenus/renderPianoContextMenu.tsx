import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import l10n from "shared/lib/lang/l10n";
import { PatternCellAddress } from "shared/lib/uge/editor/types";
import { AppThunk } from "store/storeTypes";
import { pasteAbsoluteCells } from "store/features/tracker/trackerState";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { MenuAccelerator, MenuDivider, MenuItem } from "ui/menu/Menu";

interface PianoContextMenuProps {
  dispatch: Dispatch<UnknownAction | AppThunk>;
  selectedPatternCells: PatternCellAddress[];
  channelId: number;
  selectedInstrumentId: number;
}

const renderPianoContextMenu = ({
  dispatch,
  selectedPatternCells,
  channelId,
  selectedInstrumentId,
}: PianoContextMenuProps) => {
  if (selectedPatternCells.length === 0) {
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
            trackerDocumentActions.pasteInPlace({
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
            patternCells: selectedPatternCells,
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
            patternCells: selectedPatternCells,
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
            patternCells: selectedPatternCells,
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
            patternCells: selectedPatternCells,
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
          trackerDocumentActions.cutAbsoluteCells({
            patternCells: selectedPatternCells,
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
          trackerDocumentActions.copyAbsoluteCells({
            patternCells: selectedPatternCells,
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
          trackerDocumentActions.pasteInPlace({
            channelId,
          }),
        );
      }}
    >
      {l10n("MENU_PASTE_IN_PLACE")}
      <MenuAccelerator accelerator="CommandOrControl+Shift+V" />
    </MenuItem>,
    <MenuDivider key="div-change"></MenuDivider>,
    ...(selectedPatternCells.length > 1
      ? [
          <MenuItem
            key="interpolate"
            onClick={() => {
              dispatch(
                trackerDocumentActions.interpolateAbsoluteCells({
                  patternCells: selectedPatternCells,
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
            patternCells: selectedPatternCells,
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
            patternCells: selectedPatternCells,
          }),
        );
      }}
    >
      {l10n("MENU_DELETE")} <MenuAccelerator accelerator="Backspace" />
    </MenuItem>,
  ];
};

export default renderPianoContextMenu;
