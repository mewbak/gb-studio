import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Select } from "ui/form/Select";
import { PlusIcon } from "ui/icons/Icons";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import trackerActions from "store/features/tracker/trackerActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { SingleValue } from "react-select";
import { SortableList } from "ui/lists/SortableList";
import { patternHue } from "shared/lib/uge/display";
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
  sequence: number[];
  patterns: number;
  playingSequence: number;
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
  playingSequence: number;
  sequenceOptions: SequenceOption[];
  sequenceLength: number;
  numPatterns: number;
  setSelectHasFocus: (value: boolean) => void;
  direction: "vertical" | "horizontal";
}

const SequenceItem = ({
  item,
  isSelected,
  playingSequence,
  sequenceOptions,
  sequenceLength,
  numPatterns,
  setSelectHasFocus,
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
        onClose,
      });
    },
    [dispatch, item.patternId, item.sequenceIndex, numPatterns, sequenceLength],
  );

  const { onContextMenu, contextMenuElement } = useContextMenu({
    getMenu: ({ closeMenu }) => getContextMenu(closeMenu),
  });

  const contextMenu = useMemo(() => getContextMenu(), [getContextMenu]);

  return (
    <StyledSequenceItem
      $selected={isSelected}
      $active={playingSequence === item.sequenceIndex}
      style={{
        background: `linear-gradient(0deg, hsl(${patternHue(item.patternId)}deg 100% 70%) 0%, hsl(${patternHue(item.patternId)}deg 100% 90%) 100%)`,
      }}
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
        <Select
          classNamePrefix="CustomSelect--Left CustomSelect--WidthAuto"
          value={sequenceOptions.find(
            (option) => option.value === item.patternId,
          )}
          formatOptionLabel={(option, { context }) =>
            context === "value" && direction === "horizontal"
              ? option.shortLabel
              : option.label
          }
          options={sequenceOptions}
          onFocus={() => setSelectHasFocus(true)}
          onBlur={() => setSelectHasFocus(false)}
          onChange={(newValue: SingleValue<SequenceOption>) => {
            if (newValue) {
              editSequence(newValue);
            }
          }}
        />
      )}
      {contextMenuElement}
    </StyledSequenceItem>
  );
};

const SequenceEditorFwd = ({
  sequence,
  patterns,
  playingSequence,
  height,
  direction,
}: SequenceEditorProps) => {
  const dispatch = useAppDispatch();

  const [selectHasFocus, setSelectHasFocus] = useState(false);
  const sequenceId = useAppSelector((state) => state.tracker.selectedSequence);
  const sequenceLengthRef = useRef(sequence?.length ?? 0);

  const setSequenceId = useCallback(
    (sequenceId: number) => {
      dispatch(trackerActions.setSelectedPatternCells([]));
      dispatch(trackerActions.setSelectedSequence(sequenceId));
    },
    [dispatch],
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

  if (play && playingSequence !== -1) {
    setSequenceId(playingSequence);
  }

  const sequenceOptions: SequenceOption[] = Array.from(
    Array(patterns || 0).keys(),
  )
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
    ]);

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

  return (
    <StyledSequenceEditorWrapper style={{ height }}>
      <SortableList
        itemType={"sequence"}
        items={sequenceItems}
        extractKey={(item) => `${item.sequenceIndex}:${item.patternId}`}
        orientation={direction}
        gap={10}
        padding={10}
        selectedIndex={sequenceId}
        onSelect={(item) => {
          setSequenceId(item.sequenceIndex);
        }}
        renderItem={(item, { isSelected }) => (
          <SequenceItem
            item={item}
            isSelected={isSelected}
            playingSequence={playingSequence}
            sequenceOptions={sequenceOptions}
            setSelectHasFocus={setSelectHasFocus}
            sequenceLength={sequenceItems.length}
            numPatterns={patterns}
            direction={direction}
          />
        )}
        moveItems={onMoveSequence}
        onKeyDown={(e) => {
          if (selectHasFocus) {
            return true;
          }
          if (e.key === "Backspace" || e.key === "Delete") {
            onRemoveSequence();
            return true;
          }
        }}
        appendComponent={
          <StyledAddSequenceButton
            onClick={onAddSequence}
            title={l10n("FIELD_ADD_PATTERN")}
          >
            <PlusIcon />
          </StyledAddSequenceButton>
        }
      />
    </StyledSequenceEditorWrapper>
  );
};

export const SequenceEditor = React.memo(SequenceEditorFwd);
