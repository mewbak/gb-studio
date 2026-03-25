import React, { useState, useRef, useEffect } from "react";
import { Song } from "shared/lib/uge/types";
import { MusicDataReceivePacket } from "shared/lib/music/types";
import { useAppSelector } from "store/hooks";
import { StyledPianoRollWrapper } from "./style";
import { PianoRollCanvas } from "./PianoRollCanvas";
import API from "renderer/lib/api";

interface SongPianoRollProps {
  sequenceId: number;
  song: Song | null;
}

export const SongPianoRoll = ({ song, sequenceId }: SongPianoRollProps) => {
  const playing = useAppSelector((state) => state.tracker.playing);
  const startPlaybackPosition = useAppSelector(
    (state) => state.tracker.startPlaybackPosition,
  );

  const [playbackState, setPlaybackState] = useState([0, 0]);

  useEffect(() => {
    setPlaybackState(startPlaybackPosition);
  }, [setPlaybackState, startPlaybackPosition]);

  useEffect(() => {
    const listener = (_event: unknown, d: MusicDataReceivePacket) => {
      if (d.action === "update") {
        setPlaybackState(d.update);
      } else if (d.action === "initialized") {
        setPlaybackState([0, 0]);
      }
    };
    const unsubscribeMusicData = API.events.music.response.subscribe(listener);
    return () => {
      unsubscribeMusicData();
    };
  }, [setPlaybackState]);

  const playingRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (playingRowRef && playingRowRef.current) {
      if (playing) {
        playingRowRef.current.scrollIntoView({
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [playing, playbackState]);

  return (
    <StyledPianoRollWrapper>
      {song && (
        <PianoRollCanvas
          song={song}
          sequenceId={sequenceId}
          playbackOrder={playbackState[0]}
          playbackRow={playbackState[1]}
        />
      )}
    </StyledPianoRollWrapper>
  );
};
