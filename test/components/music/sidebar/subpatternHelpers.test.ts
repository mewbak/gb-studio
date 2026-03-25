import { createSubPatternCell } from "../../../../src/shared/lib/uge/song";
import {
  applySubpatternCellChanges,
  formatSubpatternFlow,
  formatSubpatternPitch,
  getSubpatternFlowType,
  moveSubpatternRow,
} from "../../../../src/components/music/subpattern/helpers";

test("Should format null and positive subpattern pitch values", () => {
  expect(formatSubpatternPitch(null)).toBe("Base");
  expect(formatSubpatternPitch(43)).toBe("+7 st");
});

test("Should map stored jump values to continue and jump states", () => {
  expect(getSubpatternFlowType(null, 5)).toBe("continue");
  expect(formatSubpatternFlow(1, 5)).toBe("Jump to 00");
  expect(getSubpatternFlowType(6, 5)).toBe("jump");
  expect(formatSubpatternFlow(6, 5)).toBe("Jump to 05");
});

test("Should initialize effect param when setting effect code zero", () => {
  const subpattern = [createSubPatternCell()];
  const nextSubpattern = applySubpatternCellChanges(subpattern, 0, {
    effectcode: 0,
  });

  expect(nextSubpattern[0].effectcode).toBe(0);
  expect(nextSubpattern[0].effectparam).toBe(0);
});

test("Should move a visible subpattern row without dropping data", () => {
  const subpattern = [createSubPatternCell(), createSubPatternCell()];
  subpattern[0].note = 40;
  subpattern[1].note = 45;

  const nextSubpattern = moveSubpatternRow(subpattern, 0, 1);

  expect(nextSubpattern[0].note).toBe(45);
  expect(nextSubpattern[1].note).toBe(40);
});
