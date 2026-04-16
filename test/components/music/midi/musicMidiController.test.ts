import { TOTAL_NOTES } from "consts";
import {
  createMusicMidiController,
  getMidiNoteFromMessage,
} from "components/music/midi/musicMidiController";
import trackerActions from "store/features/tracker/trackerActions";
import {
  defaultMusicMidiState,
  MusicMidiState,
} from "shared/lib/music/midi";

type FakeMidiInput = {
  id: string;
  name: string;
  manufacturer?: string | null;
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
};

type FakeStoredMidiDevice = {
  id: string | null;
  name: string | null;
  manufacturer: string | null;
};

const makeMidiInput = (
  id: string,
  name: string,
  manufacturer: string | null = "ACME",
): FakeMidiInput => ({
  id,
  name,
  manufacturer,
  onmidimessage: null,
});

const makeMidiAccess = (inputs: FakeMidiInput[]) =>
  ({
    inputs: new Map(inputs.map((input) => [input.id, input])),
    onstatechange: null,
  }) as unknown as MIDIAccess;

const createMockMidiStore = () => {
  let midiInputState: MusicMidiState = defaultMusicMidiState;

  return {
    dispatch: (action: unknown) => {
      if (
        typeof action === "object" &&
        action !== null &&
        "type" in action &&
        action.type === trackerActions.setMidiState.type &&
        "payload" in action
      ) {
        midiInputState = action.payload as MusicMidiState;
      }

      return action;
    },
    getState: () => ({
      tracker: {
        midiInput: midiInputState,
      },
    }),
  };
};

describe("musicMidiController", () => {
  it("parses note on messages and clamps notes to the supported range", () => {
    expect(getMidiNoteFromMessage(Uint8Array.from([0x90, 60, 100]))).toBe(12);
    expect(getMidiNoteFromMessage(Uint8Array.from([0x91, 127, 100]))).toBe(
      TOTAL_NOTES - 1,
    );
    expect(getMidiNoteFromMessage(Uint8Array.from([0x90, 32, 0]))).toBeNull();
    expect(getMidiNoteFromMessage(Uint8Array.from([0x80, 32, 100]))).toBeNull();
  });

  it("enables MIDI input and selects the first available device", async () => {
    const stored = {
      enabled: false,
      device: null as FakeStoredMidiDevice | null,
    };
    const inputA = makeMidiInput("input-a", "Keyboard A");
    const inputB = makeMidiInput("input-b", "Keyboard B");
    const store = createMockMidiStore();

    const controller = createMusicMidiController({
      supportsMidi: () => true,
      requestAccess: async () => makeMidiAccess([inputA, inputB]),
      getStoredEnabled: async () => stored.enabled,
      setStoredEnabled: async (enabled) => {
        stored.enabled = enabled;
      },
      getStoredDevice: async () => stored.device,
      setStoredDevice: async (device) => {
        stored.device = device;
      },
    });

    controller.bindStore(store);
    await controller.initialize();
    await controller.setEnabled(true);

    expect(store.getState().tracker.midiInput).toMatchObject({
      enabled: true,
      selectedInputId: "input-a",
      inputs: [
        { id: "input-a", name: "Keyboard A" },
        { id: "input-b", name: "Keyboard B" },
      ],
    });
    expect(stored.enabled).toBe(true);
    expect(stored.device).toEqual({
      id: "input-a",
      name: "Keyboard A",
      manufacturer: "ACME",
    });
    expect(inputA.onmidimessage).toBeInstanceOf(Function);
  });

  it("restores the stored input and forwards note events to subscribers", async () => {
    const stored = {
      enabled: true,
      device: {
        id: "input-b",
        name: "Keyboard B",
        manufacturer: "ACME",
      } as FakeStoredMidiDevice | null,
    };
    const inputA = makeMidiInput("input-a", "Keyboard A");
    const inputB = makeMidiInput("input-b", "Keyboard B");
    const receivedNotes: number[] = [];
    const store = createMockMidiStore();

    const controller = createMusicMidiController({
      supportsMidi: () => true,
      requestAccess: async () => makeMidiAccess([inputA, inputB]),
      getStoredEnabled: async () => stored.enabled,
      setStoredEnabled: async (enabled) => {
        stored.enabled = enabled;
      },
      getStoredDevice: async () => stored.device,
      setStoredDevice: async (device) => {
        stored.device = device;
      },
    });

    controller.bindStore(store);
    controller.subscribeToNotes((note) => {
      receivedNotes.push(note);
    });

    await controller.initialize();

    expect(store.getState().tracker.midiInput).toMatchObject({
      enabled: true,
      selectedInputId: "input-b",
    });

    inputB.onmidimessage?.({
      data: Uint8Array.from([0x90, 72, 100]),
    } as MIDIMessageEvent);

    expect(receivedNotes).toEqual([24]);
  });

  it("toggles MIDI recording state without changing input selection", async () => {
    const store = createMockMidiStore();
    const controller = createMusicMidiController({
      supportsMidi: () => true,
      requestAccess: async () => makeMidiAccess([]),
      getStoredEnabled: async () => false,
      setStoredEnabled: async () => undefined,
      getStoredDevice: async () => null,
      setStoredDevice: async () => undefined,
    });

    controller.bindStore(store);
    await controller.initialize();

    expect(store.getState().tracker.midiInput.recordingEnabled).toBe(true);

    controller.toggleRecordingEnabled();

    expect(store.getState().tracker.midiInput).toMatchObject({
      recordingEnabled: false,
      selectedInputId: null,
      enabled: false,
    });
  });

  it("keeps the stored preferred device when temporarily falling back after disconnect", async () => {
    const stored = {
      enabled: true,
      device: {
        id: "input-b",
        name: "Keyboard B",
        manufacturer: "ACME",
      } as FakeStoredMidiDevice | null,
    };
    const inputA = makeMidiInput("input-a", "Keyboard A");
    const inputB = makeMidiInput("input-b", "Keyboard B");
    const midiAccess = makeMidiAccess([inputA, inputB]) as MIDIAccess & {
      inputs: Map<string, FakeMidiInput>;
      onstatechange: ((event: Event) => void) | null;
    };
    const mutableInputs = midiAccess as unknown as {
      inputs: Map<string, FakeMidiInput>;
    };
    const store = createMockMidiStore();

    const controller = createMusicMidiController({
      supportsMidi: () => true,
      requestAccess: async () => midiAccess,
      getStoredEnabled: async () => stored.enabled,
      setStoredEnabled: async (enabled) => {
        stored.enabled = enabled;
      },
      getStoredDevice: async () => stored.device,
      setStoredDevice: async (device) => {
        stored.device = device;
      },
    });

    controller.bindStore(store);
    await controller.initialize();

    expect(store.getState().tracker.midiInput.selectedInputId).toBe("input-b");
    expect(stored.device?.id).toBe("input-b");

    mutableInputs.inputs = new Map([[inputA.id, inputA]]);
    midiAccess.onstatechange?.({} as Event);
    await Promise.resolve();

    expect(store.getState().tracker.midiInput.selectedInputId).toBe("input-a");
    expect(stored.device?.id).toBe("input-b");

    mutableInputs.inputs = new Map([
      [inputA.id, inputA],
      [inputB.id, inputB],
    ]);
    midiAccess.onstatechange?.({} as Event);
    await Promise.resolve();

    expect(store.getState().tracker.midiInput.selectedInputId).toBe("input-b");
    expect(stored.device?.id).toBe("input-b");
  });

  it("matches a reconnecting preferred device by name and manufacturer when the id changes", async () => {
    const stored = {
      enabled: true,
      device: {
        id: "input-b-old",
        name: "Keyboard B",
        manufacturer: "ACME",
      } as FakeStoredMidiDevice | null,
    };
    const inputA = makeMidiInput("input-a", "Keyboard A", "Roland");
    const inputB = makeMidiInput("input-b-new", "Keyboard B", "ACME");
    const store = createMockMidiStore();

    const controller = createMusicMidiController({
      supportsMidi: () => true,
      requestAccess: async () => makeMidiAccess([inputA, inputB]),
      getStoredEnabled: async () => stored.enabled,
      setStoredEnabled: async (enabled) => {
        stored.enabled = enabled;
      },
      getStoredDevice: async () => stored.device,
      setStoredDevice: async (device) => {
        stored.device = device;
      },
    });

    controller.bindStore(store);
    await controller.initialize();

    expect(store.getState().tracker.midiInput.selectedInputId).toBe(
      "input-b-new",
    );
    expect(stored.device).toEqual({
      id: "input-b-new",
      name: "Keyboard B",
      manufacturer: "ACME",
    });
  });
});
