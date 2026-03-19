import {
  getDefaultSizes,
  getSizesFromLayout,
  getInitialSizes,
  fitSizesToTotal,
  SplitPaneLayout,
} from "ui/hooks/use-vertical-split-pane";

describe("getDefaultSizes", () => {
  test("returns empty array when count is 0", () => {
    expect(getDefaultSizes(0, 100)).toEqual([]);
  });

  test("returns empty array when count is negative", () => {
    expect(getDefaultSizes(-1, 100)).toEqual([]);
  });

  test("splits height evenly across panes", () => {
    expect(getDefaultSizes(4, 100)).toEqual([25, 25, 25, 25]);
  });

  test("puts remainder on the last pane", () => {
    expect(getDefaultSizes(3, 100)).toEqual([33, 33, 34]);
  });

  test("returns full height for a single pane", () => {
    expect(getDefaultSizes(1, 100)).toEqual([100]);
  });

  test("returns zero sized panes when total height is 0", () => {
    expect(getDefaultSizes(3, 0)).toEqual([0, 0, 0]);
  });

  test("handles total height smaller than pane count", () => {
    expect(getDefaultSizes(5, 2)).toEqual([0, 0, 0, 0, 2]);
  });
});

describe("getSizesFromLayout", () => {
  test("returns empty array when count is 0", () => {
    expect(getSizesFromLayout([], 0, 100)).toEqual([]);
  });

  test("fills missing layout entries with default fill panes", () => {
    const layout: SplitPaneLayout[] = [{ type: "fixed", size: 30 }];

    expect(getSizesFromLayout(layout, 3, 100)).toEqual([30, 35, 35]);
  });

  test("ignores extra layout entries beyond count", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 40 },
      { type: "fixed", size: 60 },
      { type: "fixed", size: 999 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([40, 60]);
  });

  test("allocates fixed panes exactly when enough space exists", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 20 },
      { type: "fixed", size: 30 },
      { type: "fill" },
    ];

    expect(getSizesFromLayout(layout, 3, 100)).toEqual([20, 30, 50]);
  });

  test("allocates fill panes evenly by default", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill" },
      { type: "fill" },
      { type: "fill" },
    ];

    expect(getSizesFromLayout(layout, 3, 100)).toEqual([33, 33, 34]);
  });

  test("allocates fill panes proportionally by weight", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", weight: 1 },
      { type: "fill", weight: 2 },
      { type: "fill", weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 3, 100)).toEqual([25, 50, 25]);
  });

  test("treats missing fill weight as 1", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill" },
      { type: "fill", weight: 3 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([25, 75]);
  });

  test("treats negative fill weight as 0", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", weight: -1 },
      { type: "fill", weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([0, 100]);
  });

  test("applies fill initialMinSize before distributing remaining height", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", initialMinSize: 10, weight: 1 },
      { type: "fill", initialMinSize: 20, weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([45, 55]);
  });

  test("floors fractional initialMinSize values", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", initialMinSize: 10.9, weight: 1 },
      { type: "fill", initialMinSize: 0, weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([55, 45]);
  });

  test("treats negative initialMinSize as 0", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", initialMinSize: -10, weight: 1 },
      { type: "fill", weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([50, 50]);
  });

  test("returns only fill initial minimums when they already exceed total height", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", initialMinSize: 80 },
      { type: "fill", initialMinSize: 50 },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([80, 20]);
  });

  test("scales fixed panes proportionally when requested fixed total exceeds available space", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 80 },
      { type: "fixed", size: 40 },
    ];

    expect(getSizesFromLayout(layout, 2, 60)).toEqual([40, 20]);
  });

  test("floors fractional fixed sizes", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 10.9 },
      { type: "fixed", size: 20.9 },
      { type: "fill" },
    ];

    expect(getSizesFromLayout(layout, 3, 100)).toEqual([10, 20, 70]);
  });

  test("treats negative fixed sizes as 0", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: -50 },
      { type: "fill" },
    ];

    expect(getSizesFromLayout(layout, 2, 100)).toEqual([0, 100]);
  });

  test("keeps fixed panes at requested sizes when total requested size is below available space", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 1 },
      { type: "fixed", size: 1 },
      { type: "fixed", size: 1 },
    ];

    expect(getSizesFromLayout(layout, 3, 10)).toEqual([1, 1, 1]);
  });

  test("distributes fill rounding remainder to the last fill pane", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fill", weight: 1 },
      { type: "fill", weight: 1 },
      { type: "fill", weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 3, 10)).toEqual([3, 3, 4]);
  });

  test("supports mixed fixed and fill panes with fill initial minimums", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 30 },
      { type: "fill", initialMinSize: 10, weight: 1 },
      { type: "fill", initialMinSize: 20, weight: 2 },
    ];

    expect(getSizesFromLayout(layout, 3, 120)).toEqual([30, 30, 60]);
  });

  test("returns all zeroes when total height is 0", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 10 },
      { type: "fill", weight: 1 },
    ];

    expect(getSizesFromLayout(layout, 2, 0)).toEqual([0, 0]);
  });
});

describe("getInitialSizes", () => {
  test("returns empty array when total height is 0", () => {
    expect(getInitialSizes(3, 0)).toEqual([]);
  });

  test("returns empty array when total height is negative", () => {
    expect(getInitialSizes(3, -10)).toEqual([]);
  });

  test("uses default sizes when layout is undefined", () => {
    expect(getInitialSizes(3, 100)).toEqual([33, 33, 34]);
  });

  test("uses default sizes when layout is empty", () => {
    expect(getInitialSizes(3, 100, [])).toEqual([33, 33, 34]);
  });

  test("uses layout sizes when layout is provided", () => {
    const layout: SplitPaneLayout[] = [
      { type: "fixed", size: 25 },
      { type: "fill", weight: 1 },
    ];

    expect(getInitialSizes(2, 100, layout)).toEqual([25, 75]);
  });
});
describe("fitSizesToTotal", () => {
  test("returns empty array when currentSizes is empty", () => {
    expect(fitSizesToTotal([], 100, [], [], 30)).toEqual([]);
  });

  test("returns zero-filled array when total height is 0", () => {
    expect(
      fitSizesToTotal([50, 50], 0, [10, 10], [Infinity, Infinity], 30),
    ).toEqual([0, 0]);
  });

  test("returns zero-filled array when total height is negative", () => {
    expect(
      fitSizesToTotal([50, 50], -10, [10, 10], [Infinity, Infinity], 30),
    ).toEqual([0, 0]);
  });

  test("preserves proportional sizes when scaling up", () => {
    expect(
      fitSizesToTotal([40, 40], 100, [10, 10], [Infinity, Infinity], 30),
    ).toEqual([50, 50]);
  });

  test("preserves proportional sizes when scaling down", () => {
    expect(
      fitSizesToTotal([50, 50], 80, [10, 10], [Infinity, Infinity], 30),
    ).toEqual([40, 40]);
  });

  test("preserves total exactly after scaling", () => {
    const result = fitSizesToTotal(
      [10, 20, 30],
      101,
      [0, 0, 0],
      [Infinity, Infinity, Infinity],
      0,
    );
    expect(result).toEqual([16, 33, 52]);
    expect(result.reduce((memo, value) => memo + value, 0)).toBe(101);
  });

  test("treats sizes at or below collapsedSize as locked", () => {
    expect(
      fitSizesToTotal([20, 80], 120, [10, 10], [Infinity, Infinity], 30),
    ).toEqual([20, 100]);
  });

  test("keeps multiple collapsed panes locked", () => {
    expect(
      fitSizesToTotal(
        [10, 20, 70],
        140,
        [5, 5, 5],
        [Infinity, Infinity, Infinity],
        30,
      ),
    ).toEqual([10, 20, 110]);
  });

  test("returns locked pane sizes unchanged even if they exceed the new total height", () => {
    expect(
      fitSizesToTotal([20, 20], 10, [0, 0], [Infinity, Infinity], 30),
    ).toEqual([20, 20]);
  });

  test("uses default sizes for remaining panes when remaining minimum total exceeds remaining height", () => {
    expect(
      fitSizesToTotal([50, 50], 30, [20, 20], [Infinity, Infinity], 0),
    ).toEqual([15, 15]);
  });

  test("forces panes up to their min sizes when proportional allocation would go below min", () => {
    expect(
      fitSizesToTotal([80, 20], 50, [10, 20], [Infinity, Infinity], 0),
    ).toEqual([30, 20]);
  });

  test("can force multiple panes to min sizes", () => {
    expect(
      fitSizesToTotal(
        [60, 20, 20],
        60,
        [30, 20, 20],
        [Infinity, Infinity, Infinity],
        0,
      ),
    ).toEqual([20, 20, 20]);
  });

  test("distributes leftover space proportionally among remaining active panes after forcing mins", () => {
    expect(
      fitSizesToTotal(
        [80, 10, 10],
        100,
        [10, 20, 20],
        [Infinity, Infinity, Infinity],
        0,
      ),
    ).toEqual([60, 20, 20]);
  });

  test("adds final rounding remainder to the last active pane", () => {
    expect(
      fitSizesToTotal(
        [1, 1, 1],
        10,
        [0, 0, 0],
        [Infinity, Infinity, Infinity],
        0,
      ),
    ).toEqual([3, 3, 4]);
  });

  test("floors current sizes before fitting", () => {
    expect(
      fitSizesToTotal([10.9, 20.9], 62, [0, 0], [Infinity, Infinity], 0),
    ).toEqual([20, 42]);
  });

  test("floors min sizes before fitting", () => {
    expect(
      fitSizesToTotal([50, 50], 40, [19.9, 10.1], [Infinity, Infinity], 0),
    ).toEqual([20, 20]);
  });

  test("floors collapsed size before determining locked panes", () => {
    expect(
      fitSizesToTotal([30, 70], 200, [10, 10], [Infinity, Infinity], 30.9),
    ).toEqual([30, 170]);
  });

  test("treats negative current sizes as 0", () => {
    expect(
      fitSizesToTotal([-10, 50], 100, [10, 10], [Infinity, Infinity], 0),
    ).toEqual([0, 100]);
  });

  test("treats negative min sizes as 0", () => {
    expect(
      fitSizesToTotal([50, 50], 100, [-10, 0], [Infinity, Infinity], 0),
    ).toEqual([50, 50]);
  });

  test("returns exact locked-only result when all panes are collapsed", () => {
    expect(
      fitSizesToTotal(
        [10, 20, 30],
        200,
        [0, 0, 0],
        [Infinity, Infinity, Infinity],
        30,
      ),
    ).toEqual([10, 20, 30]);
  });

  test("does not force a pane to min size if proportional size already meets min", () => {
    expect(
      fitSizesToTotal([40, 60], 100, [20, 20], [Infinity, Infinity], 0),
    ).toEqual([40, 60]);
  });

  test("handles a more complex mixture of locked and unlocked panes", () => {
    expect(
      fitSizesToTotal(
        [20, 40, 40],
        120,
        [10, 30, 10],
        [Infinity, Infinity, Infinity],
        30,
      ),
    ).toEqual([20, 50, 50]);
  });

  test("keeps output length equal to input length", () => {
    const result = fitSizesToTotal(
      [10, 20, 30, 40],
      200,
      [5, 5, 5, 5],
      [Infinity, Infinity, Infinity, Infinity],
      0,
    );
    expect(result).toHaveLength(4);
  });

  test("keeps output total equal to requested total when there is remaining active space", () => {
    const result = fitSizesToTotal(
      [10, 20, 30, 40],
      200,
      [5, 5, 5, 5],
      [Infinity, Infinity, Infinity, Infinity],
      0,
    );
    expect(result.reduce((memo, value) => memo + value, 0)).toBe(200);
  });

  test("respects max sizes when scaling up", () => {
    expect(fitSizesToTotal([40, 40], 120, [0, 0], [50, Infinity], 0)).toEqual([
      50, 70,
    ]);
  });

  test("respects max sizes for multiple panes", () => {
    expect(
      fitSizesToTotal([30, 30, 30], 150, [0, 0, 0], [40, 45, Infinity], 0),
    ).toEqual([40, 45, 65]);
  });

  test("keeps collapsed panes collapsed even if min size is larger", () => {
    expect(
      fitSizesToTotal([30, 200], 300, [190, 10], [190, Infinity], 30),
    ).toEqual([30, 270]);
  });

  test("clamps a pane to max size even if preferred size is larger", () => {
    expect(
      fitSizesToTotal([300, 100], 400, [0, 0], [190, Infinity], 0),
    ).toEqual([190, 210]);
  });

  test("treats maxSize lower than minSize as minSize", () => {
    expect(
      fitSizesToTotal([100, 100], 200, [80, 0], [50, Infinity], 0),
    ).toEqual([80, 120]);
  });
});
