import { loadUGWave, saveUGWave, UGW_WAVE_SIZE } from "../../src/shared/lib/uge/ugwHelper";

const makeWave = (fill = 0): Uint8Array => new Uint8Array(UGW_WAVE_SIZE).fill(fill);

const rampWave = (): Uint8Array => {
  const w = new Uint8Array(UGW_WAVE_SIZE);
  for (let i = 0; i < UGW_WAVE_SIZE; i++) w[i] = i % 16;
  return w;
};

describe("saveUGWave", () => {
  test("produces exactly UGW_WAVE_SIZE bytes", () => {
    expect(saveUGWave(makeWave()).length).toBe(UGW_WAVE_SIZE);
  });

  test("throws if wave is too short", () => {
    expect(() => saveUGWave(new Uint8Array(31))).toThrow();
  });

  test("throws if wave is too long", () => {
    expect(() => saveUGWave(new Uint8Array(33))).toThrow();
  });

  test("all-zero wave produces 32 zero bytes", () => {
    const buf = saveUGWave(makeWave(0));
    expect(Array.from(buf)).toEqual(new Array(32).fill(0));
  });

  test("all-max wave (0xf) produces 32 bytes of 0x0f", () => {
    const buf = saveUGWave(makeWave(0xf));
    expect(Array.from(buf)).toEqual(new Array(32).fill(0x0f));
  });

  test("ramp wave bytes are preserved verbatim", () => {
    const wave = rampWave();
    const buf = saveUGWave(wave);
    for (let i = 0; i < UGW_WAVE_SIZE; i++) {
      expect(buf[i]).toBe(wave[i]);
    }
  });
});

describe("loadUGWave", () => {
  test("throws on buffer smaller than 32 bytes", () => {
    expect(() => loadUGWave(Buffer.alloc(31))).toThrow();
  });

  test("returns exactly 32 bytes", () => {
    expect(loadUGWave(Buffer.alloc(32)).length).toBe(UGW_WAVE_SIZE);
  });

  test("ignores extra bytes beyond 32", () => {
    const buf = Buffer.alloc(64, 0xaa);
    const wave = loadUGWave(buf);
    expect(wave.length).toBe(UGW_WAVE_SIZE);
    expect(wave[0]).toBe(0xaa);
  });

  test("all-zero buffer produces all-zero wave", () => {
    const wave = loadUGWave(Buffer.alloc(32, 0));
    expect(Array.from(wave)).toEqual(new Array(32).fill(0));
  });
});

describe("round-trip", () => {
  test("zero wave survives round-trip", () => {
    const original = makeWave(0);
    const loaded = loadUGWave(saveUGWave(original));
    expect(Array.from(loaded)).toEqual(Array.from(original));
  });

  test("max wave survives round-trip", () => {
    const original = makeWave(0xf);
    const loaded = loadUGWave(saveUGWave(original));
    expect(Array.from(loaded)).toEqual(Array.from(original));
  });

  test("ramp wave survives round-trip", () => {
    const original = rampWave();
    const loaded = loadUGWave(saveUGWave(original));
    expect(Array.from(loaded)).toEqual(Array.from(original));
  });

  test("arbitrary wave survives round-trip", () => {
    const original = new Uint8Array([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    ]);
    const loaded = loadUGWave(saveUGWave(original));
    expect(Array.from(loaded)).toEqual(Array.from(original));
  });
});
