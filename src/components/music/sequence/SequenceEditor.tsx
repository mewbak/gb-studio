import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Select } from "ui/form/Select";
import { PlusIcon } from "ui/icons/Icons";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { SingleValue } from "react-select";
import { SortableList } from "ui/lists/SortableList";
import { patternGradient } from "shared/lib/uge/display";
import l10n from "shared/lib/lang/l10n";
import renderPatternContextMenu from "components/music/contextMenus/renderPatternContextMenu";
import { useContextMenu } from "ui/hooks/use-context-menu";
import {
  StyledAddSequenceButton,
  StyledSequenceEditorWrapper,
  StyledSequenceItem,
  StyledSequenceItemHeader,
} from "./style";
import { DropdownButton } from "ui/buttons/DropdownButton";

interface SequenceOption {
  value: number;
  label: string;
  shortLabel: string;
}
interface SequenceEditorProps {
  height?: number;
  direction: "vertical" | "horizontal";
}

interface SequenceListItem {
  sequenceIndex: number;
  patternId: number;
}

interface SequenceItemProps {
  item: SequenceListItem;
  isSelected: boolean;
  sequenceOptions: SequenceOption[];
  sequenceLength: number;
  numPatterns: number;
  loopSequenceId: number | undefined;
  direction: "vertical" | "horizontal";
}

interface SequencePatternSelectProps {
  patternId: number;
  sequenceOptions: SequenceOption[];
  onEditSequence: (newValue: SequenceOption) => void;
}

export const SequencePatternSelect = memo(
  ({
    patternId,
    sequenceOptions,
    onEditSequence,
  }: SequencePatternSelectProps) => {
    const value = useMemo(
      () => sequenceOptions.find((option) => option.value === patternId),
      [sequenceOptions, patternId],
    );

    const formatOptionLabel = useCallback(
      (option: SequenceOption, { context }: { context: "menu" | "value" }) =>
        context === "value" ? option.shortLabel : option.label,
      [],
    );

    const onChange = useCallback(
      (newValue: SingleValue<SequenceOption>) => {
        if (newValue) {
          onEditSequence(newValue);
        }
      },
      [onEditSequence],
    );

    return (
      <Select
        classNamePrefix="CustomSelect--Left CustomSelect--WidthAuto"
        value={value}
        formatOptionLabel={formatOptionLabel}
        options={sequenceOptions}
        onChange={onChange}
      />
    );
  },
);

const SequenceItem = memo(
  ({
    item,
    isSelected,
    sequenceOptions,
    sequenceLength,
    numPatterns,
    loopSequenceId,
    direction,
  }: SequenceItemProps) => {
    const dispatch = useAppDispatch();

    const editSequence = useCallback(
      (newValue: SequenceOption) => {
        dispatch(
          trackerDocumentActions.editSequence({
            sequenceIndex: item.sequenceIndex,
            sequenceId: newValue.value,
          }),
        );
      },
      [dispatch, item.sequenceIndex],
    );

    const getContextMenu = useCallback(
      (onClose?: () => void) => {
        return renderPatternContextMenu({
          dispatch,
          patternIndex: item.patternId,
          orderIndex: item.sequenceIndex,
          orderLength: sequenceLength,
          numPatterns,
          loopSequenceId,
          onClose,
        });
      },
      [
        dispatch,
        item.patternId,
        item.sequenceIndex,
        numPatterns,
        loopSequenceId,
        sequenceLength,
      ],
    );

    const { onContextMenu, contextMenuElement } = useContextMenu({
      getMenu: ({ closeMenu }) => getContextMenu(closeMenu),
    });

    const contextMenu = useMemo(() => getContextMenu(), [getContextMenu]);

    const isFiltered =
      loopSequenceId !== undefined && loopSequenceId !== item.sequenceIndex;

    const background = useMemo(
      () => patternGradient(item.patternId, isFiltered),
      [isFiltered, item.patternId],
    );

    return (
      <StyledSequenceItem
        $selected={isSelected}
        $filtered={isFiltered}
        style={{ background }}
        onContextMenu={onContextMenu}
      >
        <StyledSequenceItemHeader $direction={direction}>
          <span>
            {item.sequenceIndex + 1}:
            {direction === "vertical"
              ? ` ${l10n("FIELD_PATTERN")} ${String(item.patternId).padStart(2, "0")}`
              : ""}
          </span>
          {direction === "vertical" && (
            <DropdownButton
              variant="transparent"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {contextMenu}
            </DropdownButton>
          )}
        </StyledSequenceItemHeader>
        {direction === "horizontal" && (
          <SequencePatternSelect
            patternId={item.patternId}
            sequenceOptions={sequenceOptions}
            onEditSequence={editSequence}
          />
        )}
        {contextMenuElement}
      </StyledSequenceItem>
    );
  },
);

const emptySequence: number[] = [];

export const SequenceEditor = ({ height, direction }: SequenceEditorProps) => {
  const dispatch = useAppDispatch();

  const sequence = useAppSelector(
    (state) => state.trackerDocument.present.song?.sequence ?? emptySequence,
  );

  const patterns = useAppSelector(
    (state) => state.trackerDocument.present.song?.patterns.length ?? 0,
  );

  const sequenceId = useAppSelector((state) => state.tracker.selectedSequence);
  const playingSequence = useAppSelector(
    (state) => state.tracker.playbackPosition[0],
  );

  const loopSequenceId = useAppSelector(
    (state) => state.tracker.loopSequenceId,
  );

  const sequenceLengthRef = useRef(sequence?.length ?? 0);

  const setSequenceId = useCallback(
    (sequenceId: number) => {
      dispatch(trackerActions.setSelectedPatternCells([]));
      dispatch(trackerActions.setSelectedSequence(sequenceId));
      if (loopSequenceId !== sequenceId) {
        dispatch(trackerActions.setLoopSequenceId(undefined));
      }
    },
    [dispatch, loopSequenceId],
  );

  useEffect(() => {
    if (sequence) {
      const sequenceItemAboveMax = sequenceId >= sequence?.length;
      const sequenceItemBelowMin = sequenceId < 0;

      if (sequenceItemAboveMax) {
        setSequenceId(sequence.length - 1);
      } else if (sequenceItemBelowMin) {
        setSequenceId(0);
      }

      sequenceLengthRef.current = sequence.length;
    }
  }, [dispatch, sequence, sequenceId, setSequenceId]);

  const play = useAppSelector((state) => state.tracker.playing);

  useEffect(() => {
    if (play && playingSequence !== -1 && playingSequence !== sequenceId) {
      if (loopSequenceId !== undefined) {
        setSequenceId(loopSequenceId);
      } else {
        setSequenceId(playingSequence);
      }
    }
  }, [play, playingSequence, loopSequenceId, sequenceId, setSequenceId]);

  const sequenceOptions: SequenceOption[] = useMemo(
    () =>
      Array.from(Array(patterns || 0).keys())
        .map((i) => ({
          value: i,
          shortLabel: String(i).padStart(2, "0"),
          label: `${l10n("FIELD_PATTERN")} ${String(i).padStart(2, "0")}`,
        }))
        .concat([
          {
            value: -1,
            shortLabel: "",
            label: `${l10n("FIELD_PATTERN")} ${(patterns || 1).toString().padStart(2, "0")} (${l10n("FIELD_NEW")})`,
          },
        ]),
    [patterns],
  );

  const onAddSequence = useCallback(() => {
    dispatch(
      trackerDocumentActions.insertSequence({
        sequenceIndex: sequenceLengthRef.current,
        position: "after",
      }),
    );
  }, [dispatch]);

  const onRemoveSequence = useCallback(() => {
    dispatch(
      trackerDocumentActions.removeSequence({ sequenceIndex: sequenceId }),
    );
  }, [dispatch, sequenceId]);

  const onMoveSequence = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return;
      }

      dispatch(trackerDocumentActions.moveSequence({ fromIndex, toIndex }));
    },
    [dispatch],
  );

  const sequenceItems = useMemo<SequenceListItem[]>(
    () =>
      (sequence || []).map((patternId, sequenceIndex) => ({
        sequenceIndex,
        patternId,
      })),
    [sequence],
  );

  const renderSequenceItem = useCallback(
    (item: SequenceListItem, { isSelected }: { isSelected: boolean }) => (
      <SequenceItem
        item={item}
        isSelected={isSelected}
        sequenceOptions={sequenceOptions}
        sequenceLength={sequenceItems.length}
        numPatterns={patterns}
        loopSequenceId={loopSequenceId}
        direction={direction}
      />
    ),
    [
      sequenceOptions,
      sequenceItems.length,
      patterns,
      loopSequenceId,
      direction,
    ],
  );

  const onSelect = useCallback(
    (item: SequenceListItem) => {
      setSequenceId(item.sequenceIndex);
    },
    [setSequenceId],
  );

  const extractKey = useCallback(
    (item: SequenceListItem) => `${item.sequenceIndex}:${item.patternId}`,
    [],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTypingIntoSelect =
        active instanceof HTMLElement &&
        !!active.closest(".CustomSelect__control");
      if (isTypingIntoSelect) {
        return true;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        onRemoveSequence();
        return true;
      }
    },
    [onRemoveSequence],
  );

  const appendComponent = useMemo(
    () => (
      <StyledAddSequenceButton
        onClick={onAddSequence}
        title={l10n("FIELD_ADD_PATTERN")}
      >
        <PlusIcon />
      </StyledAddSequenceButton>
    ),
    [onAddSequence],
  );

  return (
    <StyledSequenceEditorWrapper style={{ height }}>
      <SortableList
        itemType={"sequence"}
        items={sequenceItems}
        extractKey={extractKey}
        orientation={direction}
        gap={10}
        padding={10}
        selectedIndex={sequenceId}
        onSelect={onSelect}
        renderItem={renderSequenceItem}
        moveItems={onMoveSequence}
        onKeyDown={onKeyDown}
        appendComponent={appendComponent}
      />
    </StyledSequenceEditorWrapper>
  );
};
