import { useCallback } from "react";
import { useAppSelector } from "store/hooks";
import {
  playDutyNotePreview,
  playNoiseNotePreview,
  playWaveNotePreview,
} from "components/music/helpers";
import { NOTE_C5 } from "consts";

type PreviewArgs = {
  note?: number | null;
  instrumentId?: number | null;
  effectCode?: number | null;
  effectParam?: number | null;
};

export const useMusicNotePreview = () => {
  const song = useAppSelector((state) => state.trackerDocument.present.song);
  const selectedChannel = useAppSelector(
    (state) => state.tracker.selectedChannel,
  );
  const selectedInstrumentId = useAppSelector(
    (state) => state.tracker.selectedInstrumentId,
  );

  return useCallback(
    ({ note, instrumentId, effectCode, effectParam }: PreviewArgs) => {
      if (!song) {
        return;
      }

      const previewNote = note ?? NOTE_C5;
      const previewInstrumentId = instrumentId ?? selectedInstrumentId ?? 0;
      const previewEffectCode = effectCode ?? 0;
      const previewEffectParams = effectParam ?? 0;

      if (selectedChannel === 0 || selectedChannel === 1) {
        const instrument = song.duty_instruments[previewInstrumentId];
        if (!instrument) {
          return;
        }

        playDutyNotePreview(
          previewNote,
          instrument,
          selectedChannel === 1 ? 1 : 0,
          previewEffectCode,
          previewEffectParams,
        );
        return;
      }

      if (selectedChannel === 2) {
        const instrument = song.wave_instruments[previewInstrumentId];
        if (!instrument) {
          return;
        }

        const wave = song.waves[instrument.wave_index];
        if (!wave) {
          return;
        }

        playWaveNotePreview(
          previewNote,
          instrument,
          wave,
          previewEffectCode,
          previewEffectParams,
        );
        return;
      }

      if (selectedChannel === 3) {
        const instrument = song.noise_instruments[previewInstrumentId];
        if (!instrument) {
          return;
        }

        playNoiseNotePreview(
          previewNote,
          instrument,
          previewEffectCode,
          previewEffectParams,
        );
      }
    },
    [selectedChannel, selectedInstrumentId, song],
  );
};
