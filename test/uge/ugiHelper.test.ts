/* eslint-disable camelcase */
import { createSubPattern } from "shared/lib/uge/song";
import {
  UGI_INSTRUMENT_SIZE,
  loadUGIInstrument,
  saveUGIInstrument,
  isDutyInstrument,
  isWaveInstrument,
  isNoiseInstrument,
} from "shared/lib/uge/ugiHelper";
import type {
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";

const makeDutyInstrument = (
  overrides?: Partial<DutyInstrument>,
): DutyInstrument => ({
  index: 0,
  name: "Test Duty",
  length: 16,
  duty_cycle: 2,
  initial_volume: 12,
  volume_sweep_change: -3,
  frequency_sweep_time: 4,
  frequency_sweep_shift: -2,
  subpattern_enabled: false,
  subpattern: createSubPattern(),
  ...overrides,
});

const makeWaveInstrument = (
  overrides?: Partial<WaveInstrument>,
): WaveInstrument => ({
  index: 0,
  name: "Test Wave",
  length: 32,
  volume: 2,
  wave_index: 5,
  subpattern_enabled: true,
  subpattern: createSubPattern(),
  ...overrides,
});

const makeNoiseInstrument = (
  overrides?: Partial<NoiseInstrument>,
): NoiseInstrument => ({
  index: 0,
  name: "Test Noise",
  length: null,
  initial_volume: 8,
  volume_sweep_change: 2,
  dividing_ratio: 0,
  bit_count: 7,
  subpattern_enabled: false,
  subpattern: createSubPattern(),
  ...overrides,
});

describe("saveUGIInstrument / loadUGIInstrument", () => {
  describe("buffer size", () => {
    test("saved duty instrument is exactly UGI_INSTRUMENT_SIZE bytes", () => {
      const buf = saveUGIInstrument(makeDutyInstrument());
      expect(buf.byteLength).toBe(UGI_INSTRUMENT_SIZE);
    });

    test("saved wave instrument is exactly UGI_INSTRUMENT_SIZE bytes", () => {
      const buf = saveUGIInstrument(makeWaveInstrument());
      expect(buf.byteLength).toBe(UGI_INSTRUMENT_SIZE);
    });

    test("saved noise instrument is exactly UGI_INSTRUMENT_SIZE bytes", () => {
      const buf = saveUGIInstrument(makeNoiseInstrument());
      expect(buf.byteLength).toBe(UGI_INSTRUMENT_SIZE);
    });
  });

  describe("type detection after round-trip", () => {
    test("duty instrument round-trips as DutyInstrument", () => {
      const loaded = loadUGIInstrument(saveUGIInstrument(makeDutyInstrument()));
      expect(isDutyInstrument(loaded)).toBe(true);
    });

    test("wave instrument round-trips as WaveInstrument", () => {
      const loaded = loadUGIInstrument(saveUGIInstrument(makeWaveInstrument()));
      expect(isWaveInstrument(loaded)).toBe(true);
    });

    test("noise instrument round-trips as NoiseInstrument", () => {
      const loaded = loadUGIInstrument(
        saveUGIInstrument(makeNoiseInstrument()),
      );
      expect(isNoiseInstrument(loaded)).toBe(true);
    });
  });

  describe("duty instrument round-trip", () => {
    test("name is preserved", () => {
      const instr = makeDutyInstrument({ name: "My Lead" });
      const loaded = loadUGIInstrument(saveUGIInstrument(instr));
      expect(loaded.name).toBe("My Lead");
    });

    test("length is preserved", () => {
      const instr = makeDutyInstrument({ length: 20 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.length).toBe(20);
    });

    test("null length is preserved", () => {
      const instr = makeDutyInstrument({ length: null });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.length).toBeNull();
    });

    test("duty_cycle is preserved", () => {
      const instr = makeDutyInstrument({ duty_cycle: 3 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.duty_cycle).toBe(3);
    });

    test("initial_volume is preserved", () => {
      const instr = makeDutyInstrument({ initial_volume: 10 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.initial_volume).toBe(10);
    });

    test("negative volume_sweep_change (decreasing envelope) is preserved", () => {
      const instr = makeDutyInstrument({ volume_sweep_change: -3 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.volume_sweep_change).toBe(-3);
    });

    test("positive volume_sweep_change (increasing envelope) is preserved", () => {
      const instr = makeDutyInstrument({ volume_sweep_change: 4 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.volume_sweep_change).toBe(4);
    });

    test("zero volume_sweep_change is preserved", () => {
      const instr = makeDutyInstrument({ volume_sweep_change: 0 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.volume_sweep_change).toBe(0);
    });

    test("positive frequency_sweep_shift is preserved", () => {
      const instr = makeDutyInstrument({ frequency_sweep_shift: 3 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.frequency_sweep_shift).toBe(3);
    });

    test("negative frequency_sweep_shift is preserved", () => {
      const instr = makeDutyInstrument({ frequency_sweep_shift: -2 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.frequency_sweep_shift).toBe(-2);
    });

    test("frequency_sweep_time is preserved", () => {
      const instr = makeDutyInstrument({ frequency_sweep_time: 5 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as DutyInstrument;
      expect(loaded.frequency_sweep_time).toBe(5);
    });
  });

  describe("wave instrument round-trip", () => {
    test("name is preserved", () => {
      const instr = makeWaveInstrument({ name: "Bass Wave" });
      const loaded = loadUGIInstrument(saveUGIInstrument(instr));
      expect(loaded.name).toBe("Bass Wave");
    });

    test("null length is preserved", () => {
      const instr = makeWaveInstrument({ length: null });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as WaveInstrument;
      expect(loaded.length).toBeNull();
    });

    test("length is preserved", () => {
      const instr = makeWaveInstrument({ length: 100 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as WaveInstrument;
      expect(loaded.length).toBe(100);
    });

    test("volume is preserved", () => {
      const instr = makeWaveInstrument({ volume: 3 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as WaveInstrument;
      expect(loaded.volume).toBe(3);
    });

    test("wave_index is preserved", () => {
      const instr = makeWaveInstrument({ wave_index: 11 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as WaveInstrument;
      expect(loaded.wave_index).toBe(11);
    });
  });

  describe("noise instrument round-trip", () => {
    test("name is preserved", () => {
      const instr = makeNoiseInstrument({ name: "Snare" });
      const loaded = loadUGIInstrument(saveUGIInstrument(instr));
      expect(loaded.name).toBe("Snare");
    });

    test("bit_count 7 (7-step) is preserved", () => {
      const instr = makeNoiseInstrument({ bit_count: 7 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as NoiseInstrument;
      expect(loaded.bit_count).toBe(7);
    });

    test("bit_count 15 (15-step) is preserved", () => {
      const instr = makeNoiseInstrument({ bit_count: 15 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as NoiseInstrument;
      expect(loaded.bit_count).toBe(15);
    });

    test("initial_volume is preserved", () => {
      const instr = makeNoiseInstrument({ initial_volume: 6 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as NoiseInstrument;
      expect(loaded.initial_volume).toBe(6);
    });

    test("volume_sweep_change is preserved", () => {
      const instr = makeNoiseInstrument({ volume_sweep_change: -5 });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as NoiseInstrument;
      expect(loaded.volume_sweep_change).toBe(-5);
    });

    test("null length is preserved", () => {
      const instr = makeNoiseInstrument({ length: null });
      const loaded = loadUGIInstrument(
        saveUGIInstrument(instr),
      ) as NoiseInstrument;
      expect(loaded.length).toBeNull();
    });
  });

  describe("subpattern round-trip", () => {
    test("subpattern_enabled=true is preserved", () => {
      const instr = makeDutyInstrument({ subpattern_enabled: true });
      const loaded = loadUGIInstrument(saveUGIInstrument(instr));
      expect(loaded.subpattern_enabled).toBe(true);
    });

    test("subpattern_enabled=false is preserved", () => {
      const instr = makeDutyInstrument({ subpattern_enabled: false });
      const loaded = loadUGIInstrument(saveUGIInstrument(instr));
      expect(loaded.subpattern_enabled).toBe(false);
    });

    test("non-trivial subpattern cells survive round-trip", () => {
      const subpattern = createSubPattern();
      subpattern[0] = { note: 36, jump: 3, effectcode: 5, effectparam: 10 };
      subpattern[1] = {
        note: 48,
        jump: null,
        effectcode: null,
        effectparam: null,
      };
      subpattern[63] = {
        note: null,
        jump: 1,
        effectcode: 0x0a,
        effectparam: 0xff,
      };

      const instr = makeDutyInstrument({
        subpattern_enabled: true,
        subpattern,
      });
      const loaded = loadUGIInstrument(saveUGIInstrument(instr));

      expect(loaded.subpattern[0].note).toBe(36);
      expect(loaded.subpattern[0].jump).toBe(3);
      expect(loaded.subpattern[0].effectcode).toBe(5);
      expect(loaded.subpattern[0].effectparam).toBe(10);

      expect(loaded.subpattern[1].note).toBe(48);
      expect(loaded.subpattern[1].jump).toBe(0); // null jump serializes as 0
      expect(loaded.subpattern[1].effectcode).toBeNull();
      expect(loaded.subpattern[1].effectparam).toBeNull();

      expect(loaded.subpattern[63].note).toBeNull();
      expect(loaded.subpattern[63].jump).toBe(1);
      expect(loaded.subpattern[63].effectcode).toBe(0x0a);
      expect(loaded.subpattern[63].effectparam).toBe(0xff);
    });

    test("subpattern has exactly 64 cells after round-trip", () => {
      const loaded = loadUGIInstrument(saveUGIInstrument(makeDutyInstrument()));
      expect(loaded.subpattern).toHaveLength(64);
    });
  });

  describe("error handling", () => {
    test("throws on buffer that is too small", () => {
      const tinyBuffer = Buffer.alloc(100);
      expect(() => loadUGIInstrument(tinyBuffer)).toThrow(/too small/i);
    });

    test("throws on invalid instrument type byte", () => {
      const buf = saveUGIInstrument(makeDutyInstrument());
      // Overwrite the type uint32 with an invalid value (little-endian)
      buf.writeUInt32LE(99, 0);
      expect(() => loadUGIInstrument(buf)).toThrow(/invalid.*type/i);
    });
  });
});
