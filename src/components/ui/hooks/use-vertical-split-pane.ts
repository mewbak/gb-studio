import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import useSplitPane from "ui/hooks/use-split-pane";

export type SplitPaneLayout =
  | {
      type: "fixed";
      size: number;
      initialMinSize?: number;
      minSize?: number;
    }
  | {
      type: "fill";
      weight?: number;
      initialMinSize?: number;
      minSize?: number;
    };

interface UseVerticalSplitPaneProps {
  height: number;
  panelCount: number;
  minPaneSize?: number;
  collapsedSize?: number;
  defaultLayout?: SplitPaneLayout[];
}

interface UseVerticalSplitPaneResult {
  sizes: number[];
  onDragStart: (
    index: number,
  ) => (ev: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  togglePane: (index: number) => void;
  ensurePaneMinHeight: (index: number, requestedHeight: number) => void;
}

const DEFAULT_COLLAPSED_SIZE = 30;

const sum = (values: number[]) =>
  values.reduce((memo, value) => memo + value, 0);

export const getDefaultSizes = (count: number, totalHeight: number) => {
  if (count <= 0) {
    return [];
  }

  const base = Math.floor(totalHeight / count);
  const remainder = totalHeight - base * count;

  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? base + remainder : base,
  );
};

export const getSizesFromLayout = (
  layout: SplitPaneLayout[],
  count: number,
  totalHeight: number,
) => {
  if (count <= 0) {
    return [];
  }

  const resolvedLayout = layout.slice(0, count);

  while (resolvedLayout.length < count) {
    resolvedLayout.push({ type: "fill", weight: 1 });
  }

  const sizes = new Array<number>(count).fill(0);

  const fillIndexes: number[] = [];
  let fillInitialMinTotal = 0;

  for (let index = 0; index < resolvedLayout.length; index++) {
    const entry = resolvedLayout[index];
    if (entry.type === "fill") {
      const initialMinSize = Math.max(0, Math.floor(entry.initialMinSize ?? 0));
      sizes[index] = initialMinSize;
      fillIndexes.push(index);
      fillInitialMinTotal += initialMinSize;
    }
  }

  if (fillInitialMinTotal >= totalHeight) {
    let remaining = totalHeight;

    for (let i = 0; i < fillIndexes.length; i++) {
      const index = fillIndexes[i];
      const size = Math.min(sizes[index], remaining);
      sizes[index] = size;
      remaining -= size;
    }

    return sizes;
  }

  let remainingHeight = totalHeight - fillInitialMinTotal;

  const fixedIndexes: number[] = [];
  let requestedFixedTotal = 0;

  for (let index = 0; index < resolvedLayout.length; index++) {
    const entry = resolvedLayout[index];
    if (entry.type === "fixed") {
      fixedIndexes.push(index);
      requestedFixedTotal += Math.max(0, Math.floor(entry.size));
    }
  }

  const assignedFixedTotal = Math.min(remainingHeight, requestedFixedTotal);
  remainingHeight -= assignedFixedTotal;

  if (requestedFixedTotal > 0) {
    let usedFixedHeight = 0;
    let lastFixedIndex = -1;

    for (let i = 0; i < fixedIndexes.length; i++) {
      const index = fixedIndexes[i];
      const entry = resolvedLayout[index];
      if (entry.type !== "fixed") {
        continue;
      }

      lastFixedIndex = index;
      const requested = Math.max(0, Math.floor(entry.size));
      const size = Math.floor(
        (assignedFixedTotal * requested) / requestedFixedTotal,
      );
      sizes[index] = size;
      usedFixedHeight += size;
    }

    const fixedRemainder = assignedFixedTotal - usedFixedHeight;
    if (fixedRemainder > 0 && lastFixedIndex >= 0) {
      sizes[lastFixedIndex] += fixedRemainder;
    }
  }

  const totalWeight = resolvedLayout.reduce((memo, entry) => {
    if (entry.type === "fill") {
      return memo + Math.max(0, entry.weight ?? 1);
    }
    return memo;
  }, 0);

  if (remainingHeight > 0 && totalWeight > 0) {
    let usedFillExtraHeight = 0;
    let lastFillIndex = -1;

    for (let index = 0; index < resolvedLayout.length; index++) {
      const entry = resolvedLayout[index];
      if (entry.type !== "fill") {
        continue;
      }

      lastFillIndex = index;
      const weight = Math.max(0, entry.weight ?? 1);
      const extraSize = Math.floor((remainingHeight * weight) / totalWeight);
      sizes[index] += extraSize;
      usedFillExtraHeight += extraSize;
    }

    const fillRemainder = remainingHeight - usedFillExtraHeight;
    if (fillRemainder > 0 && lastFillIndex >= 0) {
      sizes[lastFillIndex] += fillRemainder;
    }
  }

  return sizes;
};

export const getInitialSizes = (
  count: number,
  totalHeight: number,
  layout?: SplitPaneLayout[],
) => {
  if (totalHeight <= 0) {
    return [];
  }

  if (layout && layout.length > 0) {
    return getSizesFromLayout(layout, count, totalHeight);
  }

  return getDefaultSizes(count, totalHeight);
};

export const fitSizesToTotal = (
  currentSizes: number[],
  totalHeight: number,
  minSizes: number[],
  collapsedSize: number,
) => {
  const count = currentSizes.length;

  if (count <= 0) {
    return [];
  }

  if (totalHeight <= 0) {
    return new Array<number>(count).fill(0);
  }

  const safeCollapsedSize = Math.max(0, Math.floor(collapsedSize));
  const safeMinSizes = Array.from({ length: count }, (_, index) =>
    Math.max(0, Math.floor(minSizes[index] ?? 0)),
  );
  const preferredSizes = currentSizes.map((size) =>
    Math.max(0, Math.floor(size)),
  );

  const result = new Array<number>(count).fill(0);

  const lockedIndexes = Array.from(
    { length: count },
    (_, index) => index,
  ).filter((index) => preferredSizes[index] <= safeCollapsedSize);

  let remainingHeight = totalHeight;

  for (let i = 0; i < lockedIndexes.length; i++) {
    const index = lockedIndexes[i];
    const lockedSize = preferredSizes[index];
    result[index] = lockedSize;
    remainingHeight -= lockedSize;
  }

  const remainingIndexes = Array.from(
    { length: count },
    (_, index) => index,
  ).filter((index) => !lockedIndexes.includes(index));

  if (remainingIndexes.length === 0) {
    return result;
  }

  if (remainingHeight <= 0) {
    return result;
  }

  const remainingPreferredSizes = remainingIndexes.map(
    (index) => preferredSizes[index],
  );
  const remainingMinSizes = remainingIndexes.map(
    (index) => safeMinSizes[index],
  );

  const remainingPreferredTotal = sum(remainingPreferredSizes);
  const remainingMinTotal = sum(remainingMinSizes);

  if (remainingPreferredTotal <= 0) {
    const fallback = getDefaultSizes(remainingIndexes.length, remainingHeight);
    for (let i = 0; i < remainingIndexes.length; i++) {
      result[remainingIndexes[i]] = fallback[i] ?? 0;
    }
    return result;
  }

  if (remainingMinTotal >= remainingHeight) {
    const fallback = getDefaultSizes(remainingIndexes.length, remainingHeight);
    for (let i = 0; i < remainingIndexes.length; i++) {
      result[remainingIndexes[i]] = fallback[i] ?? 0;
    }
    return result;
  }

  let activeIndexes = [...remainingIndexes];
  let activeHeight = remainingHeight;

  while (activeIndexes.length > 0) {
    const activePreferredTotal = sum(
      activeIndexes.map((index) => preferredSizes[index]),
    );

    if (activePreferredTotal <= 0) {
      const fallback = getDefaultSizes(activeIndexes.length, activeHeight);
      for (let i = 0; i < activeIndexes.length; i++) {
        result[activeIndexes[i]] = fallback[i] ?? 0;
      }
      break;
    }

    const currentActiveHeight = activeHeight;

    const forcedIndexes = activeIndexes.filter((index) => {
      const proposed = Math.floor(
        (currentActiveHeight * preferredSizes[index]) / activePreferredTotal,
      );
      return proposed < safeMinSizes[index];
    });

    if (forcedIndexes.length === 0) {
      let used = 0;
      let lastIndex = -1;

      for (let i = 0; i < activeIndexes.length; i++) {
        const index = activeIndexes[i];
        lastIndex = index;

        const size = Math.floor(
          (currentActiveHeight * preferredSizes[index]) / activePreferredTotal,
        );

        result[index] = size;
        used += size;
      }

      const remainder = currentActiveHeight - used;
      if (remainder > 0 && lastIndex >= 0) {
        result[lastIndex] += remainder;
      }

      break;
    }

    for (let i = 0; i < forcedIndexes.length; i++) {
      const index = forcedIndexes[i];
      result[index] = safeMinSizes[index];
      activeHeight -= safeMinSizes[index];
    }

    activeIndexes = activeIndexes.filter(
      (index) => !forcedIndexes.includes(index),
    );
  }

  return result;
};

export const useVerticalSplitPane = ({
  height,
  panelCount,
  minPaneSize = DEFAULT_COLLAPSED_SIZE,
  collapsedSize = DEFAULT_COLLAPSED_SIZE,
  defaultLayout,
}: UseVerticalSplitPaneProps): UseVerticalSplitPaneResult => {
  const minSizes = useMemo(
    () =>
      Array.from({ length: panelCount }, (_, index) =>
        Math.max(minPaneSize, defaultLayout?.[index]?.minSize ?? 0),
      ),
    [panelCount, minPaneSize, defaultLayout],
  );

  const minSizesKey = useMemo(() => minSizes.join(","), [minSizes]);

  const layoutKey = useMemo(
    () => JSON.stringify(defaultLayout ?? []),
    [defaultLayout],
  );

  const [sizes, setSizesState] = useState<number[]>(() =>
    getInitialSizes(panelCount, height, defaultLayout),
  );

  useLayoutEffect(() => {
    if (height <= 0) {
      return;
    }

    setSizesState((currentSizes) => {
      if (currentSizes.length !== panelCount) {
        return getInitialSizes(panelCount, height, defaultLayout);
      }

      const currentTotal = sum(currentSizes);
      if (currentTotal <= 0) {
        return getInitialSizes(panelCount, height, defaultLayout);
      }

      if (currentTotal === height) {
        return currentSizes;
      }

      return fitSizesToTotal(currentSizes, height, minSizes, collapsedSize);
    });
  }, [
    height,
    panelCount,
    collapsedSize,
    minSizes,
    minSizesKey,
    defaultLayout,
    layoutKey,
  ]);

  const resolvedSizes = useMemo(() => {
    if (sizes.length === panelCount && sum(sizes) > 0) {
      return fitSizesToTotal(sizes, height, minSizes, collapsedSize);
    }

    return getInitialSizes(panelCount, height, defaultLayout);
  }, [sizes, panelCount, height, minSizes, collapsedSize, defaultLayout]);

  const setSizes = useCallback(
    (newSizes: number[], _manuallyEdited: boolean) => {
      setSizesState(fitSizesToTotal(newSizes, height, minSizes, collapsedSize));
    },
    [height, minSizes, collapsedSize],
  );

  const ensurePaneMinHeight = useCallback(
    (index: number, requestedHeight: number) => {
      setSizesState((currentSizes) => {
        const workingSizes =
          currentSizes.length === panelCount && sum(currentSizes) > 0
            ? fitSizesToTotal(currentSizes, height, minSizes, collapsedSize)
            : getInitialSizes(panelCount, height, defaultLayout);

        const nextSizes = [...workingSizes];
        const currentHeight = nextSizes[index] ?? 0;
        const targetHeight = Math.max(
          currentHeight,
          Math.floor(requestedHeight),
        );

        if (targetHeight <= currentHeight) {
          return workingSizes;
        }

        let extraNeeded = targetHeight - currentHeight;
        nextSizes[index] = targetHeight;

        for (let i = nextSizes.length - 1; i >= 0 && extraNeeded > 0; i--) {
          if (i === index) {
            continue;
          }

          const minSize = minSizes[i] ?? minPaneSize;
          const available = Math.max(0, nextSizes[i] - minSize);
          const taken = Math.min(available, extraNeeded);

          nextSizes[i] -= taken;
          extraNeeded -= taken;
        }

        if (extraNeeded > 0) {
          nextSizes[index] -= extraNeeded;
        }

        return fitSizesToTotal(nextSizes, height, minSizes, collapsedSize);
      });
    },
    [panelCount, height, minSizes, minPaneSize, collapsedSize, defaultLayout],
  );

  const [onDragStart, togglePane] = useSplitPane({
    sizes: resolvedSizes,
    setSizes,
    minSizes,
    maxTotal: height,
    collapsedSize,
    direction: "vertical",
  });

  return {
    sizes: resolvedSizes,
    onDragStart,
    togglePane,
    ensurePaneMinHeight,
  };
};

export default useVerticalSplitPane;
