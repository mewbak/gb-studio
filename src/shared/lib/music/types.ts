import type {
  Song,
  DutyInstrument,
  NoiseInstrument,
  WaveInstrument,
} from "shared/lib/uge/types";

export type InstrumentType = "duty" | "wave" | "noise";

export type MusicExportFormat = "wav" | "mp3" | "flac";

export type MusicDataPacket =
  | {
      action: "load-song";
      song: Song;
    }
  | {
      action: "load-sound";
      sound: string;
    }
  | {
      action: "play";
      song: Song;
      position?: [number, number];
      metronomeEnabled?: boolean;
    }
  | {
      action: "stop";
      position?: [number, number];
    }
  | {
      action: "set-metronome-enabled";
      enabled: boolean;
    }
  | {
      action: "position";
      position: [number, number];
    }
  | {
      action: "preview";
      type: "duty";
      note: number;
      instrument: DutyInstrument;
      channel: 0 | 1;
      effectCode: number;
      effectParam: number;
    }
  | {
      action: "preview";
      type: "wave";
      note: number;
      instrument: WaveInstrument;
      waveForm: Uint8Array;
      effectCode: number;
      effectParam: number;
    }
  | {
      action: "preview";
      type: "noise";
      note: number;
      instrument: NoiseInstrument;
      effectCode: number;
      effectParam: number;
    }
  | {
      action: "export-song";
      requestId: string;
      song: Song;
      format: MusicExportFormat;
      loopCount: number;
    }
  | {
      action: "set-mute";
      channel: number;
      muted: boolean;
    }
  | {
      action: "set-solo";
      channel: number;
      enabled: boolean;
    };

export type MusicDataReceivePacket =
  | {
      action: "initialized";
    }
  | {
      action: "log";
      message: string;
    }
  | {
      action: "loaded";
    }
  | {
      action: "update";
      update: [number, number];
    }
  | {
      action: "muted";
      channels: [boolean, boolean, boolean, boolean];
    }
  | {
      action: "exported-song";
      requestId: string;
      format: MusicExportFormat;
      data: Uint8Array;
    }
  | {
      action: "export-failed";
      requestId: string;
      message: string;
    };
