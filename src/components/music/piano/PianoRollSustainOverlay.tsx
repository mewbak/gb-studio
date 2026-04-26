import debounce from "lodash/debounce";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PIANO_ROLL_CELL_SIZE,
  TOTAL_NOTES,
  TRACKER_PATTERN_LENGTH,
} from "consts";
import { channelIdToInstrumentType } from "shared/lib/uge/display";
import {
  DutyInstrument,
  NoiseInstrument,
  PatternCell,
  SequenceItem,
  WaveInstrument,
} from "shared/lib/uge/types";
import { useAppStore } from "store/hooks";
import type { RootState } from "store/configureStore";
import {
  StyledPianoRollNoteSustain,
  StyledPianoRollSustainChannel,
  StyledPianoRollSustainOverlay,
} from "./style";
import {
  calculateDocumentWidth,
  getPatternListStartTicksPerRow,
  getPatternListTicksPerRow,
  getPatternNoteSustain,
} from "./helpers";

type PianoRollChannelId = 0 | 1 | 2 | 3;
type ChannelInstrument = DutyInstrument | WaveInstrument | NoiseInstrument;
type SequencePattern = ReadonlyArray<PatternCell> | undefined;

interface PianoRollSustainOverlayProps {
  displayChannels: number[];
  selectedChannel: number;
  sequence: SequenceItem[];
}

interface ChannelOverlaySnapshot {
  sequencePatterns: SequencePattern[];
  initialTicksPerRow: number;
  instruments: ReadonlyArray<ChannelInstrument> | undefined;
}

interface PianoRollSustainChannelOverlayProps {
  channelId: PianoRollChannelId;
  isActive: boolean;
  sequence: SequenceItem[];
  width: number;
}

interface SustainBlock {
  key: string;
  left: number;
  bottom: number;
  width: number;
  instrument?: number;
}

export const SUSTAIN_OVERLAY_DEBOUNCE_MS = 150;

const noteBottom = (note: number) =>
  (note % TOTAL_NOTES) * PIANO_ROLL_CELL_SIZE;

const isPianoRollChannelId = (value: number): value is PianoRollChannelId =>
  value === 0 || value === 1 || value === 2 || value === 3;

const arePatternListsEqual = (
  a: SequencePattern[] | undefined,
  b: SequencePattern[] | undefined,
): boolean => {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};

const areChannelOverlaySnapshotsEqual = (
  a: ChannelOverlaySnapshot,
  b: ChannelOverlaySnapshot,
) =>
  a.initialTicksPerRow === b.initialTicksPerRow &&
  a.instruments === b.instruments &&
  arePatternListsEqual(a.sequencePatterns, b.sequencePatterns);

const useDebouncedStoreValue = <T,>(
  select: (state: RootState) => T,
  isEqual: (a: T, b: T) => boolean,
  delayMs: number,
) => {
  const store = useAppStore();
  const [value, setValue] = useState(() => select(store.getState()));
  const valueRef = useRef(value);
  const queuedValueRef = useRef<T | null>(null);
  const selectRef = useRef(select);
  const isEqualRef = useRef(isEqual);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    selectRef.current = select;
    isEqualRef.current = isEqual;

    const nextValue = select(store.getState());
    queuedValueRef.current = null;

    setValue((prevValue) => {
      if (isEqual(prevValue, nextValue)) {
        return prevValue;
      }

      valueRef.current = nextValue;
      return nextValue;
    });
  }, [isEqual, select, store]);

  useEffect(() => {
    const publish = debounce(() => {
      const nextValue = queuedValueRef.current;
      queuedValueRef.current = null;

      if (nextValue === null) {
        return;
      }

      setValue((prevValue) => {
        if (isEqualRef.current(prevValue, nextValue)) {
          return prevValue;
        }

        valueRef.current = nextValue;
        return nextValue;
      });
    }, delayMs);

    const unsubscribe = store.subscribe(() => {
      const nextValue = selectRef.current(store.getState());
      const compareValue = queuedValueRef.current ?? valueRef.current;

      if (!isEqualRef.current(compareValue, nextValue)) {
        queuedValueRef.current = nextValue;
        publish();
      }
    });

    return () => {
      publish.cancel();
      unsubscribe();
    };
  }, [delayMs, store]);

  return value;
};

const getChannelInstruments = (
  channelId: PianoRollChannelId,
  dutyInstruments: DutyInstrument[] | undefined,
  waveInstruments: WaveInstrument[] | undefined,
  noiseInstruments: NoiseInstrument[] | undefined,
): ReadonlyArray<ChannelInstrument> | undefined => {
  const instrumentType = channelIdToInstrumentType(channelId);

  if (instrumentType === "wave") {
    return waveInstruments;
  }

  if (instrumentType === "noise") {
    return noiseInstruments;
  }

  return dutyInstruments;
};

const getPatternStartInstrumentIds = (patterns: SequencePattern[]) => {
  let currentInstrumentId: number | null = null;

  return patterns.map((pattern) => {
    const startInstrumentId = currentInstrumentId;

    if (pattern) {
      for (const cell of pattern) {
        if (cell.instrument !== null) {
          currentInstrumentId = cell.instrument;
        }
      }
    }

    return startInstrumentId;
  });
};

const buildSustainBlocks = ({
  sequencePatterns,
  startTicksPerRowByPattern,
  startInstrumentIds,
  initialTicksPerRow,
  instruments,
  isActive,
}: {
  sequencePatterns: SequencePattern[];
  startTicksPerRowByPattern: number[];
  startInstrumentIds: Array<number | null>;
  initialTicksPerRow: number;
  instruments: ReadonlyArray<ChannelInstrument> | undefined;
  isActive: boolean;
}): SustainBlock[] => {
  const blocks: SustainBlock[] = [];

  for (
    let sequenceId = 0;
    sequenceId < sequencePatterns.length;
    sequenceId += 1
  ) {
    const currentPattern = sequencePatterns[sequenceId];

    if (!currentPattern) {
      continue;
    }

    const suffixPatterns = sequencePatterns.slice(sequenceId);
    const startTicksPerRow =
      startTicksPerRowByPattern[sequenceId] ?? initialTicksPerRow;
    const ticksPerRowByRow = getPatternListTicksPerRow(
      suffixPatterns,
      startTicksPerRow,
    );
    const channelCells = suffixPatterns.flatMap((pattern) => pattern ?? []);

    let currentInstrumentId = startInstrumentIds[sequenceId] ?? null;

    for (let rowId = 0; rowId < currentPattern.length; rowId += 1) {
      const cell = currentPattern[rowId];

      if (cell.instrument !== null) {
        currentInstrumentId = cell.instrument;
      }

      if (cell.note === null) {
        continue;
      }

      const resolvedInstrumentId = currentInstrumentId;
      const sustain = getPatternNoteSustain({
        instruments,
        channelCells,
        ticksPerRowByRow,
        rowIndex: rowId,
        instrumentId: resolvedInstrumentId,
      });

      if (sustain <= 1) {
        continue;
      }

      blocks.push({
        key: `${sequenceId}:${rowId}`,
        left:
          (sequenceId * TRACKER_PATTERN_LENGTH + (rowId + 1)) *
          PIANO_ROLL_CELL_SIZE,
        bottom: noteBottom(cell.note) + 5,
        width: (sustain - 1) * PIANO_ROLL_CELL_SIZE,
        instrument:
          resolvedInstrumentId !== null && isActive
            ? resolvedInstrumentId
            : undefined,
      });
    }
  }

  return blocks;
};

const PianoRollSustainChannelOverlay = memo(
  ({
    channelId,
    isActive,
    sequence,
    width,
  }: PianoRollSustainChannelOverlayProps) => {
    const selectSnapshot = useCallback(
      (state: RootState): ChannelOverlaySnapshot => {
        const song = state.trackerDocument.present.song;
        const patterns = song?.patterns;

        return {
          sequencePatterns: sequence.map(
            (sequenceItem) => patterns?.[sequenceItem.channels[channelId]],
          ),
          initialTicksPerRow: song?.ticksPerRow ?? 0,
          instruments: getChannelInstruments(
            channelId,
            song?.dutyInstruments,
            song?.waveInstruments,
            song?.noiseInstruments,
          ),
        };
      },
      [channelId, sequence],
    );

    const { sequencePatterns, initialTicksPerRow, instruments } =
      useDebouncedStoreValue(
        selectSnapshot,
        areChannelOverlaySnapshotsEqual,
        SUSTAIN_OVERLAY_DEBOUNCE_MS,
      );

    const startTicksPerRowByPattern = useMemo(
      () =>
        getPatternListStartTicksPerRow(sequencePatterns, initialTicksPerRow),
      [initialTicksPerRow, sequencePatterns],
    );

    const startInstrumentIds = useMemo(
      () => getPatternStartInstrumentIds(sequencePatterns),
      [sequencePatterns],
    );

    const sustains = useMemo(
      () =>
        buildSustainBlocks({
          sequencePatterns,
          startTicksPerRowByPattern,
          startInstrumentIds,
          initialTicksPerRow,
          instruments,
          isActive,
        }),
      [
        initialTicksPerRow,
        instruments,
        isActive,
        sequencePatterns,
        startInstrumentIds,
        startTicksPerRowByPattern,
      ],
    );

    if (sustains.length === 0) {
      return null;
    }

    return (
      <StyledPianoRollSustainChannel $active={isActive} $width={width}>
        {sustains.map((sustain) => (
          <StyledPianoRollNoteSustain
            key={sustain.key}
            $instrument={sustain.instrument}
            style={{
              left: sustain.left,
              bottom: sustain.bottom,
              width: sustain.width,
            }}
          />
        ))}
      </StyledPianoRollSustainChannel>
    );
  },
);

export const PianoRollSustainOverlay = memo(
  ({
    displayChannels,
    selectedChannel,
    sequence,
  }: PianoRollSustainOverlayProps) => {
    if (sequence.length === 0) {
      return null;
    }

    const width = calculateDocumentWidth(sequence.length);

    return (
      <StyledPianoRollSustainOverlay $width={width}>
        {displayChannels.filter(isPianoRollChannelId).map((channelId) => (
          <PianoRollSustainChannelOverlay
            key={channelId}
            channelId={channelId}
            isActive={selectedChannel === channelId}
            sequence={sequence}
            width={width}
          />
        ))}
      </StyledPianoRollSustainOverlay>
    );
  },
);
