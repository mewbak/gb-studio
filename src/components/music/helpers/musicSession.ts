/* eslint-disable camelcase */
import type {
  MusicDataPacket,
  MusicDataReceivePacket,
} from "shared/lib/music/types";
import player, { PlaybackPosition } from "./player";
import { Song } from "shared/lib/uge/types";
import { createPattern, createSong } from "shared/lib/uge/song";

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
  let position: PlaybackPosition = [0, 0];
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
        position = [0, 0];
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
          position = data.position;
        }
        loopSequenceId = data.loopSequenceId;
        player.reset();
        player.setMetronomeEnabled(data.metronomeEnabled ?? false);
        player.play(data.song, position);
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
          position = data.position;
        }
        player.stop(data.position);
        emit({
          action: "log",
          message: "stop",
        });
        break;
      case "position":
        position = data.position;
        player.setStartPosition(data.position);
        emit({
          action: "log",
          message: "position",
        });
        emit({
          action: "update",
          update: position,
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
        const previewPattern = createPattern();
        previewSong.patterns = [previewPattern];
        previewSong.sequence = [0];
        if (data.type === "duty") {
          previewPattern[0][data.channel].note = data.note;
          previewPattern[0][data.channel].instrument = 0;
          previewPattern[0][data.channel].effectcode = data.effectCode;
          previewPattern[0][data.channel].effectparam = data.effectParam;
          previewSong.dutyInstruments = [data.instrument];
        } else if (data.type === "wave") {
          previewPattern[0][2].note = data.note;
          previewPattern[0][2].instrument = 0;
          previewPattern[0][2].effectcode = data.effectCode;
          previewPattern[0][2].effectparam = data.effectParam;
          previewSong.waveInstruments = [
            {
              ...data.instrument,
              waveIndex: 0,
            },
          ];
          previewSong.waves = [data.waveForm];
        } else if (data.type === "noise") {
          previewPattern[0][3].note = data.note;
          previewPattern[0][3].instrument = 0;
          previewPattern[0][3].effectcode = data.effectCode;
          previewPattern[0][3].effectparam = data.effectParam;
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
      loopSequenceId !== undefined && playbackUpdate[0] !== loopSequenceId;

    if (shouldLoop && loopSequenceId !== undefined) {
      position = [loopSequenceId, 0];
      player.setStartPosition(position);
    } else {
      position = playbackUpdate;
    }

    emit({
      action: "update",
      update: position,
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
