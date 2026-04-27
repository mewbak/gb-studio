import type {
  MusicDataPacket,
  MusicDataReceivePacket,
  MusicPlaybackState,
} from "shared/lib/music/types";
import player from "./player";
import { Song } from "shared/lib/uge/types";
import {
  createSequenceItem,
  createPattern,
  createSong,
} from "shared/lib/uge/song";

type MusicSessionListener = (data: MusicDataReceivePacket) => void;

export interface MusicSession {
  open: (sfx?: string) => void;
  send: (data: MusicDataPacket) => void;
  subscribe: (listener: MusicSessionListener) => () => void;
}

const createMusicSession = (): MusicSession => {
  let isInitialized = false;
  let isOpening = false;
  let openedSfx: string | undefined;
  let playbackState: MusicPlaybackState = {
    sequence: 0,
    row: 0,
    tick: 0,
    ticksPerRow: 0,
  };
  let loopSequenceId: number | undefined;
  let queuedActions: MusicDataPacket[] = [];

  const listeners = new Set<MusicSessionListener>();

  const emit = (data: MusicDataReceivePacket) => {
    listeners.forEach((listener) => listener(data));
  };

  const flushQueuedActions = () => {
    if (queuedActions.length === 0) {
      return;
    }
    const actions = queuedActions;
    queuedActions = [];
    actions.forEach((action) => {
      handleAction(action);
    });
  };

  const handleAction = (data: MusicDataPacket) => {
    switch (data.action) {
      case "load-song":
        player.reset();
        player.loadSong(data.song);
        playbackState = {
          sequence: 0,
          row: 0,
          tick: 0,
          ticksPerRow: data.song.ticksPerRow,
        };
        player.setStartPosition({
          sequence: playbackState.sequence,
          row: playbackState.row,
        });
        loopSequenceId = undefined;
        emit({
          action: "log",
          message: "load song",
        });
        emit({
          action: "loaded",
        });
        break;
      case "load-sound":
        player.loadSound(data.sound);
        break;
      case "play":
        if (data.position) {
          playbackState = {
            ...playbackState,
            sequence: data.position.sequence,
            row: data.position.row,
          };
        }
        playbackState = {
          ...playbackState,
          tick: 0,
          ticksPerRow: data.song.ticksPerRow,
        };
        loopSequenceId = data.loopSequenceId;
        player.reset();
        player.setMetronomeEnabled(data.metronomeEnabled ?? false);
        player.play(data.song, {
          sequence: playbackState.sequence,
          row: playbackState.row,
        });
        emit({
          action: "log",
          message: "playing",
        });
        break;
      case "set-metronome-enabled":
        player.setMetronomeEnabled(data.enabled);
        break;
      case "stop":
        if (data.position) {
          playbackState = {
            ...playbackState,
            sequence: data.position.sequence,
            row: data.position.row,
          };
        }
        player.stop(data.position);
        emit({
          action: "log",
          message: "stop",
        });
        break;
      case "position":
        playbackState = {
          ...playbackState,
          sequence: data.position.sequence,
          row: data.position.row,
          tick: 0,
        };
        player.setStartPosition(data.position);
        emit({
          action: "log",
          message: "position",
        });
        emit({
          action: "update",
          update: {
            ...playbackState,
            source: "position",
          },
        });
        break;
      case "set-mute":
        emit({
          action: "muted",
          channels: player.setChannel(data.channel, data.muted),
        });
        break;
      case "set-solo":
        emit({
          action: "muted",
          channels: player.setSolo(data.channel, data.enabled),
        });
        break;
      case "preview": {
        if (!data.instrument) {
          break;
        }
        const previewSong: Song = createSong();
        previewSong.patterns = [
          createPattern(),
          createPattern(),
          createPattern(),
          createPattern(),
        ];
        previewSong.sequence = [createSequenceItem(0)];
        if (data.type === "duty") {
          const pattern = previewSong.patterns[data.channel];
          const row = pattern[0];
          row.note = data.note;
          row.instrument = 0;
          row.effectCode = data.effectCode;
          row.effectParam = data.effectParam;
          previewSong.dutyInstruments = [data.instrument];
        } else if (data.type === "wave") {
          const pattern = previewSong.patterns[2];
          const row = pattern[0];
          row.note = data.note;
          row.instrument = 0;
          row.effectCode = data.effectCode;
          row.effectParam = data.effectParam;
          previewSong.waveInstruments = [
            {
              ...data.instrument,
              waveIndex: 0,
            },
          ];
          previewSong.waves = [data.waveForm];
        } else if (data.type === "noise") {
          const pattern = previewSong.patterns[3];
          const row = pattern[0];
          row.note = data.note;
          row.instrument = 0;
          row.effectCode = data.effectCode;
          row.effectParam = data.effectParam;
          previewSong.noiseInstruments = [data.instrument];
        }
        player.playPreview(previewSong, 500);
        break;
      }
      case "export-song": {
        player.reset();
        void player
          .exportSong(data.song, data.format, data.loopCount)
          .then((fileData) => {
            emit({
              action: "exported-song",
              requestId: data.requestId,
              format: data.format,
              data: fileData,
            });
            player.reset();
          })
          .catch((error) => {
            emit({
              action: "export-failed",
              requestId: data.requestId,
              message: error instanceof Error ? error.message : String(error),
            });
          });
        break;
      }
      default: {
        const unsupportedAction: never = data;
        console.log(`Unsupported music action`, unsupportedAction);
      }
    }
  };

  player.setOnIntervalCallback((playbackUpdate) => {
    const shouldLoop =
      loopSequenceId !== undefined &&
      playbackUpdate.sequence !== loopSequenceId;

    if (shouldLoop && loopSequenceId !== undefined) {
      playbackState = {
        sequence: loopSequenceId,
        row: 0,
        tick: 0,
        ticksPerRow: playbackUpdate.ticksPerRow,
      };
      player.setStartPosition({
        sequence: playbackState.sequence,
        row: playbackState.row,
      });
    } else {
      playbackState = {
        sequence: playbackUpdate.sequence,
        row: playbackUpdate.row,
        tick: playbackUpdate.tick,
        ticksPerRow: playbackUpdate.ticksPerRow,
      };
    }

    emit({
      action: "update",
      update: {
        ...playbackState,
        source: "playback",
      },
    });
  });

  const open = (sfx?: string) => {
    if (isInitialized) {
      queueMicrotask(() => {
        emit({
          action: "initialized",
        });
      });
      return;
    }

    if (isOpening) {
      return;
    }

    isOpening = true;
    openedSfx = sfx;

    player.initPlayer((file) => {
      isOpening = false;
      if (!file) {
        emit({
          action: "log",
          message: "compile error",
        });
        return;
      }

      isInitialized = true;
      emit({
        action: "initialized",
      });
      flushQueuedActions();
    }, openedSfx);
  };

  const send = (data: MusicDataPacket) => {
    if (!isInitialized) {
      queuedActions = queuedActions.concat(data);
      open(openedSfx);
      return;
    }
    handleAction(data);
  };

  const subscribe = (listener: MusicSessionListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    open,
    send,
    subscribe,
  };
};

export default createMusicSession;
