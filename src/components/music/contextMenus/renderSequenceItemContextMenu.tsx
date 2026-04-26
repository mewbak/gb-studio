import React, { Dispatch } from "react";
import { UnknownAction } from "redux";
import API from "renderer/lib/api";
import l10n from "shared/lib/lang/l10n";
import { getL10NChannelName } from "shared/lib/uge/display";
import { SequenceItem } from "shared/lib/uge/types";
import trackerActions from "store/features/tracker/trackerActions";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { BlankIcon, CheckIcon } from "ui/icons/Icons";
import { MenuDivider, MenuGroup, MenuItem } from "ui/menu/Menu";

interface SequenceItemMenuProps {
  dispatch: Dispatch<UnknownAction>;
  sequenceItem: SequenceItem;
  orderIndex: number;
  orderLength: number;
  numPatterns: number;
  globalSplitPattern: boolean;
  loopSequenceId: number | undefined;
  onClose?: () => void;
}

const renderSequenceItemMenu = ({
  dispatch,
  sequenceItem,
  orderIndex,
  orderLength,
  loopSequenceId,
  numPatterns,
  globalSplitPattern,
  onClose,
}: SequenceItemMenuProps) => {
  return [
    <MenuItem
      key="loop"
      icon={loopSequenceId === orderIndex ? <CheckIcon /> : <BlankIcon />}
      onClick={() => {
        const isLooped = loopSequenceId === orderIndex;
        dispatch(
          trackerActions.setLoopSequenceId(isLooped ? undefined : orderIndex),
        );
        if (!isLooped) {
          API.music.sendToMusicWindow({
            action: "position",
            position: { sequence: orderIndex, row: 0 },
          });
        }
      }}
    >
      {l10n("FIELD_LOOP_PATTERN")}
    </MenuItem>,
    <MenuDivider key="div-loop" />,

    ...(orderIndex > 0
      ? [
          <MenuItem
            key="move-start"
            icon={<BlankIcon />}
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
            icon={<BlankIcon />}
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
            icon={<BlankIcon />}
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
            icon={<BlankIcon />}
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
        ]
      : []),

    ...(orderLength > 1 ? [<MenuDivider key="div-insert" />] : []),

    ...(!globalSplitPattern
      ? [
          <MenuItem
            key="splitPattern"
            icon={
              globalSplitPattern || sequenceItem.splitPattern ? (
                <CheckIcon />
              ) : (
                <BlankIcon />
              )
            }
            onClick={() => {
              dispatch(
                trackerDocumentActions.setSequenceSplitPattern({
                  sequenceIndex: orderIndex,
                  splitPattern: !sequenceItem.splitPattern,
                }),
              );
              onClose?.();
            }}
          >
            {l10n("FIELD_SPLIT_PATTERN")}
          </MenuItem>,
        ]
      : []),

    ...(globalSplitPattern || sequenceItem.splitPattern
      ? sequenceItem.channels.map((patternId, sequenceChannelId) => (
          <MenuItem
            key={`replaceChannel${sequenceChannelId}`}
            icon={<BlankIcon />}
            subMenu={Array.from({ length: numPatterns + 1 }).flatMap((_, n) => [
              <MenuGroup key={`${n}::group`}>
                {l10n("FIELD_PATTERN")} {String(n).padStart(2, "0")}
              </MenuGroup>,
              ...Array.from({ length: 4 }).flatMap((_, patternChannelId) => [
                <MenuItem
                  key={`${n}::${patternChannelId}`}
                  icon={
                    n * 4 + patternChannelId ===
                    sequenceItem.channels[sequenceChannelId] ? (
                      <CheckIcon />
                    ) : (
                      <BlankIcon />
                    )
                  }
                  onClick={() => {
                    dispatch(
                      trackerDocumentActions.editSequenceChannel({
                        sequenceIndex: orderIndex,
                        sequenceChannelId,
                        patternId: n < numPatterns ? n : -1,
                        patternChannelId,
                      }),
                    );
                  }}
                >
                  {l10n("FIELD_PATTERN")} {String(n).padStart(2, "0")}.
                  {patternChannelId}{" "}
                  {n === numPatterns ? `(${l10n("FIELD_NEW")})` : ""}
                </MenuItem>,
              ]),
            ])}
          >
            {getL10NChannelName(sequenceChannelId as 0 | 1 | 2 | 3)}
          </MenuItem>
        ))
      : []),

    <MenuDivider key="div-splitPattern" />,

    ...(!globalSplitPattern && !sequenceItem.splitPattern
      ? [
          <MenuItem
            key="replaceWith"
            icon={<BlankIcon />}
            subMenu={Array.from({ length: numPatterns + 1 }).map((_, n) => (
              <MenuItem
                key={n}
                icon={
                  n === sequenceItem.channels[0] ? <CheckIcon /> : <BlankIcon />
                }
                onClick={() => {
                  dispatch(
                    trackerDocumentActions.editSequence({
                      sequenceIndex: orderIndex,
                      patternId: n < numPatterns ? n : -1,
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
        ]
      : []),

    <MenuItem
      key="insertBefore"
      icon={<BlankIcon />}
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
      icon={<BlankIcon />}
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
    <MenuDivider key="div-duplicate" />,
    <MenuItem
      key="duplicate"
      icon={<BlankIcon />}
      onClick={() => {
        dispatch(
          trackerDocumentActions.duplicateSequencePattern({
            sequenceIndex: orderIndex,
            position: "after",
          }),
        );
      }}
    >
      {l10n("FIELD_DUPLICATE_PATTERN")}
    </MenuItem>,
    <MenuItem
      key="clone"
      icon={<BlankIcon />}
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
            icon={<BlankIcon />}
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

export default renderSequenceItemMenu;
