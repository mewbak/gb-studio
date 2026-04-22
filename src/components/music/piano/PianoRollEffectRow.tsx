import React, { useCallback, useMemo } from "react";
import { PatternCell } from "shared/lib/uge/types";
import trackerActions from "store/features/tracker/trackerActions";
import trackerDocumentActions from "store/features/trackerDocument/trackerDocumentActions";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { StyledPianoRollEffectCell, StyledPianoRollEffectRow } from "./style";
import { PIANO_ROLL_CELL_SIZE } from "consts";

interface PianoRollEffectRowProps {
  patternId: number;
  sequenceId: number;
  channelId: 0 | 1 | 2 | 3;
}

type EffectCellChanges = {
  effectcode: number | null;
  effectparam: number | null;
};

const computeEffectChanges = (
  cell?: PatternCell,
  lastCell?: PatternCell,
): EffectCellChanges | null => {
  if (!cell) {
    return null;
  }

  return {
    effectcode:
      cell.effectcode !== null ? cell.effectcode : (lastCell?.effectcode ?? 0),
    effectparam:
      cell.effectparam !== null
        ? cell.effectparam
        : (lastCell?.effectparam ?? 0),
  };
};

const clearEffect = (): EffectCellChanges => ({
  effectcode: null,
  effectparam: null,
});

const hasEffect = (cell?: PatternCell) =>
  Boolean(cell && (cell.effectcode !== null || cell.effectparam !== null));

export const PianoRollEffectRow = React.memo(
  ({ sequenceId, patternId, channelId }: PianoRollEffectRowProps) => {
    const dispatch = useAppDispatch();

    const tool = useAppSelector((state) => state.tracker.tool);
    const playing = useAppSelector((state) => state.tracker.playing);
    const selectedEffectCell = useAppSelector(
      (state) => state.tracker.selectedEffectCell,
    );
    const selectedPatternCells = useAppSelector(
      (state) => state.tracker.selectedPatternCells,
    );

    const selectedRowIds = useMemo(() => {
      return new Set(
        selectedPatternCells
          .filter(
            (cell) =>
              cell.sequenceId === sequenceId && cell.channelId === channelId,
          )
          .map((cell) => cell.rowId),
      );
    }, [channelId, selectedPatternCells, sequenceId]);

    const songDocument = useAppSelector(
      (state) => state.trackerDocument.present.song,
    );

    const renderPattern = songDocument?.patterns[patternId];

    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!renderPattern) return;

        const col = Math.floor(e.nativeEvent.offsetX / PIANO_ROLL_CELL_SIZE);
        const cell = renderPattern[col]?.[channelId] as PatternCell | undefined;

        const lastCell =
          selectedEffectCell !== null
            ? (songDocument?.patterns[selectedEffectCell.patternId]?.[
                selectedEffectCell.rowId
              ]?.[selectedEffectCell.channelId] as PatternCell | undefined)
            : undefined;

        if (e.button === 0 && tool !== "eraser") {
          const changes = computeEffectChanges(cell, lastCell);

          if (changes) {
            if (tool === "pencil") {
              dispatch(
                trackerDocumentActions.editPatternCell({
                  patternId,
                  cell: [col, channelId],
                  changes,
                }),
              );
            }
            dispatch(
              trackerActions.setSelectedEffectCell({
                sequenceId,
                patternId,
                rowId: col,
                channelId,
              }),
            );
            dispatch(
              trackerActions.setSelectedPatternCells([
                {
                  sequenceId,
                  rowId: col,
                  channelId,
                },
              ]),
            );
          }
        } else if (e.button === 2 || (tool === "eraser" && e.button === 0)) {
          if (hasEffect(cell)) {
            dispatch(
              trackerDocumentActions.editPatternCell({
                patternId,
                cell: [col, channelId],
                changes: clearEffect(),
              }),
            );
          }
        }
      },
      [
        renderPattern,
        channelId,
        selectedEffectCell,
        songDocument?.patterns,
        tool,
        dispatch,
        patternId,
        sequenceId,
      ],
    );

    return (
      <StyledPianoRollEffectRow
        onMouseDown={!playing ? handleMouseDown : undefined}
      >
        {renderPattern?.map((column: PatternCell[], columnIdx: number) => {
          const cell = column[channelId];

          const isSelected = selectedRowIds.has(columnIdx);

          if (!cell || cell.effectcode === null) {
            return null;
          }

          return (
            <StyledPianoRollEffectCell
              key={`fx_${columnIdx}_${channelId}`}
              data-type="note"
              data-row={columnIdx}
              $isSelected={isSelected}
              style={{ left: `${columnIdx * PIANO_ROLL_CELL_SIZE}px` }}
              $instrument={cell.instrument ?? undefined}
            >
              <span>{cell.effectcode?.toString(16).toUpperCase()}</span>
            </StyledPianoRollEffectCell>
          );
        })}
      </StyledPianoRollEffectRow>
    );
  },
);
