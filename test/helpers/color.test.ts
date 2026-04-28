import { compileColor } from "lib/compiler/generateGBVMData";
import {
  hex2GBChex,
  rawHexToClosestRepresentableRawHex,
  rawHexToCorrectedHex,
} from "shared/lib/helpers/color";

describe("rawHexToClosestRepresentableRawHex", () => {
  test("floors low raw values to the same 5-bit color used by the compiler", () => {
    expect(rawHexToClosestRepresentableRawHex("050505")).toBe("000000");
    expect(rawHexToClosestRepresentableRawHex("080808")).toBe("080808");
    expect(rawHexToClosestRepresentableRawHex("fafafa")).toBe("ffffff");
  });

  test("preserves the compiled RGB value after snapping to canonical raw hex", () => {
    ["050505", "123456", "fafafa"].forEach((inHex) => {
      const canonicalHex = rawHexToClosestRepresentableRawHex(inHex);
      expect(canonicalHex).not.toBe(inHex);
      expect(compileColor(canonicalHex)).toBe(compileColor(inHex));
    });
  });

  test("matches compiler quantisation for representative values", () => {
    expect(rawHexToClosestRepresentableRawHex("123456")).toBe("103152");
    expect(rawHexToClosestRepresentableRawHex("05050d")).toBe("000008");
    expect(rawHexToClosestRepresentableRawHex("050515")).toBe("000010");
  });
});

describe("rawHexToCorrectedHex", () => {
  test("uses the same snapped raw color as compiler-aligned canonicalisation", () => {
    expect(rawHexToCorrectedHex("050505")).toBe(
      hex2GBChex("000000", "default"),
    );
    expect(rawHexToCorrectedHex("080808")).toBe(
      hex2GBChex("080808", "default"),
    );
  });
});
