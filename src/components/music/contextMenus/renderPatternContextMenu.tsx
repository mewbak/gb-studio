import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import l10n from "shared/lib/lang/l10n";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { BlankIcon, CheckIcon } from "ui/icons/Icons";
import { MenuDivider, MenuItem } from "ui/menu/Menu";

interface PatternContextMenuProps {
  dispatch: Dispatch<UnknownAction>;
  patternIndex: number;
  orderIndex: number;
  orderLength: number;
  numPatterns: number;
  onClose?: () => void;
}

const renderPatternContextMenu = ({
  dispatch,
  patternIndex,
  orderIndex,
  orderLength,
  numPatterns,
}: PatternContextMenuProps) => {
  return [
    ...(orderIndex > 0
      ? [
          <MenuItem
            key="move-start"
            onClick={() => {
              dispatch(
                trackerDocumentActions.moveSequence({
                  fromIndex: orderIndex,
                  toIndex: 0,
                }),
              );
            }}
          >
            {l10n("FIELD_MOVE_START")}
          </MenuItem>,
        ]
      : []),

    ...(orderIndex > 0
      ? [
          <MenuItem
            key="move-back"
            onClick={() => {
              dispatch(
                trackerDocumentActions.moveSequence({
                  fromIndex: orderIndex,
                  toIndex: orderIndex - 1,
                }),
              );
            }}
          >
            {l10n("FIELD_MOVE_BACK")}
          </MenuItem>,
        ]
      : []),

    ...(orderIndex < orderLength - 1
      ? [
          <MenuItem
            key="move-forward"
            onClick={() => {
              dispatch(
                trackerDocumentActions.moveSequence({
                  fromIndex: orderIndex,
                  toIndex: orderIndex + 1,
                }),
              );
            }}
          >
            {l10n("FIELD_MOVE_FORWARD")}
          </MenuItem>,
        ]
      : []),

    ...(orderIndex < orderLength - 1
      ? [
          <MenuItem
            key="move-end"
            onClick={() => {
              dispatch(
                trackerDocumentActions.moveSequence({
                  fromIndex: orderIndex,
                  toIndex: orderLength - 1,
                }),
              );
            }}
          >
            {l10n("FIELD_MOVE_END")}
          </MenuItem>,
          <MenuDivider key="div-insert" />,
        ]
      : []),
    <MenuItem
      key="replaceWith"
      subMenu={Array.from({ length: numPatterns + 1 }).map((_, n) => (
        <MenuItem
          key={n}
          icon={n === patternIndex ? <CheckIcon /> : <BlankIcon />}
          onClick={() => {
            dispatch(
              trackerDocumentActions.editSequence({
                sequenceIndex: orderIndex,
                sequenceId: n < numPatterns ? n : -1,
              }),
            );
          }}
        >
          {l10n("FIELD_PATTERN")} {String(n).padStart(2, "0")}{" "}
          {n === numPatterns ? `(${l10n("FIELD_NEW")})` : ""}
        </MenuItem>
      ))}
    >
      {l10n("FIELD_REPLACE_WITH")}
    </MenuItem>,

    <MenuItem
      key="insertBefore"
      subMenu={Array.from({ length: numPatterns + 1 }).map((_, n) => (
        <MenuItem
          key={n}
          onClick={() => {
            dispatch(
              trackerDocumentActions.insertSequence({
                sequenceIndex: orderIndex,
                position: "before",
                patternId: n < numPatterns ? n : undefined,
              }),
            );
          }}
        >
          {l10n("FIELD_PATTERN")} {String(n).padStart(2, "0")}{" "}
          {n === numPatterns ? `(${l10n("FIELD_NEW")})` : ""}
        </MenuItem>
      ))}
    >
      {l10n("FIELD_INSERT_PATTERN_BEFORE")}
    </MenuItem>,
    <MenuItem
      key="insertAfter"
      subMenu={Array.from({ length: numPatterns + 1 }).map((_, n) => (
        <MenuItem
          key={n}
          onClick={() => {
            dispatch(
              trackerDocumentActions.insertSequence({
                sequenceIndex: orderIndex,
                position: "after",
                patternId: n < numPatterns ? n : undefined,
              }),
            );
          }}
        >
          {l10n("FIELD_PATTERN")} {String(n).padStart(2, "0")}{" "}
          {n === numPatterns ? `(${l10n("FIELD_NEW")})` : ""}
        </MenuItem>
      ))}
    >
      {l10n("FIELD_INSERT_PATTERN_AFTER")}
    </MenuItem>,
    <MenuItem
      key="clone"
      onClick={() => {
        dispatch(
          trackerDocumentActions.cloneSequencePattern({
            sequenceIndex: orderIndex,
            position: "after",
          }),
        );
      }}
    >
      {l10n("FIELD_CLONE_PATTERN")}
    </MenuItem>,
    ...(orderLength > 1
      ? [
          <MenuDivider key="div-delete" />,
          <MenuItem
            key="delete"
            onClick={() => {
              dispatch(
                trackerDocumentActions.removeSequence({
                  sequenceIndex: orderIndex,
                }),
              );
            }}
          >
            {l10n("MENU_PATTERN_DELETE")}
          </MenuItem>,
        ]
      : []),
  ];
};

export default renderPatternContextMenu;
